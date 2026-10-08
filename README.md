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

## Run with Docker

The existing Docker image serves the static Firebase Hosting site from `public/` using Nginx. Build it from the repository root:

```sh
docker build -t niti-ai .
```

Start it on port 8080:

```sh
docker run --rm -p 8080:80 niti-ai
```

Open <http://localhost:8080>. This static deployment uses the files in `public/` and Firebase services; it does not run the root Node/MongoDB API. Use the Node.js instructions above to run the current MongoDB-backed app and AI chat.

Firebase Authentication and Firestore remain hosted services, so the static site requires network access to Firebase and a valid configuration in `public/firebase-config.js`. Neither Firebase Hosting nor the Docker container proxies requests to the root Node/MongoDB backend.

## NITI AI chat setup

The Firebase-hosted static site includes a Gemini-powered chat assistant. Before using it, open the Firebase Console for project `niti-ai-2ba5d`, go to **AI Services → AI Logic → Get started**, and enable the Gemini Developer API provider.

If Firebase App Check is enforced for AI Logic, register the web app with Fraud Defense (reCAPTCHA Enterprise) in **Security → App Check**, then configure the site key in `public/ai-chat.js`. For local development, use Firebase's App Check debug token flow and register the token in the console. Do not commit a debug token or use it for the public deployment. The Firebase AI Logic web SDK and Gemini model are initialized in `public/ai-chat.js`; no Gemini API key is embedded in the static site.
