/* =========================
   NITI AI JAVASCRIPT
========================= */


/* =========================
   CREATOR DATA
========================= */

const creators = [

    {
        name: "Arjun AI Studio",
        role: "AI Video Creator",
        rating: 4.9,
        projects: 128,
        skills: ["AI Video", "Reels", "Ads"],
        location: "Bangalore",
        match: 96
    },

    {
        name: "Maya Creative",
        role: "AI Image Creator",
        rating: 4.8,
        projects: 96,
        skills: ["AI Art", "Branding", "Design"],
        location: "Hyderabad",
        match: 94
    },

    {
        name: "Pixel Gen AI",
        role: "AI Content Creator",
        rating: 4.9,
        projects: 154,
        skills: ["Ads", "Social Media", "Content"],
        location: "Chennai",
        match: 92
    },

    {
        name: "Vision AI Labs",
        role: "AI Advertisement Creator",
        rating: 4.7,
        projects: 87,
        skills: ["AI Ads", "Marketing", "Video"],
        location: "Mumbai",
        match: 90
    }

];

let medicalReportAnswers = null;
let nitiConversation = [];


/* =========================
   FIND CREATORS
========================= */

function findCreators() {

    const section =
        document.getElementById("creators");
    const searchInput =
        document.getElementById("creatorSearch");

    if (section) {

        section.scrollIntoView({
            behavior: "smooth"
        });

    }

    if (searchInput) searchInput.focus();

}


/* =========================
   SEARCH CREATORS
========================= */

function searchCreators(searchText) {

    const cards =
        document.querySelectorAll(".creator-card");

    const terms = normalizeSearchText(searchText).split(/\s+/).filter(Boolean);
    let visibleCount = 0;

    cards.forEach(card => {
        const creator = creators.find(item => item.name === card.dataset.creator);
        const searchableText = normalizeSearchText(creator
            ? [creator.name, creator.role, creator.location, ...creator.skills].join(" ")
            : card.innerText);
        const isMatch = terms.every(term => searchableText.includes(term));
        card.style.display = isMatch ? "" : "none";
        if (isMatch) visibleCount += 1;
    });

    const response = document.getElementById("creatorSearchResults");
    if (!response) return;

    if (terms.length === 0) {
        response.textContent = `Showing all ${visibleCount} creators.`;
    } else if (visibleCount === 0) {
        response.textContent = `No creators found for "${searchText.trim()}". Try a skill, role, or city.`;
    } else {
        response.textContent = `${visibleCount} creator${visibleCount === 1 ? "" : "s"} found.`;
    }

}

