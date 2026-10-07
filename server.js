require("dotenv").config();

const path = require("path");
const express = require("express");
const { MongoClient } = require("mongodb");
const { applicationDefault, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const requiredEnvironment = ["MONGODB_URI", "MONGODB_DB", "GOOGLE_APPLICATION_CREDENTIALS"];
const missingEnvironment = requiredEnvironment.filter(name => !process.env[name]);
if (missingEnvironment.length) {
    throw new Error(`Missing required environment variables: ${missingEnvironment.join(", ")}`);
}

initializeApp({
    credential: applicationDefault()
});

const mongoClient = new MongoClient(process.env.MONGODB_URI);
const app = express();
const staticFiles = new Map([
    ["/script.js", "script.js"],
    ["/style.css", "style.css"],
    ["/firebase-config.js", "firebase-config.js"]
]);
const port = Number(process.env.PORT || 5500);
const allowedProjectTypes = new Set(["AI Video", "AI Image", "AI Ads", "Social Media"]);
let database;
const aiRequestCounts = new Map();

app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
    req.db = database;
    next();
});

async function requireFirebaseUser(req, res, next) {
    const authorization = req.get("authorization") || "";
    const match = authorization.match(/^Bearer (.+)$/i);
    if (!match) {
        res.status(401).json({ error: "Sign in to continue." });
        return;
    }

    try {
        req.user = await getAuth().verifyIdToken(match[1]);
        next();
    } catch (error) {
        console.warn("Firebase token verification failed:", error.code || error.message);
        res.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
    }
}

