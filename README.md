# NITI AI

## Run with MongoDB

Use Node.js 22 or newer.

1. Install and start MongoDB Community Server, or create an Atlas database.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` to your MongoDB connection string and `MONGODB_DB` to the database name. Keep `.env` private.
3. In Firebase Console, open **Project settings → Service accounts**, generate a private key for the same Firebase project used by `firebase-config.js`, and save the downloaded JSON as `firebase-service-account.json` in this folder. Do not commit or share this file.
4. Set `GOOGLE_APPLICATION_CREDENTIALS` in `.env` to that JSON file path. This service account lets the backend verify signed-in users; the MongoDB URI stays on the server.
5. On Windows, run `npm.cmd install`, then `npm.cmd start` from PowerShell.
6. Open `http://localhost:5500` and sign in. Structured creative briefs, contact requests, and favorites are saved in MongoDB collections named `briefs`, `contactRequests`, and `favorites`.

The website keeps Firebase Authentication for account sign-in. MongoDB stores the app's project data; connecting Compass alone does not transfer existing Firestore data.

## Secure admin dashboard

The free Firebase Hosting dashboard at `/admin` reads contact requests and project briefs directly from Firestore. Firestore security rules allow normal signed-in users to read only their own records; a Firebase Auth custom claim (`admin: true`) grants read-only access to these two collections for the configured administrator. New saves include the signed-in customer's email, which the rules validate against their Firebase Auth token; older records without an email still show their Firebase UID. No service-account key or database credential is included in browser code.

The root Express app's MongoDB admin mode is for local development only. It reads MongoDB records as well as Firestore records, but the Firebase Hosting admin dashboard displays Firestore records only.

To add an administrator:

1. Sign in to Firebase Console and open **Authentication → Users**. Copy the user's Firebase UID.
2. Set that UID in your private `.env` as `ADMIN_UIDS=your-firebase-user-uid`. The local service-account file configured by `GOOGLE_APPLICATION_CREDENTIALS` must have permission to manage Firebase Authentication custom claims.
3. From the repository root, run `npm.cmd run admin:set-claims` to grant the `admin: true` claim to each configured UID. This command preserves any other custom claims. Each administrator must sign out and sign back in (or refresh their ID token) after claim changes.
4. The Firebase Hosting deploy publishes the `/admin` route and `firestore.rules.txt`. Deploy from an account authorized to release Hosting and Firestore rules. Only records in the `briefs` and `contactRequests` collections receive the admin read exception; users' write restrictions and ownership checks remain in place.

The dashboard reports loading, empty, and error states, supports Google or email/password sign-in, and shows up to the latest 200 records per collection. The deployed dashboard is <https://niti-ai-2ba5d.web.app/admin>. To run the Hosting emulator locally, use `firebase emulators:start --only hosting --project niti-ai-2ba5d` and open <http://127.0.0.1:5000/admin>; authentication and Firestore requests still use the configured Firebase project. A deployment updates the live Firestore rules; review them before deploying.

## Creator catalog local development

The frontend is plain HTML/CSS/browser JavaScript. A small Node HTTP server can run its CSV-backed UI without MongoDB or Firebase credentials:

```powershell
node serve-local.js
```

Open <http://localhost:5500/public/index.html>. To run the full Express/MongoDB app instead, configure the private environment values described in **Run with MongoDB**, install dependencies with `npm.cmd install`, and run `npm.cmd start`; the Express app serves the same root CSV endpoint.

If port `5500` is already in use, stop the other server or choose another port in PowerShell:

```powershell
$env:PORT=5501
node serve-local.js
```

Then open <http://localhost:5501/public/index.html>.

Edit only `data/creators.csv`. Run `npm.cmd run prepare:hosting-data` to generate the static hosting copy at `public/data/creators.csv` when preparing another static bundle. Firebase Hosting runs this sync automatically before deploy. The Docker image copies the root CSV into its Nginx document root.

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

From a creator profile, brands can save an engagement request or start a brief with that creator as a stored preference. Briefs save campaign details, deliverables, platform/format, tool preferences, deadline, budget, and usage terms through the active deployment's existing storage path. Confirmations describe only what was saved: they do not claim creator receipt or acceptance, availability, or a transaction. The local brief-assist helper provides clearly labeled demo suggestions; it does not send project details to an AI provider.

## Creator CSV dataset

The site uses plain HTML, CSS, and browser JavaScript. Its creator catalog has one source of truth at `data/creators.csv`; `public/creator-data.js` fetches and validates that CSV before rendering cards and profiles. Search covers creator and portfolio text. Category, skill, location, and minimum-rating filters and the sort menu all operate on the loaded CSV records. While loading, the page announces its state; a failed/malformed CSV shows the error and a retry button rather than displaying stale records.

