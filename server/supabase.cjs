/* Server-side Supabase helpers. Uses plain REST calls, so no extra packages are needed. */
const configured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

/* Browser settings. The anon key is designed to be public; Row Level Security protects the data. */
const publicConfig = () => configured() ? {url: process.env.SUPABASE_URL, anonKey: process.env.SUPABASE_ANON_KEY} : null;

/* One tiny query a day keeps a free Supabase project from pausing. */
async function ping() {
  if (!configured()) return [503, {error: 'backend_unavailable'}];
  const key = process.env.SUPABASE_ANON_KEY;
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/elderly_homes?select=profile_id&limit=1`, {
    headers: {apikey: key, Authorization: `Bearer ${key}`}, signal: AbortSignal.timeout(10_000),
  });
  return [response.ok ? 200 : 502, {ok: response.ok}];
}

module.exports = {configured, publicConfig, ping};
