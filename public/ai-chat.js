import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAI, getGenerativeModel, GoogleAIBackend, ThinkingLevel } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-ai.js";
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
const appCheckSiteKey = "6LdvteMtAAAAAIkvbYMLIaXXpNCC4SXUDQM075XU";
const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
if (isLocalhost) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}
if (appCheckSiteKey) {
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
}
const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, {
    model: "gemini-3.8-flash",
    generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 350,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    },
    systemInstruction: `You are the helpful NITI AI assistant. Answer in the same language as the user, including natural Telugu when appropriate. Help with creator discovery, project briefs, and writing creative prompts. Do not invent creator profiles, prices, reviews, verification, or match scores; this chat does not receive the live creator catalog, so direct users to the creator filters for current profile details. This chat returns text only and cannot generate or display images or videos. For image or video requests, clearly label any text prompt as "Prompt draft - not generated media"; use editable placeholders or ask a short clarifying question for missing details. Never say media was generated. Do not claim to have booked or contacted anyone, read private account information, or saved a brief. If unsure, say so. Never ask the user to share passwords, API keys, or private information.`
});

const panel = document.getElementById("nitiChat");
const launcher = document.getElementById("nitiChatLauncher");
const closeButton = document.getElementById("nitiChatClose");
const form = document.getElementById("nitiChatForm");
const input = document.getElementById("nitiChatInput");
const sendButton = document.getElementById("nitiChatSend");
const messages = document.getElementById("nitiChatMessages");
const suggestions = document.getElementById("nitiChatSuggestions");
const suggestionsToggle = document.getElementById("nitiChatSuggestionsToggle");
const suggestionMenu = document.getElementById("nitiChatSuggestionMenu");

suggestions.querySelectorAll("[data-question]").forEach(button => {
    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.role = "menuitem";
    menuButton.dataset.question = button.dataset.question;
    menuButton.textContent = button.textContent;
    suggestionMenu.appendChild(menuButton);
});

