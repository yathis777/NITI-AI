const APP_CHECK_JWKS_URL = "https://firebaseappcheck.googleapis.com/v1/jwks";
const APP_CHECK_JWKS_CACHE_MS = 6 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 32 * 1024;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_IMAGE_PROMPT_LENGTH = 2048;
const MAX_JOIN_PASSWORD_LENGTH = 128;
const JOIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_JOIN_ATTEMPTS = 5;
const SYSTEM_INSTRUCTION = [
    "You are the helpful NITI AI assistant. Answer naturally and in the same language as the user, including Telugu written in Latin letters.",
    "Help with creator discovery, project briefs, and writing creative prompts.",
    "Do not invent creator profiles, prices, reviews, verification, or match scores. This chat does not receive the live creator catalog; direct users to the creator filters for current profile details.",
    "This chat returns text only and cannot generate images or videos. For media requests, clearly label text as 'Prompt draft - not generated media'; use editable placeholders or ask a short clarifying question when details are missing. Never say media was generated.",
    "Do not claim to have booked or contacted anyone, read private account information, or saved a brief. If unsure, say so.",
    "Never ask the user to share passwords, API keys, or private information."
].join(" ");

let cachedJwks;
let cachedJwksUntil = 0;
const joinAttempts = new Map();

function jsonResponse(data, status, corsHeaders) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
        }
    });
}

function allowedOrigin(origin, configuredOrigins) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
    return configuredOrigins.split(",").map(value => value.trim()).filter(Boolean).includes(origin);
}

function decodeBase64Url(value) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

