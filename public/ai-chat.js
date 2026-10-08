import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-ai.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js";

const firebaseConfig = {
    apiKey: "AIzaSyDg3bgUlfIzxBPCjUM5PVTkaO-jaXmUhDI",
    authDomain: "niti-ai-2ba5d.firebaseapp.com",
    projectId: "niti-ai-2ba5d",
    storageBucket: "niti-ai-2ba5d.firebasestorage.app",
    messagingSenderId: "620811813898",
    appId: "1:620811813898:web:2defe24fefa8796e97cbf3"
};

const app = initializeApp(firebaseConfig, "niti-ai-assistant");
// Add the reCAPTCHA Enterprise site key from Firebase App Check before enabling enforcement.
const appCheckSiteKey = "6LdvteMtAAAAAIkvbYMLIaXXpNCC4SXUDQM075XU";
if (appCheckSiteKey) {
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
}
const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, {
    model: "gemini-3.8-flash",
    systemInstruction: `You are the helpful AI assistant for NITI AI, a marketplace that connects brands with AI creators. Answer in the same language as the user: use clear, friendly English for English questions, and natural Telugu for Telugu questions, including Telugu written in Latin letters. Support both English and Telugu. Explain how to discover creators, compare their listed skills, sign up or log in, post a project brief, and contact a creator. The listed creators are Arjun AI Studio (AI video, Reels, ads; Bangalore), Maya Creative (AI art, branding, design; Hyderabad), Pixel Gen AI (ads, social media, content; Chennai), and Vision AI Labs (AI ads, marketing, video; Mumbai). The site's demo match ratings are Arjun 96%, Maya 94%, Pixel Gen 92%, and Vision 90%; describe these as demo matches, not guaranteed results. Do not claim to have booked or contacted anyone, read private account information, or saved a brief. If asked something outside NITI AI, be helpful but concise, and say when you are unsure. Never ask the user to share passwords, API keys, or private information.`
});
const chat = model.startChat({ generationConfig: { temperature: 0.55, maxOutputTokens: 700 } });

const panel = document.getElementById("nitiChat");
const launcher = document.getElementById("nitiChatLauncher");
const closeButton = document.getElementById("nitiChatClose");
const form = document.getElementById("nitiChatForm");
const input = document.getElementById("nitiChatInput");
const sendButton = document.getElementById("nitiChatSend");
const messages = document.getElementById("nitiChatMessages");
const suggestions = document.getElementById("nitiChatSuggestions");

function openChat() {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    input.focus();
}
function closeChat() {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
}
function addMessage(text, role, extraClass = "") {
    const message = document.createElement("div");
    message.className = `niti-chat-message ${role}${extraClass ? ` ${extraClass}` : ""}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
}

function getReplyLanguage(text) {
    if (/[\u0C00-\u0C7F]/.test(text)) return "Telugu";
    if (/\b(nenu|naaku|naku|ela|enti|emiti|cheppu|cheppandi|unnava|unnaru|meeru|mee|enduku|avuthundi|kavali|kaavali|undi|ledu|chesi|cheyyali|telugu|matladu|matladali|ravali|rava|vasthundi|vastundi|undhi|kavala|sare)\b/i.test(text)) return "Telugu";
    return "English";
}

launcher.addEventListener("click", () => panel.classList.contains("open") ? closeChat() : openChat());
closeButton.addEventListener("click", closeChat);
suggestions.addEventListener("click", event => {
    const button = event.target.closest("[data-question]");
    if (!button) return;
    input.value = button.dataset.question;
    form.requestSubmit();
});
form.addEventListener("submit", async event => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || sendButton.disabled) return;
    addMessage(question, "user");
    input.value = "";
    sendButton.disabled = true;
    const replyLanguage = getReplyLanguage(question);
    const pending = addMessage(replyLanguage === "Telugu" ? "సమాధానం తయారు చేస్తున్నాను…" : "Thinking…", "assistant", "pending");
    try {
        const prompt = `For this reply, answer only in ${replyLanguage}. Do not switch languages. User question: ${question}`;
        const result = await chat.sendMessage(prompt);
        const answer = result.response.text();
        pending.textContent = answer || (replyLanguage === "Telugu" ? "క్షమించండి, ఇప్పుడే సమాధానం రాలేదు. మళ్లీ ప్రయత్నించండి." : "Sorry, I couldn't generate an answer just now. Please try again.");
        pending.classList.remove("pending");
    } catch (error) {
        console.error("NITI AI chat error:", error);
        const code = String(error?.code || error?.status || error?.name || "unknown");
        const detail = String(error?.message || "").replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]").replace(/\s+/g, " ").slice(0, 280);
        const reason = detail ? `${code}: ${detail}` : code;
        pending.textContent = replyLanguage === "Telugu"
            ? `AI అభ్యర్థన విఫలమైంది. కారణం: ${reason}`
            : `The AI request failed. Details: ${reason}`;
        pending.classList.remove("pending");
    } finally {
        sendButton.disabled = false;
        input.focus();
        messages.scrollTop = messages.scrollHeight;
    }
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && panel.classList.contains("open")) closeChat();
});
