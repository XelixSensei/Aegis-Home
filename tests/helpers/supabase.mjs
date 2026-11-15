// A real Postgres (PGlite) with a small stand-in for Supabase's auth and storage schemas,
// and every migration in supabase/migrations applied in order.
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';

export async function setupSupabase(people) {
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
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  for (const file of fs.readdirSync(dir).sort()) await db.exec(fs.readFileSync(new URL(file, dir), 'utf8'));

  const ids = {};
  for (const [who, digits] of Object.entries(people)) {
    ids[who] = crypto.randomUUID();
    await db.query('insert into auth.users values ($1, $2)', [ids[who], `${digits}@phone.aegis.app`]);
  }
  /* Runs SQL as a signed-in person (or as the dashboard/service when who is null). */
  async function as(who, sql, params = []) {
    await db.exec('reset role');
    if (who) {
      await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({sub: ids[who], email: `${people[who]}@phone.aegis.app`, role: 'authenticated'})]);
      await db.exec('set role authenticated');
    } else await db.query(`select set_config('request.jwt.claims', '', false)`);
    try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role'); }
  }
  const fails = (who, sql, params, label) => assert.rejects(as(who, sql, params), undefined, label);
  return {db, ids, as, fails};
}