function validString(value, maxLength) {
    return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

app.get("/api/favorites", requireFirebaseUser, async (req, res, next) => {
    try {
        const rows = await req.db.collection("favorites")
            .find({ userId: req.user.uid }, { projection: { _id: 0, creatorName: 1 } })
            .toArray();
        res.json({ favorites: rows.map(row => row.creatorName) });
    } catch (error) {
        next(error);
    }
});

app.put("/api/favorites/:creatorName", requireFirebaseUser, async (req, res, next) => {
    const creatorName = req.params.creatorName.trim();
    if (!validString(creatorName, 120)) {
        res.status(400).json({ error: "Creator name is invalid." });
        return;
    }

    try {
        await req.db.collection("favorites").updateOne(
            { userId: req.user.uid, creatorName },
            { $setOnInsert: { userId: req.user.uid, creatorName, createdAt: new Date() } },
            { upsert: true }
        );
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

app.delete("/api/favorites/:creatorName", requireFirebaseUser, async (req, res, next) => {
    const creatorName = req.params.creatorName.trim();
    if (!validString(creatorName, 120)) {
        res.status(400).json({ error: "Creator name is invalid." });
        return;
    }

    try {
        await req.db.collection("favorites").deleteOne({ userId: req.user.uid, creatorName });
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

app.post("/api/contact-requests", requireFirebaseUser, async (req, res, next) => {
    const { creatorName } = req.body || {};
    if (!validString(creatorName, 120)) {
        res.status(400).json({ error: "Creator name is required." });
        return;
    }

    try {
        const result = await req.db.collection("contactRequests").insertOne({
            creatorName: creatorName.trim(),
            userId: req.user.uid,
            createdAt: new Date()
        });
        res.status(201).json({ id: result.insertedId });
    } catch (error) {
        next(error);
    }
});

app.post("/api/briefs", requireFirebaseUser, async (req, res, next) => {
    const { title, description, type, budget } = req.body || {};
    if (!validString(title, 200) || !validString(description, 5000) ||
        !allowedProjectTypes.has(type) || !Number.isFinite(budget) || budget <= 0) {
        res.status(400).json({ error: "Enter a valid title, description, project type, and positive budget." });
        return;
    }

    try {
        const result = await req.db.collection("briefs").insertOne({
            title: title.trim(),
            description: description.trim(),
            type,
            budget,
            userId: req.user.uid,
            createdAt: new Date()
        });
        res.status(201).json({ id: result.insertedId });
    } catch (error) {
        next(error);
    }
});

app.post("/api/chat", requireFirebaseUser, async (req, res) => {
    if (!process.env.AI_API_KEY) {
        res.status(503).json({ error: "AI answers are not configured yet. Add your provider API key to .env and restart the app." });
        return;
    }

    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 12 ||
        messages.some(message => !message || !["user", "assistant"].includes(message.role) ||
            !validString(message.content, 2000))) {
        res.status(400).json({ error: "Send up to 12 valid chat messages, each no longer than 2,000 characters." });
        return;
    }
    if (messages[messages.length - 1].role !== "user") {
        res.status(400).json({ error: "The latest chat message must be from the user." });
        return;
    }

    const now = Date.now();
    const priorRequests = aiRequestCounts.get(req.user.uid) || [];
    const recentRequests = priorRequests.filter(timestamp => now - timestamp < 60_000);
    if (aiRequestCounts.size > 1000) {
        for (const [uid, timestamps] of aiRequestCounts) {
            if (!timestamps.some(timestamp => now - timestamp < 60_000)) aiRequestCounts.delete(uid);
        }
    }
    if (recentRequests.length >= 20) {
        aiRequestCounts.set(req.user.uid, recentRequests);
        res.status(429).json({ error: "Chat request limit reached. Please wait a minute and try again." });
        return;
    }
    recentRequests.push(now);
    aiRequestCounts.set(req.user.uid, recentRequests);

    const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
        const providerResponse = await fetch(`${baseUrl}/responses`, {
            method: "POST",
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${process.env.AI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: process.env.AI_MODEL || "gpt-4.1-mini",
                instructions: [
                    "You are the NITI AI web assistant. Answer naturally and helpfully, using web search to answer current-information questions.",
                    "When you use web search, cite sources by including their URLs in your answer.",
                    "Be clear about uncertainty and never invent facts, sources, or capabilities.",
                    "For medical questions, provide general educational information only, do not diagnose or prescribe, and encourage discussing personal test results with a qualified clinician. For potentially urgent symptoms, recommend local emergency care."
                ].join(" "),
                tools: [{ type: "web_search" }],
                input: messages.map(message => ({
                    role: message.role,
                    content: message.content.trim()
                })),
                max_output_tokens: 1000
            })
        });

        if (!providerResponse.ok) {
            console.warn("AI provider request failed with HTTP status", providerResponse.status);
            res.status(502).json({ error: "The AI provider could not answer this message. Check the provider settings or try again shortly." });
            return;
        }

        const result = await providerResponse.json();
        const answer = typeof result.output_text === "string"
            ? result.output_text.trim()
            : (result.output || []).flatMap(item => item.content || [])
                .filter(content => content.type === "output_text" && typeof content.text === "string")
                .map(content => content.text)
                .join("\n")
                .trim();
        if (!answer) {
            console.warn("AI provider returned no text output.");
            res.status(502).json({ error: "The AI provider returned no answer. Please try again." });
            return;
        }

        const citations = (result.output || []).flatMap(item =>
            (item.content || []).flatMap(content =>
                (content.annotations || [])
                    .filter(annotation => annotation.type === "url_citation" && annotation.url)
                    .map(annotation => ({ title: annotation.title || annotation.url, url: annotation.url }))
            )
        ).filter((citation, index, all) =>
            all.findIndex(item => item.url === citation.url) === index
        );

        res.json({ answer, citations });
    } catch (error) {
        console.warn("AI provider request failed:", error.name);
        const timedOut = error.name === "AbortError";
        res.status(timedOut ? 504 : 502).json({
            error: timedOut ? "The AI search timed out. Please try again." : "Could not reach the AI provider. Check the server connection and try again."
        });
    } finally {
        clearTimeout(timeout);
    }
});

app.use("/api", (req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
});

app.use((error, req, res, next) => {
    console.error("Request failed:", error.name, error.code || "unknown error");
    if (res.headersSent) {
        next(error);
        return;
    }
    res.status(error.status || 500).json({
        error: error.status === 400 ? "Invalid JSON request body." : "The request could not be completed."
    });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get([...staticFiles.keys()], (req, res) => {
    res.sendFile(path.join(__dirname, staticFiles.get(req.path)));
});

app.use((req, res) => {
    res.status(404).send("Not found");
});

async function start() {
    await mongoClient.connect();
    database = mongoClient.db(process.env.MONGODB_DB);
    await database.collection("favorites").createIndex({ userId: 1, creatorName: 1 }, { unique: true });

    app.listen(port, "127.0.0.1", () => {
        console.log(`NITI AI is available at http://localhost:${port}`);
        console.log(`Connected to MongoDB database "${process.env.MONGODB_DB}".`);
    });
}

start().catch(async error => {
    console.error("Could not start NITI AI backend:", error);
    await mongoClient.close().catch(() => {});
    process.exitCode = 1;
});
