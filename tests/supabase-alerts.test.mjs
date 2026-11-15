// Step 6 database rules: emergency and abandonment alerts, live location, and the missed-medicine check.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {setupSupabase} from './helpers/supabase.mjs';

test('alerts reach the right people and missed medicines are noticed once', {timeout: 120000}, async () => {
  const people = {elder: '919876543210', care: '919811111111', stranger: '919822222222', home: '919833333333'};
  const {db, ids, as, fails} = await setupSupabase(people);
  const roles = {elder: 'grandparent', care: 'caretaker', stranger: 'caretaker', home: 'elderly_home'};
  for (const who of Object.keys(people)) await as(who, 'insert into profiles (id, role, full_name, phone) values ($1, $2, $3, $4)', [ids[who], roles[who], who, '+' + people[who]]);
  const [{create_invite: code}] = await as('elder', `select create_invite('view')`);
  await as('care', 'select accept_invite($1, $2)', ['+' + people.elder, code]);

  // Emergency alert with live location
  const [{id}] = await as('elder', `select raise_alert('emergency', 19.07, 72.87, 'Please come') as id`);
  assert.equal((await as('care', 'select * from alerts where id = $1', [id])).length, 1, 'caretaker sees the alert');
  assert.equal((await as('stranger', 'select * from alerts where id = $1', [id])).length, 0, 'stranger does not');
  await as('elder', 'select update_alert_location($1, $2, $3)', [id, 19.1, 72.9]);
  const [moved] = await as('care', 'select lat, lng from alerts where id = $1', [id]);
  assert.deepEqual([moved.lat, moved.lng], [19.1, 72.9], 'caretaker sees the new location');
  await as('care', 'select update_alert_location($1, $2, $3)', [id, 1, 1]);
  assert.equal((await as('elder', 'select lat from alerts where id = $1', [id]))[0].lat, 19.1, 'only the elder can move their location');
  await as('stranger', 'select resolve_alert($1)', [id]);
  assert.equal((await as('elder', 'select status from alerts where id = $1', [id]))[0].status, 'open', 'a stranger cannot resolve it');
  await as('care', 'select acknowledge_alert($1)', [id]);
  assert.equal((await as('elder', 'select status from alerts where id = $1', [id]))[0].status, 'acknowledged');
  await as('elder', 'select resolve_alert($1)', [id]);
  assert.equal((await as('care', 'select status from alerts where id = $1', [id]))[0].status, 'resolved', '"I am safe now" resolves it');
  await as('elder', 'select update_alert_location($1, $2, $3)', [id, 20, 73]);
  assert.equal((await as('care', 'select lat from alerts where id = $1', [id]))[0].lat, 19.1, 'location stops updating once resolved');

  // Missed medicine check (times are in India time)
  const [{hour}] = await as(null, `select extract(hour from now() at time zone 'Asia/Kolkata')::int as hour`);
  if (hour < 2) return; // too close to India midnight for "earlier today" times; skip the timing part
  const add = (name, minutesAgo) => as(null, `insert into medicines (elder_id, name, time_ist, created_at)
    values ($1, $2, ((now() at time zone 'Asia/Kolkata') - make_interval(mins => $3))::time, now() - interval '1 day') returning id`, [ids.elder, name, minutesAgo]);
  const [missed] = await add('BP tablet', 60);
  const [taken] = await add('Vitamin D', 60);
  await add('Soon', 10);     // still inside the 30-minute grace period
  await as('elder', `insert into dose_checkins (elder_id, medicine_id, day, photo_path) values ($1, $2, (now() at time zone 'Asia/Kolkata')::date, 'x.jpg')`, [ids.elder, taken.id]);
  await fails('elder', 'select check_missed_doses()', [], 'people cannot run the missed-dose check themselves');
  assert.equal((await as(null, 'select check_missed_doses() as n'))[0].n, 1, 'one medicine was missed');
  assert.equal((await as(null, 'select check_missed_doses() as n'))[0].n, 0, 'the same miss is never alerted twice');
  const alerts = await as('care', `select message from alerts where kind = 'missed_dose'`);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0].message, /BP tablet/, 'the caretaker sees which medicine');
  assert.equal(missed.id.length, 36);
  assert.equal((await as('stranger', `select * from alerts where kind = 'missed_dose'`)).length, 0);
  await db.close();
});