function openChat() {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    input.focus();
}
function closeChat() {
    closeSuggestionMenu();
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
}
function closeSuggestionMenu() {
    suggestionMenu.hidden = true;
    suggestionsToggle.setAttribute("aria-expanded", "false");
}
function selectSuggestion(event) {
    const button = event.target.closest("[data-question]");
    if (!button) return;
    input.value = button.dataset.question;
    closeSuggestionMenu();
    input.focus();
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

async function getInstantReply(question, language) {
    const query = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const telugu = language === "Telugu";
    if (/\b(hi|hello|hey|hii|namaste|namaskaram)\b/.test(query) || /హాయ్|హలో|నమస్కారం/.test(question.trim())) {
        return telugu ? "హాయ్! NITI AI creators లేదా project brief గురించి అడగండి. వెంటనే సహాయం చేస్తాను." : "Hi! Ask me about NITI AI creators or posting a project brief.";
    }
    if (/\b(how|where|steps?|instructions?)\b/.test(query) && /\b(brief|project|post|save)\b/.test(query) || /ఎలా.*(?:ప్రాజెక్ట్|బ్రీఫ్)/.test(question)) {
        return telugu
            ? "Project brief పెట్టడానికి “Post a Brief” ఎంచుకుని title, వివరాలు, project type, budget ఇవ్వండి. Save చేయడానికి sign in అవసరం."
            : "Choose “Post a Brief”, add a title, details, project type, and budget. Sign in is needed to save it.";
    }

    const searchTerms = query.match(/[a-z0-9]+/g) || [];
    const topicTerms = searchTerms.filter(term => !["a", "an", "and", "are", "ask", "can", "content", "creator", "creators", "find", "for", "help", "i", "in", "me", "need", "please", "show", "skills", "the", "to", "tools", "type", "want", "what", "who", "with", "ai"].includes(term));
    const isCreatorSearch = /\b(creator|creators|find|recommend|hire)\b/.test(query);
    if (isCreatorSearch && topicTerms.length) {
        const catalog = await window.loadNitiCreatorDataset();
        const matches = catalog.filter(creator => {
            const searchable = [
                creator.name, creator.role, creator.category, creator.location,
                ...creator.skills, ...creator.specializations, ...creator.tools
            ].join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return topicTerms.some(term => searchable.includes(term));
        });
        if (!matches.length) {
            return telugu
                ? "ఈ వివరాలతో creator కనబడలేదు. Skills, tools, specialization లేదా content type మార్చి ప్రయత్నించండి."
                : "I couldn't find a creator with those details. Try a skill, tool, specialization, or content type.";
        }
        return (telugu ? "మీకు సరిపోయే creators:\n" : "Creators matching those profile details:\n") + matches.slice(0, 5).map(creator => {
            const detail = [creator.role, creator.location].filter(Boolean).join(", ") || (telugu ? "వివరాలు ఇవ్వలేదు" : "profile details not provided");
            return `${creator.name} — ${detail}`;
        }).join("\n");
    }
    return null;
}

launcher.addEventListener("click", () => panel.classList.contains("open") ? closeChat() : openChat());
closeButton.addEventListener("click", closeChat);
suggestions.addEventListener("click", selectSuggestion);
suggestionMenu.addEventListener("click", selectSuggestion);
suggestionsToggle.addEventListener("click", () => {
    const shouldOpen = suggestionMenu.hidden;
    suggestionMenu.hidden = !shouldOpen;
    suggestionsToggle.setAttribute("aria-expanded", String(shouldOpen));
    if (shouldOpen) suggestionMenu.querySelector("button")?.focus();
});
document.addEventListener("click", event => {
    if (!suggestionMenu.hidden && !suggestionMenu.contains(event.target) && !suggestionsToggle.contains(event.target)) {
        closeSuggestionMenu();
    }
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
        const instantReply = await getInstantReply(question, replyLanguage);
        if (instantReply) {
            pending.textContent = instantReply;
            pending.classList.remove("pending");
            return;
        }
        const needsPromptDraft = /\b(image|picture|illustration|video|film|reel|clip)\b/i.test(question) &&
            /\b(create|generate|make|draft|write|prompt|concept)\b/i.test(question);
        const mediaInstruction = needsPromptDraft
            ? `The user is asking about image/video creation. You can only return text, not media. Start with "Prompt draft — not generated media". If the user has not provided enough details, write a concise editable prompt template with clear placeholders and ask what to fill in. Never say you generated an image or video.`
            : `You can only return text, not generated images or videos. If asked to create media, offer a clearly labeled prompt draft and never say you generated it.`;
        const prompt = `For this reply, answer only in ${replyLanguage}. Do not switch languages. ${mediaInstruction} User question: ${question}`;
        const result = await model.generateContentStream(prompt);
        let answer = "";
        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (!text) continue;
            answer += text;
            pending.textContent = answer;
            pending.classList.remove("pending");
            messages.scrollTop = messages.scrollHeight;
        }
        if (!answer) {
            const response = await result.response;
            answer = response.text();
        }
        pending.textContent = answer || (replyLanguage === "Telugu" ? "క్షమించండి, ఇప్పుడే సమాధానం రాలేదు. మళ్లీ ప్రయత్నించండి." : "Sorry, I couldn't generate an answer just now. Please try again.");
        pending.classList.remove("pending");
    } catch (error) {
        console.error("NITI AI chat error:", error);
        const code = String(error?.code || error?.status || error?.name || "unknown");
        const errorMessage = String(error?.message || "");
        const detail = errorMessage.replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]").replace(/\s+/g, " ").slice(0, 280);
        const reason = detail ? `${code}: ${detail}` : code;
        const appCheckRejected = /app.?check.*(?:token.*invalid|invalid.*token)|token is invalid/i.test(errorMessage);
        if (appCheckRejected) {
            pending.textContent = replyLanguage === "Telugu"
                ? "Firebase App Check ఈ అభ్యర్థనను తిరస్కరించింది. Localhostలో browser consoleలో కనిపించే debug token‌ను Firebase Console → Security → App Check → Appsలో ఈ web appకు register చేసి మళ్లీ ప్రయత్నించండి. Live siteలో App Check provider, site key, domain సరిగ్గా సరిపోతున్నాయో చూడండి."
                : "Firebase App Check rejected this request. On localhost, register the debug token shown in the browser console under Firebase Console → Security → App Check → Apps for this web app, then retry. On the live site, verify the App Check provider, site key, and allowed domain.";
        } else {
            pending.textContent = replyLanguage === "Telugu"
                ? `AI అభ్యర్థన విఫలమైంది. కారణం: ${reason}`
                : `The AI request failed. Details: ${reason}`;
        }
        pending.classList.remove("pending");
    } finally {
        sendButton.disabled = false;
        input.focus();
        messages.scrollTop = messages.scrollHeight;
    }
});
document.addEventListener("keydown", event => {
    if (event.key !== "Escape" && event.key !== "Esc") return;
    if (!suggestionMenu.hidden) {
        event.preventDefault();
        closeSuggestionMenu();
        suggestionsToggle.focus();
    } else if (panel.classList.contains("open")) {
        closeChat();
    }
}, true);
