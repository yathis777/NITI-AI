# NITI AI

## Run with Docker

Build the image from the repository root:

```sh
docker build -t niti-ai .
```

Start the web app on port 8080:

```sh
docker run --rm -p 8080:80 niti-ai
```

Open <http://localhost:8080>.

The container serves the Firebase Hosting site from `public/` with Nginx. Firebase Authentication and Firestore remain hosted services, so the app still requires network access to Firebase and a valid configuration in `public/firebase-config.js`.

## NITI AI chat setup

The site includes a Gemini-powered chat assistant. Before using it, open the Firebase Console for project `niti-ai-2ba5d`, go to **AI Services → AI Logic → Get started**, and enable the Gemini Developer API provider.

If Firebase App Check is enforced for AI Logic, register the web app with Fraud Defense (reCAPTCHA Enterprise) in **Security → App Check**, then paste its site key into `appCheckSiteKey` in `ai-chat.js` (and `public/ai-chat.js`). For local development, use Firebase's App Check debug token flow and register the token in the console. Do not commit a debug token or use it for the public deployment. The Firebase AI Logic web SDK and Gemini model are initialized in `ai-chat.js`; no Gemini API key is embedded in the site.

