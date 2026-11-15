/* Step 6: medicines shared with the care circle, missed-dose and emergency alerts,
   "I've been abandoned" help from verified elderly homes, live location, and emergency numbers.
   WhatsApp messages open on the person's own phone for them to send. In-app alerts arrive by themselves. */
Object.assign(icons, {
  sos: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m5.6 5.6 3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
});
const role = () => Backend.available() ? Backend.profile()?.role : null;
const isElder = () => role() === 'grandparent';
const todayIST = () => DoseLedger.day();
const mapsLink = (lat, lng) => `https://maps.google.com/?q=${lat},${lng}`;
const waTo = (phone, text) => `https://wa.me/${String(phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
const waAny = text => `https://wa.me/?text=${encodeURIComponent(text)}`;
const ago = iso => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return mins < 1 ? t('just now','अभी') : mins < 60 ? t(`${mins} min ago`, `${mins} मिनट पहले`) : t(`${Math.round(mins / 60)} h ago`, `${Math.round(mins / 60)} घंटे पहले`);
};

/* ---------- 1. Medicines and check-in photos, shared with the care circle ---------- */
state.sharedCheckins ||= {};
let medsSignature = '', syncing = false, syncTimer;
async function syncShared() {
  if (!isElder() || syncing) return;
  syncing = true;
  try {
    let changed = false;
    for (const m of state.meds) if (!m.remoteId) { m.remoteId = crypto.randomUUID(); changed = true; }
    if (changed) save();
    const signature = JSON.stringify(state.meds.map(m => [m.remoteId, m.name, m.dose, m.note, m.time]));
    if (signature !== medsSignature) {
      await Backend.syncMedicines(state.meds.map(m => ({remoteId: m.remoteId, name: m.name, dose: m.dose, note: m.note, time: m.time})));
      medsSignature = signature;
    }
    let shared = 0;
    for (const [key, record] of Object.entries(state.checkins || {})) {
      if (state.sharedCheckins[key]) continue;
      const [day, id] = [key.slice(0, 10), key.slice(11)];
      const med = state.meds.find(m => String(m.id) === id);
      if (!med || day < todayIST().slice(0, 8) + '01') continue;
      const blob = await photoStore('get', record.photoId);
      if (!blob) continue;
      await Backend.shareCheckin({medicineId: med.remoteId, day, blob});
      state.sharedCheckins[key] = {medicineId: med.remoteId, day};
      shared++;
    }
    // A check-in removed on this phone is removed for the care circle too.
    for (const [key, info] of Object.entries(state.sharedCheckins)) {
      if (state.checkins[key]) continue;
      await Backend.unshareCheckin(info);
      delete state.sharedCheckins[key];
    }
    save();
    if (shared) toast(t('Your check-in photo is shared with your Trusted People.','आपकी चेक-इन फ़ोटो आपके अपने लोगों से साझा हो गई।'));
  } catch { /* Try again on the next change; the check-in stays safe on this phone. */ }
  syncing = false;
}
const queueSync = () => { clearTimeout(syncTimer); syncTimer = setTimeout(syncShared, 600); };

/* The saved check-in shows whether it was shared, and can be sent on WhatsApp. */
const showCheckinBeforeStep6 = showCheckin;
showCheckin = async function(key) {
  await showCheckinBeforeStep6(key);
  const m = document.querySelector('#modal'), record = state.checkins[key];
  if (!record || !m.open) return;
  const notice = m.querySelector('.notice');
  if (notice && state.sharedCheckins[key]) notice.textContent = t('Shared privately with your Trusted People.','आपके अपने लोगों के साथ निजी रूप से साझा।');
  const share = document.createElement('button');
  share.className = 'btn secondary'; share.innerHTML = `${icon('share')}${t('Send on WhatsApp','व्हाट्सऐप पर भेजें')}`;
  share.onclick = async () => {
    const text = t(`I took my ${record.name} at ${new Date(record.at).toLocaleTimeString('en-IN', {hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata'})}.`, `मैंने ${record.name} ${new Date(record.at).toLocaleTimeString('hi-IN', {hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata'})} बजे ली।`);
    try {
      const blob = await photoStore('get', record.photoId);
      const file = new File([blob], 'checkin.jpg', {type: 'image/jpeg'});
      if (navigator.canShare?.({files: [file]})) return await navigator.share({files: [file], text});
    } catch (error) { if (error?.name === 'AbortError') return; }
    open(waAny(text), '_blank', 'noopener');
  };
  notice?.after(share);
};