The ten original records contain fictional mock data. Nani AI Studio is an additional sparse SAMPLE / DEMO profile containing only the creator details supplied for the prototype. The visible page labels mock creator records, ratings, reviews, prices, and revenue as MOCK / DEMO data; replace them with verified information before using them as marketplace facts. All revenue and pricing columns contain integer Indian rupees (INR).

| Column | Type and meaning |
| --- | --- |
| `id` | Unique text identifier |
| `name`, `location`, `category` | Text; location and category may be blank |
| `skills`, `specializations`, `tools` | Separate JSON arrays of strings; skills, specializations, and tools are not interchangeable |
| `rating`, `reviewCount`, revenue, prices, and project counts | Optional mock numeric values; leave blank when unknown. Revenue and prices are integer INR |
| `socialLinks` | JSON array of `{ "platform": "...", "handle": "...", "url": "https://..." }` objects; use `[]` when none are supplied |
| `portfolio` | JSON array of mock portfolio objects with `title`, `client`, `status` (`Completed` or `In progress`), `description`, `format`, `placeholder`, `toolsUsed`, and `commercialUse`; an optional `thumbnail` must be an HTTPS URL. Use `[]` when no items are supplied |
| `reviews` | JSON array of 2–3 mock review objects (`author`, `rating` from 1–5, and `text`), or `[]` when no reviews are supplied |

The JSON arrays and objects must be valid JSON inside their CSV cells. Quote a CSV cell containing commas, quotes, or line breaks with double quotes, and escape each embedded double quote by doubling it. Keep the header names and order shown in the example.

```csv
id,name,location,category,skills,specializations,tools,rating,reviewCount,totalRevenue,monthlyRevenue,reelPrice,promotionPrice,storyPrice,totalProjects,completedProjects,activeProjects,socialLinks,portfolio,reviews
creator-011,Nani AI Studio,,,"[""AI Video Generation"",""AI Filmmaking"",""Prompt Engineering"",""AI Advertising""]","[""AI Film & Video"",""Advertising & Campaign Creative""]","[""Runway"",""Kling AI"",""Midjourney"",""ElevenLabs""]",,,,,,,,,,,[],[],[]
```

The browser derives the card role, short bio, tool list, project workflow, and content formats from these CSV fields. `public/data/creators.csv` is generated from the root CSV by `npm run prepare:hosting-data`; Firebase Hosting runs that sync automatically before deploying. The Docker image copies the same source CSV to its static document root. Do not edit the generated hosting copy.

## Brief data model

Briefs saved through the app contain `title`, `brand`, `goal`, `description`, `type`, `visualStyle`, `visualReferences`, `deliverables`, integer `quantity`, `format`, `targetPlatform`, `requiredTools`, `preferredTools`, `deadline`, numeric `budget`, boolean `commercialUseRequired`, `usageDuration`, and `intendedChannels`. A brief started from a creator profile also contains optional `selectedCreatorName`, which records a preference only; it does not represent an offer or agreement. Brief records also include the signed-in `userId` and a storage-generated `createdAt`. The backend validates brief values before saving; Firestore rules enforce ownership and the document field types/limits.

```js
{
  title: "Summer product launch",
  brand: "Example Brand",
  goal: "Build awareness for a product launch",
  description: "A campaign for a new reusable bottle.",
  type: "AI Video",
  visualStyle: "Warm daylight, clean product close-ups",
  visualReferences: "Brand moodboard link or reference notes",
  deliverables: "One vertical launch video and two cutdowns",
  quantity: 3,
  format: "9:16 vertical",
  targetPlatform: "Instagram",
  requiredTools: "",
  preferredTools: "Runway Gen-3",
  deadline: "YYYY-MM-DD",
  budget: 25000,
  commercialUseRequired: true,
  usageDuration: "6 months",
  intendedChannels: "Organic social and paid ads",
  selectedCreatorName: "Arjun AI Studio", // optional creator preference
  userId: "<signed-in user's Firebase UID>",
  createdAt: "<server-generated timestamp>"
}
```

The supported `type` values are `AI Video`, `AI Image`, `AI Ads`, and `Social Media`. Replace the illustrative deadline and timestamp placeholders with valid values when creating a real brief.

Commercial-use fields describe the brand's requested terms: whether commercial use is required, how long the content is intended to be used, and the channels where it may appear. These requested terms and the demo portfolio labels do not grant a license. Confirm actual tool/model terms and creator rights directly before any real campaign use.