function decodeJwtJson(value) {
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

async function fetchJwks(forceRefresh = false) {
    if (!forceRefresh && cachedJwks && Date.now() < cachedJwksUntil) return cachedJwks;
    const response = await fetch(APP_CHECK_JWKS_URL, { cf: { cacheTtl: 21600, cacheEverything: true } });
    if (!response.ok) throw new Error(`Firebase App Check keys returned HTTP ${response.status}.`);
    const result = await response.json();
    if (!Array.isArray(result.keys)) throw new Error("Firebase App Check keys response was invalid.");
    cachedJwks = result.keys;
    cachedJwksUntil = Date.now() + APP_CHECK_JWKS_CACHE_MS;
    return cachedJwks;
}

async function verifyAppCheckToken(token, env) {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    let header;
    let claims;
    try {
        header = decodeJwtJson(parts[0]);
        claims = decodeJwtJson(parts[1]);
    } catch {
        return false;
    }

    if (header.alg !== "RS256" || header.typ !== "JWT" || typeof header.kid !== "string") return false;
    const projectNumber = env.FIREBASE_PROJECT_NUMBER;
    const audience = claims.aud;
    const hasAudience = Array.isArray(audience)
        ? audience.includes(`projects/${projectNumber}`)
        : audience === `projects/${projectNumber}`;
    if (claims.iss !== `https://firebaseappcheck.googleapis.com/${projectNumber}` ||
        !hasAudience ||
        claims.sub !== env.FIREBASE_APP_ID ||
        !Number.isFinite(claims.exp) ||
        claims.exp <= Math.floor(Date.now() / 1000)) {
        return false;
    }

    let keys = await fetchJwks();
    let jwk = keys.find(key => key.kid === header.kid);
    if (!jwk) {
        keys = await fetchJwks(true);
        jwk = keys.find(key => key.kid === header.kid);
    }
    if (!jwk) return false;

    try {
        const publicKey = await crypto.subtle.importKey(
            "jwk",
            jwk,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            false,
            ["verify"]
        );
        return await crypto.subtle.verify(
            "RSASSA-PKCS1-v1_5",
            publicKey,
            decodeBase64Url(parts[2]),
            new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
        );
    } catch {
        return false;
    }
}

function validateMessages(messages) {
    return Array.isArray(messages) &&
        messages.length > 0 &&
        messages.length <= MAX_MESSAGES &&
        messages.every(message =>
            message &&
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string" &&
            message.content.trim().length > 0 &&
            message.content.trim().length <= MAX_MESSAGE_LENGTH
        ) &&
        messages[messages.length - 1].role === "user";
}

function isJoinRateLimited(ip, now = Date.now()) {
    if (joinAttempts.size > 5000) {
        for (const [key, attempts] of joinAttempts) {
            if (!attempts.some(timestamp => now - timestamp < JOIN_ATTEMPT_WINDOW_MS)) {
                joinAttempts.delete(key);
            }
        }
    }

    const key = ip || "unknown";
    const recentAttempts = (joinAttempts.get(key) || [])
        .filter(timestamp => now - timestamp < JOIN_ATTEMPT_WINDOW_MS);
    if (recentAttempts.length >= MAX_JOIN_ATTEMPTS) {
        joinAttempts.set(key, recentAttempts);
        return true;
    }
    recentAttempts.push(now);
    joinAttempts.set(key, recentAttempts);
    return false;
}

async function passwordsMatch(candidate, expected) {
    const encoder = new TextEncoder();
    const [candidateHash, expectedHash] = await Promise.all([
        crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
        crypto.subtle.digest("SHA-256", encoder.encode(expected))
    ]);
    const candidateBytes = new Uint8Array(candidateHash);
    const expectedBytes = new Uint8Array(expectedHash);
    let difference = 0;
    for (let index = 0; index < candidateBytes.length; index += 1) {
        difference |= candidateBytes[index] ^ expectedBytes[index];
    }
    return difference === 0;
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get("Origin") || "";
        const isAllowedOrigin = allowedOrigin(origin, env.ALLOWED_ORIGINS || "");
        const path = new URL(request.url).pathname;
        const corsHeaders = {
            "Vary": "Origin",
            ...(isAllowedOrigin ? {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, X-Firebase-AppCheck",
                "Access-Control-Max-Age": "86400"
            } : {})
        };

        if (!isAllowedOrigin) return jsonResponse({ error: "This website is not allowed to use the AI service." }, 403, corsHeaders);
        if (!["/api/chat", "/api/image", "/api/join/verify"].includes(path)) {
            return jsonResponse({ error: "Not found." }, 404, corsHeaders);
        }
        if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
        if (request.method !== "POST") return jsonResponse({ error: "Use POST to send this request." }, 405, corsHeaders);

        const token = request.headers.get("X-Firebase-AppCheck");
        if (!token) return jsonResponse({ error: "A valid Firebase App Check token is required.", code: "app_check_rejected" }, 401, corsHeaders);

        try {
            if (!await verifyAppCheckToken(token, env)) {
                return jsonResponse({ error: "A valid Firebase App Check token is required.", code: "app_check_rejected" }, 401, corsHeaders);
            }
        } catch (error) {
            console.error("Firebase App Check verification is unavailable:", error instanceof Error ? error.message : String(error));
            return jsonResponse({ error: "App Check verification is temporarily unavailable. Please try again shortly.", code: "app_check_unavailable" }, 503, corsHeaders);
        }

        if (path === "/api/join/verify") {
            if (!env.JOIN_PASSWORD) {
                return jsonResponse({
                    error: "Join verification is not configured yet. Please try again later.",
                    code: "join_verification_unavailable"
                }, 503, corsHeaders);
            }
            if (isJoinRateLimited(request.headers.get("CF-Connecting-IP"))) {
                return jsonResponse({
                    error: "Too many attempts. Please wait 15 minutes before trying again.",
                    code: "join_rate_limited"
                }, 429, corsHeaders);
            }
        }

        let body;
        try {
            const requestBody = await request.text();
            if (new TextEncoder().encode(requestBody).byteLength > MAX_BODY_BYTES) {
                return jsonResponse({ error: "The chat request is too large." }, 413, corsHeaders);
            }
            body = JSON.parse(requestBody);
        } catch {
            return jsonResponse({ error: "Send a valid JSON request." }, 400, corsHeaders);
        }

        if (path === "/api/join/verify") {
            if (typeof body?.password !== "string" ||
                !body.password.trim() ||
                body.password.length > MAX_JOIN_PASSWORD_LENGTH) {
                return jsonResponse({
                    error: `Enter an invite password no longer than ${MAX_JOIN_PASSWORD_LENGTH} characters.`,
                    code: "invalid_join_password"
                }, 400, corsHeaders);
            }
            if (!await passwordsMatch(body.password, env.JOIN_PASSWORD)) {
                return jsonResponse({
                    error: "That invite password is not correct. Please try again.",
                    code: "join_password_rejected"
                }, 401, corsHeaders);
            }
            return jsonResponse({ verified: true }, 200, corsHeaders);
        }

        if (path === "/api/image") {
            if (typeof body?.prompt !== "string" ||
                !body.prompt.trim() ||
                body.prompt.trim().length > MAX_IMAGE_PROMPT_LENGTH) {
                return jsonResponse({
                    error: `Enter an image prompt between 1 and ${MAX_IMAGE_PROMPT_LENGTH} characters.`,
                    code: "invalid_image_prompt"
                }, 400, corsHeaders);
            }

            try {
                const result = await env.AI.run(env.IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell", {
                    prompt: body.prompt.trim(),
                    steps: 4
                });
                if (typeof result?.image !== "string" || !result.image) {
                    console.error("Workers AI image model returned no image data.");
                    return jsonResponse({ error: "The image service returned no image. Please try again." }, 502, corsHeaders);
                }
                const binary = atob(result.image);
                const imageBytes = Uint8Array.from(binary, character => character.charCodeAt(0));
                return new Response(imageBytes, {
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "image/jpeg",
                        "Cache-Control": "no-store",
                        "X-Content-Type-Options": "nosniff"
                    }
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error("Workers AI image request failed:", message);
                if (/quota|daily.*limit|resource exhausted|neurons/i.test(message)) {
                    return jsonResponse({
                        error: "The free AI daily limit has been reached. Please try again after it resets.",
                        code: "daily_quota_exceeded"
                    }, 429, corsHeaders);
                }
                return jsonResponse({ error: "The image service could not create this image. Please try again shortly." }, 502, corsHeaders);
            }
        }

        if (!validateMessages(body?.messages)) {
            return jsonResponse({ error: "Send up to 12 valid chat messages, each no longer than 2,000 characters, ending with a user message." }, 400, corsHeaders);
        }

        try {
            const result = await env.AI.run(env.AI_MODEL || "@cf/meta/llama-3.2-3b-instruct", {
                messages: [
                    { role: "system", content: SYSTEM_INSTRUCTION },
                    ...body.messages.map(message => ({ role: message.role, content: message.content.trim() }))
                ],
                temperature: 0.35,
                max_tokens: 350
            });
            const answer = typeof result?.response === "string" ? result.response.trim() : "";
            if (!answer) {
                console.error("Workers AI returned no text output.");
                return jsonResponse({ error: "The AI service returned no answer. Please try again." }, 502, corsHeaders);
            }
            return jsonResponse({ answer }, 200, corsHeaders);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Workers AI request failed:", message);
            if (/quota|daily.*limit|resource exhausted|neurons/i.test(message)) {
                return jsonResponse({
                    error: "The free AI daily limit has been reached. Please try again after it resets.",
                    code: "daily_quota_exceeded"
                }, 429, corsHeaders);
            }
            return jsonResponse({ error: "The AI service could not answer this message. Please try again shortly." }, 502, corsHeaders);
        }
    }
};
