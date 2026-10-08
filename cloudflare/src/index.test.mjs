import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { webcrypto } from "node:crypto";
import worker from "./index.mjs";

const projectNumber = "620811813898";
const appId = "1:620811813898:web:2defe24fefa8796e97cbf3";
const keyId = "niti-ai-test-key";
const env = {
    FIREBASE_PROJECT_NUMBER: projectNumber,
    FIREBASE_APP_ID: appId,
    ALLOWED_ORIGINS: "https://niti-ai-2ba5d.web.app",
    AI_MODEL: "@cf/meta/llama-3.2-3b-instruct",
    IMAGE_MODEL: "@cf/black-forest-labs/flux-1-schnell",
    AI: {
        run: async model => model.includes("flux")
            ? { image: Buffer.from("mock jpeg bytes").toString("base64") }
            : { response: "Hello from the test model." }
    }
};
const originalFetch = globalThis.fetch;
let privateKey;
let publicJwk;

function encodeBase64Url(value) {
    return Buffer.from(value).toString("base64url");
}

async function makeToken(overrides = {}) {
    const header = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: keyId }));
    const claims = encodeBase64Url(JSON.stringify({
        iss: `https://firebaseappcheck.googleapis.com/${projectNumber}`,
        aud: [`projects/${projectNumber}`],
        sub: appId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        ...overrides
    }));
    const unsigned = `${header}.${claims}`;
    const signature = await webcrypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        privateKey,
        new TextEncoder().encode(unsigned)
    );
    return `${unsigned}.${Buffer.from(signature).toString("base64url")}`;
}

function makeRequest({ token, origin = "https://niti-ai-2ba5d.web.app", path = "/api/chat", body = { messages: [{ role: "user", content: "Hello" }] } } = {}) {
    return new Request(`https://niti-ai-chat.example.workers.dev${path}`, {
        method: "POST",
        headers: {
            Origin: origin,
            ...(token ? { "X-Firebase-AppCheck": token } : {}),
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
}

before(async () => {
    const keys = await webcrypto.subtle.generateKey(
        { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true,
        ["sign", "verify"]
    );
    privateKey = keys.privateKey;
    publicJwk = await webcrypto.subtle.exportKey("jwk", keys.publicKey);
    publicJwk.kid = keyId;
    globalThis.fetch = async () => new Response(JSON.stringify({ keys: [publicJwk] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
});

after(() => {
    globalThis.fetch = originalFetch;
});

test("valid App Check token returns the AI answer", async () => {
    const token = await makeToken();
    const response = await worker.fetch(makeRequest({ token }), env);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { answer: "Hello from the test model." });
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://niti-ai-2ba5d.web.app");
});

test("rejects missing or invalid App Check tokens", async () => {
    const missing = await worker.fetch(makeRequest(), env);
    assert.equal(missing.status, 401);
    assert.equal((await missing.json()).code, "app_check_rejected");

    const invalid = await worker.fetch(makeRequest({ token: `${await makeToken()}.invalid` }), env);
    assert.equal(invalid.status, 401);
});

test("rejects unapproved origins and malformed messages", async () => {
    const token = await makeToken();
    const rejectedOrigin = await worker.fetch(makeRequest({ token, origin: "https://attacker.example" }), env);
    assert.equal(rejectedOrigin.status, 403);

    const malformedMessages = await worker.fetch(makeRequest({
        token,
        body: { messages: [{ role: "assistant", content: "Not a user request" }] }
    }), env);
    assert.equal(malformedMessages.status, 400);
});

test("supports CORS preflight and rejects oversized requests", async () => {
    const preflight = await worker.fetch(new Request("https://niti-ai-chat.example.workers.dev/api/chat", {
        method: "OPTIONS",
        headers: { Origin: "https://niti-ai-2ba5d.web.app" }
    }), env);
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("Access-Control-Allow-Headers"), "Content-Type, X-Firebase-AppCheck");

    const token = await makeToken();
    const oversized = await worker.fetch(makeRequest({
        token,
        body: { messages: [{ role: "user", content: "x".repeat(33 * 1024) }] }
    }), env);
    assert.equal(oversized.status, 413);
});

test("generates an image with App Check and returns image bytes", async () => {
    const token = await makeToken();
    const response = await worker.fetch(makeRequest({
        token,
        path: "/api/image",
        body: { prompt: "A blue whale floating among stars, digital illustration" }
    }), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/jpeg");
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://niti-ai-2ba5d.web.app");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from("mock jpeg bytes"));
});

test("rejects empty, non-string, or oversized image prompts", async () => {
    const token = await makeToken();
    for (const prompt of [" ", 42, "x".repeat(2049)]) {
        const response = await worker.fetch(makeRequest({
            token,
            path: "/api/image",
            body: { prompt }
        }), env);
        assert.equal(response.status, 400);
        assert.equal((await response.json()).code, "invalid_image_prompt");
    }
});

test("requires App Check for image generation", async () => {
    const response = await worker.fetch(makeRequest({
        path: "/api/image",
        body: { prompt: "A bright abstract landscape" }
    }), env);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, "app_check_rejected");
});

test("returns a clear rate-limit response when Workers AI image quota is exhausted", async () => {
    const token = await makeToken();
    const limitedEnv = {
        ...env,
        AI: { run: async () => { throw new Error("Daily quota exceeded for Workers AI."); } }
    };
    const response = await worker.fetch(makeRequest({
        token,
        path: "/api/image",
        body: { prompt: "A bright abstract landscape" }
    }), limitedEnv);
    assert.equal(response.status, 429);
    assert.equal((await response.json()).code, "daily_quota_exceeded");
});