## Hackathon demo walkthrough (about 2–3 minutes)

1. **0:00–0:30 — Discover:** Open the creator section, search for a skill, location, or creator, and combine category, skill, location, and minimum-rating filters. Sort by rating, reviews, revenue, pricing, project count, or name; point out the live result count and clear/reset option.
2. **0:30–1:10 — Evaluate:** Open a profile. Scan its mock rating/reviews, INR revenue and prices, project counts, sample portfolio, and demo social handles. Emphasize that all supplied catalog records are fictional.
3. **1:10–1:45 — Start an engagement:** Choose **Contact** to show the save progress and confirmation, or choose **Hire creator** to carry the selected creator into the brief as a preference.
4. **1:45–2:30 — Create a brief:** Enter campaign details, deliverables, target platform/format, deadline, budget, required or preferred tools, and intended usage. Optionally use the local demo assist on a rough idea; review its suggestions and manually fill any missing brand, deadline, and budget fields. Save and show the brief summary/creator preference in the confirmation.
5. **2:30–2:45 — Set expectations:** Explain that demo profiles, portfolio examples, ratings, match scores, and trust signals are illustrative. A saved request or brief is not proof of delivery, creator receipt or acceptance, availability, commercial rights, or a completed transaction.

## Run the prototype for a demo

For the MongoDB-backed root app, follow **Run with MongoDB** above: configure private `.env` values and the Firebase Admin service-account path, run `npm.cmd install` and `npm.cmd start`, open `http://localhost:5500`, and sign in with Firebase Authentication. Real brief and engagement-request saves require the configured MongoDB and authenticated session.

For the Firebase static deployment, install and authenticate the Firebase CLI, select the intended Firebase project, and run `firebase deploy --only hosting` from the repository root. Firebase Authentication and Firestore must be enabled/configured for that project. The current `firebase.json` configures Hosting only; `firestore.rules.txt` is a reference rules file and is not automatically deployed by that Hosting command. Deploy the reviewed Firestore rules through the Firebase Console before testing authenticated writes. Docker serves the same `public/` build, but Docker alone does not start Firebase or MongoDB services. Keep project credentials and API keys private.

For a UI-only local walkthrough without backend persistence, run `node serve-local.js` and open `http://localhost:5500/public/index.html`. This static preview serves the UI and CSV-backed mock creator catalog; it does not run the root API or save a real request/brief. For persisted root-app saves, use **Run with MongoDB** above. For persisted Firebase saves, use the configured Firebase Hosting deployment.

## NITI AI chat setup

The Firebase-hosted site sends chat and image-generation requests to a Cloudflare Worker using the Workers AI binding. The Worker verifies Firebase App Check tokens before running `@cf/meta/llama-3.2-3b-instruct` for chat or `@cf/black-forest-labs/flux-1-schnell` for images; no AI provider API key is placed in browser code. Image generation is available from the chat panel's **Create image** tab, supports visual-style and composition presets, and returns a downloadable JPEG. Video generation is not included. Cloudflare currently includes 10,000 Neurons per day at no charge on its Free plan. Chat and image usage share this daily allocation; the page explains the limit but does not show the account's live remaining Neurons. Usage beyond the free allocation requires Workers Paid and is billed, while Workers Free requests stop until the allocation resets. See [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) and the [FLUX.1 schnell model details](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/).

To deploy the AI backend and connect it to Firebase Hosting:

1. Create or sign in to a Cloudflare account that has Workers AI available.
2. From the repository root, run `npx wrangler login`, then deploy the Worker with `npx wrangler deploy --config cloudflare/wrangler.jsonc`. The config binds Workers AI and restricts requests to this Firebase project/app and the configured site origins.
3. Copy the `workers.dev` URL printed by Wrangler. Set `window.NITI_AI_CHAT_WORKER_URL` in `public/ai-config.js` to that exact base URL (for example, `https://niti-ai-chat.example-subdomain.workers.dev`, without a trailing slash).
4. From the repository root, run `firebase deploy --only hosting` to publish the configured site.
5. Test the live chat. For localhost development, register that browser's Firebase App Check debug token for the web app; never use a debug token on the deployed site or commit it.

The Cloudflare Worker validates the Firebase App Check token signature against Firebase's public keys and checks the project, app, issuer, audience, and expiry. It also validates chat request size and shape, restricts browser origins to the project's Firebase Hosting domains and localhost, and returns an explicit message when the daily AI allocation is exhausted. Chat messages are sent to Cloudflare Workers AI to generate a response and are not saved by this app.
