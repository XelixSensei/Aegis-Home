# Where we go from here

We are starting with a usable design, then adding the services that make it dependable. Each step should leave something we can open, test, and understand.

## Step 1 · Find the right feel

**Built:** the white-and-gold interface, English/Hindi switching, larger text, local medicine schedules, routines, appointments, music options, and a sample Yaar conversation.

**Still to review:** the layout in a real browser, on a phone, with a keyboard, and with someone who is less comfortable using apps. Small labels and touch targets need particular attention before calling the app accessible.

## Step 2 · Put the person in control

- Add sign-in and care profiles.
- Invite family or caregivers with expiring passcodes, attempt limits, and server-side checks.
- Separate permission to view from permission to manage care.
- Let the profile owner remove access.
- Keep a record of who changed a medicine or appointment.

The earlier architecture proposed Next.js, TypeScript, Firebase Auth, and Firestore. These are plans; Step 1 is plain HTML, CSS, and JavaScript.

## Step 3 · Make schedules reliable

- Store schedules in India Standard Time and show that clearly.
- Create a separate record for each scheduled dose and preserve its history.
- Handle changes to prescriptions without rewriting past records.
- Send emails for upcoming doses, unrecorded doses, and appointments.
- Prevent duplicate emails and make failed deliveries visible.
- Let a Trusted People member follow up when needed. A dose that was not recorded is not proof it was missed.

Cloud Scheduler and an email provider were proposed for this stage. The provider has not been selected.

## Step 4 · Give Yaar a real voice

- Connect a real AI service with clear disclosure that Yaar is AI.
- Support conversation in Hindi and English.
- Keep medicine doses and treatment decisions with the person's clinician.
- Decide what conversations, if any, are saved, and make that choice clear.
- Keep music optional. An embedded catalogue will need suitable playback rights and reliable sources.

## Step 5 · Prepare for the challenge

- Test access permissions, schedules, reminder delivery, and the full shared-care flow.
- Review keyboard use, contrast, readable text, and mobile layouts.
- Deploy to Google Cloud Run and check the actual deployed app.
- Write a short project description and prepare the demo.
- Check the final submission carefully: the last scored attempt counts, not the best one.