function normalizeSearchText(value) {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function toggleNitiChat(forceOpen) {
    const panel = document.getElementById("nitiChatPanel");
    const toggle = document.getElementById("nitiChatToggle");
    const input = document.getElementById("nitiChatInput");
    if (!panel || !toggle) return;

    const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : panel.hidden;
    panel.hidden = !shouldOpen;
    toggle.setAttribute("aria-expanded", String(shouldOpen));
    if (shouldOpen && input) input.focus();
}

function getNitiChatReply(message) {
    const query = normalizeSearchText(message).replace(/[?!.,]+/g, " ");
    const greeting = /^(hi|hello|hey|namaste|namaskaram|hii|hlo|good morning|good afternoon|good evening)\b/.test(query);
    if (greeting) {
        return "Hi! 👋 I’m NITI AI Assistant. I can help you find creators by skill or city, or explain how to post a project brief. What are you looking for?";
    }

    if (/\b(brief|project|hire|post|budget|work|how it works)\b/.test(query)) {
        return "To start a project, choose “Post Your Brief”, enter a title, description, project type, and budget, then select “Find AI Creators”. Sign in is required to save your brief.";
    }

    const ignoredTerms = new Set(["a", "an", "and", "are", "by", "creator", "creators", "find", "for", "i", "in", "me", "of", "please", "show", "the", "to", "want", "with", "ai"]);
    const searchTerms = query.split(/\s+/).filter(term => term && !ignoredTerms.has(term));
    const matches = searchTerms.length ? creators.filter(creator => {
        const searchable = normalizeSearchText([creator.name, creator.role, creator.location, ...creator.skills].join(" "));
        return searchTerms.every(term => searchable.includes(term));
    }) : [];
    if (matches.length > 0) {
        const recommendations = matches.slice(0, 3)
            .map(creator => `${creator.name} — ${creator.role}, ${creator.location} (${creator.match}% match)`)
            .join("\n");
        return `Here ${matches.length === 1 ? "is a creator" : "are creators"} matching your message:\n${recommendations}`;
    }

    if (/\b(search|find|creator|creators|skill|city|location)\b/.test(query)) {
        return "You can search the creator list by name, skill, role, or city. For example, try “video”, “design”, or “Hyderabad”.";
    }
    return "I can help find creators by name, skill, role, or city, and explain how to post a project brief. Try “video creators” or “how do I post a project?”";
}

function addNitiChatMessage(message, sender = "assistant") {
    const messages = document.getElementById("nitiChatMessages");
    if (!messages) return;

    const bubble = document.createElement("p");
    bubble.className = `niti-chat-bubble ${sender}`;
    bubble.textContent = message;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
}

function addNitiChatSources(citations) {
    const messages = document.getElementById("nitiChatMessages");
    if (!messages || !Array.isArray(citations) || citations.length === 0) return;

    const sourceList = document.createElement("div");
    sourceList.className = "niti-chat-sources";
    const heading = document.createElement("strong");
    heading.textContent = "Sources";
    sourceList.appendChild(heading);

    citations.forEach(citation => {
        try {
            const url = new URL(citation.url);
            if (!["http:", "https:"].includes(url.protocol)) return;
            const link = document.createElement("a");
            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = citation.title || url.hostname;
            sourceList.appendChild(link);
        } catch (error) {
            console.warn("Skipping invalid AI citation URL.");
        }
    });

    if (sourceList.children.length > 1) messages.appendChild(sourceList);
}

async function requestNitiAIResponse(message) {
    if (!currentNitiUser) {
        throw new Error("Please sign in before using AI search.");
    }

    const token = await currentNitiUser.getIdToken();
    const messages = [...nitiConversation.slice(-10), { role: "user", content: message }];
    const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ messages })
    });

    let result;
    try {
        result = await response.json();
    } catch (error) {
        console.error("Could not read AI response:", error);
        throw new Error("The AI service returned an unreadable response.");
    }
    if (!response.ok) {
        throw new Error(result.error || `AI request failed (${response.status}).`);
    }
    if (typeof result.answer !== "string" || !result.answer.trim()) {
        throw new Error("The AI service returned no answer.");
    }

    nitiConversation = [
        ...messages,
        { role: "assistant", content: result.answer }
    ].slice(-12);
    return result;
}

function startMedicalReport() {
    medicalReportAnswers = [];
    toggleNitiChat(true);
    addNitiChatMessage(
        "I can help organize one test result into a summary for your clinician. This is not ChatGPT or a medical diagnosis, and the app does not send or save these answers. Please do not enter your name, address, or record number. Type “cancel” at any time to stop."
    );
    addNitiChatMessage("Step 1 of 5 — What age range applies? This is optional; type “skip” if you prefer not to say.");
}

function handleMedicalReportAnswer(message) {
    if (!medicalReportAnswers) return false;

    if (/^\s*cancel\s*$/i.test(message)) {
        medicalReportAnswers = null;
        addNitiChatMessage("Medical report helper cancelled. Your answers were only held in this page session.");
        return true;
    }

    const lowerMessage = normalizeSearchText(message);
    if (/\b(chest pain|trouble breathing|difficulty breathing|severe bleeding|fainting|passed out|stroke symptoms|face drooping|sudden weakness)\b/.test(lowerMessage)) {
        medicalReportAnswers = null;
        addNitiChatMessage("Your message mentions a potentially urgent symptom. Please contact your local emergency service or seek urgent medical care now. Do not wait for an online report explanation.");
        return true;
    }

    medicalReportAnswers.push(message.trim());
    const answerCount = medicalReportAnswers.length;
    const questions = [
        "Step 2 of 5 — What is the test or report item called? Copy the name as shown on the report.",
        "Step 3 of 5 — What result/value and unit does the report show? Copy it exactly, including any H/L or abnormal flag.",
        "Step 4 of 5 — What reference range does this lab show for that item? Include its units, or type “not shown”.",
        "Step 5 of 5 — What would you like the clinician to know about the reason for the test or any symptoms? This is optional; type “skip”."
    ];

    if (answerCount < 5) {
        addNitiChatMessage(questions[answerCount - 1]);
        return true;
    }

    const [ageRange, testName, result, referenceRange, context] = medicalReportAnswers;
    const report = [
        "Your medical report notes (for discussion with a clinician)",
        `Age range: ${ageRange}`,
        `Test/report item: ${testName}`,
        `Reported result: ${result}`,
        `Lab reference range: ${referenceRange}`,
        `Reason/symptoms shared: ${context}`,
        "",
        "What this summary means: It organizes only the information you entered. It cannot determine what the result means for your health. A result outside a lab's range does not by itself diagnose a condition; interpretation depends on the full report and your health history.",
        "Next step: Ask the clinician who ordered the test to explain this result, whether follow-up is needed, and how it relates to your symptoms and other results. Do not start, stop, or change treatment based on this summary.",
        "If you have severe or rapidly worsening symptoms, seek urgent medical care."
    ].join("\n");
    medicalReportAnswers = null;
    addNitiChatMessage(report);
    addNitiChatMessage("For privacy, clear this chat to remove the report details from the page.");
    return true;
}

