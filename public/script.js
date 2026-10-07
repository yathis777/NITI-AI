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


/* =========================
   FIND CREATORS
========================= */

function findCreators() {

    const section =
        document.getElementById("creators");

    if (section) {

        section.scrollIntoView({
            behavior: "smooth"
        });

    }

    showNotification(
        "AI Creator Search",
        "Showing the best AI creators for you."
    );

}


/* =========================
   SEARCH CREATORS
========================= */

function searchCreators(searchText) {

    const cards =
        document.querySelectorAll(".creator-card");

    const search =
        searchText.toLowerCase().trim();


    cards.forEach(card => {

        const text =
            card.innerText.toLowerCase();

        if (text.includes(search)) {

            card.style.display = "";

        } else {

            card.style.display = "none";

        }

    });

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
// Firebase-backed account, favorites, creator requests, and project briefs.
let authMode = "login";
let currentNitiUser = null;

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
    if (!user || !window.nitiDb) return;
    try {
        const snapshot = await window.nitiDb.collection("users").doc(user.uid).collection("favorites").get();
        const savedNames = new Set(snapshot.docs.map(doc => doc.data().name));
        buttons.forEach(button => setFavoriteButton(button, savedNames.has(button.dataset.creator)));
    } catch (error) {
        console.error("Could not load favorites:", error.code || error.message);
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
    const favoriteId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const ref = window.nitiDb.collection("users").doc(currentNitiUser.uid).collection("favorites").doc(favoriteId);
    if (button) button.disabled = true;
    try {
        const favorite = await ref.get();
        if (favorite.exists) {
            await ref.delete();
            setFavoriteButton(button, false);
            showNotification("Removed from Favorites", name);
        } else {
            await ref.set({ name: name, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            setFavoriteButton(button, true);
            showNotification("Added to Favorites", name);
        }
    } catch (error) {
        console.error("Could not save favorite:", error.code || error.message);
        showNotification("Could not save favorite", error.code || "Please try again.");
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
        await window.nitiDb.collection("contactRequests").add({
            creatorName: name,
            userId: currentNitiUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        closeProfile();
        showNotification("Connection request sent", "Your request to " + name + " has been sent.");
    } catch (error) {
        showNotification("Could not send request", "Please try again.");
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
        await window.nitiDb.collection("briefs").add({
            title: title,
            description: description,
            type: type,
            budget: budget,
            userId: currentNitiUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        closeBrief();
        showAIResult(title, type, budget);
        showNotification("Brief saved", "Your project brief was saved to NITI AI.");
    } catch (error) {
        showNotification("Could not save brief", "Check your connection and Firestore rules, then try again.");
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