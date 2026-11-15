# Step 2 — one feature at a time

## 1. Medicines: implemented locally

- Each scheduled medicine has its own daily check-in, using India Standard Time.
- Camera capture or a chosen photo is required before saving a check-in.
- Photos are resized and re-encoded, then stored in this browser's IndexedDB. They are not uploaded.
- A separate consent checkbox explains local storage. Removing a check-in deletes its photo.
- Status changes from upcoming to due, then overdue after a 30-minute grace period. This is a display rule, not medical advice.
- Previous days remain in the recent check-in list. A new day never inherits yesterday's taken status.
- A storage failure does not mark a medicine as taken.

A photo records a person's check-in. It cannot prove ingestion or establish which medication was taken. Sample medicines remain examples, not prescriptions.

Camera capture requires HTTPS or localhost and permission. A file chooser is available if the camera is unavailable. Local records are not encrypted by the app and are accessible to anyone using the same browser profile. Browser data can be cleared; this is not a production clinical record.

## Still to build

2. Verified phone sign-in, consent-based Trusted People, private shared photos, and missed-check-in delivery with delivery status.
3. Routine and appointment reminders, including a reliable server scheduler.
4. Live Yaar chat and guided YouTube playback.
5. Three accessible interface sizes, narration, tutorial, and a reviewed phone preview.
6. Emergency contacts and care-home assistance, with human verification of organizations.
7. Loved-one photos, videos and voice notes; varied bilingual learning cards.
8. Vercel deployment and end-to-end checks.

The Step 2 branch must remain separate from main until Xelix approves the result. No messages, emergency requests, or photos are sent in this first slice.
