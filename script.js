/* =========================
   NITI AI JAVASCRIPT
========================= */


/* =========================
   CREATOR DATA
========================= */

let creators = [];

function formatCreatorCurrency(amount) {
    if (!Number.isFinite(amount)) return "Not provided";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(amount);
}

function displayOptionalValue(value) {
    return value === null || value === undefined || value === "" ? "Not provided" : escapeHTML(value);
}

function renderCreatorSocialLinks(links) {
    return links.map(link => `
        <a class="profile-social-link" href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">
            <span>${escapeHTML(link.platform)}</span>
            <strong>${escapeHTML(link.handle)}</strong>
        </a>
    `).join("");
}

function getCreatorSearchText(creator) {
    return [
        creator.name,
        creator.id,
        creator.category,
        creator.role,
        creator.location,
        creator.specialization,
        ...creator.specializations,
        creator.bio,
        ...creator.skills,
        ...creator.tools,
        ...creator.contentTypes,
        ...creator.socialLinks.flatMap(link => [link.platform, link.handle]),
        ...creator.portfolioItems.flatMap(item => [item.title, item.client, item.status, item.description, item.format, ...item.toolsUsed]),
        ...creator.reviews.flatMap(review => [review.author, review.text]),
        creator.rating, creator.reviewCount, creator.revenue.total, creator.revenue.thisMonth,
        creator.pricing.reel, creator.pricing.promotionalPost, creator.pricing.storyPackage
    ].join(" ");
}

async function loadCreatorData() {
    const status = document.getElementById("creatorDataStatus");
    const retry = document.getElementById("creatorDataRetry");
    const searchForm = document.getElementById("creatorSearchForm");
    const grid = document.querySelector(".creator-grid");
    if (!status || !searchForm || !grid || typeof window.loadNitiCreatorDataset !== "function") {
        throw new Error("Creator data loader or page status elements are missing.");
    }

    status.textContent = "Loading mock creator data…";
    status.dataset.state = "loading";
    retry.hidden = true;
    searchForm.hidden = true;
    grid.hidden = true;
    try {
        if (typeof window.loadNitiCreatorDataset !== "function") {
            throw new Error("The creator CSV loader script did not load.");
        }
        creators = await window.loadNitiCreatorDataset();
        renderCreatorCards();
        initializeCreatorFilters();
        searchForm.hidden = false;
        grid.hidden = false;
        applyCreatorFilters();
        status.textContent = `Loaded ${creators.length} mock creator records. Ratings, reviews, prices, and revenue are demo data.`;
        status.dataset.state = "success";
    } catch (error) {
        console.error("Could not load creator dataset:", error);
        status.textContent = `Could not load creator data: ${error.message}`;
        status.dataset.state = "error";
        retry.hidden = false;
    }
}

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
    const input = document.getElementById("creatorSearch");
    if (input && input.value !== searchText) input.value = searchText;
    applyCreatorFilters();
}

