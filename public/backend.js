/* Step 5: the only file that talks to Supabase. Everything else calls Backend.*.
   When the app is opened as a file, or no keys are set, Backend stays off and the app keeps
   working on this device as before. */
const Backend = (() => {
  let client = null, profile = null, home = null;
  const fail = (code, cause) => Object.assign(new Error(code), {code, cause});

  async function start() {
    if (!/^https?:$/.test(location.protocol) || !window.supabase?.createClient) return false;
    try {
      const response = await fetch('/api/config', {signal: AbortSignal.timeout(8000)});
      if (!response.ok) return false;
      const config = await response.json();
      client = window.supabase.createClient(config.url, config.anonKey, {auth: {persistSession: true, autoRefreshToken: true, storageKey: 'aegis-auth'}});
      const {data} = await client.auth.getSession();
      if (data.session) await loadProfile();
      return true;
    } catch { client = null; return false; }
  }

  async function loadProfile() {
    const {data: {user}} = await client.auth.getUser();
    if (!user) { profile = home = null; return null; }
    const {data, error} = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw fail('load_failed', error);
    profile = data;
    home = null;
    if (profile?.role === 'elderly_home') {
      const result = await client.from('elderly_homes').select('*').eq('profile_id', user.id).maybeSingle();
      home = result.data;
    }
    return profile;
  }

  async function saveHome(userId, details) {
    let path = null;
    const file = details.licenceFile;
    if (file) {
      if (file.size > 5 * 1024 * 1024) throw fail('file_too_big');
      const ext = ({'application/pdf': 'pdf', 'image/png': 'png', 'image/webp': 'webp'})[file.type] || 'jpg';
      path = `${userId}/licence-${Date.now()}.${ext}`;
      const {error} = await client.storage.from('licences').upload(path, file, {contentType: file.type, upsert: false});
      if (error) throw fail('upload_failed', error);
    }
    const {error} = await client.from('elderly_homes').upsert({
      profile_id: userId, org_name: details.orgName, licence_number: details.licenceNumber,
      licence_doc_path: path, lat: details.lat, lng: details.lng,
    });
    if (error) throw fail('home_failed', error);
  }

  /* Creates the profile row for a signed-in user (also used if sign-up stopped half-way). */
  async function createProfile({role, name, lang, home: homeDetails}) {
    const {data: {user}} = await client.auth.getUser();
    if (!user) throw fail('signed_out');
    const phone = '+' + user.email.split('@')[0];
    const {error} = await client.from('profiles').insert({id: user.id, role, full_name: name, phone, lang});
    if (error) throw fail(error.code === '23505' ? 'exists' : 'profile_failed', error);
    if (role === 'elderly_home') await saveHome(user.id, homeDetails);
    return loadProfile();
  }

  async function signUp({role, name, phone, passcode, lang, home: homeDetails}) {
    const number = Phone.normalize(phone);
    if (!number) throw fail('bad_phone');
    if (!Phone.validPasscode(passcode)) throw fail('bad_passcode');
    const {data, error} = await client.auth.signUp({email: Phone.loginEmail(number), password: passcode});
    if (error) throw fail(/already|registered|exists/i.test(error.message) ? 'exists' : 'signup_failed', error);
    if (!data.session) throw fail('confirm_email_on');
    return createProfile({role, name, lang, home: homeDetails});
  }

  async function signIn({phone, passcode}) {
    const number = Phone.normalize(phone);
    if (!number) throw fail('bad_phone');
    const {error} = await client.auth.signInWithPassword({email: Phone.loginEmail(number), password: String(passcode || '')});
    if (error) throw fail(/invalid/i.test(error.message) ? 'wrong_login' : 'signin_failed', error);
    return loadProfile();
  }

  async function signOut() { await client?.auth.signOut(); profile = home = null; }

  async function setLang(lang) {
    if (!profile || profile.lang === lang) return;
    const {error} = await client.from('profiles').update({lang}).eq('id', profile.id);
    if (!error) profile = {...profile, lang};
  }

  return {
    start, signUp, signIn, signOut, createProfile, setLang,
    available: () => Boolean(client),
    signedIn: async () => Boolean(client && (await client.auth.getSession()).data.session),
    profile: () => profile,
    home: () => home,
    client: () => client,
  };
})();