/* ---------- 2. Asking for help ---------- */
state.activeAlert ??= null;
let liveWatch = null, lastSent = 0;
function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(p => resolve({lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5)}), () => resolve(null), {enableHighAccuracy: true, timeout: 12000, maximumAge: 60000});
  });
}
function startLiveLocation() {
  if (liveWatch !== null || !state.activeAlert || !navigator.geolocation) return;
  liveWatch = navigator.geolocation.watchPosition(p => {
    const now = Date.now();
    if (now - lastSent < 30000 || !state.activeAlert) return;
    lastSent = now;
    const lat = +p.coords.latitude.toFixed(5), lng = +p.coords.longitude.toFixed(5);
    state.activeAlert.loc = {lat, lng, at: now}; save();
    Backend.updateAlertLocation(state.activeAlert.id, lat, lng).catch(() => {});
    const line = document.querySelector('#live-line');
    if (line) line.textContent = t('Live location shared · updated just now','लाइव लोकेशन साझा · अभी अपडेट हुई');
  }, () => {}, {enableHighAccuracy: true, maximumAge: 15000});
}
function stopLiveLocation() { if (liveWatch !== null) navigator.geolocation.clearWatch(liveWatch); liveWatch = null; }

/* Big buttons arm on the first tap and send on the second, so a slip of the hand sends nothing. */
function armed(button, label) {
  if (button.dataset.armed) return true;
  button.dataset.armed = '1';
  const original = button.innerHTML;
  button.innerHTML = label;
  setTimeout(() => { if (button.isConnected) { delete button.dataset.armed; button.innerHTML = original; } }, 5000);
  return false;
}
async function askForHelp(kind) {
  if (!isElder()) { openAccount(); return; }
  toast(t('Finding your location…','आपकी जगह ढूँढ रहे हैं…'));
  const loc = await getLocation();
  try {
    const message = kind === 'abandoned' ? 'I have been left alone and need a safe place.' : 'I need help.';
    const id = await Backend.raiseAlert(kind, loc?.lat ?? null, loc?.lng ?? null, message);
    const homes = kind === 'abandoned' && loc ? await Backend.nearestHomes(loc.lat, loc.lng).catch(() => []) : [];
    state.activeAlert = {id, kind, at: Date.now(), loc, homes}; save();
    if (!circle.links) await loadCircle();
    startLiveLocation();
    page = 'help'; render(); window.scrollTo(0, 0);
    speakText(kind === 'abandoned' ? t('Help has been asked for. Stay where you are if you can. You can also call Elderline, 1 4 5 6 7.','मदद माँगी गई है। हो सके तो वहीं रहें। आप एल्डरलाइन 1 4 5 6 7 पर भी कॉल कर सकते हैं।') : t('Your family has been alerted.','आपके परिवार को सूचना दे दी गई है।'));
  } catch {
    toast(t('Could not send the alert. Please call 112 now.','अलर्ट नहीं भेज पाए। कृपया अभी 112 पर कॉल करें।'));
  }
}
async function imSafe() {
  const active = state.activeAlert;
  if (!active) return;
  try { await Backend.resolveAlert(active.id); } catch { /* still stop sharing on this phone */ }
  state.activeAlert = null; save(); stopLiveLocation(); render();
  toast(t('Glad you are safe. Location sharing has stopped.','अच्छा हुआ आप सुरक्षित हैं। लोकेशन साझा करना बंद हो गया।'));
}

