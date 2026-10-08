require("dotenv").config();

const path = require("path");
const express = require("express");
const { MongoClient } = require("mongodb");
const { applicationDefault, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { isConfiguredAdmin } = require("./admin-access");

const adminDashboardOnly = process.env.ADMIN_DASHBOARD_ONLY === "true";
const requiredEnvironment = adminDashboardOnly
    ? ["GOOGLE_APPLICATION_CREDENTIALS", "ADMIN_UIDS"]
    : ["MONGODB_URI", "MONGODB_DB", "GOOGLE_APPLICATION_CREDENTIALS"];
const missingEnvironment = requiredEnvironment.filter(name => !process.env[name]);
if (missingEnvironment.length) {
    throw new Error(`Missing required environment variables: ${missingEnvironment.join(", ")}`);
}

initializeApp({
    credential: applicationDefault()
});

const mongoClient = adminDashboardOnly ? null : new MongoClient(process.env.MONGODB_URI);
const app = express();
const staticFiles = new Map([
    ["/script.js", "script.js"],
    ["/style.css", "style.css"],
    ["/admin.js", "admin.js"],
    ["/admin.css", "admin.css"],
    ["/firebase-config.js", "firebase-config.js"],
    ["/creator-data.js", "public/creator-data.js"],
    ["/data/creators.csv", "data/creators.csv"]
]);
const port = Number(process.env.PORT || 5500);
const allowedProjectTypes = new Set(["AI Video", "AI Image", "AI Ads", "Social Media"]);
function validDeadline(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime())
        && parsed.toISOString().slice(0, 10) === value
        && value >= new Date().toISOString().slice(0, 10);
}
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

function requireAdmin(req, res, next) {
    if (!isConfiguredAdmin(req.user.uid, process.env.ADMIN_UIDS)) {
        res.status(403).json({ error: "This Firebase account is not configured as an administrator." });
        return;
    }
    next();
}

