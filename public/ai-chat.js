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
// Add the reCAPTCHA Enterprise site key from Firebase App Check before enabling enforcement.
const appCheckSiteKey = "6LdvteMtAAAAAIkvbYMLIaXXpNCC4SXUDQM075XU";
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
    systemInstruction: `You are the helpful AI assistant for NITI AI, a marketplace that connects brands with AI creators. Answer in the same language as the user: use clear, friendly English for English questions, and natural Telugu for Telugu questions, including Telugu written in Latin letters. Support both English and Telugu. Explain how to discover creators, compare their listed skills, sign up or log in, post a project brief, and contact a creator. The listed creators are Arjun AI Studio (AI video, Reels, ads; Bangalore), Maya Creative (AI art, branding, design; Hyderabad), Pixel Gen AI (ads, social media, content; Chennai), and Vision AI Labs (AI ads, marketing, video; Mumbai). The site's demo match ratings are Arjun 96%, Maya 94%, Pixel Gen 92%, and Vision 90%; describe these as demo matches, not guaranteed results. Do not claim to have booked or contacted anyone, read private account information, or saved a brief. If asked something outside NITI AI, be helpful but concise, and say when you are unsure. Never ask the user to share passwords, API keys, or private information.`
});

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

function getInstantReply(question, language) {
    const query = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const telugu = language === "Telugu";
    if (/\b(hi|hello|hey|hii|namaste|namaskaram)\b/.test(query) || /హాయ్|హలో|నమస్కారం/.test(question.trim())) {
        return telugu ? "హాయ్! NITI AI creators లేదా project brief గురించి అడగండి. వెంటనే సహాయం చేస్తాను." : "Hi! Ask me about NITI AI creators or posting a project brief.";
    }
    if (/\b(brief|project|hire|post|budget)\b/.test(query) || /ప్రాజెక్ట్|బ్రీఫ్|బడ్జెట్/.test(question)) {
        return telugu
            ? "Project brief పెట్టడానికి “Post a Brief” ఎంచుకుని title, వివరాలు, project type, budget ఇవ్వండి. Save చేయడానికి sign in అవసరం."
            : "Choose “Post a Brief”, add a title, details, project type, and budget. Sign in is needed to save it.";
    }

    const catalog = [
        { name: "Arjun AI Studio", role: "AI Video Creator", city: "Bangalore", terms: ["video", "reels", "ads", "bangalore", "bengaluru"] },
        { name: "Maya Creative", role: "AI Image Creator", city: "Hyderabad", terms: ["image", "art", "branding", "design", "hyderabad"] },
        { name: "Pixel Gen AI", role: "AI Content Creator", city: "Chennai", terms: ["content", "ads", "social", "media", "chennai"] },
        { name: "Vision AI Labs", role: "AI Advertisement Creator", city: "Mumbai", terms: ["advertisement", "marketing", "video", "mumbai"] }
    ];
    const searchTerms = query.match(/[a-z0-9]+/g) || [];
    const topicTerms = searchTerms.filter(term => !["a", "an", "and", "are", "can", "creator", "creators", "find", "for", "i", "in", "me", "need", "please", "show", "the", "to", "who", "with", "ai", "want"].includes(term));
    const relevant = topicTerms.some(term => catalog.some(creator => creator.terms.includes(term)));
    if (relevant) {
        const matches = catalog.filter(creator => topicTerms.some(term => creator.terms.includes(term)));
        return matches.length
            ? (telugu ? "మీకు సరిపోయే creators:\n" : "Creators matching your search:\n") + matches.map(creator => `${creator.name} — ${creator.role}, ${creator.city}`).join("\n")
            : (telugu ? "Creator కనబడలేదు. Video, design, ads లేదా city పేరు ప్రయత్నించండి." : "No creator found. Try video, design, ads, or a city name.");
    }
    return null;
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
    const instantReply = getInstantReply(question, replyLanguage);
    const pending = addMessage(instantReply || (replyLanguage === "Telugu" ? "సమాధానం తయారు చేస్తున్నాను…" : "Thinking…"), "assistant", instantReply ? "" : "pending");
    if (instantReply) {
        sendButton.disabled = false;
        input.focus();
        return;
    }
    try {
        const prompt = `For this reply, answer only in ${replyLanguage}. Do not switch languages. User question: ${question}`;
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