const numbers = () => [
  ['112', t('All emergencies','सभी आपात स्थितियाँ'), t('Police, fire and ambulance','पुलिस, फ़ायर और एम्बुलेंस')],
  ['108', t('Ambulance','एम्बुलेंस'), t('Medical emergency','मेडिकल इमरजेंसी')],
  ['100', t('Police','पुलिस'), ''],
  ['101', t('Fire','फ़ायर ब्रिगेड'), ''],
  ['14567', t('Elderline','एल्डरलाइन'), t('Help for senior citizens','वरिष्ठ नागरिकों के लिए मदद')],
  ['1091', t('Women helpline','महिला हेल्पलाइन'), ''],
  ['1930', t('Cyber fraud','साइबर ठगी'), t('Money lost to a scam call','ठगी में पैसे गए हों तो')],
  ['14416', t('Tele-MANAS','टेली-मानस'), t('Mental health support','मानसिक स्वास्थ्य सहायता')],
  ['104', t('Health helpline','स्वास्थ्य हेल्पलाइन'), t('Advice in most states','ज़्यादातर राज्यों में सलाह')],
  ['1078', t('Disaster helpline','आपदा हेल्पलाइन'), t('Floods, earthquakes','बाढ़, भूकंप')],
];
function activeAlertCard() {
  const a = state.activeAlert;
  if (!a) return '';
  const where = a.loc ? `${t('My location','मेरी जगह')}: ${mapsLink(a.loc.lat, a.loc.lng)}` : '';
  const message = `${a.kind === 'abandoned' ? t('I have been left alone and need a safe place.','मुझे अकेला छोड़ दिया गया है, मुझे सुरक्षित जगह चाहिए।') : t('I need help. Please come or call me.','मुझे मदद चाहिए। कृपया आइए या फ़ोन कीजिए।')} ${where} (Aegis Home)`;
  const people = (circle.links || []).map(l => `<div class="member"><div class="avatar">${esc(initials(l.caretaker.full_name))}</div><div class="details"><p><strong>${esc(l.caretaker.full_name)}</strong></p><small>${esc(Phone.display(l.caretaker.phone))}</small></div><div class="row-actions"><a class="btn small" href="tel:${esc(l.caretaker.phone)}">${icon('phone')}${t('Call','कॉल')}</a><a class="btn secondary small" target="_blank" rel="noopener" href="${esc(waTo(l.caretaker.phone, message))}">WhatsApp</a></div></div>`).join('');
  const homes = (a.homes || []).map(h => `<div class="member"><div class="avatar">${icon('home')}</div><div class="details"><p><strong>${esc(h.org_name)}</strong></p><small>${t(`${h.distance_km.toFixed(1)} km away`, `${h.distance_km.toFixed(1)} किमी दूर`)} · ${t('Verified home','सत्यापित आश्रम')}</small></div><div class="row-actions"><a class="btn small" href="tel:${esc(h.phone)}">${icon('phone')}${t('Call','कॉल')}</a></div></div>`).join('');
  return `<section class="card wide-card help-active" role="status"><div class="card-title">${icon('sos')}<h2>${a.kind === 'abandoned' ? t('Help is being found for you','आपके लिए मदद ढूँढी जा रही है') : t('Your family has been alerted','आपके परिवार को सूचना दे दी गई है')}</h2></div><p id="live-line" class="muted">${a.loc ? t('Live location shared while this page is open.','यह पेज खुला रहने तक लाइव लोकेशन साझा हो रही है।') : t('Location is off. Turn it on so people can find you.','लोकेशन बंद है। ताकि लोग आप तक पहुँच सकें, इसे चालू करें।')}</p>${a.kind === 'abandoned' ? (homes ? `<h3>${t('Verified elderly homes near you','आपके पास के सत्यापित वृद्धाश्रम')}</h3>${homes}` : `<div class="notice">${t('No verified elderly home is close enough yet. Please call Elderline 14567 — they can arrange a safe place.','अभी पास में कोई सत्यापित वृद्धाश्रम नहीं है। कृपया एल्डरलाइन 14567 पर कॉल करें — वे सुरक्षित जगह दिला सकते हैं।')}</div>`) : ''}${people ? `<h3>${t('Your Trusted People','आपके अपने लोग')}</h3>${people}` : `<div class="notice">${t('No one is in your Trusted People yet. Call 112 if you are in danger.','आपके अपने लोगों में अभी कोई नहीं है। ख़तरा हो तो 112 पर कॉल करें।')}</div>`}<div class="row-actions" style="margin-top:16px"><a class="btn" href="tel:${a.kind === 'abandoned' ? '14567' : '112'}">${icon('phone')}${a.kind === 'abandoned' ? t('Call Elderline 14567','एल्डरलाइन 14567') : t('Call 112','112 पर कॉल')}</a><button class="btn secondary" data-safe>${t('I’m safe now','अब मैं सुरक्षित हूँ')}</button></div></section>`;
}
function helpPage() {
  if (isElder() && !circle.links && !circle.loading) loadCircle();
  const signedOut = !isElder();
  const getHelp = `<section class="card wide-card"><div class="card-title">${icon('sos')}<h2>${t('Get help now','अभी मदद पाएँ')}</h2></div><p class="muted">${t('Tap a button twice to send. Your location is shared so people can reach you.','भेजने के लिए बटन दो बार दबाएँ। आपकी जगह साझा होती है ताकि लोग आप तक पहुँच सकें।')}</p>${signedOut ? `<div class="notice">${Backend.available() ? t('Sign in as a grandparent to alert your family and nearby elderly homes automatically.','अपने परिवार और पास के वृद्धाश्रमों को अपने आप सूचना देने के लिए दादा/दादी खाते से साइन इन करें।') : t('Automatic alerts need the online app. You can still call or send your location on WhatsApp below.','अपने आप सूचना के लिए ऑनलाइन ऐप चाहिए। आप नीचे से कॉल कर सकते हैं या व्हाट्सऐप पर अपनी जगह भेज सकते हैं।')}</div>${Backend.available() ? `<button class="btn" data-account-open>${t('Sign in','साइन इन')}</button>` : ''}` : `<div class="help-buttons"><button class="btn help-btn" data-sos="emergency">${icon('care')}<span><strong>${t('Alert my family','मेरे परिवार को बुलाएँ')}</strong><small>${t('Your Trusted People are told right away, with your location','आपके अपने लोगों को तुरंत आपकी जगह के साथ सूचना')}</small></span></button><button class="btn secondary help-btn" data-sos="abandoned">${icon('home')}<span><strong>${t('I have been abandoned','मुझे छोड़ दिया गया है')}</strong><small>${t('Verified elderly homes near you are told where you are','पास के सत्यापित वृद्धाश्रमों को आपकी जगह बताई जाती है')}</small></span></button></div>`}<div class="help-share"><button class="btn secondary" data-share-location>${icon('pin')}${t('Send my location on WhatsApp','व्हाट्सऐप पर मेरी जगह भेजें')}</button></div></section>`;
  const grid = `<section class="card wide-card" style="margin-top:24px"><h2>${t('Emergency numbers','आपातकालीन नंबर')}</h2><p class="muted">${t('Free to call from any phone in India.','भारत में किसी भी फ़ोन से मुफ़्त कॉल।')}</p><div class="number-grid">${numbers().map(([n, label, sub]) => `<a class="number-card" href="tel:${n}"><strong>${n}</strong><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</a>`).join('')}</div></section>`;
  const nearby = `<section class="card wide-card" style="margin-top:24px"><h2>${t('Find nearby','पास में खोजें')}</h2><div class="row-actions">${[['hospital', t('Hospitals','अस्पताल')], ['police station', t('Police station','पुलिस स्टेशन')], ['pharmacy', t('Medical store','दवा की दुकान')], ['old age home', t('Old age homes','वृद्धाश्रम')]].map(([q, label]) => `<a class="btn secondary" target="_blank" rel="noopener" href="https://www.google.com/maps/search/${encodeURIComponent(q + ' near me')}">${icon('pin')}${label}</a>`).join('')}</div></section>`;
  return `${header(t('Help is one tap away','मदद बस एक बटन दूर'), t('In danger? Call 112 straight away.','ख़तरे में हैं? तुरंत 112 पर कॉल करें।'))}${activeAlertCard()}${state.activeAlert ? '' : getHelp}${grid}${nearby}<div class="notice">${t('Alerts reach your Trusted People and verified homes inside Aegis Home. WhatsApp messages open on your phone for you to send.','अलर्ट Aegis Home के अंदर आपके अपने लोगों और सत्यापित आश्रमों तक पहुँचते हैं। व्हाट्सऐप संदेश आपके फ़ोन पर खुलते हैं, भेजना आपको होता है।')}</div>`;
}
window.extraPages.help = helpPage;
navs.splice(1, 0, ['help', 'Help & emergency', 'मदद और आपातकाल']);
ni.help = 'sos';

