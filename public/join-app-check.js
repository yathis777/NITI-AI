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
const appCheckSiteKey = "6LdvteMtAAAAAIkvbYMLIaXXpNCC4SXUDQM075XU";
const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
if (isLocalhost) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

const app = initializeApp(firebaseConfig, "niti-ai-secure-backend");
const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true
});

export async function getNitiAppCheckToken() {
    const { token } = await getToken(appCheck, false);
    return token;
}

window.nitiGetAppCheckToken = getNitiAppCheckToken;
