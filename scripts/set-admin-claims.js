require("dotenv").config();

const { applicationDefault, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const adminUids = [...new Set(
    (process.env.ADMIN_UIDS || "")
        .split(",")
        .map(uid => uid.trim())
        .filter(Boolean)
)];

if (!adminUids.length) {
    throw new Error("Set at least one Firebase user UID in ADMIN_UIDS in the private .env file.");
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Set GOOGLE_APPLICATION_CREDENTIALS to the private Firebase service-account JSON file.");
}

initializeApp({ credential: applicationDefault() });

async function grantAdminClaims() {
    const auth = getAuth();
    for (const uid of adminUids) {
        const user = await auth.getUser(uid);
        await auth.setCustomUserClaims(uid, { ...user.customClaims, admin: true });
        console.log(`Granted the admin claim to Firebase UID ${uid}.`);
    }
}

grantAdminClaims().catch(error => {
    console.error("Could not configure Firebase administrator claims:", error.code || error.message);
    process.exitCode = 1;
});