/* The same two buttons sit in the profile, as asked. */
const accountBodyBeforeStep6 = accountBody;
accountBody = function() {
  const body = accountBodyBeforeStep6();
  if (!isElder()) return body;
  return body.replace('<div class="form-actions">', `<div class="settings-row profile-help"><div><h3>${t('Need help?','मदद चाहिए?')}</h3><p class="muted">${t('Tap twice to send.','भेजने के लिए दो बार दबाएँ।')}</p></div><div class="row-actions"><button class="btn small" data-sos="emergency">${t('Alert my family','परिवार को बुलाएँ')}</button><button class="btn secondary small" data-sos="abandoned">${t('I have been abandoned','मुझे छोड़ दिया गया है')}</button></div></div><div class="form-actions">`);
};
const bindAccountBeforeStep6 = bindAccount;
bindAccount = function() {
  bindAccountBeforeStep6();
  document.querySelectorAll('#modal [data-sos]').forEach(bindSos);
};
function bindSos(b) {
  b.onclick = () => {
    if (!armed(b, t('Tap again to send','भेजने के लिए फिर दबाएँ'))) return;
    document.querySelector('#modal').open && document.querySelector('#modal').close();
    askForHelp(b.dataset.sos);
  };
}

/* ---------- 3. Alerts arriving for caretakers and elderly homes ---------- */
state.seenAlerts ||= [];
const careAlert = document.createElement('dialog');
careAlert.id = 'care-alert'; careAlert.setAttribute('aria-labelledby', 'care-alert-title');
document.body.append(careAlert);
const alertTitle = a => {
  const name = a.elder?.full_name || t('Someone in your care','आपकी देखभाल में कोई');
  return a.kind === 'missed_dose' ? t(`${name} has not checked in a medicine`, `${name} ने दवा का चेक-इन नहीं किया`)
    : a.kind === 'abandoned' ? t(`${name} needs a safe place`, `${name} को सुरक्षित जगह चाहिए`)
    : t(`${name} needs help`, `${name} को मदद चाहिए`);
};
const alertMessage = a => a.kind === 'missed_dose' ? (a.message || '').replace(/^No check-in yet for /, t('No check-in yet for ','अभी तक चेक-इन नहीं: '))
  : a.kind === 'abandoned' ? t('They say they have been left alone and need a safe place.','उनका कहना है कि उन्हें अकेला छोड़ दिया गया है और सुरक्षित जगह चाहिए।')
  : t('They pressed “Alert my family”.','उन्होंने “परिवार को बुलाएँ” दबाया।');
