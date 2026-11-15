# Step 3 — a gentle reminder

This checkpoint builds on Step 2's local medicine photo check-ins. Xelix tested the preview and approved publishing and merging this checkpoint. Hosting is a later step.

## Try it

Download `previews/step-3.html` and open it in Chrome or Edge. For camera access, use `npm start` and visit http://127.0.0.1:4174 instead.

1. Open **My routine** and choose **Try an alarm**. Check your device volume first.
2. Add an activity for a minute or two from now. Leave its reminder checkbox selected.
3. Choose **Start reminders**, keep the app visible, and wait for the time. The reminder should appear with a short, gentle chime.
4. Choose **In 5 minutes**. It should return after five minutes. Choose **Okay, thank you** to acknowledge it. Acknowledging does not mark the activity complete.
5. Choose **Done today** on an activity. Tomorrow in India time it becomes available again.
6. Add an appointment for today, a few minutes ahead. Test its alarm, then edit its time or switch its reminder off.
7. Switch to Hindi and repeat the practice alarm. Try the page on your phone, too.

## What works

- Routines repeat daily; appointments use their saved date and time, all in India Standard Time.
- Reminder settings, acknowledgements, snoozes, and daily completion are saved on this device.
- A reminder can be acknowledged or snoozed five minutes. Multiple due reminders appear one at a time.
- Earlier reminders from today appear when you start reminders or return to the app. Old appointment reminders do not ring on later days.
- Sound starts only after a tap. Each alarm plays a short chime sequence for up to about 20 seconds; the card stays until acknowledged.
- Existing forms and camera check-ins are not interrupted by an alarm dialog.
- Edit, disable, or remove schedules. Completed daily activities do not ring.

## Scope

Keep one app tab open and the device awake. Browser timers and sound can pause in the background or when the screen locks. This is not yet a reliable background reminder service. Restart reminders each time the app opens. No email, WhatsApp, Trusted People alert, or photo upload is sent.

The standalone preview's browser storage may differ from localhost or the future hosted app. Do not expect records to transfer between them automatically.

## Checks

Eight automated scheduling and medicine tests pass, including exact trigger times, IST midnight, snooze boundaries, disabled/deleted schedules, and daily medicine records. JavaScript syntax and the standalone preview build pass. The in-app browser could not reach localhost, so Xelix subsequently tested the preview and confirmed that it works. Full cross-device testing remains pending.

## Checkpoint plan

- `step-2`: published local photo check-ins.
- `step-3`: based on Step 2; preview approved for publishing and merging.
- Each later step builds on the previous reviewed checkpoint. Merge reviewed checkpoints into main through separate pull requests.
- Vercel hosting follows completion. Keep the challenge's Cloud Run deployment requirement in the final submission plan as well.

Browser references: [autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay), [background timers](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout).
