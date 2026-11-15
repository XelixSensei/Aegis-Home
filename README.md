<div align="center">

![Aegis Home — A little care. A little comfort. Every day.](docs/banner.svg)

**A calmer place for everyday care.**

Medicines, daily routines, familiar music, and a little company — in English and Hindi.

[Try the latest preview](previews/step-4.html) · [Build notes](docs/step-4.md) · [The challenge](docs/challenge.md)

</div>

## A little more peace of mind

Aegis Home is being built for older people in India and the people who care about them. Everyday care should feel familiar: clear choices, comfortable reading, and room to do things at your own pace.

## What you can try today

| Feature | What works |
|---|---|
| Medicines | Add schedules and save a daily photo check-in on your device. |
| Daily routine | Add activities, mark them complete for today, and set an alarm. |
| Appointments | Save or edit a visit; alarms ring 1 day, 1 hour or 15 minutes before, and at the time. |
| Alarms | Try the chime, acknowledge a reminder, or snooze for five minutes. Times use IST. |
| English and Hindi | Switch language without leaving the page. |
| Peace and music | Saathi asks a few easy questions (singer, type of music, faith) and plays songs inside the app. Or play your own audio, or take a quiet minute. |
| Saathi | Chat about anything in English, Hindi or Hinglish. Live AI with a key; a simpler offline Saathi without one. Emergency words show 112/108 call buttons. |

**Photos stay on this device.** They document a check-in, not proof of taking medicine. Care-circle sharing, WhatsApp, email delivery, and secure sign-in are not connected yet.

**Keep the app open and your device awake for alarms.** Background and locked-screen delivery are still to come.

## Open the preview

Open [previews/step-4.html](previews/step-4.html), choose **Download raw file**, and open it in Chrome or Edge. GitHub shows the code until you download it.

For local development and camera access:

```sh
git clone https://github.com/XelixSensei/Aegis-Home.git
cd Aegis-Home
npm install
cp .env.example .env   # optional keys for live Saathi and in-app music
npm start
```

Visit **http://127.0.0.1:4174**. Without keys, Saathi runs offline and music opens on YouTube.

```sh
npm test                # Scheduling and medicine checks
npm run check           # JavaScript syntax
npm run build:preview   # Rebuild the latest downloadable preview
```

## Our checkpoints

| Step | Focus | Notes |
|---|---|---|
| [Step 1](previews/step-1.html) | First English and Hindi design preview | [Design notes](docs/step-1.md) |
| [Step 2](previews/step-2.html) | Daily medicine photo check-ins | [Photo storage](docs/step-2.md) |
| [Step 3](previews/step-3.html) | Routine and appointment alarms | [Reminder notes](docs/step-3.md) |
| [Step 4](previews/step-4.html) | Saathi chat, guided music, early appointment alarms | [Step 4 notes](docs/step-4.md) |

Each reviewed step has its own branch and is merged through a separate pull request.

## Find your way around

| Folder | Contents |
|---|---|
| `public/` | App pages, styles, and interactions |
| `previews/` | Downloadable checkpoints |
| `api/`, `server/` | Saathi and music endpoints (Vercel functions, also used locally) |
| `scripts/` | Local server, checks and preview builder |
| `tests/` | Scheduling and medicine tests |
| `docs/` | Challenge, roadmap, and build notes |

## Still ahead

Sign-in for grandparents, caretakers and elderly homes; care circles; WhatsApp alerts; emergency help; loved-ones section; and accessibility improvements. The [roadmap](docs/roadmap.md) records the wider plan.

Vercel hosting is planned after the app is complete. The hackathon also requires a working Cloud Run deployment; that remains part of the submission plan.

---

*A little care. A little comfort. Every day.*