function alertActions(a) {
  const phone = a.elder?.phone;
  return `${phone ? `<a class="btn small" href="tel:${esc(phone)}">${icon('phone')}${t('Call','कॉल')}</a><a class="btn secondary small" target="_blank" rel="noopener" href="${esc(waTo(phone, t('I saw your alert on Aegis Home. I am on my way / calling you now.','मैंने Aegis Home पर आपका अलर्ट देखा। मैं आ रहा/रही हूँ / अभी फ़ोन कर रहा/रही हूँ।')))}">WhatsApp</a>` : ''}${a.lat != null ? `<a class="btn secondary small" target="_blank" rel="noopener" href="${mapsLink(a.lat, a.lng)}">${icon('pin')}${t('Live location','लाइव लोकेशन')}</a>` : ''}${a.status === 'open' ? `<button class="btn secondary small" data-ack="${a.id}">${t('I’m on it','मैं देख रहा/रही हूँ')}</button>` : ''}${a.status !== 'resolved' ? `<button class="btn secondary small" data-resolve="${a.id}">${t('Resolved','हल हो गया')}</button>` : ''}`;
}
const statusLabel = a => a.status === 'open' ? `<span class="dose-status missed">${t('Needs attention','ध्यान चाहिए')}</span>` : a.status === 'acknowledged' ? `<span class="dose-status due">${t('Someone is on it','कोई देख रहा है')}</span>` : `<span class="dose-status taken">${t('Resolved','हल हो गया')}</span>`;
function alertRow(a) {
  return `<div class="alert-row"><div class="details"><h3>${esc(alertTitle(a))}</h3><p>${esc(alertMessage(a))}</p><p class="muted">${ago(a.created_at)}${a.lat != null && a.kind !== 'missed_dose' ? ` · ${t('location updated','लोकेशन अपडेट')} ${ago(a.updated_at || a.created_at)}` : ''}</p>${statusLabel(a)}</div><div class="row-actions">${alertActions(a)}</div></div>`;
}
function showCareAlert(a) {
  if (state.seenAlerts.includes(a.id)) return;
  state.seenAlerts = [...state.seenAlerts, a.id].slice(-150); save();
  careAlert.innerHTML = `<div class="alarm-kind">${a.kind === 'missed_dose' ? t('Medicine check-in','दवा चेक-इन') : t('Help needed','मदद चाहिए')}</div><h2 id="care-alert-title">${esc(alertTitle(a))}</h2><p>${esc(alertMessage(a))}</p><p class="muted">${ago(a.created_at)}</p><div class="alarm-actions">${alertActions(a)}<button class="btn" data-close-care-alert>${t('Close','बंद करें')}</button></div>`;
  bindAlertButtons(careAlert);
  careAlert.querySelector('[data-close-care-alert]').onclick = () => careAlert.close();
  if (!careAlert.open) careAlert.showModal();
  if (typeof alarmAudio !== 'undefined' && alarmAudio?.state === 'running') chime();
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try { new Notification(alertTitle(a), {body: alertMessage(a), tag: a.id}); } catch { /* not supported on this phone */ }
  }
  if (state.narrator) speakText(`${alertTitle(a)}. ${alertMessage(a)}`);
}
function bindAlertButtons(root) {
  root.querySelectorAll('[data-ack]').forEach(b => b.onclick = async () => { try { await Backend.acknowledgeAlert(b.dataset.ack); refreshAlerts(); careAlert.open && careAlert.close(); toast(t('They will see that someone is on it.','उन्हें पता चलेगा कि कोई देख रहा है।')); } catch { toast(t('Please try again.','फिर कोशिश करें।')); } });
  root.querySelectorAll('[data-resolve]').forEach(b => b.onclick = async () => { try { await Backend.resolveAlert(b.dataset.resolve); refreshAlerts(); careAlert.open && careAlert.close(); } catch { toast(t('Please try again.','फिर कोशिश करें।')); } });
}
let watching = null, inbox = {alerts: null, loading: false}, pollTimer;
async function refreshAlerts() {
  if (!Backend.available() || !Backend.profile() || inbox.loading) return;
  inbox.loading = true;
  try { inbox.alerts = await Backend.alerts({limit: 20}); } catch { inbox.alerts ||= []; }
  inbox.loading = false;
  const mine = Backend.profile()?.id;
  if (role() !== 'grandparent') {
    for (const a of inbox.alerts) if (a.elder_id !== mine && a.status === 'open' && Date.now() - new Date(a.created_at) < 86400000) showCareAlert(a);
  }
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if ((page === 'care' || page === 'help') && !typing && !document.querySelector('#modal').open) render();
}
function startWatching() {
  if (watching || !Backend.available() || !Backend.profile()) return;
  watching = Backend.watchAlerts(() => refreshAlerts());
  refreshAlerts();
  clearInterval(pollTimer);
  pollTimer = setInterval(refreshAlerts, 60000); // a safety net if live updates are interrupted
}
function stopWatching() { watching?.(); watching = null; clearInterval(pollTimer); inbox = {alerts: null, loading: false}; }

