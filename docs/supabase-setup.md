# Setting up Supabase for Aegis Home

Aegis Home uses Supabase for accounts and for care data shared between phones. People sign in with their **WhatsApp number and a 6-digit passcode**. No SMS or OTP is sent, so there is nothing to pay for.

Without Supabase the app still works, but everything stays on one device.

## 1. Create the project (5 minutes)
1. Go to **https://supabase.com** → *Start your project* → sign in with GitHub.
2. Click **New project**.
   - Name: `aegis-home`
   - Database password: let Supabase generate one, and save it in your password manager.
   - Region: **South Asia (Mumbai)**, the closest to your users.
   - Plan: Free.
3. Wait about a minute while it starts.

## 2. Turn off email confirmation
Sign-in uses the phone number, so Supabase must not wait for an email.

**Authentication → Sign In / Providers → Email**: keep **Email** enabled, turn **Confirm email** **off**, then **Save**.

If you skip this, sign-up shows: "Sign-up is not finished on the server yet".

## 3. Create the tables
1. Open **SQL Editor → New query**.
2. Paste the whole of [`supabase/migrations/0001_core.sql`](../supabase/migrations/0001_core.sql) and click **Run**.
3. You should see "Success. No rows returned". The tables appear under **Table Editor**: `profiles`, `care_links`, `elderly_homes`, `medicines`, `dose_checkins`, `alerts`, `loved_ones`, `admins`.

The same SQL is tested automatically (`npm test`) against a real Postgres engine, with 38 checks of who can see what.

### Step 6 update
Also run [`supabase/migrations/0002_alerts.sql`](../supabase/migrations/0002_alerts.sql) the same way. It adds live location, "I'm safe now", live alerts, and a check every 10 minutes for medicines that were not checked in (Supabase Cron). It is safe to run more than once.

## 4. Connect the app
1. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
2. In the project folder, copy `.env.example` to `.env` and fill in:
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
   The anon key is meant to be public; the database rules protect the data. **Never** put the `service_role` key in the app or in git.
3. Run `npm start` and open http://127.0.0.1:4174. The terminal says `Accounts: on`, and the app asks who is using it.

## 5. Make yourself an admin (to verify elderly homes)
1. Sign up in the app with your own number (any role).
2. In **SQL Editor**, run:
   ```sql
   insert into public.admins (profile_id)
   select id from public.profiles where phone = '+91XXXXXXXXXX';  -- your number
   ```

## 6. Verify an elderly home
India has no public API for checking care-home licences, so a person checks them:
1. **Table Editor → elderly_homes** lists homes with `status = pending`.
2. Open **Storage → licences → <home id>** to see the uploaded registration certificate. Check the registration number with the state Social Welfare department.
3. Set `status` to `approved`, or to `rejected` with a `review_note` explaining why. Only approved homes receive "I have been abandoned" alerts, and only within their service radius.

## 7. On Vercel (later, when we deploy)
Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` under **Project → Settings → Environment Variables**. `vercel.json` already runs `/api/keepalive` once a day, so the free project doesn't pause after a week without visitors.

## Who can see what
| Person | Can see |
|---|---|
| Grandparent | Their own profile, medicines, check-in photos, alerts and loved ones; people in their care circle |
| Caretaker | Nothing, until the grandparent shares a 6-digit invite code (valid 24 hours, 5 tries). Then the grandparent's data; changes only with "manage" permission |
| Elderly home | Its own details; an elder's alert and profile only when that alert was sent to it |
| Admin | Homes waiting for verification and their certificates |

A grandparent can remove a caretaker at any time, and a caretaker can leave.
