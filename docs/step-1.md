# Step 1 · The first home for Aegis

Recorded on 15 November 2026.

## What we wanted

A simple app for older people in India, with English and Hindi, a warm white-and-gold palette, medicines and routines close at hand, and room for familiar music and conversation.

The Today screen brings the main tasks together. Separate pages give medicines, routines, appointments, music, Yaar, their Trusted People, and settings room to breathe.

## What we kept deliberately honest

Yaar's replies are scripted examples. The invitation screen does not create a passcode. Reminder settings do not send emails. These features need real backend work before anyone relies on them.

Medicine entries are generic examples, not prescriptions. Taken toggles are local demo state; they do not reset into a new clinical day or create an adherence history. Browser storage is not suitable for real health records or shared care.

## Checks so far

- JavaScript syntax checks passed.
- All eight screens rendered in both languages in a lightweight simulated DOM check. This checks page generation, not browser layout or accessibility.
- The downloadable preview was rebuilt from the source files.
- Browser QA could not be completed because this workspace's local server was unreachable from the browser. Desktop, mobile, keyboard and audio playback checks remain open.

## Review before Step 2

- Can someone find their next medicine without help?
- Is the Hindi wording natural and easy to understand?
- Are labels and buttons comfortably readable at the default size?
- Do controls fit on a small phone without crowding?
- Does each feature explain what it can actually do?
- Does their Trusted People flow make consent and control clear?

Nothing in this step has been deployed to Cloud Run. Pushing the repository saves the design checkpoint; it does not make the care services live.