function clearNitiChat() {
    medicalReportAnswers = null;
    nitiConversation = [];
    const messages = document.getElementById("nitiChatMessages");
    if (!messages) return;

    messages.replaceChildren();
    addNitiChatMessage("Chat cleared. Hi! 👋 You can ask about creators and projects, or start a medical report helper.");
}

async function sendNitiChatMessage(event) {
    event.preventDefault();
    const input = document.getElementById("nitiChatInput");
    const messages = document.getElementById("nitiChatMessages");
    const sendButton = document.getElementById("nitiChatSend");
    const aiEnabled = document.getElementById("nitiAiEnabled");
    if (!input || !messages) return;

    const message = input.value.trim();
    if (!message) return;

    addNitiChatMessage(message, "user");
    input.value = "";

    if (handleMedicalReportAnswer(message)) {
        input.focus();
        return;
    }

    if (aiEnabled && aiEnabled.checked) {
        if (sendButton) sendButton.disabled = true;
        input.disabled = true;
        addNitiChatMessage("Searching the web and preparing an answer…");
        try {
            const result = await requestNitiAIResponse(message);
            const bubbles = messages.querySelectorAll(".niti-chat-bubble.assistant");
            const loadingBubble = bubbles[bubbles.length - 1];
            if (loadingBubble && loadingBubble.textContent === "Searching the web and preparing an answer…") {
                loadingBubble.textContent = result.answer;
            } else {
                addNitiChatMessage(result.answer);
            }
            addNitiChatSources(result.citations);
        } catch (error) {
            console.error("AI search failed:", error.message);
            addNitiChatMessage(`AI search could not answer: ${error.message}`);
        } finally {
            if (sendButton) sendButton.disabled = false;
            input.disabled = false;
            input.focus();
            messages.scrollTop = messages.scrollHeight;
        }
    } else {
        addNitiChatMessage(getNitiChatReply(message));
    }

    messages.scrollTop = messages.scrollHeight;
    input.focus();
}


/* =========================
   FAVORITE CREATOR
========================= */

/* =========================
   VIEW CREATOR
========================= */

function viewCreator(name) {

    const creator =
        creators.find(
            item => item.name === name
        );


    if (!creator) return;


    const oldPopup =
        document.querySelector(".profile-popup");

    if (oldPopup) {
        oldPopup.remove();
    }


    const popup =
        document.createElement("div");

    popup.className =
        "profile-popup";


    popup.innerHTML = `

        <div class="profile-box">

            <button
                class="popup-close"
                onclick="closeProfile()">
                ×
            </button>

            <div class="profile-avatar">
                ${creator.name.substring(0, 2).toUpperCase()}
            </div>

            <h2>
                ${creator.name}
            </h2>

            <p class="profile-role">
                ${creator.role}
            </p>

            <div class="profile-rating">
                ⭐ ${creator.rating}
            </div>

            <div class="profile-info">

                <p>
                    <strong>📍 Location:</strong>
                    ${creator.location}
                </p>

                <p>
                    <strong>🎯 Projects:</strong>
                    ${creator.projects}
                </p>

                <p>
                    <strong>🤖 AI Match:</strong>
                    ${creator.match}%
                </p>

                <p>
                    <strong>🛠 Skills:</strong>
                    ${creator.skills.join(", ")}
                </p>

            </div>

            <button
                class="contact-btn"
                onclick="contactCreator('${creator.name}')">

                Connect with Creator

            </button>

        </div>

    `;


    document.body.appendChild(popup);

}


