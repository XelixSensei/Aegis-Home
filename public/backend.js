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

  /* ---------- Care circle ---------- */
  async function careLinks() {
    const {data, error} = await client.from('care_links')
      .select('id, permission, accepted_at, expires_at, elder:profiles!care_links_elder_id_fkey(id, full_name, phone), caretaker:profiles!care_links_caretaker_id_fkey(id, full_name, phone)')
      .not('accepted_at', 'is', null).order('accepted_at');
    if (error) throw fail('load_failed', error);
    return data;
  }
  async function rpc(name, args) {
    const {data, error} = await client.rpc(name, args);
    if (error) throw fail(name + '_failed', error);
    return data;
  }
  const createInvite = perm => rpc('create_invite', {perm});
  async function acceptInvite(phone, code) {
    const number = Phone.normalize(phone);
    if (!number) throw fail('bad_phone');
    if (!/^\d{6}$/.test(String(code))) throw fail('bad_code');
    if (!await rpc('accept_invite', {elder_phone: number, code: String(code)})) throw fail('wrong_code');
  }
  async function removeLink(id) {
    const {error} = await client.from('care_links').delete().eq('id', id);
    if (error) throw fail('remove_failed', error);
  }
  const setPermission = (link, perm) => rpc('set_link_permission', {link, perm});

  /* ---------- Loved ones (shared with the care circle) ---------- */
  const baseType = blob => String(blob.type || '').split(';')[0];
  async function upload(path, blob) {
    const {error} = await client.storage.from('loved-ones').upload(path, blob, {contentType: baseType(blob), upsert: false});
    if (error) throw fail('upload_failed', error);
    return path;
  }
  const extOf = blob => ({'image/png': 'png', 'image/webp': 'webp', 'video/webm': 'webm', 'video/mp4': 'mp4', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3'})[baseType(blob)] || 'jpg';
  async function lovedList() {
    const {data, error} = await client.from('loved_ones').select('*').eq('elder_id', profile.id).order('created_at');
    if (error) throw fail('load_failed', error);
    const paths = data.flatMap(p => [p.photo_path, p.video_path, ...p.voice_paths]).filter(Boolean);
    const urls = {};
    if (paths.length) {
      const signed = await client.storage.from('loved-ones').createSignedUrls(paths, 3600);
      for (const s of signed.data || []) if (s.signedUrl) urls[s.path] = s.signedUrl;
    }
    return data.map(p => ({id: p.id, name: p.name, relation: p.relation || '', photo: urls[p.photo_path] || null,
      video: urls[p.video_path] || null, voices: p.voice_paths.map(v => urls[v]).filter(Boolean)}));
  }
  async function lovedAdd({name, relation, photo, video, voices = []}) {
    const id = crypto.randomUUID(), base = `${profile.id}/${id}`;
    const row = {id, elder_id: profile.id, name, relation: relation || null, voice_paths: []};
    if (photo) row.photo_path = await upload(`${base}/photo.${extOf(photo)}`, photo);
    if (video) row.video_path = await upload(`${base}/video.${extOf(video)}`, video);
    for (const [i, v] of voices.entries()) row.voice_paths.push(await upload(`${base}/voice-${Date.now()}-${i}.${extOf(v)}`, v));
    const {error} = await client.from('loved_ones').insert(row);
    if (error) throw fail('save_failed', error);
  }
  async function lovedAddVoice(id, blob) {
    const {data, error} = await client.from('loved_ones').select('voice_paths').eq('id', id).single();
    if (error) throw fail('load_failed', error);
    const path = await upload(`${profile.id}/${id}/voice-${Date.now()}.${extOf(blob)}`, blob);
    const result = await client.from('loved_ones').update({voice_paths: [...data.voice_paths, path]}).eq('id', id);
    if (result.error) throw fail('save_failed', result.error);
  }
  async function lovedRemove(id) {
    const {data} = await client.from('loved_ones').select('*').eq('id', id).single();
    const {error} = await client.from('loved_ones').delete().eq('id', id);
    if (error) throw fail('remove_failed', error);
    const paths = data ? [data.photo_path, data.video_path, ...data.voice_paths].filter(Boolean) : [];
    if (paths.length) await client.storage.from('loved-ones').remove(paths);
  }

  /* ---------- Step 6: shared medicines and check-in photos ---------- */
  /* Mirrors the grandparent's medicine list online so the care circle and the missed-dose check can see it. */
  async function syncMedicines(meds) {
    const rows = meds.map(m => ({id: m.remoteId, elder_id: profile.id, name: m.name, dose: m.dose || null, note: m.note || null, time_ist: m.time, active: true}));
    if (rows.length) {
      const {error} = await client.from('medicines').upsert(rows);
      if (error) throw fail('sync_failed', error);
    }
    const keep = rows.map(r => r.id);
    let stale = client.from('medicines').update({active: false}).eq('elder_id', profile.id).eq('active', true);
    if (keep.length) stale = stale.not('id', 'in', `(${keep.join(',')})`);
    const {error} = await stale;
    if (error) throw fail('sync_failed', error);
  }
  async function shareCheckin({medicineId, day, blob}) {
    const path = `${profile.id}/${day}/${medicineId}.jpg`;
    const up = await client.storage.from('checkins').upload(path, blob, {contentType: 'image/jpeg', upsert: true});
    if (up.error) throw fail('upload_failed', up.error);
    const {error} = await client.from('dose_checkins').upsert({elder_id: profile.id, medicine_id: medicineId, day, photo_path: path}, {onConflict: 'medicine_id,day'});
    if (error) throw fail('save_failed', error);
  }
  async function unshareCheckin({medicineId, day}) {
    await client.from('dose_checkins').delete().eq('elder_id', profile.id).eq('medicine_id', medicineId).eq('day', day);
    await client.storage.from('checkins').remove([`${profile.id}/${day}/${medicineId}.jpg`]);
  }
  /* What a caretaker sees for one elder today: medicines, check-ins with photos, and recent alerts. */
  async function elderToday(elderId, day) {
    const [meds, checks, alerts] = await Promise.all([
      client.from('medicines').select('id, name, dose, time_ist').eq('elder_id', elderId).eq('active', true).order('time_ist'),
      client.from('dose_checkins').select('medicine_id, photo_path, taken_at').eq('elder_id', elderId).eq('day', day),
      client.from('alerts').select('*').eq('elder_id', elderId).order('created_at', {ascending: false}).limit(10),
    ]);
    const error = meds.error || checks.error || alerts.error;
    if (error) throw fail('load_failed', error);
    const paths = checks.data.map(c => c.photo_path);
    const urls = {};
    if (paths.length) {
      const signed = await client.storage.from('checkins').createSignedUrls(paths, 3600);
      for (const s of signed.data || []) if (s.signedUrl) urls[s.path] = s.signedUrl;
    }
    const byMed = Object.fromEntries(checks.data.map(c => [c.medicine_id, {...c, photo: urls[c.photo_path] || null}]));
    return {medicines: meds.data.map(m => ({...m, checkin: byMed[m.id] || null})), alerts: alerts.data};
  }

  /* ---------- Step 6: alerts ---------- */
  const raiseAlert = (kind, lat = null, lng = null, message = null) => rpc('raise_alert', {alert_kind: kind, alert_lat: lat, alert_lng: lng, alert_message: message});
  const updateAlertLocation = (id, lat, lng) => rpc('update_alert_location', {alert_id: id, p_lat: lat, p_lng: lng});
  const resolveAlert = id => rpc('resolve_alert', {alert_id: id});
  const acknowledgeAlert = id => rpc('acknowledge_alert', {alert: id});
  const nearestHomes = (lat, lng) => rpc('nearest_homes', {p_lat: lat, p_lng: lng, max_results: 5});
  async function alerts({openOnly = false, limit = 20} = {}) {
    let query = client.from('alerts').select('*, elder:profiles!alerts_elder_id_fkey(id, full_name, phone)').order('created_at', {ascending: false}).limit(limit);
    if (openOnly) query = query.neq('status', 'resolved');
    const {data, error} = await query;
    if (error) throw fail('load_failed', error);
    return data;
  }
  async function getAlert(id) {
    const {data, error} = await client.from('alerts').select('*, elder:profiles!alerts_elder_id_fkey(id, full_name, phone)').eq('id', id).maybeSingle();
    if (error) throw fail('load_failed', error);
    return data;
  }
  /* Live updates for new and changed alerts. Row Level Security decides what arrives. */
  function watchAlerts(onChange) {
    const channel = client.channel('aegis-alerts')
      .on('postgres_changes', {event: '*', schema: 'public', table: 'alerts'}, payload => onChange(payload.new, payload.eventType))
      .subscribe();
    return () => client.removeChannel(channel);
  }

  return {
    start, signUp, signIn, signOut, createProfile, setLang,
    syncMedicines, shareCheckin, unshareCheckin, elderToday,
    raiseAlert, updateAlertLocation, resolveAlert, acknowledgeAlert, nearestHomes, alerts, getAlert, watchAlerts,
    careLinks, createInvite, acceptInvite, removeLink, setPermission,
    loved: {list: lovedList, add: lovedAdd, addVoice: lovedAddVoice, remove: lovedRemove},
    available: () => Boolean(client),
    signedIn: async () => Boolean(client && (await client.auth.getSession()).data.session),
    profile: () => profile,
    home: () => home,
    client: () => client,
  };
})();
