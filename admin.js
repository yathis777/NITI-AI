const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const googleLoginButton = document.getElementById("googleLoginButton");
const loginMessage = document.getElementById("loginMessage");
const dashboardMessage = document.getElementById("dashboardMessage");
const contactList = document.getElementById("contactList");
const briefList = document.getElementById("briefList");
let currentAdminUser = null;

function setMessage(element, text, kind = "") {
    element.textContent = text;
    element.className = `message${kind ? ` ${kind}` : ""}`;
}

function setListState(element, text, kind = "") {
    const state = document.createElement("p");
    state.className = `state${kind ? ` ${kind}` : ""}`;
    state.textContent = text;
    element.replaceChildren(state);
}

function addField(parent, label, value) {
    if (value === undefined || value === null || value === "") return;
    const row = document.createElement("div");
    row.className = "detail-row";
    const term = document.createElement("span");
    term.className = "detail-label";
    term.textContent = label;
    const detail = document.createElement("span");
    detail.className = "detail-value";
    detail.textContent = String(value);
    row.append(term, detail);
    parent.append(row);
}

function formatDate(value) {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

function addRecordMeta(card, record) {
    const meta = document.createElement("div");
    meta.className = "record-meta";
    const customer = record.userDisplayName || record.userEmail || "Account details unavailable";
    addField(meta, "Customer", customer);
    if (record.userDisplayName && record.userEmail) addField(meta, "Email", record.userEmail);
    addField(meta, "Firebase UID", record.userId || "Unavailable");
    addField(meta, "Saved", formatDate(record.createdAt));
    addField(meta, "Source", record.source);
    card.append(meta);
}

function renderContacts(records) {
    document.getElementById("contactCount").textContent = String(records.length);
    document.getElementById("contactSectionCount").textContent = `${records.length} saved`;
    if (!records.length) {
        setListState(contactList, "No contact requests have been saved yet.", "empty");
        return;
    }

    const cards = records.map(record => {
        const card = document.createElement("article");
        card.className = "record-card";
        const heading = document.createElement("h3");
        heading.textContent = record.creatorName || "Creator name unavailable";
        const caption = document.createElement("p");
        caption.className = "record-caption";
        caption.textContent = "Requested creator";
        card.append(heading, caption);
        addRecordMeta(card, record);
        return card;
    });
    contactList.replaceChildren(...cards);
}

function renderBriefs(records) {
    document.getElementById("briefCount").textContent = String(records.length);
    document.getElementById("briefSectionCount").textContent = `${records.length} saved`;
    if (!records.length) {
        setListState(briefList, "No project briefs have been saved yet.", "empty");
        return;
    }

    const cards = records.map(record => {
        const card = document.createElement("article");
        card.className = "record-card";
        const heading = document.createElement("h3");
        heading.textContent = record.title || "Untitled brief";
        const caption = document.createElement("p");
        caption.className = "record-caption";
        caption.textContent = [record.brand, record.type].filter(Boolean).join(" · ") || "Project brief";
        const details = document.createElement("div");
        details.className = "brief-details";
        addField(details, "Goal", record.goal);
        addField(details, "Description", record.description);
        addField(details, "Visual style", record.visualStyle);
        addField(details, "Visual references", record.visualReferences);
        addField(details, "Deliverables", record.deliverables);
        addField(details, "Quantity", record.quantity);
        addField(details, "Format", record.format);
        addField(details, "Target platform", record.targetPlatform);
        addField(details, "Required tools", record.requiredTools);
        addField(details, "Preferred tools", record.preferredTools);
        addField(details, "Deadline", record.deadline);
        addField(details, "Budget", record.budget === undefined ? "" : `${record.budget}`);
        addField(details, "Commercial use", record.commercialUseRequired === undefined ? "" : (record.commercialUseRequired ? "Yes" : "No"));
        addField(details, "Usage duration", record.usageDuration);
        addField(details, "Intended channels", record.intendedChannels);
        addField(details, "Selected creator", record.selectedCreatorName);
        card.append(heading, caption, details);
        addRecordMeta(card, record);
        return card;
    });
    briefList.replaceChildren(...cards);
}

async function loadAdminData() {
    const user = currentAdminUser;
    if (!user) return;
    setMessage(dashboardMessage, "Loading saved customer data…");
    setListState(contactList, "Loading contact requests…", "loading");
    setListState(briefList, "Loading project briefs…", "loading");

    try {
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/data", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store"
        });
        if (currentAdminUser !== user) return;
        const result = await response.json();
        if (currentAdminUser !== user) return;
        if (!response.ok) throw new Error(result.error || `Could not load dashboard (${response.status}).`);
        renderContacts(result.contacts);
        renderBriefs(result.briefs);
        document.getElementById("sourceNote").textContent =
            `Showing up to the latest ${result.limitPerCollectionPerStore} records per collection. Source: ${result.sources.join(" and ")}.`;
        setMessage(dashboardMessage, "Saved data loaded securely.", "success");
    } catch (error) {
        if (currentAdminUser !== user) return;
        setMessage(dashboardMessage, error.message || "Could not load saved customer data.", "error");
        setListState(contactList, "Contact requests are unavailable. Use Refresh to try again.", "error");
        setListState(briefList, "Project briefs are unavailable. Use Refresh to try again.", "error");
        document.getElementById("contactCount").textContent = "—";
        document.getElementById("briefCount").textContent = "—";
        document.getElementById("contactSectionCount").textContent = "Unavailable";
        document.getElementById("briefSectionCount").textContent = "Unavailable";
    }
}

loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    loginButton.disabled = true;
    setMessage(loginMessage, "Signing in…");
    try {
        const email = document.getElementById("adminEmail").value.trim();
        const password = document.getElementById("adminPassword").value;
        await window.nitiAuth.signInWithEmailAndPassword(email, password);
        loginForm.reset();
        setMessage(loginMessage, "");
    } catch (error) {
        setMessage(loginMessage, error.message || "Sign-in failed.", "error");
    } finally {
        loginButton.disabled = false;
    }
});

googleLoginButton.addEventListener("click", async () => {
    googleLoginButton.disabled = true;
    setMessage(loginMessage, "Opening Google sign-in…");
    try {
        await window.nitiAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        setMessage(loginMessage, "");
    } catch (error) {
        setMessage(loginMessage, error.message || "Google sign-in failed.", "error");
    } finally {
        googleLoginButton.disabled = false;
    }
});

document.getElementById("refreshButton").addEventListener("click", loadAdminData);
document.getElementById("signOutButton").addEventListener("click", async () => {
    try {
        await window.nitiAuth.signOut();
    } catch (error) {
        setMessage(dashboardMessage, error.message || "Could not sign out. Please try again.", "error");
    }
});

window.nitiAuth.onAuthStateChanged(user => {
    currentAdminUser = user || null;
    loginPanel.hidden = Boolean(user);
    dashboard.hidden = !user;
    if (!user) {
        setMessage(loginMessage, "");
        setMessage(dashboardMessage, "");
        document.getElementById("accountLabel").textContent = "";
        document.getElementById("contactCount").textContent = "—";
        document.getElementById("briefCount").textContent = "—";
        document.getElementById("contactSectionCount").textContent = "—";
        document.getElementById("briefSectionCount").textContent = "—";
        setListState(contactList, "Sign in to load records.");
        setListState(briefList, "Sign in to load records.");
        return;
    }
    document.getElementById("accountLabel").textContent = user.email || user.uid;
    loadAdminData();
});