function normalizeSearchText(value) {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function getSelectedCreatorFilters() {
    return {
        skills: [...document.querySelectorAll("#creatorSkillFilter input:checked")].map(input => input.value),
        category: document.getElementById("creatorCategoryFilter")?.value || "",
        specialization: document.getElementById("creatorSpecializationFilter")?.value || "",
        tools: [...document.querySelectorAll("#creatorToolFilter input:checked")].map(input => input.value),
        location: document.getElementById("creatorLocationFilter")?.value || "",
        rating: Number(document.getElementById("creatorRatingFilter")?.value || 0)
    };
}

function populateCreatorCheckboxFilter(id, values, name) {
    const container = document.getElementById(id);
    if (!container) return;
    const options = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    container.innerHTML = options.map((value, index) => `
        <label class="creator-filter-option" for="${name}-${index}">
            <input id="${name}-${index}" name="${name}" type="checkbox" value="${escapeHTML(value)}" onchange="applyCreatorFilters()">
            <span>${escapeHTML(value)}</span>
        </label>
    `).join("");
}

function initializeCreatorFilters() {
    populateCreatorCheckboxFilter("creatorSkillFilter", creators.flatMap(creator => creator.skills), "creator-skill-option");
    populateCreatorCheckboxFilter(
        "creatorToolFilter",
        ["Runway", "Kling AI", "Midjourney", "ElevenLabs", ...creators.flatMap(creator => creator.tools)],
        "creator-tool-option"
    );
    const filterOptions = [
        {
            id: "creatorCategoryFilter",
            values: creators.map(creator => creator.category),
            placeholder: "All categories"
        },
        {
            id: "creatorSpecializationFilter",
            values: creators.flatMap(creator => creator.specializations),
            placeholder: "All specializations"
        },
        {
            id: "creatorLocationFilter",
            values: creators.map(creator => creator.location),
            placeholder: "All locations"
        }
    ];

    filterOptions.forEach(({ id, values, placeholder }) => {
        const select = document.getElementById(id);
        if (!select) return;
        const options = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
        select.innerHTML = `<option value="">${placeholder}</option>` +
            options.map(value => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join("");
    });
}

function applyCreatorFilters() {
    const input = document.getElementById("creatorSearch");
    const terms = normalizeSearchText(input ? input.value : "").split(/\s+/).filter(Boolean);
    const filters = getSelectedCreatorFilters();
    const matchingCreators = creators.filter(creator =>
        terms.every(term => normalizeSearchText(getCreatorSearchText(creator)).includes(term))
        && (!filters.skills.length || filters.skills.some(filterValue => creator.skills.some(value => normalizeSearchText(value) === normalizeSearchText(filterValue))))
        && (!filters.category || normalizeSearchText(creator.category) === normalizeSearchText(filters.category))
        && (!filters.specialization || creator.specializations.some(value => normalizeSearchText(value) === normalizeSearchText(filters.specialization)))
        && (!filters.tools.length || filters.tools.some(filterValue => creator.tools.some(value => normalizeSearchText(value) === normalizeSearchText(filterValue))))
        && (!filters.location || normalizeSearchText(creator.location) === normalizeSearchText(filters.location))
        && (!filters.rating || creator.rating >= filters.rating)
    );
    const sortBy = document.getElementById("creatorSort")?.value || "rating";
    const sortNumber = (value, fallback = -1) => Number.isFinite(value) ? value : fallback;
    const sorters = {
        rating: (a, b) => sortNumber(b.rating) - sortNumber(a.rating) || sortNumber(b.reviewCount) - sortNumber(a.reviewCount),
        reviews: (a, b) => sortNumber(b.reviewCount) - sortNumber(a.reviewCount) || sortNumber(b.rating) - sortNumber(a.rating),
        revenue: (a, b) => sortNumber(b.revenue.total) - sortNumber(a.revenue.total),
        monthly: (a, b) => sortNumber(b.revenue.thisMonth) - sortNumber(a.revenue.thisMonth),
        reel: (a, b) => sortNumber(a.pricing.reel, Number.POSITIVE_INFINITY) - sortNumber(b.pricing.reel, Number.POSITIVE_INFINITY),
        projects: (a, b) => sortNumber(b.projects) - sortNumber(a.projects),
        name: (a, b) => a.name.localeCompare(b.name)
    };
    matchingCreators.sort(sorters[sortBy] || sorters.rating);

    const grid = document.querySelector(".creator-grid");
    if (grid) {
        const fragment = document.createDocumentFragment();
        matchingCreators.forEach(creator => {
            const card = [...grid.children].find(item => item.dataset.creatorId === creator.id);
            if (card) fragment.append(card);
        });
        grid.append(fragment);
    }
    const visibleIds = new Set(matchingCreators.map(creator => creator.id));
    document.querySelectorAll(".creator-card").forEach(card => {
        const visible = visibleIds.has(card.dataset.creatorId);
        card.hidden = !visible;
        card.style.display = visible ? "" : "none";
    });
    const visibleCount = matchingCreators.length;

    const activeFilters = terms.length > 0 || filters.skills.length > 0 || filters.category || filters.specialization || filters.tools.length > 0 || filters.location || filters.rating;
    const results = document.getElementById("creatorSearchResults");
    if (results) {
        results.textContent = activeFilters
            ? `${visibleCount} mock creator${visibleCount === 1 ? "" : "s"} found.`
            : `Showing all ${visibleCount} mock creators.`;
    }

    const emptyState = document.getElementById("creatorEmptyState");
    if (emptyState) emptyState.hidden = visibleCount > 0;
}

function clearCreatorFilters() {
    const input = document.getElementById("creatorSearch");
    if (input) input.value = "";
    document.querySelectorAll("#creatorSkillFilter input, #creatorToolFilter input").forEach(input => {
        input.checked = false;
    });
    ["creatorCategoryFilter", "creatorSpecializationFilter", "creatorLocationFilter", "creatorRatingFilter"]
        .forEach(id => {
            const select = document.getElementById(id);
            if (select) select.value = "";
        });
    const sort = document.getElementById("creatorSort");
    if (sort) sort.value = "rating";
    applyCreatorFilters();
    if (input) input.focus();
}

function renderCreatorCards() {
    const grid = document.querySelector(".creator-grid");
    if (!grid) throw new Error("Creator card container is missing.");
    grid.replaceChildren(...creators.map(creator => {
        const card = document.createElement("article");
        card.className = "creator-card";
        card.dataset.creatorId = creator.id;
        const initials = creator.name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
        const roleLocation = [creator.role, creator.location].filter(Boolean).map(escapeHTML).join(" · ");
        card.innerHTML = `
            <div class="creator-avatar" aria-hidden="true">${escapeHTML(initials)}</div>
            <button class="favorite-btn" type="button" aria-label="Favorite ${escapeHTML(creator.name)}" data-creator="${escapeHTML(creator.name)}">♡</button>
            <h3>${escapeHTML(creator.name)}</h3>
            <p class="creator-role">${roleLocation}</p>
            <div class="creator-tags">${creator.skills.slice(0, 3).map(skill => `<span>${escapeHTML(skill)}</span>`).join("")}</div>
            <div class="creator-card-details">
                ${creator.bio ? `<p class="creator-card-bio">${escapeHTML(creator.bio)}</p>` : ""}
                ${creator.category ? `<p><strong>Category:</strong> ${escapeHTML(creator.category)}</p>` : ""}
                <p><strong>Specializations:</strong> ${creator.specializations.map(escapeHTML).join(", ") || "Not provided"}</p>
                <p><strong>Tools / models:</strong> ${creator.tools.map(escapeHTML).join(", ") || "Not provided"}</p>
                ${creator.rating !== null ? `<p><strong>⭐ ${escapeHTML(creator.rating)}</strong>${creator.reviewCount === null ? "" : ` · ${escapeHTML(creator.reviewCount)} mock reviews`}</p>` : ""}
                ${creator.pricing.reel !== null ? `<p><strong>Mock price:</strong> ${formatCreatorCurrency(creator.pricing.reel)} / reel</p>` : ""}
                <div class="creator-card-socials">${renderCreatorSocialLinks(creator.socialLinks)}</div>
                <span class="creator-demo-indicator">MOCK PROFILE · DEMO DATA</span>
            </div>
            <div class="creator-bottom">
                <span>${creator.rating === null ? "Rating not provided" : `⭐ ${escapeHTML(creator.rating)} <small>mock rating</small>`}</span>
                <button type="button" class="creator-view-button">View Profile</button>
            </div>
            <div class="creator-card-actions">
                <button type="button" class="creator-contact-button">Contact</button>
                <button type="button" class="creator-hire-button">Hire creator</button>
            </div>
        `;
        card.querySelector(".favorite-btn").addEventListener("click", event => favoriteCreator(creator.name, event.currentTarget));
        card.querySelector(".creator-view-button").addEventListener("click", () => viewCreator(creator.name));
        card.querySelector(".creator-contact-button").addEventListener("click", event => contactCreator(creator.name, event.currentTarget));
        card.querySelector(".creator-hire-button").addEventListener("click", () => openBriefForCreator(creator.name));
        return card;
    }));
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

    const roleLocation = [creator.role, creator.location].filter(Boolean).map(escapeHTML).join(" · ");

    const portfolioHTML = creator.portfolioItems.map((item, index) => {
        const media = item.mediaUrl
            ? `<img class="portfolio-image" src="${escapeHTML(item.mediaUrl)}" alt="${escapeHTML(item.title)} — ${escapeHTML(item.description)}" loading="lazy">`
            : "";
        const statusClass = item.status === "Completed" ? "completed" : "in-progress";
        return `
            <article class="portfolio-item">
                <div class="portfolio-media portfolio-media--${escapeHTML(item.placeholder)}">
                    <div class="portfolio-placeholder" aria-label="Sample portfolio placeholder">
                        <span>${escapeHTML(item.format)} · MOCK SAMPLE ${index + 1}</span>
                        <strong>${escapeHTML(item.title)}</strong>
                    </div>
                    ${media}
                </div>
                <div class="portfolio-item-copy">
                    <h4>${escapeHTML(item.title)}</h4>
                    <p class="portfolio-meta"><strong>Mock client / brand:</strong> ${escapeHTML(item.client)}</p>
                    <span class="portfolio-status portfolio-status--${statusClass}">${escapeHTML(item.status)} · mock project</span>
                    <p>${escapeHTML(item.description)}</p>
                    <p class="portfolio-meta"><strong>Format:</strong> ${escapeHTML(item.format)}</p>
                    <p class="portfolio-meta"><strong>Tools:</strong> ${item.toolsUsed.map(escapeHTML).join(", ")}</p>
                    <p class="portfolio-license">${escapeHTML(item.commercialUse)}</p>
                </div>
            </article>
        `;
    }).join("");

    popup.innerHTML = `
        <div class="profile-box profile-box--rich" role="dialog" aria-modal="true" aria-labelledby="creatorProfileHeading">
            <button class="popup-close" type="button" onclick="closeProfile()" aria-label="Close creator profile">×</button>
            <div class="profile-hero">
                <div class="profile-avatar">${escapeHTML(creator.name.substring(0, 2).toUpperCase())}</div>
                <div>
                    ${roleLocation ? `<p class="profile-role">${roleLocation}</p>` : ""}
                    <h2 id="creatorProfileHeading">${escapeHTML(creator.name)}</h2>
                    <p class="profile-specialization">${escapeHTML(creator.specialization)}</p>
                </div>
            </div>
            ${creator.bio ? `<p class="profile-bio">${escapeHTML(creator.bio)}</p>` : ""}
            <div class="profile-demo-notice">SAMPLE / DEMO PROFILE. Only the fields shown below were supplied; missing details are not provided, and no verification claims are made.</div>
            <section class="profile-detail profile-social-section">
                <h3>Mock social profiles <span>Sample links · replace with verified accounts</span></h3>
                <div class="profile-social-links">${renderCreatorSocialLinks(creator.socialLinks)}</div>
            </section>
            <div class="profile-verification" aria-label="Sample verification indicators">
                <span>Creator claimed · Tools: ${creator.verification.tools ? "sample signal" : "not supplied"}</span>
                <span>Evidence checked · Workflow: ${creator.verification.workflow ? "sample signal" : "not supplied"}</span>
                <span>Verified · Past work: ${creator.verification.pastWork ? "sample signal" : "not supplied"}</span>
            </div>
            <div class="profile-info">
                ${creator.rating !== null ? `<span>⭐ ${escapeHTML(creator.rating)} mock rating</span>` : ""}
                ${creator.reviewCount !== null ? `<span>${escapeHTML(creator.reviewCount)} mock reviews</span>` : ""}
                ${creator.projects !== null ? `<span>🎯 ${escapeHTML(creator.projects)} mock projects</span>` : ""}
                ${creator.match !== null ? `<span>🤖 ${escapeHTML(creator.match)}% demo match</span>` : ""}
                ${creator.rating === null && creator.reviewCount === null ? "<span>Rating and reviews not provided</span>" : ""}
            </div>
            <div class="profile-detail-grid">
                <section class="profile-detail">
                    <h3>Mock project history</h3>
                    <div class="profile-stat-list">
                        <p><span>Total projects</span><strong>${displayOptionalValue(creator.projects)}</strong></p>
                        <p><span>Completed</span><strong>${displayOptionalValue(creator.projectStats.completed)}</strong></p>
                        <p><span>Active</span><strong>${displayOptionalValue(creator.projectStats.inProgress)}</strong></p>
                    </div>
                </section>
                <section class="profile-detail">
                    <h3>Mock earnings · INR</h3>
                    <div class="profile-stat-list">
                        <p><span>Total revenue</span><strong>${formatCreatorCurrency(creator.revenue.total)}</strong></p>
                        <p><span>This month</span><strong>${formatCreatorCurrency(creator.revenue.thisMonth)}</strong></p>
                    </div>
                </section>
                <section class="profile-detail">
                    <h3>Mock pricing · INR</h3>
                    <div class="profile-stat-list">
                        <p><span>One reel</span><strong>${formatCreatorCurrency(creator.pricing.reel)}</strong></p>
                        <p><span>Promotional post</span><strong>${formatCreatorCurrency(creator.pricing.promotionalPost)}</strong></p>
                        <p><span>Story package</span><strong>${formatCreatorCurrency(creator.pricing.storyPackage)}</strong></p>
                    </div>
                </section>
                <section class="profile-detail">
                    <h3>Skills</h3>
                    <div class="profile-tags">${creator.skills.map(skill => `<span>${escapeHTML(skill)}</span>`).join("")}</div>
                </section>
                <section class="profile-detail">
                    <h3>Specializations</h3>
                    <div class="profile-tags">${creator.specializations.map(specialization => `<span>${escapeHTML(specialization)}</span>`).join("") || "Not provided"}</div>
                </section>
                <section class="profile-detail">
                    <h3>Tools &amp; models</h3>
                    <div class="profile-tags">${creator.tools.map(tool => `<span>${escapeHTML(tool)}</span>`).join("") || "Not provided"}</div>
                </section>
                <section class="profile-detail">
                    <h3>Workflow</h3>
                    <ol class="profile-workflow">${creator.workflowSteps.map(step => `<li>${escapeHTML(step)}</li>`).join("")}</ol>
                </section>
                <section class="profile-detail">
                    <h3>Content types</h3>
                    <div class="profile-tags">${creator.contentTypes.map(type => `<span>${escapeHTML(type)}</span>`).join("")}</div>
                </section>
            </div>
            <section class="profile-reviews">
                <div class="profile-section-heading">
                    <div><h3>Mock customer feedback</h3><p>${creator.rating === null ? "No rating or reviews provided." : `⭐ ${escapeHTML(creator.rating)} average · ${displayOptionalValue(creator.reviewCount)} mock reviews`}</p></div>
                </div>
                <div class="profile-review-grid">${creator.reviews.length ? creator.reviews.map(review => `
                    <article class="profile-review">
                        <p class="profile-review-stars" aria-label="${escapeHTML(review.rating)} out of 5 mock stars">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</p>
                        <blockquote>“${escapeHTML(review.text)}”</blockquote>
                        <p class="profile-review-author">${escapeHTML(review.author)}</p>
                    </article>
                `).join("") : "<p>No sample reviews provided.</p>"}</div>
            </section>
            <section class="profile-portfolio">
                <div class="profile-section-heading">
                    <div><h3>Mock reels &amp; promotions</h3><p>Sample thumbnails, clients, and project statuses.</p></div>
                </div>
                <div class="portfolio-grid">${portfolioHTML || "<p>No portfolio items provided for this demo profile.</p>"}</div>
            </section>
            <div class="profile-actions">
                <button class="contact-btn" id="contactCreatorButton" type="button">Contact</button>
                <button class="brief-secondary-action" id="creatorBriefButton" type="button">Hire creator · create a brief</button>
                <p class="profile-action-status" id="profileActionStatus" role="status" aria-live="polite"></p>
            </div>
        </div>
    `;

    document.body.appendChild(popup);
    popup.querySelectorAll(".portfolio-image").forEach(image => {
        image.addEventListener("error", () => {
            image.hidden = true;
        }, { once: true });
    });
    popup.querySelector("#contactCreatorButton").addEventListener("click", event => {
        contactCreator(creator.name, event.currentTarget);
    });
    popup.querySelector("#creatorBriefButton").addEventListener("click", () => {
        openBriefForCreator(creator.name);
    });
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

function showBrief(creatorName = "") {
    closeBrief();
    briefCreatorName = creators.some(creator => creator.name === creatorName) ? creatorName : "";
    const popup = document.createElement("div");
    popup.className = "brief-popup";
    popup.innerHTML = `
        <div class="brief-box brief-box--builder" role="dialog" aria-modal="true" aria-labelledby="briefHeading">
            <button class="popup-close" type="button" onclick="closeBrief()" aria-label="Close project brief">×</button>
            <h2 id="briefHeading">📝 Build Your Creative Brief</h2>
            <p class="brief-intro">Share the details creators need to scope and deliver your campaign.</p>
            ${briefCreatorName ? `<p class="brief-creator-context">Creator preference: <strong>${escapeHTML(briefCreatorName)}</strong>. Saving a brief does not confirm availability or an agreement.</p>` : ""}
            <section class="brief-assistant" aria-labelledby="briefAssistantHeading">
                <label for="briefRoughIdea" id="briefAssistantHeading">Start with a rough idea</label>
                <textarea id="briefRoughIdea" rows="3" maxlength="2000" placeholder="Example: Launch a short vertical video campaign for a new sustainable skincare line on Instagram."></textarea>
                <div class="brief-assistant-actions">
                    <button class="brief-assist-button" type="button" onclick="assistBriefFromIdea()">✨ Fill brief from idea</button>
                    <span>Local demo assist — suggestions are not AI-generated. Review and edit every field.</span>
                </div>
                <p id="briefAssistStatus" class="brief-assist-status" role="status" aria-live="polite"></p>
            </section>
            <form id="creativeBriefForm" onsubmit="submitBrief(event)" novalidate>
                <div class="brief-form-grid">
                    <div class="brief-field">
                        <label for="briefTitle">Campaign / project title <span aria-hidden="true">*</span></label>
                        <input id="briefTitle" name="title" type="text" maxlength="200" autocomplete="off" required aria-describedby="briefTitleError">
                        <p class="brief-field-error" id="briefTitleError"></p>
                    </div>
                    <div class="brief-field">
                        <label for="briefBrand">Brand <span aria-hidden="true">*</span></label>
                        <input id="briefBrand" name="brand" type="text" maxlength="120" autocomplete="organization" required aria-describedby="briefBrandError">
                        <p class="brief-field-error" id="briefBrandError"></p>
                    </div>
                    <div class="brief-field brief-field--full">
                        <label for="briefGoal">Campaign goal <span aria-hidden="true">*</span></label>
                        <input id="briefGoal" name="goal" type="text" maxlength="200" placeholder="e.g. Build awareness for a product launch" required aria-describedby="briefGoalError">
                        <p class="brief-field-error" id="briefGoalError"></p>
                    </div>
                    <div class="brief-field brief-field--full">
                        <label for="briefDescription">Campaign description <span aria-hidden="true">*</span></label>
                        <textarea id="briefDescription" name="description" rows="4" maxlength="5000" required aria-describedby="briefDescriptionError"></textarea>
                        <p class="brief-field-error" id="briefDescriptionError"></p>
                    </div>
                    <div class="brief-field">
                        <label for="briefType">Content type <span aria-hidden="true">*</span></label>
                        <select id="briefType" name="type" required aria-describedby="briefTypeError">
                            <option value="">Choose a content type</option>
                            <option value="AI Video">AI Video</option>
                            <option value="AI Image">AI Image</option>
                            <option value="AI Ads">AI Advertisement</option>
                            <option value="Social Media">Social Media</option>
                        </select>
                        <p class="brief-field-error" id="briefTypeError"></p>
                    </div>
                    <div class="brief-field">
                        <label for="briefFormat">Aspect ratio / format <span aria-hidden="true">*</span></label>
                        <select id="briefFormat" name="format" required aria-describedby="briefFormatError">
                            <option value="">Choose a format</option>
                            <option>9:16 vertical</option>
                            <option>4:5 portrait</option>
                            <option>1:1 square</option>
                            <option>16:9 landscape</option>
                            <option>Custom / multiple formats</option>
                        </select>
                        <p class="brief-field-error" id="briefFormatError"></p>
                    </div>
                    <div class="brief-field brief-field--full">
                        <label for="briefVisualStyle">Visual style <span aria-hidden="true">*</span></label>
                        <input id="briefVisualStyle" name="visualStyle" type="text" maxlength="500" placeholder="e.g. Warm natural light, minimal, editorial" required aria-describedby="briefVisualStyleError">
                        <p class="brief-field-error" id="briefVisualStyleError"></p>
                    </div>
                    <div class="brief-field brief-field--full">
                        <label for="briefVisualReferences">Visual references</label>
                        <textarea id="briefVisualReferences" name="visualReferences" rows="2" maxlength="2000" placeholder="Links or notes for moodboards, examples, or brand guidelines"></textarea>
                        <p class="brief-field-hint">Optional. Add public URLs or describe your references.</p>
                    </div>
                    <div class="brief-field brief-field--full">
                        <label for="briefDeliverables">Deliverables <span aria-hidden="true">*</span></label>
                        <textarea id="briefDeliverables" name="deliverables" rows="2" maxlength="2000" placeholder="Describe the assets, edits, or source files you need" required aria-describedby="briefDeliverablesError"></textarea>
                        <p class="brief-field-error" id="briefDeliverablesError"></p>
                    </div>
                    <div class="brief-field">
                        <label for="briefQuantity">Quantity <span aria-hidden="true">*</span></label>
                        <input id="briefQuantity" name="quantity" type="number" min="1" max="1000" step="1" required aria-describedby="briefQuantityError">
                        <p class="brief-field-error" id="briefQuantityError"></p>
                    </div>
                    <div class="brief-field">
                        <label for="briefPlatform">Target platform <span aria-hidden="true">*</span></label>
                        <input id="briefPlatform" name="targetPlatform" type="text" maxlength="120" placeholder="e.g. Instagram, YouTube, website" required aria-describedby="briefPlatformError">
                        <p class="brief-field-error" id="briefPlatformError"></p>
                    </div>
                    <div class="brief-field">
                        <label for="briefRequiredTools">Required AI tools / models</label>
                        <input id="briefRequiredTools" name="requiredTools" type="text" maxlength="500" placeholder="Optional; separate tools with commas">
                        <p class="brief-field-hint">Leave blank if creators may recommend tools.</p>
                    </div>
                    <div class="brief-field">
                        <label for="briefPreferredTools">Preferred AI tools / models</label>
                        <input id="briefPreferredTools" name="preferredTools" type="text" maxlength="500" placeholder="Optional; separate tools with commas">
                    </div>
                    <div class="brief-field">
                        <label for="briefDeadline">Deadline <span aria-hidden="true">*</span></label>
                        <input id="briefDeadline" name="deadline" type="date" required aria-describedby="briefDeadlineError">
                        <p class="brief-field-error" id="briefDeadlineError"></p>
                    </div>
                    <div class="brief-field">
                        <label for="briefBudget">Budget (₹) <span aria-hidden="true">*</span></label>
                        <input id="briefBudget" name="budget" type="number" min="1" step="0.01" inputmode="decimal" required aria-describedby="briefBudgetError">
                        <p class="brief-field-error" id="briefBudgetError"></p>
                    </div>
                    <div class="brief-field">
                        <label for="briefCommercialUse">Commercial-use requirement <span aria-hidden="true">*</span></label>
                        <select id="briefCommercialUse" name="commercialUseRequired" required aria-describedby="briefCommercialUseError">
                            <option value="">Choose a requirement</option>
                            <option value="required">Commercial use required</option>
                            <option value="not-required">Commercial use not required</option>
                        </select>
                        <p class="brief-field-error" id="briefCommercialUseError"></p>
                    </div>
                    <div class="brief-field">
                        <label for="briefUsageDuration">Usage duration <span aria-hidden="true">*</span></label>
                        <input id="briefUsageDuration" name="usageDuration" type="text" maxlength="120" placeholder="e.g. 12 months, worldwide" required aria-describedby="briefUsageDurationError">
                        <p class="brief-field-error" id="briefUsageDurationError"></p>
                    </div>
                    <div class="brief-field brief-field--full">
                        <label for="briefChannels">Intended usage channels <span aria-hidden="true">*</span></label>
                        <input id="briefChannels" name="intendedChannels" type="text" maxlength="500" placeholder="e.g. Organic social, paid ads, email, website" required aria-describedby="briefChannelsError">
                        <p class="brief-field-error" id="briefChannelsError"></p>
                    </div>
                </div>
                <p id="briefFormStatus" class="brief-form-status" role="status" aria-live="polite"></p>
                <button class="brief-submit" id="briefSubmitButton" type="submit">Save brief &amp; find creators</button>
            </form>
        </div>
    `;
    document.body.appendChild(popup);
    const form = popup.querySelector("#creativeBriefForm");
    if (form) {
        form.addEventListener("input", event => applyBriefValidation(event.target.id));
        form.addEventListener("change", event => applyBriefValidation(event.target.id));
    }
    const deadline = popup.querySelector("#briefDeadline");
    if (deadline) deadline.min = new Date().toISOString().slice(0, 10);
    const firstField = popup.querySelector("#briefTitle");
    if (firstField) firstField.focus();
}


function closeBrief() {

    const popup =
        document.querySelector(".brief-popup");

    if (popup) {
        popup.remove();
    }
}

function openBriefForCreator(name) {
    if (!creators.some(creator => creator.name === name)) return;
    closeProfile();
    showBrief(name);
}

    function assistBriefFromIdea() {
        const ideaInput = document.getElementById("briefRoughIdea");
        const status = document.getElementById("briefAssistStatus");
        const idea = ideaInput ? ideaInput.value.trim() : "";
        if (!idea) {
            if (status) status.textContent = "Add a short project idea first, then I can draft suggestions.";
            if (ideaInput) ideaInput.focus();
            return;
        }

        const normalizedIdea = normalizeSearchText(idea);
        const isVideo = /\b(video|reel|film|motion|animation)\b/.test(normalizedIdea);
        const isImage = /\b(image|photo|photography|still|illustration|artwork)\b/.test(normalizedIdea);
        const isSocial = /\b(social|instagram|tiktok|reels|youtube|post|carousel)\b/.test(normalizedIdea);
        const type = isVideo ? "AI Video" : isImage ? "AI Image" : isSocial ? "Social Media" : "AI Ads";
        const platform = /\b(tiktok)\b/.test(normalizedIdea) ? "TikTok"
            : /\b(youtube)\b/.test(normalizedIdea) ? "YouTube"
                : /\b(instagram|reels)\b/.test(normalizedIdea) ? "Instagram"
                    : /\b(website|web)\b/.test(normalizedIdea) ? "Website" : "Instagram and paid social";
        const format = type === "AI Video" || platform === "TikTok" || platform === "Instagram"
            ? "9:16 vertical"
            : type === "AI Image" ? "4:5 portrait"
                : type === "Social Media" ? "4:5 portrait" : "16:9 landscape";
        const toolMatches = creators
            .filter(creator => creator.role.toLowerCase().includes(type === "AI Video" ? "video" : type === "AI Image" ? "image" : type === "AI Ads" ? "advertisement" : "content"))
            .flatMap(creator => creator.tools)
            .slice(0, 2);
        const sentence = idea.split(/[.!?]/)[0].trim();
        const title = sentence.length > 70 ? `${sentence.slice(0, 67).trim()}...` : sentence;
        const quantityMatch = idea.match(/\b(\d{1,3})\s*(?:videos?|images?|posts?|assets?|reels?|deliverables?)\b/i);
        const quantity = quantityMatch ? quantityMatch[1] : type === "Social Media" ? "3" : "1";
        const referenceLinks = idea.match(/https?:\/\/\S+/g) || [];
        const values = {
            briefTitle: title,
            briefGoal: /\b(launch|new product|introduc)\b/.test(normalizedIdea) ? "Build awareness for a product launch" : "Create engaging campaign content for the target audience",
            briefDescription: idea,
            briefType: type,
            briefFormat: format,
            briefVisualStyle: /\b(minimal|cinematic|playful|luxury|editorial|vibrant|natural)\b/i.test(idea)
                ? `Use a ${idea.match(/\b(minimal|cinematic|playful|luxury|editorial|vibrant|natural)\b/i)[0]} visual direction`
                : "Polished, contemporary visual direction aligned to the brand",
            briefVisualReferences: referenceLinks.join("\n"),
            briefDeliverables: type === "AI Video" ? "Finished campaign video, caption-ready export, and one revision"
                : type === "AI Image" ? "Final campaign images, web-ready exports, and one revision"
                    : type === "Social Media" ? "Platform-ready social assets, caption suggestions, and one revision"
                        : "Campaign ad creative, platform-ready exports, and one revision",
            briefQuantity: quantity,
            briefPlatform: platform,
            briefPreferredTools: toolMatches.join(", "),
            briefUsageDuration: "12 months; confirm geographic scope with the creator",
            briefCommercialUse: "required",
            briefChannels: platform === "Instagram" ? "Organic Instagram and paid social"
                : platform === "TikTok" ? "Organic TikTok and paid social"
                    : platform === "YouTube" ? "YouTube organic and paid placements"
                        : "Organic social, paid ads, and brand website"
        };

        Object.entries(values).forEach(([id, value]) => {
            const field = document.getElementById(id);
            if (field && !field.value.trim()) {
                field.value = value;
                const error = document.getElementById(`${id}Error`);
                if (error) error.textContent = "";
                field.setAttribute("aria-invalid", "false");
            }
        });
        if (status) status.textContent = "Demo suggestions added. No AI service was used; review and edit all details, especially brand, deadline, and budget.";
    }

    function getBriefPayload() {
        const value = id => document.getElementById(id).value.trim();
        return {
            title: value("briefTitle"),
            brand: value("briefBrand"),
            goal: value("briefGoal"),
            description: value("briefDescription"),
            type: value("briefType"),
            visualStyle: value("briefVisualStyle"),
            visualReferences: value("briefVisualReferences"),
            deliverables: value("briefDeliverables"),
            quantity: Number(value("briefQuantity")),
            format: value("briefFormat"),
            targetPlatform: value("briefPlatform"),
            requiredTools: value("briefRequiredTools"),
            preferredTools: value("briefPreferredTools"),
            deadline: value("briefDeadline"),
            budget: Number(value("briefBudget")),
            commercialUseRequired: value("briefCommercialUse") === "required",
            usageDuration: value("briefUsageDuration"),
            intendedChannels: value("briefChannels"),
            ...(briefCreatorName ? { selectedCreatorName: briefCreatorName } : {})
        };
    }

    function applyBriefValidation(fieldId) {
        const brief = getBriefPayload();
        const errors = {
            briefTitle: brief.title ? "" : "Enter a campaign or project title.",
            briefBrand: brief.brand ? "" : "Enter the brand name.",
            briefGoal: brief.goal ? "" : "Describe the campaign goal.",
            briefDescription: brief.description ? "" : "Describe the campaign and its audience.",
            briefType: brief.type ? "" : "Choose a content type.",
            briefVisualStyle: brief.visualStyle ? "" : "Describe the visual style.",
            briefDeliverables: brief.deliverables ? "" : "List the expected deliverables.",
            briefQuantity: Number.isInteger(brief.quantity) && brief.quantity > 0 && brief.quantity <= 1000 ? "" : "Enter a whole-number quantity between 1 and 1,000.",
            briefFormat: brief.format ? "" : "Choose an aspect ratio or format.",
            briefPlatform: brief.targetPlatform ? "" : "Enter at least one target platform.",
            briefDeadline: brief.deadline && brief.deadline >= new Date().toISOString().slice(0, 10) ? "" : "Choose today or a future deadline.",
            briefBudget: Number.isFinite(brief.budget) && brief.budget > 0 ? "" : "Enter a budget greater than zero.",
            briefCommercialUse: document.getElementById("briefCommercialUse").value ? "" : "Choose whether commercial use is required.",
            briefUsageDuration: brief.usageDuration ? "" : "Enter how long the content may be used.",
            briefChannels: brief.intendedChannels ? "" : "Enter the intended usage channels."
        };
        let valid = true;
        Object.entries(errors).forEach(([id, message]) => {
            if (message) valid = false;
            if (fieldId && fieldId !== id) return;
            const field = document.getElementById(id);
            const error = document.getElementById(`${id}Error`);
            if (!field || !error) return;
            error.textContent = message;
            field.setAttribute("aria-invalid", String(Boolean(message)));
        });
        return { valid, brief };
    }

    function showBriefSuccess(brief) {
        const box = document.querySelector(".brief-box");
        if (!box) return;
        box.classList.add("brief-box--success");
        box.innerHTML = `
            <button class="popup-close" type="button" onclick="closeBrief()" aria-label="Close success message">×</button>
            <div class="brief-success-icon" aria-hidden="true">✓</div>
            <h2 id="briefHeading">Brief saved to your account</h2>
            <p class="brief-success-copy"><strong>${escapeHTML(brief.title)}</strong> for ${escapeHTML(brief.brand)} has been saved${brief.selectedCreatorName ? ` with ${escapeHTML(brief.selectedCreatorName)} as your creator preference` : ""}.</p>
            <p class="brief-success-note">Saving does not send an offer or confirm creator availability, acceptance, or a transaction. Creator suggestions use demo match scores only.</p>
            ${brief.selectedCreatorName ? `<button class="brief-submit" id="briefSelectedCreatorButton" type="button">Review ${escapeHTML(brief.selectedCreatorName)}'s profile</button>` : ""}
            <button class="brief-secondary-action" id="briefSuggestionsButton" type="button">See demo creator suggestions</button>
            <button class="brief-secondary-action" type="button" onclick="closeBrief()">Done</button>
        `;
        const selectedCreatorButton = box.querySelector("#briefSelectedCreatorButton");
        if (selectedCreatorButton) {
            selectedCreatorButton.addEventListener("click", () => {
                closeBrief();
                viewCreator(brief.selectedCreatorName);
            });
        }
        box.querySelector("#briefSuggestionsButton").addEventListener("click", () => {
            closeBrief();
            showAIResult(brief.title, brief.type, brief.budget);
        });
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

        loadCreatorData();

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
let briefCreatorName = "";

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

async function contactCreator(name, button) {
    const status = document.getElementById("profileActionStatus");
    if (!currentNitiUser) {
        closeProfile();
        showNotification("Login required", "Please log in to contact a creator.");
        openLogin();
        return;
    }
    if (button) {
        button.disabled = true;
        button.textContent = "Saving request…";
    }
    if (status) status.textContent = "Saving your engagement request…";
    try {
        await mongoApi("/api/contact-requests", {
            method: "POST",
            body: JSON.stringify({ creatorName: name })
        });
        const box = document.querySelector(".profile-box");
        if (box) {
            box.classList.add("profile-box--confirmation");
            box.innerHTML = `
                <button class="popup-close" type="button" onclick="closeProfile()" aria-label="Close confirmation">×</button>
                <div class="brief-success-icon" aria-hidden="true">✓</div>
                <h2 id="creatorRequestHeading" tabindex="-1">Engagement request saved</h2>
                <p class="brief-success-copy">Your request about <strong>${escapeHTML(name)}</strong> has been recorded in your account.</p>
                <p class="brief-success-note">This demo does not confirm that the creator received or accepted the request, or that a transaction took place.</p>
                <button class="contact-btn" id="requestBriefButton" type="button">Create a brief with ${escapeHTML(name)}</button>
                <button class="brief-secondary-action" type="button" onclick="closeProfile()">Done</button>
            `;
            box.setAttribute("aria-labelledby", "creatorRequestHeading");
            box.querySelector("#requestBriefButton").addEventListener("click", () => openBriefForCreator(name));
            box.querySelector("h2").focus();
        } else {
            showNotification("Engagement request saved", `Your request about ${name} is recorded in your account; creator receipt or acceptance is not confirmed.`);
        }
    } catch (error) {
        console.error("Could not send contact request:", error.message);
        const currentStatus = document.getElementById("profileActionStatus");
        if (currentStatus) currentStatus.textContent = `Could not save request: ${error.message}`;
        else showNotification("Could not save request", error.message);
        if (button) {
            button.disabled = false;
            button.textContent = "Request an engagement";
        }
    }
}

async function submitBrief(event) {
    if (event) event.preventDefault();
    const { valid, brief } = applyBriefValidation();
    const status = document.getElementById("briefFormStatus");
    if (!valid) {
        const firstInvalid = document.querySelector(".brief-box [aria-invalid='true']");
        if (firstInvalid) firstInvalid.focus();
        if (status) status.textContent = "Please fix the highlighted fields before saving.";
        return;
    }
    if (!currentNitiUser) {
        closeBrief();
        showNotification("Login required", "Please log in before posting a project brief.");
        openLogin();
        return;
    }
    const submitButton = document.getElementById("briefSubmitButton");
    const form = document.getElementById("creativeBriefForm");
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Saving brief…";
    }
    if (form) form.setAttribute("aria-busy", "true");
    if (status) status.textContent = "Saving your structured brief...";
    try {
        await mongoApi("/api/briefs", {
            method: "POST",
            body: JSON.stringify(brief)
        });
        showBriefSuccess(brief);
    } catch (error) {
        console.error("Could not save brief:", error.message);
        if (status) status.textContent = `Could not save brief: ${error.message}`;
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Save brief & find creators";
        }
        if (form) form.setAttribute("aria-busy", "false");
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