/* Caretakers: open alerts at the top, and "Today's care" for each person. Homes: alerts sent to them. */
const careBeforeStep6 = carePage;
carePage = function() {
  let html = careBeforeStep6();
  const r = role();
  if (r !== 'caretaker' && r !== 'elderly_home') return html;
  if (!inbox.alerts && !inbox.loading) refreshAlerts();
  const list = (inbox.alerts || []).filter(a => a.elder_id !== Backend.profile().id);
  const open = list.filter(a => a.status !== 'resolved');
  const notify = 'Notification' in window && Notification.permission === 'default' ? `<button class="text-btn" data-allow-notify>${icon('bell')}${t('Also notify me when this page is in the background','पेज पीछे हो तब भी सूचना दें')}</button>` : '';
  const section = `<section class="card wide-card alerts-card"><div class="card-head"><div class="card-title">${icon('bell')}<h2>${r === 'elderly_home' ? t('Alerts sent to your home','आपके आश्रम को भेजे गए अलर्ट') : t('Alerts','अलर्ट')}</h2></div>${notify}</div>${inbox.alerts === null ? `<p class="empty">${t('Loading…','लोड हो रहा है…')}</p>` : (r === 'elderly_home' ? list : open).length ? (r === 'elderly_home' ? list : open).map(alertRow).join('') : `<p class="empty">${t('No alerts right now. New ones appear here instantly.','अभी कोई अलर्ट नहीं। नए अलर्ट यहाँ तुरंत दिखेंगे।')}</p>`}</section>`;
  if (r === 'elderly_home') return html + section;
  for (const l of circle.links || []) html = html.replace(`<button class="btn secondary small danger" data-link-remove="${l.id}">`, `<button class="btn secondary small" data-today="${l.elder.id}" data-name="${esc(l.elder.full_name)}">${icon('pill')}${t('Today’s care','आज की देखभाल')}</button><button class="btn secondary small danger" data-link-remove="${l.id}">`);
  return html.replace('<section', `${section}<section`);
};
async function showToday(elderId, name) {
  modal(t(`Today for ${name}`, `${name} का आज`), `<p class="empty">${t('Loading…','लोड हो रहा है…')}</p>`);
  try {
    const day = todayIST(), data = await Backend.elderToday(elderId, day);
    const nowMinutes = (() => { const p = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date()).split(':'); return +p[0] * 60 + +p[1]; })();
    const meds = data.medicines.map(m => {
      const [h, mm] = m.time_ist.split(':').map(Number), late = nowMinutes - (h * 60 + mm);
      const status = m.checkin ? 'taken' : late >= 30 ? 'missed' : late >= 0 ? 'due' : 'upcoming';
      const label = {taken: t(`Checked in ${ago(m.checkin?.taken_at)}`, `चेक-इन हुआ ${ago(m.checkin?.taken_at)}`), missed: t('No check-in yet · time passed','अभी चेक-इन नहीं · समय बीत गया'), due: t('Due now','अभी का समय'), upcoming: t('Later today','आज बाद में')}[status];
      return `<div class="today-med"><div class="details"><h3>${esc(m.name)}</h3><p class="muted">${time(m.time_ist.slice(0, 5))}${m.dose ? ` · ${esc(m.dose)}` : ''}</p><span class="dose-status ${status}">${label}</span></div>${m.checkin?.photo ? `<a href="${esc(m.checkin.photo)}" target="_blank" rel="noopener"><img class="today-photo" src="${esc(m.checkin.photo)}" alt="${t('Check-in photo','चेक-इन फ़ोटो')}"></a>` : ''}</div>`;
    }).join('') || `<p class="empty">${t('No medicines shared yet. They appear when your grandparent signs in on their phone.','अभी कोई दवा साझा नहीं। दादा/दादी के फ़ोन पर साइन इन करते ही दिखेंगी।')}</p>`;
    const m = document.querySelector('#modal');
    if (!m.open) return;
    modal(t(`Today for ${name}`, `${name} का आज`), `<h3>${t('Medicines','दवाएँ')}</h3>${meds}${data.alerts.length ? `<h3 style="margin-top:20px">${t('Recent alerts','हाल के अलर्ट')}</h3>${data.alerts.slice(0, 5).map(a => alertRow({...a, elder: {full_name: name}})).join('')}` : ''}<p class="muted" style="margin-top:16px">${t('A photo records a check-in. It cannot prove the medicine was taken.','फ़ोटो चेक-इन दर्ज करती है। इससे दवा लेने का पक्का सबूत नहीं मिलता।')}</p>`);
    bindAlertButtons(document.querySelector('#modal'));
  } catch {
    modal(t(`Today for ${name}`, `${name} का आज`), `<div class="notice">${t('Could not load. Please check your internet.','लोड नहीं हुआ। कृपया इंटरनेट देखें।')}</div>`);
  }
}

