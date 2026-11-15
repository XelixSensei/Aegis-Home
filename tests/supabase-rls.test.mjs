// Runs supabase/migrations in PGlite (real Postgres in WebAssembly) with a small stand-in for
// Supabase's auth and storage schemas, then checks who can see and change what.
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';

test('Supabase row level security keeps care data private', {timeout: 120000}, async () => {

const db = new PGlite({extensions: {pgcrypto}});
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema extensions; create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid default auth.uid());
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated;
  grant all on storage.objects to authenticated; grant select on storage.buckets to authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);
for (const file of fs.readdirSync(new URL('../supabase/migrations/', import.meta.url)).sort())
  await db.exec(fs.readFileSync(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'));

const ids = {};
const people = {elder: '919876543210', care: '919811111111', stranger: '919822222222', home: '919833333333', farHome: '919844444444', admin: '919855555555'};
for (const [who, digits] of Object.entries(people)) {
  ids[who] = crypto.randomUUID();
  await db.query('insert into auth.users values ($1, $2)', [ids[who], `${digits}@phone.aegis.app`]);
}
async function as(who, sql, params = []) {
  await db.exec('reset role');
  if (who) {
    await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({sub: ids[who], email: `${people[who]}@phone.aegis.app`, role: 'authenticated'})]);
    await db.exec('set role authenticated');
  } else await db.query(`select set_config('request.jwt.claims', '', false)`);
  try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role'); }
}
const fails = async (who, sql, params, label) => { await assert.rejects(as(who, sql, params), undefined, label); };
let checks = 0; const ok = (cond, label) => { assert.ok(cond, label); checks++; };

// Profiles
const roles = {elder: 'grandparent', care: 'caretaker', stranger: 'caretaker', home: 'elderly_home', farHome: 'elderly_home', admin: 'caretaker'};
for (const who of Object.keys(people)) await as(who, 'insert into profiles (id, role, full_name, phone) values ($1, $2, $3, $4)', [ids[who], roles[who], who, '+' + people[who]]);
await fails('stranger', `insert into profiles (id, role, full_name, phone) values ($1, 'grandparent', 'x', '+919899999999')`, [ids.stranger], 'second profile'); checks++;
await as(null, 'insert into admins values ($1)', [ids.admin]);
await fails('elder', `update profiles set role = 'caretaker' where id = $1`, [ids.elder], 'role change blocked'); checks++;
await as('elder', `update profiles set full_name = 'Kamla' where id = $1`, [ids.elder]);
ok((await as('stranger', 'select * from profiles where id = $1', [ids.elder])).length === 0, 'stranger cannot see elder');

// Phone must match login address
const spoof = crypto.randomUUID();
await db.query('insert into auth.users values ($1, $2)', [spoof, '919866666666@phone.aegis.app']);
ids.spoof = spoof; people.spoof = '919866666666';
await fails('spoof', `insert into profiles (id, role, full_name, phone) values ($1, 'grandparent', 'x', '+919876500000')`, [spoof], 'phone spoof'); checks++;

// Care circle
await as('elder', `insert into medicines (elder_id, name, time_ist) values ($1, 'BP tablet', '08:00')`, [ids.elder]);
ok((await as('care', 'select * from medicines')).length === 0, 'caretaker sees nothing before invite');
await fails('care', 'select create_invite()', [], 'caretaker cannot invite'); checks++;
const [{create_invite: code}] = await as('elder', `select create_invite('view')`);
ok(/^\d{6}$/.test(code), 'six-digit code');
ok((await as('care', 'select accept_invite($1, $2) as r', ['+' + people.elder, code === '000000' ? '111111' : '000000']))[0].r === false, 'wrong code rejected');
ok((await as('care', 'select accept_invite($1, $2) as r', ['+' + people.elder, code]))[0].r === true, 'right code accepted');
ok((await as('care', 'select * from medicines')).length === 1, 'caretaker can now read medicines');
ok((await as('care', 'select * from profiles where id = $1', [ids.elder])).length === 1, 'caretaker sees elder profile');
ok((await as('elder', 'select * from profiles where id = $1', [ids.care])).length === 1, 'elder sees caretaker profile');
await fails('care', `insert into medicines (elder_id, name, time_ist) values ($1, 'x', '09:00')`, [ids.elder], 'view-only cannot add'); checks++;
const [link] = await as('elder', 'select id from care_links where elder_id = $1', [ids.elder]);
await as('elder', `select set_link_permission($1, 'manage')`, [link.id]);
await as('care', `insert into medicines (elder_id, name, time_ist) values ($1, 'Vitamin D', '09:00')`, [ids.elder]);
ok((await as('elder', 'select * from medicines')).length === 2, 'manage caretaker can add');
ok((await as('stranger', 'select * from medicines')).length === 0, 'stranger still sees nothing');
ok((await as('stranger', 'select accept_invite($1, $2) as r', ['+' + people.elder, code]))[0].r === false, 'used code cannot be reused');