function validString(value, maxLength) {
    return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

app.use("/api/admin", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

app.use("/api", (req, res, next) => {
    if (adminDashboardOnly && req.path !== "/admin/data") {
        res.status(404).json({ error: "Only the admin dashboard API is available in admin-only mode." });
        return;
    }
    next();
});

app.get("/api/admin/data", requireFirebaseUser, requireAdmin, async (req, res, next) => {
    const recordLimit = 200;
    const briefFields = [
        "title", "brand", "goal", "description", "type", "visualStyle",
        "visualReferences", "deliverables", "quantity", "format",
        "targetPlatform", "requiredTools", "preferredTools", "deadline",
        "budget", "commercialUseRequired", "usageDuration", "intendedChannels",
        "selectedCreatorName"
    ];
    const mongoBriefProjection = Object.fromEntries([
        "_id", "userId", "createdAt", ...briefFields
    ].map(field => [field, 1]));

    try {
        const [mongoData, firestoreContacts, firestoreBriefs] = await Promise.all([
            req.db
                ? Promise.all([
                    req.db.collection("contactRequests")
                        .find({}, { projection: { _id: 1, userId: 1, creatorName: 1, createdAt: 1 } })
                        .sort({ createdAt: -1 })
                        .limit(recordLimit)
                        .toArray(),
                    req.db.collection("briefs")
                        .find({}, { projection: mongoBriefProjection })
                        .sort({ createdAt: -1 })
                        .limit(recordLimit)
                        .toArray()
                ])
                : Promise.resolve([[], []]),
            getFirestore().collection("contactRequests")
                .orderBy("createdAt", "desc")
                .limit(recordLimit)
                .get(),
            getFirestore().collection("briefs")
                .orderBy("createdAt", "desc")
                .limit(recordLimit)
                .get()
        ]);
        const [mongoContacts, mongoBriefs] = mongoData;

        const contacts = [
            ...mongoContacts.map(record => ({
                id: String(record._id),
                source: "MongoDB",
                userId: record.userId,
                creatorName: record.creatorName,
                createdAt: record.createdAt
            })),
            ...firestoreContacts.docs.map(document => {
                const record = document.data();
                return {
                    id: document.id,
                    source: "Firestore",
                    userId: record.userId,
                    creatorName: record.creatorName,
                    createdAt: record.createdAt
                };
            })
        ];
        const briefs = [
            ...mongoBriefs.map(record => ({
                ...Object.fromEntries(briefFields.map(field => [field, record[field]])),
                id: String(record._id),
                source: "MongoDB",
                userId: record.userId,
                createdAt: record.createdAt
            })),
            ...firestoreBriefs.docs.map(document => {
                const record = document.data();
                return {
                    ...Object.fromEntries(briefFields.map(field => [field, record[field]])),
                    id: document.id,
                    source: "Firestore",
                    userId: record.userId,
                    createdAt: record.createdAt
                };
            })
        ];

        const userIds = [...new Set(
            [...contacts, ...briefs]
                .map(record => record.userId)
                .filter(userId => typeof userId === "string" && userId)
        )];
        const profiles = new Map();
        for (let index = 0; index < userIds.length; index += 100) {
            const result = await getAuth().getUsers(userIds.slice(index, index + 100).map(uid => ({ uid })));
            for (const user of result.users) {
                profiles.set(user.uid, {
                    email: user.email || "",
                    displayName: user.displayName || ""
                });
            }
        }

        const decorateRecords = records => records
            .map(record => {
                const profile = profiles.get(record.userId);
                const createdAt = record.createdAt && typeof record.createdAt.toDate === "function"
                    ? record.createdAt.toDate()
                    : record.createdAt;
                const date = createdAt ? new Date(createdAt) : null;
                return {
                    ...record,
                    userEmail: profile?.email || "",
                    userDisplayName: profile?.displayName || "",
                    createdAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null
                };
            })
            .sort((left, right) => (right.createdAt || "").localeCompare(left.createdAt || ""));

        res.json({
            contacts: decorateRecords(contacts),
            briefs: decorateRecords(briefs),
            limitPerCollectionPerStore: recordLimit,
            sources: req.db ? ["Firestore", "MongoDB"] : ["Firestore"]
        });
    } catch (error) {
        next(error);
    }
});

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
    const {
        title, brand, goal, description, type, visualStyle, visualReferences,
        deliverables, quantity, format, targetPlatform, requiredTools,
        preferredTools, deadline, budget, commercialUseRequired,
        usageDuration, intendedChannels, selectedCreatorName
    } = req.body || {};
    if (!validString(title, 200) || !validString(brand, 120) ||
        !validString(goal, 200) || !validString(description, 5000) ||
        !allowedProjectTypes.has(type) || !validString(visualStyle, 500) ||
        typeof visualReferences !== "string" || visualReferences.length > 2000 ||
        !validString(deliverables, 2000) || !Number.isInteger(quantity) ||
        quantity < 1 || quantity > 1000 || !validString(format, 80) ||
        !validString(targetPlatform, 120) ||
        typeof requiredTools !== "string" || requiredTools.length > 500 ||
        typeof preferredTools !== "string" || preferredTools.length > 500 ||
        !validDeadline(deadline) || !Number.isFinite(budget) || budget <= 0 ||
        typeof commercialUseRequired !== "boolean" ||
        !validString(usageDuration, 120) || !validString(intendedChannels, 500) ||
        (selectedCreatorName !== undefined && !validString(selectedCreatorName, 120))) {
        res.status(400).json({ error: "Complete the required brief fields with valid values and limits." });
        return;
    }

    try {
        const result = await req.db.collection("briefs").insertOne({
            title: title.trim(),
            brand: brand.trim(),
            goal: goal.trim(),
            description: description.trim(),
            type,
            visualStyle: visualStyle.trim(),
            visualReferences: visualReferences.trim(),
            deliverables: deliverables.trim(),
            quantity,
            format: format.trim(),
            targetPlatform: targetPlatform.trim(),
            requiredTools: requiredTools.trim(),
            preferredTools: preferredTools.trim(),
            deadline,
            budget,
            commercialUseRequired,
            usageDuration: usageDuration.trim(),
            intendedChannels: intendedChannels.trim(),
            ...(selectedCreatorName ? { selectedCreatorName: selectedCreatorName.trim() } : {}),
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
    if (adminDashboardOnly) {
        res.redirect(302, "/admin");
        return;
    }
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/admin", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.sendFile(path.join(__dirname, "admin.html"));
});

app.get([...staticFiles.keys()], (req, res) => {
    res.sendFile(path.join(__dirname, staticFiles.get(req.path)));
});

app.use((req, res) => {
    res.status(404).send("Not found");
});

async function start() {
    if (mongoClient) {
        await mongoClient.connect();
        database = mongoClient.db(process.env.MONGODB_DB);
        await database.collection("favorites").createIndex({ userId: 1, creatorName: 1 }, { unique: true });
    }

    app.listen(port, "127.0.0.1", () => {
        if (adminDashboardOnly) {
            console.log(`NITI AI admin dashboard is available at http://localhost:${port}/admin`);
            console.log("Admin-only mode reads Firestore and disables the MongoDB-backed app APIs.");
            return;
        }
        console.log(`NITI AI is available at http://localhost:${port}`);
        console.log(`Connected to MongoDB database "${process.env.MONGODB_DB}".`);
    });
}

start().catch(async error => {
    console.error("Could not start NITI AI backend:", error);
    if (mongoClient) await mongoClient.close().catch(() => {});
    process.exitCode = 1;
});
