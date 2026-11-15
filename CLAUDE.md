# Aegis Home — working notes for Claude

Bilingual (English/Hindi) elderly-care and medication app for older people in India and their carers, built for the PromptWars / Catalyst hackathon (brief: `docs/challenge.md`). Repo: `github.com/XelixSensei/Aegis-Home`. Owner: Xelix.

**Keep this file current.** After every significant change, add an entry to the change log at the bottom and update the checklist, so a new chat can pick up from here.

## Rules from Xelix (important)
- **Do not redesign the UI.** Keep the white-and-gold design, colours, fonts and layout exactly as they are. Each step only enhances the parts it touches, using the existing classes (`.card`, `.btn`, `.btn.secondary`, `.notice`, `.message`, `.alarm-*`) and tokens (`--gold`, `--cream`, `--ink`, `--muted`, `--border`, `--soft`).
- **Do not add anything extra** beyond what the step asks for.
- Work step by step on branches. **Show a preview (screenshots + preview file) and get approval before pushing or merging** each step.

## Stack and layout
- Front end: plain HTML/CSS/JS with no build step. Back end:
  - small Node endpoints in `api/` (Vercel functions), reused by `scripts/serve.cjs` locally
  - **Supabase** for accounts and shared data (see `docs/supabase-setup.md`)
- Dependencies: `@anthropic-ai/sdk`. Dev: `@electric-sql/pglite`. Browser: `@supabase/supabase-js@2.118.0` from jsdelivr.
- `public/index.html` loads its scripts in this order: `app.js` → `dose-ledger.js` → `medicines.js` → `alarm-clock.js` → `alarms.js` → `saathi-local.js` → `music-guide.js` → `step4.js` → supabase-js (CDN) → `phone.js` → `backend.js` → `step5.js`. The CSS files are `style.css`, `medicines.css`, `alarms.css` and `step4.css`.
- `app.js`: the core UI. It has a global `state`, page renderers, `render()`, `bind()`, `actions`, `modal()`, `toast()` and `save()`. Lines are very long and minified-style. The page map inside `render()` is fixed: home, meds, routine, appointments, music, chat, care, settings. A new page means changing `render()` and the `navs` list.
- Pure logic in UMD form, so it runs in the browser and in Node tests:
  - `dose-ledger.js`: medicine status
  - `alarm-clock.js`: routine and appointment alarms; appointment `leads` are minutes before the visit, from `[1440,60,15,0]`
  - `saathi-local.js`: offline Saathi replies
  - `music-guide.js`: the question tree and query builder
- `step4.js` wraps `chatPage`, `chatSend`, `musicPage`, `appointmentsPage`, `scheduleForm`, `showAlarm` and `bind`. The music player (`#music-dock`) lives outside `#app`, so re-renders don't stop the music.
- Server:
  - `server/claude.cjs`: model `claude-opus-5-5`, with `fallbacks: 'default'` and beta `server-side-fallback-2026-07-01`
  - `server/saathi.cjs`: system prompt and input cleaning
  - `server/music.cjs`: YouTube Data API, or Claude `web_search_20260209` as a fallback
  - `server/http.cjs`: JSON parsing, rate limiting and errors
