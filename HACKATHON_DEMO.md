# NITI AI — Hackathon Demo

## Data model note

**Creator profile** (sample data in `script.js`): `name`, `role`, `specialization`, `skills[]`, `tools[]` (AI tools/models), `formats[]` (aspect ratios), `workflow`, `location`, sample `rating` and `projects`, demo verification signals, and `portfolio[]`. Each portfolio item has `title`, `type`, `format`, `tools`, `workflow`, and `rights`. Portfolio visuals are generated sample artwork, not client work. The verification UI demonstrates claimed/evidence/verified states; no sample creator has been genuinely checked or verified.

**Brand brief**: `title`, `description`, `type` (content type), `style`, `format` (aspect ratio), `commercialUse`, `budget`, optional `skills[]` and `tools[]`. Authenticated briefs can be saved in the MongoDB `briefs` collection. Matching runs locally in the browser against the sample profiles; no AI model is called. Invitations, project stages, revisions, and delivery approval are stored in browser local storage.

## Two-minute demo

1. Select **Post a Brief**. Enter a rough idea such as “A playful launch video for our new mango drink.” Use **Build a starter brief from template** (local templates, not AI), then choose AI Video, 9:16, commercial use, a budget, and optionally a skill or tool.
2. Submit without signing in to see local matches and their reasons. Try a requirement combination with no match, then edit it or clear optional skill/tool filters.
3. Open a matched creator’s portfolio. Point out the sample-media label, format, tools, workflow, commercial-use demo claim, and explicit unverified evidence status.
4. Invite the creator. In the project tracker, mark work in progress, request a revision, record the revised delivery, then approve it. The prototype project is stored only in the browser.
5. Optionally sign in before submitting if you want the brief itself saved to MongoDB. Matching and project tracking remain local demo functionality.

The homepage statistics describe only the four sample creators, eight sample portfolio items, and local prototype behavior. Creator records, ratings, project counts, rights claims, verification signals, and media are sample data.