function closeProfile() {

    const popup =
        document.querySelector(".profile-popup");

    if (popup) {
        popup.remove();
    }

}


/* =========================
   POST A BRIEF
========================= */

function showBrief() {

    const oldPopup =
        document.querySelector(".brief-popup");

    if (oldPopup) {
        oldPopup.remove();
    }


    const popup =
        document.createElement("div");

    popup.className =
        "brief-popup";


    popup.innerHTML = `

        <div class="brief-box">

            <button
                class="popup-close"
                onclick="closeBrief()">
                ×
            </button>

            <h2>
                📝 Post Your Project Brief
            </h2>

            <input
                id="briefTitle"
                type="text"
                placeholder="Project title">


            <textarea
                id="briefDescription"
                placeholder="Describe your project...">
            </textarea>


            <select id="briefType">

                <option value="">
                    Select project type
                </option>

                <option value="AI Video">
                    AI Video
                </option>

                <option value="AI Image">
                    AI Image
                </option>

                <option value="AI Ads">
                    AI Advertisement
                </option>

                <option value="Social Media">
                    Social Media
                </option>

            </select>


            <input
                id="briefBudget"
                type="number"
                placeholder="Budget ₹">


            <button
                class="brief-submit"
                onclick="submitBrief()">

                🤖 Find AI Creators

            </button>

        </div>

    `;


    document.body.appendChild(popup);

}


function closeBrief() {

    const popup =
        document.querySelector(".brief-popup");

    if (popup) {
        popup.remove();
    }

}


/* =========================
   AI MATCHING RESULT
========================= */

function showAIResult(
    title,
    type,
    budget
) {

    const sortedCreators =
        [...creators].sort(
            (a, b) => b.match - a.match
        );


    const popup =
        document.createElement("div");

    popup.className =
        "match-popup";


    let creatorHTML = "";


    sortedCreators
        .slice(0, 3)
        .forEach(creator => {

            creatorHTML += `

                <button type="button" class="match-item" onclick="openMatchedCreator('${creator.name}')">

                    <div class="match-avatar">
                        ${creator.name.substring(0, 2)}
                    </div>

                    <div class="match-info">

                        <strong>
                            ${creator.name}
                        </strong>

                        <small>
                            ${creator.role}
                        </small>

                    </div>

                    <div class="match-percent">
                        ${creator.match}%
                    </div>

                </button>

            `;

        });


    popup.innerHTML = `

        <div class="match-box">

            <button
                class="popup-close"
                onclick="closeMatch()">
                ×
            </button>

            <div class="popup-icon">
                🤖
            </div>

            <h2>
                AI Matching Complete
            </h2>

            <p class="match-summary">
                Best creators found for
                <strong>${escapeHTML(title)}</strong>
                (${type}) — Budget ₹${budget}
            </p>

            <div class="match-list">
                ${creatorHTML}
            </div>

            <button
                class="contact-btn" onclick="viewAllMatches()">

                View All Matches

            </button>

        </div>

    `;


    document.body.appendChild(popup);

}


function openMatchedCreator(name) {
    closeMatch();
    viewCreator(name);
}

function viewAllMatches() {
    closeMatch();
    const section = document.getElementById("creators");
    if (section) section.scrollIntoView({ behavior: "smooth" });
}
function closeMatch() {

    const popup =
        document.querySelector(".match-popup");

    if (popup) {
        popup.remove();
    }

}


/* =========================
   NOTIFICATION
========================= */

function showNotification(
    title,
    message
) {

    const old =
        document.querySelector(".niti-notification");

    if (old) {
        old.remove();
    }


    const notification =
        document.createElement("div");

    notification.className =
        "niti-notification";


    notification.innerHTML = `

        <strong>
            ${title}
        </strong>

        <p>
            ${message}
        </p>

    `;


    document.body.appendChild(notification);


    setTimeout(() => {

        notification.classList.add(
            "notification-show"
        );

    }, 50);


    setTimeout(() => {

        notification.classList.remove(
            "notification-show"
        );

        setTimeout(() => {
            notification.remove();
        }, 400);

    }, 3500);

}


/* =========================
   PROGRESS BAR
========================= */

window.addEventListener(
    "DOMContentLoaded",
    () => {

        const progress =
            document.getElementById("matchProgress");

        if (progress) {

            setTimeout(() => {

                progress.style.width =
                    "94%";

            }, 300);

        }




        console.log(
            "🐬 NITI AI loaded successfully!"
        );

    }
);


