import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js";

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
const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true
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
const chatTab = document.getElementById("nitiChatTab");
const imageTab = document.getElementById("nitiImageTab");
const chatView = document.getElementById("nitiChatView");
const imageView = document.getElementById("nitiImageView");
const imageForm = document.getElementById("nitiImageForm");
const imagePrompt = document.getElementById("nitiImagePrompt");
const imageStyle = document.getElementById("nitiImageStyle");
const imageRatio = document.getElementById("nitiImageRatio");
const imageGenerate = document.getElementById("nitiImageGenerate");
const imageStatus = document.getElementById("nitiImageStatus");
const imageResult = document.getElementById("nitiImageResult");
const imagePromptCount = document.getElementById("nitiImagePromptCount");

suggestions.querySelectorAll("[data-question]").forEach(button => {
    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.role = "menuitem";
    menuButton.dataset.question = button.dataset.question;
    menuButton.textContent = button.textContent;
    suggestionMenu.appendChild(menuButton);
});
suggestions.querySelectorAll("[data-action]").forEach(button => {
    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.role = "menuitem";
    menuButton.dataset.action = button.dataset.action;
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
    const button = event.target.closest("[data-question], [data-action]");
    if (!button) return;
    if (button.dataset.action === "image") {
        setChatMode("image");
        closeSuggestionMenu();
        imagePrompt.focus();
        return;
    }
    input.value = button.dataset.question;
    closeSuggestionMenu();
    input.focus();
}

function setChatMode(mode) {
    const showImage = mode === "image";
    chatView.hidden = showImage;
    imageView.hidden = !showImage;
    chatTab.classList.toggle("active", !showImage);
    imageTab.classList.toggle("active", showImage);
    chatTab.setAttribute("aria-selected", String(!showImage));
    imageTab.setAttribute("aria-selected", String(showImage));
    if (showImage) imagePrompt.focus();
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

async function getAiAnswer(prompt) {
    const workerUrl = getWorkerUrl();
    const { token } = await getToken(appCheck, false);
    const response = await fetch(`${workerUrl}/api/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Firebase-AppCheck": token
        },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
    });
    const result = await response.json();
    if (!response.ok) {
        const error = new Error(result.error || `AI request failed with HTTP ${response.status}.`);
        error.code = result.code || "ai_request_failed";
        throw error;
    }
    if (typeof result.answer !== "string" || !result.answer.trim()) {
        throw new Error("The AI backend returned an empty answer.");
    }
    return result.answer.trim();
}

function getWorkerUrl() {
    const workerUrl = window.NITI_AI_CHAT_WORKER_URL;
    if (typeof workerUrl !== "string" || !/^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)?\.workers\.dev$/i.test(workerUrl)) {
        throw new Error("The free AI backend is not deployed or its Worker URL is not configured yet.");
    }
    return workerUrl;
}

function addGeneratedImage(blob, prompt) {
    const previousImage = imageResult.querySelector("img");
    if (previousImage?.src.startsWith("blob:")) URL.revokeObjectURL(previousImage.src);
    const message = document.createElement("div");
    message.className = "niti-image-output";
    const image = document.createElement("img");
    image.src = URL.createObjectURL(blob);
    image.alt = `AI-generated image: ${prompt.slice(0, 180)}`;
    const footer = document.createElement("div");
    footer.className = "niti-image-output-footer";
    const label = document.createElement("span");
    label.textContent = "Your generated image";
    const download = document.createElement("a");
    download.href = image.src;
    download.download = "niti-ai-generated-image.jpg";
    download.textContent = "Download image";
    footer.append(label, download);
    message.append(image, footer);
    imageResult.replaceChildren(message);
    imageResult.hidden = false;
}

launcher.addEventListener("click", () => panel.classList.contains("open") ? closeChat() : openChat());
closeButton.addEventListener("click", closeChat);
chatTab.addEventListener("click", () => setChatMode("chat"));
imageTab.addEventListener("click", () => setChatMode("image"));
imagePrompt.addEventListener("input", () => {
    imagePromptCount.textContent = String(imagePrompt.value.length);
});
imageForm.addEventListener("submit", async event => {
    event.preventDefault();
    const description = imagePrompt.value.trim();
    if (!description || imageGenerate.disabled) return;
    const prompt = [
        description,
        `Visual style: ${imageStyle.value}.`,
        `Composition: ${imageRatio.value}.`,
        "Create a clean, high-quality image. Do not include words or lettering unless requested."
    ].join("\n");
    if (prompt.length > 2048) {
        imageStatus.textContent = "Shorten the description a little so it fits the selected style and composition.";
        imageStatus.dataset.kind = "error";
        return;
    }
    imageGenerate.disabled = true;
    imageResult.hidden = true;
    imageStatus.textContent = "Creating your image… this may take a little while.";
    imageStatus.dataset.kind = "info";
    try {
        const { token } = await getToken(appCheck, false);
        const response = await fetch(`${getWorkerUrl()}/api/image`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Firebase-AppCheck": token
            },
            body: JSON.stringify({ prompt })
        });
        if (!response.ok) {
            const result = await response.json();
            const error = new Error(result.error || `Image generation failed with HTTP ${response.status}.`);
            error.code = result.code || "image_generation_failed";
            throw error;
        }
        if (!response.headers.get("Content-Type")?.startsWith("image/")) {
            throw new Error("The image service returned an unsupported response.");
        }
        const blob = await response.blob();
        if (!blob.size) throw new Error("The image service returned an empty image.");
        addGeneratedImage(blob, description);
        imageStatus.textContent = "Your image is ready.";
        imageStatus.dataset.kind = "success";
    } catch (error) {
        console.error("NITI AI image generation error:", error);
        imageStatus.textContent = error.code === "daily_quota_exceeded"
            ? "The free AI daily limit has been reached. Please try again after it resets."
            : error.code === "app_check_rejected"
                ? "Firebase App Check rejected this request. Refresh the page and try again."
                : String(error.message || "Image generation failed. Please try again.");
        imageStatus.dataset.kind = "error";
    } finally {
        imageGenerate.disabled = false;
    }
});
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
        const answer = await getAiAnswer(prompt);
        pending.textContent = answer || (replyLanguage === "Telugu" ? "క్షమించండి, ఇప్పుడే సమాధానం రాలేదు. మళ్లీ ప్రయత్నించండి." : "Sorry, I couldn't generate an answer just now. Please try again.");
        pending.classList.remove("pending");
    } catch (error) {
        console.error("NITI AI chat error:", error);
        const code = String(error?.code || error?.status || error?.name || "unknown");
        if (code === "daily_quota_exceeded") {
            pending.textContent = replyLanguage === "Telugu"
                ? "ఈరోజు ఉచిత AI వినియోగ పరిమితి ముగిసింది. పరిమితి మళ్లీ ప్రారంభమైన తర్వాత ప్రయత్నించండి."
                : "The free AI daily limit has been reached. Please try again after it resets.";
        } else if (code === "app_check_rejected") {
            pending.textContent = replyLanguage === "Telugu"
                ? "Firebase App Check ఈ అభ్యర్థనను తిరస్కరించింది. Localhost debug token లేదా live site App Check సెట్టింగ్‌లను తనిఖీ చేయండి."
                : "Firebase App Check rejected this request. Check the localhost debug token or the live site's App Check settings.";
        } else {
            const detail = String(error?.message || code).replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]").replace(/\s+/g, " ").slice(0, 280);
            pending.textContent = replyLanguage === "Telugu"
                ? `AI అభ్యర్థన విఫలమైంది. కారణం: ${detail}`
                : `The AI request failed. Details: ${detail}`;
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