- **Supabase:**
  - Schema and RLS live in `supabase/migrations/0001_core.sql`; `tests/supabase-rls.test.mjs` runs it in PGlite with an auth/storage stub (38 checks).
  - Login is the WhatsApp number + a 6-digit passcode. There is no OTP (Xelix's choice): it is email/password auth on `<91number>@phone.aegishome.app`, with "Confirm email" off.
  - The `profiles` insert policy checks that the phone matches the login address.
  - Roles: `grandparent`, `caretaker`, `elderly_home`.
  - Care circle: `create_invite()` gives a 6-digit code (24 hours, 5 tries), redeemed with `accept_invite(phone, code)`.
  - Homes are `pending` until an admin approves them. `raise_alert('abandoned', lat, lng)` sends to approved homes within their radius (`nearest_homes`).
  - Storage buckets: `checkins`, `licences`, `loved-ones`, with paths `<elder id>/...`.
  - `public/backend.js` is the only browser file that talks to Supabase. `/api/config` serves the URL and anon key; `/api/keepalive` runs on a daily Vercel cron.
- Keys go in `.env`, which is git-ignored (see `.env.example`): `ANTHROPIC_API_KEY`, `YOUTUBE_API_KEY`, `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Both are optional; without them the app falls back to offline Saathi and YouTube links.

## Conventions
- **Extending functions:** later files wrap earlier functions instead of editing them, e.g. `const bindBeforeStep4 = bind; bind = function(){ bindBeforeStep4(); ... }`. New steps get a new `stepN.js` and `stepN.css`.
- **Strings:** every user-facing string goes through `t('English', 'हिन्दी')`. Escape user data with `esc()`.
- **Time:** use India Standard Time (`Asia/Kolkata`) everywhere.
- **Storage:** app state lives in localStorage under `aegis-step2-v1`. Photos live in IndexedDB.
- **Adding a public file:** reference it in `index.html`. The server serves anything in `public/` with a known extension, `npm run check` covers every JS file automatically, and the preview build inlines every `<link>` and `<script>`.
- **Honest copy:** never mention a feature that isn't built yet. Say plainly when AI or search is offline.

## Commands
```sh
npm install
npm start                    # http://127.0.0.1:4174 (reads .env)
npm test                     # node:test, tests/*.test.cjs + *.test.mjs (30 tests, including Supabase RLS)
npm run check                # syntax check of every JS file
npm run build:preview        # writes previews/<aegisStep>.html (aegisStep is set in package.json)
```
In-app Chrome screenshots time out on this machine. Use headless Chrome over CDP instead; the script used is in the session scratchpad (`shots/shoot.mjs` pattern: launch chrome `--headless=new --remote-debugging-port`, then `Emulation.setDeviceMetricsOverride` 390×844 for phone).

## Workflow
- Each step gets its own branch (`Step1`, `step-2`, …), notes in `docs/step-N.md`, screenshots in `docs/screens/` and a downloadable `previews/step-N.html`. It is merged to `main` by PR only after Xelix approves it.
- Hosting: Vercel after all steps (the `api/` functions are ready). A Cloud Run deployment is also **required** by the challenge.

## Status checklist (Xelix's plan)
**Done**
- [x] Step 1: white-and-gold UI, EN/HI, larger text, local medicines, routines, appointments, music links, sample Saathi (PR #1)
- [x] Step 2: daily medicine photo check-ins in IST, stored locally (PR #2)
- [x] Step 3: on-device routine and appointment alarms with chime, snooze and acknowledge (PR #3)
- [x] Step 4 (branch `step-4`, **awaiting Xelix's approval**): Saathi works with normal chatting (live AI or offline); Peace & music guided picker (singer → type → faith or style → plays an in-app YouTube embed); appointment alarms 1 day, 1 hour or 15 minutes before and at the time

**Step 5** (next)
- [ ] Quote box (EN/HI by preference, simple words, occasional sarcasm, never repeating): educates against religious discrimination, about the reality of beliefs without attacking faith, on littering and civic sense, and other things elders should know
- [ ] UI enhancement, not a redesign: thicker and more readable font, bigger text and buttons, 3 size levels for text and UI
- [ ] Better phone layout, plus phone screenshots
- [x] Login types: Grandparent / Caretaker / Elderly Home, using WhatsApp number + passcode, via Supabase (branch `step-5`; needs Xelix's Supabase project and keys to try live). Elderly Home: licence number, certificate upload and location; admin approval.
- [ ] Care circle UI (create and accept invite codes); the backend functions are ready
- [ ] Narrator: reads aloud whatever the finger touches or hovers over, for blind users
- [ ] Short tutorial on first use
- [ ] Loved ones section: name or nickname, photo, video, voice notes

**Step 6**
- [ ] WhatsApp: emergency messages, medicine photo sharing to the care circle, live location
- [ ] Today's medicines: recording a photo marks a dose taken; the care circle can see the photos; alert the care circle when no meds are taken
- [ ] Profile buttons: "I've been abandoned" alert to the nearest verified elderly homes (with location), and a caretaker emergency alert
- [ ] Emergency services section: hospital/ambulance 108, police 100/112, fire 101, women 1091, Elderline 14567 and others

**After the steps**
- [ ] Deploy to Vercel and push to GitHub; Cloud Run deployment for the challenge; final testing and submission

## Change log
Newest first.

- **2026-11-15 (Step 5, accounts)**: Branch `step-5`, built on `step-4`, v0.5.0.
  - Added Supabase: migration, RLS test in PGlite, `phone.js`, `backend.js`, `step5.js` and `step5.css` (account modal, Settings account card, clickable top-bar chip; avatar-only on phones).
  - Added `api/config.js`, `api/keepalive.js`, `server/supabase.cjs` and `vercel.json` (output `public`, daily cron), and `docs/supabase-setup.md`.
  - The preview builder keeps https scripts as links.
  - Not yet run against a real Supabase project.

- **2026-11-15 (Step 4)**: Branch `step-4`, v0.4.0.
  - Added `api/` + `server/` endpoints: `/api/saathi`, `/api/music`, `/api/health`.
  - `serve.cjs` now serves all of `public/`, loads `.env`, and routes the API.
  - Added `saathi-local.js`, `music-guide.js`, `step4.js` and `step4.css`. `alarm-clock.js` gained appointment `leads`; the Step 3 keys are unchanged.
  - Saathi replies show call buttons for 112, 108, 14567 and 14416, a Listen button (speech synthesis) and a mic button (speech recognition).
  - Generalised the preview builder; added `scripts/check.cjs`; 25 tests.
  - Added `docs/step-4.md` and `docs/screens/step-4-*.png`.
  - Not yet tested with real keys.
- **2026-11-15**: Created this CLAUDE.md after reviewing the repo (v0.3.0, Steps 1–3 merged).