/* =========================
   KEYBOARD SHORTCUTS
========================= */

document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            closeLogin();
            closeBrief();
            closeProfile();
            closeMatch();
            toggleNitiChat(false);

        }


        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "k"
        ) {

            event.preventDefault();

            const search =
                document.getElementById(
                    "creatorSearch"
                );

            if (search) {
                search.focus();
            }

        }

    }
);
function openLogin() {
    const modal = document.getElementById("loginModal");
    if (!modal) return;

    authMode = "login";
    const heading = document.querySelector(".login-box h2");
    const subtitle = document.querySelector(".login-box > p");
    const submit = document.getElementById("loginSubmit");
    const toggle = document.getElementById("authModeToggle");
    const message = document.getElementById("loginMessage");
    if (heading) heading.textContent = "Welcome to NITI AI";
    if (subtitle) subtitle.textContent = "Login to connect with AI creators";
    if (submit) submit.textContent = "Login";
    if (toggle) toggle.textContent = "New here? Create an account";
    if (message) message.textContent = "";

    modal.classList.add("show");
    const email = document.getElementById("email");
    if (email) setTimeout(() => email.focus(), 100);
}

function closeLogin() {
    const modal = document.getElementById("loginModal");
    if (modal) modal.classList.remove("show");
}
// Firebase Authentication identifies users; the backend stores their app data in MongoDB.
let authMode = "login";
let currentNitiUser = null;

async function mongoApi(path, options = {}) {
    if (!currentNitiUser) {
        throw new Error("Please sign in and try again.");
    }
    const token = await currentNitiUser.getIdToken();
    const response = await fetch(path, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            Authorization: `Bearer ${token}`,
            ...options.headers
        }
    });
    if (!response.ok) {
        let message = `Request failed (${response.status}).`;
        try {
            const body = await response.json();
            if (body.error) message = body.error;
        } catch (error) {
            console.error("Could not read API error response:", error);
        }
        throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
}

function toggleAuthMode() {
    authMode = authMode === "login" ? "signup" : "login";
    const heading = document.querySelector(".login-box h2");
    const subtitle = document.querySelector(".login-box > p");
    const submit = document.getElementById("loginSubmit");
    const toggle = document.getElementById("authModeToggle");
    const message = document.getElementById("loginMessage");
    if (heading) heading.textContent = authMode === "signup" ? "Create your NITI AI account" : "Welcome to NITI AI";
    if (subtitle) subtitle.textContent = authMode === "signup" ? "Sign up to connect with AI creators" : "Login to connect with AI creators";
    if (submit) submit.textContent = authMode === "signup" ? "Create account" : "Login";
    if (toggle) toggle.textContent = authMode === "signup" ? "Already have an account? Login" : "New here? Create an account";
    if (message) message.textContent = "";
}

function syncAuthUI(user) {
    currentNitiUser = user || null;
    const button = document.querySelector(".login-btn");
    if (button) {
        button.textContent = currentNitiUser ? "Logout" : "Login";
        button.onclick = currentNitiUser ? logout : openLogin;
    }
    syncFavoriteButtons(currentNitiUser);
}

async function syncFavoriteButtons(user) {
    const buttons = document.querySelectorAll(".favorite-btn[data-creator]");
    buttons.forEach(button => setFavoriteButton(button, false));
    if (!user) return;
    try {
        const result = await mongoApi("/api/favorites");
        const savedNames = new Set(result.favorites);
        buttons.forEach(button => setFavoriteButton(button, savedNames.has(button.dataset.creator)));
    } catch (error) {
        console.error("Could not load favorites:", error.message);
        showNotification("Could not load favorites", error.message);
    }
}

function setFavoriteButton(button, isFavorite) {
    if (!button) return;
    button.textContent = isFavorite ? "♥" : "♡";
    button.classList.toggle("active", isFavorite);
    button.setAttribute("aria-pressed", String(isFavorite));
}

function authErrorMessage(error) {
    const messages = {
        "auth/email-already-in-use": "This email already has an account. Please log in.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/user-not-found": "No account found for this email. Create an account first.",
        "auth/wrong-password": "Email or password is incorrect.",
        "auth/weak-password": "Use a password with at least 6 characters.",
        "auth/too-many-requests": "Too many attempts. Please wait and try again.",
        "auth/network-request-failed": "Network error. Check your internet connection and retry.",
        "auth/operation-not-allowed": "Email and password sign-in is not enabled in Firebase.",
        "auth/unauthorized-domain": "localhost is not allowed in Firebase Authentication settings.",
        "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "Firebase API key is not valid; check firebase-config.js."
    };
    return messages[error.code] || ("Firebase error: " + (error.code || error.message || "unknown"));
}