/* ---------- Wiring ---------- */
const bindBeforeStep6 = bind;
bind = function() {
  bindBeforeStep6();
  document.querySelectorAll('#app [data-sos]').forEach(bindSos);
  document.querySelector('[data-safe]')?.addEventListener('click', imSafe);
  document.querySelectorAll('#app [data-account-open]').forEach(b => b.onclick = openAccount);
  document.querySelector('[data-share-location]')?.addEventListener('click', async () => {
    toast(t('Finding your location…','आपकी जगह ढूँढ रहे हैं…'));
    const loc = await getLocation();
    if (!loc) return toast(t('Please allow location and try again.','कृपया लोकेशन की अनुमति दें और फिर कोशिश करें।'));
    open(waAny(`${t('This is where I am','मैं यहाँ हूँ')}: ${mapsLink(loc.lat, loc.lng)} (Aegis Home)`), '_blank', 'noopener');
  });
  document.querySelectorAll('[data-today]').forEach(b => b.onclick = () => showToday(b.dataset.today, b.dataset.name));
  document.querySelector('[data-allow-notify]')?.addEventListener('click', async () => { try { await Notification.requestPermission(); } catch {} render(); });
  bindAlertButtons(document.querySelector('#app'));
  if (Backend.profile()) { startWatching(); if (isElder()) { queueSync(); startLiveLocation(); } }
  else if (watching) stopWatching();
};
/* Pick up an alert left open from an earlier visit, unless someone already resolved it. */
window.backendReady.then(async online => {
  if (!online || !state.activeAlert || !isElder()) return;
  const a = await Backend.getAlert(state.activeAlert.id).catch(() => null);
  if (!a || a.status === 'resolved') { state.activeAlert = null; save(); render(); }
  else startLiveLocation();
});
render();
