# NITI AI

## Run with MongoDB

Use Node.js 22 or newer.

1. Install and start MongoDB Community Server, or create an Atlas database.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` to your MongoDB connection string and `MONGODB_DB` to the database name. Keep `.env` private.
3. In Firebase Console, open **Project settings → Service accounts**, generate a private key for the same Firebase project used by `firebase-config.js`, and save the downloaded JSON as `firebase-service-account.json` in this folder. Do not commit or share this file.
4. Set `GOOGLE_APPLICATION_CREDENTIALS` in `.env` to that JSON file path. This service account lets the backend verify signed-in users; the MongoDB URI stays on the server.
5. On Windows, run `npm.cmd install`, then `npm.cmd start` from PowerShell.
6. Open `http://localhost:5500` and sign in. Briefs, contact requests, and favorites are saved in MongoDB collections named `briefs`, `contactRequests`, and `favorites`.

The website keeps Firebase Authentication for account sign-in. MongoDB stores the app's project data; connecting Compass alone does not transfer existing Firestore data.

## Optional AI web search chat

1. Create an API key in your AI provider account and add it to the private `.env` as `AI_API_KEY`. Keep it secret and never put it in browser code or share it.
2. Optionally set `AI_MODEL` and `AI_BASE_URL` if using a compatible provider that supports the Responses API and web-search tool.
3. Restart with `npm.cmd start`, sign into NITI AI, open the chat, and explicitly enable **AI search** before asking a question. Answers are generated server-side and may include web citations.

AI chat is disabled until a key is configured and the user opts in. Chat messages are sent to the configured AI provider only after opt-in and are not saved by this app. The medical-report helper remains browser-only and does not send its step-by-step answers to the AI provider. Do not submit sensitive personal or medical information to AI chat. Provider usage may incur charges.