async function login() {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const message = document.getElementById("loginMessage");
    const submit = document.getElementById("loginSubmit");
    if (!emailInput || !passwordInput || !message) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
        message.textContent = "Please enter your email and password.";
        message.style.color = "#ff6b6b";
        return;
    }
    if (!window.nitiAuth) {
        message.textContent = "Firebase did not load. Open this site through a local web server and retry.";
        message.style.color = "#ff6b6b";
        return;
    }
    if (authMode === "signup" && password.length < 6) {
        message.textContent = "Use a password with at least 6 characters.";
        message.style.color = "#ff6b6b";
        return;
    }

    if (submit) submit.disabled = true;
    message.textContent = authMode === "signup" ? "Creating your account..." : "Signing in...";
    message.style.color = "#94a3b8";
    try {
        if (authMode === "signup") {
            await window.nitiAuth.createUserWithEmailAndPassword(email, password);
        } else {
            await window.nitiAuth.signInWithEmailAndPassword(email, password);
        }
        message.textContent = authMode === "signup" ? "Account created successfully!" : "Login successful!";
        message.style.color = "#00e676";
        setTimeout(() => {
            closeLogin();
            showNotification("Welcome to NITI AI", "You are signed in.");
        }, 700);
    } catch (error) {
        message.textContent = authErrorMessage(error);
        message.style.color = "#ff6b6b";
    } finally {
        if (submit) submit.disabled = false;
    }
}

async function logout() {
    try {
        await window.nitiAuth.signOut();
        showNotification("Signed out", "You have been logged out.");
    } catch (error) {
        showNotification("Could not sign out", "Please try again.");
    }
}

async function favoriteCreator(name, button) {
    if (!currentNitiUser) {
        showNotification("Login required", "Please log in to save favorites.");
        openLogin();
        return;
    }
    if (button) button.disabled = true;
    try {
        if (button && button.classList.contains("active")) {
            await mongoApi(`/api/favorites/${encodeURIComponent(name)}`, { method: "DELETE" });
            setFavoriteButton(button, false);
            showNotification("Removed from Favorites", name);
        } else {
            await mongoApi(`/api/favorites/${encodeURIComponent(name)}`, { method: "PUT" });
            setFavoriteButton(button, true);
            showNotification("Added to Favorites", name);
        }
    } catch (error) {
        console.error("Could not save favorite:", error.message);
        showNotification("Could not save favorite", error.message);
    } finally {
        if (button) button.disabled = false;
    }
}

async function contactCreator(name) {
    if (!currentNitiUser) {
        closeProfile();
        showNotification("Login required", "Please log in to contact a creator.");
        openLogin();
        return;
    }
    try {
        await mongoApi("/api/contact-requests", {
            method: "POST",
            body: JSON.stringify({ creatorName: name })
        });
        closeProfile();
        showNotification("Connection request sent", "Your request to " + name + " has been sent.");
    } catch (error) {
        console.error("Could not send contact request:", error.message);
        showNotification("Could not send request", error.message);
    }
}

async function submitBrief() {
    const title = document.getElementById("briefTitle").value.trim();
    const description = document.getElementById("briefDescription").value.trim();
    const type = document.getElementById("briefType").value;
    const budget = Number(document.getElementById("briefBudget").value);
    if (!title || !description || !type || !Number.isFinite(budget) || budget <= 0) {
        showNotification("Missing information", "Enter all project details and a budget above zero.");
        return;
    }
    if (!currentNitiUser) {
        closeBrief();
        showNotification("Login required", "Please log in before posting a project brief.");
        openLogin();
        return;
    }
    try {
        await mongoApi("/api/briefs", {
            method: "POST",
            body: JSON.stringify({ title, description, type, budget })
        });
        closeBrief();
        showAIResult(title, type, budget);
        showNotification("Brief saved", "Your project brief was saved to NITI AI.");
    } catch (error) {
        console.error("Could not save brief:", error.message);
        showNotification("Could not save brief", error.message);
    }
}

if (window.nitiAuth) {
    window.nitiAuth.onAuthStateChanged(syncAuthUI);
}
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}