// Brute-force limit
const [{create_invite: code2}] = await as('elder', `select create_invite('view')`);
for (let i = 0; i < 5; i++) await as('stranger', 'select accept_invite($1, $2)', ['+' + people.elder, code2 === '999999' ? '888888' : '999999']);
ok((await as('stranger', 'select accept_invite($1, $2) as r', ['+' + people.elder, code2]))[0].r === false, 'locked after 5 attempts');

// Check-ins and storage
await fails('care', `insert into dose_checkins (elder_id, day, photo_path) values ($1, '2026-11-15', 'x')`, [ids.elder], 'only elder checks in'); checks++;
await as('elder', `insert into storage.objects (bucket_id, name) values ('checkins', $1)`, [`${ids.elder}/2026-11-15/a.jpg`]);
await fails('elder', `insert into storage.objects (bucket_id, name) values ('checkins', $1)`, [`${ids.care}/x.jpg`], 'no writing to others'); checks++;
ok((await as('care', `select * from storage.objects where bucket_id = 'checkins'`)).length === 1, 'caretaker can see photo');
ok((await as('stranger', `select * from storage.objects where bucket_id = 'checkins'`)).length === 0, 'stranger cannot see photo');

// Elderly homes: verification and nearest alerts
await as('home', `insert into elderly_homes (profile_id, org_name, licence_number, status, lat, lng) values ($1, 'Asha Niwas', 'MH-123', 'approved', 19.0760, 72.8777)`, [ids.home]);
ok((await as('home', 'select status from elderly_homes where profile_id = $1', [ids.home]))[0].status === 'pending', 'self-approval ignored');
await fails('home', `update elderly_homes set status = 'approved' where profile_id = $1`, [ids.home], 'home cannot approve itself'); checks++;
await fails('elder', `insert into elderly_homes (profile_id, org_name, licence_number) values ($1, 'x', 'y12')`, [ids.elder], 'only home role'); checks++;
await as('farHome', `insert into elderly_homes (profile_id, org_name, licence_number, lat, lng) values ($1, 'Delhi Home', 'DL-9', 28.61, 77.20)`, [ids.farHome]);
const [alertPending] = await as('elder', `select raise_alert('abandoned', 19.08, 72.88, 'help') as id`);
ok((await as('home', 'select * from alerts')).length === 0, 'pending home gets no alerts');
await as('admin', `update elderly_homes set status = 'approved' where profile_id = $1`, [ids.home]);
await as(null, `update elderly_homes set status = 'approved' where profile_id = $1`, [ids.farHome]);
const [a] = await as('elder', `select raise_alert('abandoned', 19.08, 72.88, 'I have been left alone') as id`);
ok((await as('home', 'select * from alerts where id = $1', [a.id])).length === 1, 'nearby approved home receives alert');
ok((await as('farHome', 'select * from alerts where id = $1', [a.id])).length === 0, 'far home does not');
ok((await as('home', 'select * from profiles where id = $1', [ids.elder])).length === 1, 'home sees the elder who alerted');
ok((await as('care', 'select * from alerts')).length === 2, 'caretaker sees both alerts');
await as('home', 'select acknowledge_alert($1)', [a.id]);
ok((await as('elder', 'select status from alerts where id = $1', [a.id]))[0].status === 'acknowledged', 'home acknowledged');
await fails('home', `select raise_alert('emergency')`, [], 'homes cannot raise'); checks++;
await fails('elder', `select raise_alert('missed_dose')`, [], 'missed dose from server only'); checks++;
await fails('elder', `insert into alerts (elder_id, kind) values ($1, 'emergency')`, [ids.elder], 'no direct alert insert'); checks++;
const near = await as('stranger', 'select * from nearest_homes(19.07, 72.87)');
ok(near.length === 1 && near[0].org_name === 'Asha Niwas', 'nearest_homes finds the Mumbai home only');

// Licences: home and admin only
await as('home', `insert into storage.objects (bucket_id, name) values ('licences', $1)`, [`${ids.home}/licence.pdf`]);
ok((await as('admin', `select * from storage.objects where bucket_id = 'licences'`)).length === 1, 'admin can see licence');
ok((await as('elder', `select * from storage.objects where bucket_id = 'licences'`)).length === 0, 'others cannot');

// Anonymous visitors see nothing and cannot call functions
await fails(null, 'set role anon; select * from profiles', [], 'anon'); checks++;
await db.exec('reset role');
// Leaving the circle
await as('care', 'delete from care_links where caretaker_id = $1', [ids.care]);
ok((await as('care', 'select * from medicines')).length === 0, 'after leaving, no access');
assert.ok(checks >= 38);
await db.close();
});
