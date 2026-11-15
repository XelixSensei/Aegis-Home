/* Step 5: the real care circle (invite codes) and "My loved ones" (photos, videos, voice notes).
   Loved ones are shared through Supabase for a signed-in grandparent, otherwise kept on this device. */

/* ---------- Loved ones storage ---------- */
const LocalLoved = (() => {
  const db = new Promise((resolve, reject) => {
    const request = indexedDB.open('aegis-loved-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('people', {keyPath: 'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.catch(() => {});
  async function tx(mode, work) {
    const store = (await db).transaction('people', mode).objectStore('people');
    return new Promise((resolve, reject) => {
      const request = work(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  let urls = [];
  const url = blob => { if (!blob) return null; const u = URL.createObjectURL(blob); urls.push(u); return u; };
  return {
    async list() {
      urls.forEach(URL.revokeObjectURL); urls = [];
      const people = await tx('readonly', s => s.getAll());
      return people.sort((a, b) => a.created - b.created).map(p => ({id: p.id, name: p.name, relation: p.relation, photo: url(p.photo), video: url(p.video), voices: (p.voices || []).map(url)}));
    },
    add: ({name, relation, photo, video, voices = []}) => tx('readwrite', s => s.put({id: crypto.randomUUID(), created: Date.now(), name, relation, photo, video, voices})),
    async addVoice(id, blob) { const p = await tx('readonly', s => s.get(id)); p.voices = [...(p.voices || []), blob]; return tx('readwrite', s => s.put(p)); },
    remove: id => tx('readwrite', s => s.delete(id)),
  };
})();
const lovedShared = () => Backend.available() && Backend.profile()?.role === 'grandparent';
const lovedStore = () => lovedShared() ? Backend.loved : LocalLoved;
let loved = {items: null, loading: false, error: ''};
async function loadLoved() {
  if (loved.loading) return;
  loved.loading = true;
  try { loved.items = await lovedStore().list(); loved.error = ''; }
  catch { loved.items = loved.items || []; loved.error = t('Could not load your loved ones. Please check your internet.','आपके अपनों को लोड नहीं कर पाए। कृपया इंटरनेट देखें।'); }
  loved.loading = false;
  if (page === 'loved') render();
}

/* Photos are resized so they load fast on any phone. */
async function shrinkPhoto(file) {
  if (!file || !file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = Object.assign(document.createElement('canvas'), {width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale)});
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise(resolve => canvas.toBlob(b => resolve(b || file), 'image/jpeg', 0.85));
  } catch { return file; }
}

/* Voice notes recorded in the app. */
let recorder = null;
async function toggleRecording(onDone, button) {
  if (recorder) { recorder.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast(t('Recording is not available here. You can choose an audio file instead.','यहाँ रिकॉर्डिंग उपलब्ध नहीं है। आप ऑडियो फ़ाइल चुन सकते हैं।'));
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio: true});
    const type = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(x => MediaRecorder.isTypeSupported(x));
    const chunks = [];
    recorder = new MediaRecorder(stream, type ? {mimeType: type} : undefined);
    recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      const blob = new Blob(chunks, {type: (recorder.mimeType || 'audio/webm').split(';')[0]});
      recorder = null;
      if (button) button.textContent = t('Record a voice note','आवाज़ रिकॉर्ड करें');
      if (blob.size) onDone(blob);
    };
    recorder.start();
    if (button) button.textContent = t('Stop recording','रिकॉर्डिंग रोकें');
    toast(t('Recording… tap Stop when finished.','रिकॉर्ड हो रहा है… पूरा होने पर रोकें दबाएँ।'));
  } catch { recorder = null; toast(t('Please allow the microphone to record.','रिकॉर्ड करने के लिए माइक्रोफ़ोन की अनुमति दें।')); }
}
document.querySelector('#modal').addEventListener('close', () => { if (recorder) recorder.stop(); });

/* ---------- My loved ones page ---------- */
const initials = name => String(name).trim().charAt(0).toUpperCase() || '♥';
function lovedPage() {
  if (!loved.items && !loved.loading) loadLoved();
  const where = lovedShared()
    ? t('Shared safely with your care circle. Family members who can help manage your care can see them too.','आपके देखभाल समूह के साथ सुरक्षित रूप से साझा। देखभाल संभालने वाले परिजन भी इन्हें देख सकते हैं।')
    : t('Saved privately on this device. Sign in as a grandparent to keep them safe online and share with family.','इसी डिवाइस पर निजी रूप से सहेजे गए। ऑनलाइन सुरक्षित रखने और परिवार से साझा करने के लिए दादा/दादी खाते से साइन इन करें।');
  const list = loved.items === null ? `<p class="empty">${t('Loading…','लोड हो रहा है…')}</p>`
    : loved.items.length ? `<div class="loved-grid">${loved.items.map(p => `<button class="card loved-card" data-loved="${p.id}"><span class="loved-photo">${p.photo ? `<img src="${esc(p.photo)}" alt="">` : `<span>${esc(initials(p.name))}</span>`}</span><strong>${esc(p.name)}</strong>${p.relation ? `<small>${esc(p.relation)}</small>` : ''}<small class="loved-meta">${[p.voices.length ? t(`${p.voices.length} voice note${p.voices.length > 1 ? 's' : ''}`, `${p.voices.length} आवाज़`) : '', p.video ? t('video','वीडियो') : ''].filter(Boolean).join(' · ')}</small></button>`).join('')}</div>`
    : `<p class="empty">${t('Add the people you love — a photo, a video, or their voice saying hello.','अपने प्यारों को जोड़ें — एक फ़ोटो, एक वीडियो, या उनकी आवाज़ में नमस्ते।')}</p>`;
  return `${header(t('My loved ones','मेरे अपने'),t('Their faces and voices, always close.','उनके चेहरे और आवाज़ें, हमेशा पास।'))}<div class="notice">${where}</div>${loved.error ? `<div class="notice" role="alert">${esc(loved.error)}</div>` : ''}<section class="card wide-card"><div class="card-head"><h2>${t('My people','मेरे लोग')}</h2><button class="btn" data-loved-add>${icon('plus')}${t('Add someone','किसी को जोड़ें')}</button></div>${list}</section>`;
}
window.extraPages.loved = lovedPage;
navs.splice(navs.findIndex(n => n[0] === 'care'), 0, ['loved', 'My loved ones', 'मेरे अपने']);
ni.loved = 'heart';

function lovedForm() {
  const voices = [];
  modal(t('Add someone you love','किसी अपने को जोड़ें'), `<form id="loved-form"><label>${t('Name or nickname','नाम या प्यार का नाम')}<input name="name" required maxlength="60" placeholder="${t('Like Munna, Chhutki, Raju','जैसे मुन्ना, छुटकी, राजू')}"></label><label>${t('Who are they to you? (optional)','आपके क्या लगते हैं? (वैकल्पिक)')}<input name="relation" maxlength="40" placeholder="${t('Grandson, daughter, friend','पोता, बेटी, दोस्त')}"></label><label>${t('Photo','फ़ोटो')}<input name="photo" type="file" accept="image/*"></label><label>${t('Video (optional)','वीडियो (वैकल्पिक)')}<input name="video" type="file" accept="video/*"></label><div class="settings-row"><div><h3>${t('Voice notes','आवाज़ें')}</h3><p class="muted" id="voice-count">${t('None yet.','अभी कोई नहीं।')}</p></div><div class="row-actions"><button type="button" class="btn secondary" data-record>${t('Record a voice note','आवाज़ रिकॉर्ड करें')}</button></div></div><label>${t('Or choose audio files','या ऑडियो फ़ाइलें चुनें')}<input name="audio" type="file" accept="audio/*" multiple></label><p class="muted" id="loved-status" aria-live="polite"></p><div class="form-actions"><button class="btn" type="submit">${t('Save','सहेजें')}</button></div></form>`);
  const form = document.querySelector('#loved-form'), count = () => { document.querySelector('#voice-count').textContent = voices.length ? t(`${voices.length} recorded`, `${voices.length} रिकॉर्ड हुई`) : t('None yet.','अभी कोई नहीं।'); };
  form.querySelector('[data-record]').onclick = e => toggleRecording(blob => { voices.push(blob); count(); }, e.currentTarget);
  form.onsubmit = async e => {
    e.preventDefault();
    const data = new FormData(form), name = String(data.get('name')).trim();
    if (!name) return;
    const video = data.get('video')?.size ? data.get('video') : null;
    if (video && video.size > 50 * 1024 * 1024) return toast(t('Please choose a video smaller than 50 MB.','कृपया 50 MB से छोटा वीडियो चुनें।'));
    const status = document.querySelector('#loved-status'), submit = form.querySelector('[type=submit]');
    submit.disabled = true; status.textContent = t('Saving… photos and videos can take a moment.','सहेज रहे हैं… फ़ोटो और वीडियो में थोड़ा समय लग सकता है।');
    try {
      await lovedStore().add({name, relation: String(data.get('relation')).trim(), photo: data.get('photo')?.size ? await shrinkPhoto(data.get('photo')) : null,
        video, voices: [...voices, ...data.getAll('audio').filter(f => f.size)]});
      document.querySelector('#modal').close(); loved.items = null; toast(t(`${name} is in your loved ones.`, `${name} आपके अपनों में जुड़ गए।`)); render();
    } catch { submit.disabled = false; status.textContent = t('Could not save. Please check your internet and try again.','सहेज नहीं पाए। इंटरनेट देखकर फिर कोशिश करें।'); }
  };
}

function lovedDetail(id) {
  const p = loved.items.find(x => x.id === id);
  if (!p) return;
  modal(esc(p.name), `<div class="loved-detail">${p.photo ? `<img class="loved-big" src="${esc(p.photo)}" alt="${esc(p.name)}">` : `<span class="loved-photo big"><span>${esc(initials(p.name))}</span></span>`}${p.relation ? `<p class="muted">${esc(p.relation)}</p>` : ''}${p.voices.map((v, i) => `<div class="voice-row"><strong>${t(`Voice note ${i + 1}`, `आवाज़ ${i + 1}`)}</strong><audio controls preload="none" src="${esc(v)}"></audio></div>`).join('')}${p.video ? `<video controls playsinline preload="metadata" src="${esc(p.video)}"></video>` : ''}</div><div class="form-actions"><button class="btn secondary danger" data-loved-remove>${t('Remove','हटाएँ')}</button><button class="btn secondary" data-record>${t('Record a voice note','आवाज़ रिकॉर्ड करें')}</button></div>`);
  const m = document.querySelector('#modal');
  m.querySelector('[data-record]').onclick = e => toggleRecording(async blob => {
    try { await lovedStore().addVoice(id, blob); await loadLoved(); lovedDetail(id); toast(t('Voice note saved.','आवाज़ सहेज ली गई।')); }
    catch { toast(t('Could not save the voice note.','आवाज़ सहेज नहीं पाए।')); }
  }, e.currentTarget);
  m.querySelector('[data-loved-remove]').onclick = async () => {
    if (!confirmTwice(m.querySelector('[data-loved-remove]'))) return;
    try { await lovedStore().remove(id); m.close(); loved.items = null; render(); } catch { toast(t('Could not remove. Please try again.','हटा नहीं पाए। फिर कोशिश करें।')); }
  };
}
/* Destructive buttons ask once more on the same button, without a browser pop-up. */
function confirmTwice(button) {
  if (button.dataset.sure) return true;
  button.dataset.sure = '1';
  button.textContent = t('Tap again to remove','हटाने के लिए फिर दबाएँ');
  setTimeout(() => { delete button.dataset.sure; button.textContent = t('Remove','हटाएँ'); }, 4000);
  return false;
}

/* ---------- Care circle ---------- */
let circle = {links: null, loading: false, code: null, error: ''};
async function loadCircle() {
  if (circle.loading) return;
  circle.loading = true;
  try { circle.links = await Backend.careLinks(); circle.error = ''; }
  catch { circle.links = circle.links || []; circle.error = t('Could not load your care circle. Please check your internet.','देखभाल समूह लोड नहीं हुआ। कृपया इंटरनेट देखें।'); }
  circle.loading = false;
  if (page === 'care') render();
}
const waLink = phone => `https://wa.me/${phone.replace(/\D/g, '')}`;
const permissionLabel = p => p === 'manage' ? t('Can help manage','संभालने में मदद कर सकते हैं') : t('Can view','देख सकते हैं');

const careBeforeStep5 = carePage;
carePage = function() {
  const p = Backend.available() ? Backend.profile() : null;
  if (!p) {
    const signIn = Backend.available() ? `<div class="card wide-card account-card" style="margin-bottom:24px"><div class="settings-row"><div><h3>${t('Build your real care circle','अपना असली देखभाल समूह बनाएँ')}</h3><p class="muted">${t('Sign in to invite family with a 6-digit code.','6 अंकों के कोड से परिवार को जोड़ने के लिए साइन इन करें।')}</p></div><button class="btn" data-account-open>${t('Sign in','साइन इन')}</button></div></div>` : '';
    return careBeforeStep5().replace('<div class="card wide-card">', `${signIn}<div class="card wide-card">`);
  }
  if (!circle.links && !circle.loading) loadCircle();
  const head = header(t('Your people. Your care circle.','आपके अपने। आपका देखभाल समूह।'), t('You decide who can help, and what they can see.','कौन मदद करेगा और क्या देख सकेगा, यह आप तय करें।'));
  const error = circle.error ? `<div class="notice" role="alert">${esc(circle.error)}</div>` : '';
  const loading = `<p class="empty">${t('Loading…','लोड हो रहा है…')}</p>`;
  if (p.role === 'grandparent') {
    const members = circle.links === null ? loading : circle.links.length ? circle.links.map(l => `<div class="member"><div class="avatar">${esc(initials(l.caretaker.full_name))}</div><div class="details"><p><strong>${esc(l.caretaker.full_name)}</strong></p><small>${esc(Phone.display(l.caretaker.phone))} · ${permissionLabel(l.permission)}</small></div><div class="row-actions"><a class="btn secondary small" href="tel:${esc(l.caretaker.phone)}">${icon('phone')}${t('Call','कॉल')}</a><button class="btn secondary small" data-link-perm="${l.id}" data-perm="${l.permission === 'manage' ? 'view' : 'manage'}">${l.permission === 'manage' ? t('Make view-only','सिर्फ़ देखने दें') : t('Let them help manage','संभालने दें')}</button><button class="btn secondary small danger" data-link-remove="${l.id}">${t('Remove','हटाएँ')}</button></div></div>`).join('')
      : `<p class="empty">${t('No one has joined yet.','अभी कोई नहीं जुड़ा है।')}</p>`;
    const code = circle.code ? `<div class="invite-code" aria-live="polite"><small>${t('Share this code. It works once, for 24 hours.','यह कोड साझा करें। यह एक बार, 24 घंटे तक चलेगा।')}</small><strong>${circle.code.code.replace(/(\d{3})(\d{3})/, '$1 $2')}</strong><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(t(`Please join my care circle on Aegis Home. Sign in as a caretaker, then enter my number ${p.phone} and this code: ${circle.code.code}`, `Aegis Home पर मेरे देखभाल समूह से जुड़ें। देखभालकर्ता के रूप में साइन इन करें, फिर मेरा नंबर ${p.phone} और यह कोड डालें: ${circle.code.code}`))}">${t('Share on WhatsApp','व्हाट्सऐप पर भेजें')}</a></div>` : '';
    return `${head}${error}<section class="card wide-card"><div class="card-head"><div class="card-title">${icon('care')}<h2>${t('People who care for you','आपकी देखभाल करने वाले')}</h2></div><button class="text-btn" data-circle-refresh>${t('Refresh','ताज़ा करें')}</button></div>${members}</section><section class="card wide-card" style="margin-top:24px"><div class="card-title">${icon('plus')}<h2>${t('Invite someone','किसी को जोड़ें')}</h2></div><p class="muted">${t('They sign in as a caretaker and enter your number with this code. You can remove them any time.','वे देखभालकर्ता के रूप में साइन इन करके आपका नंबर और यह कोड डालेंगे। आप उन्हें कभी भी हटा सकते हैं।')}</p><div class="row-actions"><button class="btn" data-invite="view">${t('Code to view my care','देखने के लिए कोड')}</button><button class="btn secondary" data-invite="manage">${t('Code to help manage','संभालने के लिए कोड')}</button></div>${code}</section>`;
  }
  if (p.role === 'caretaker') {
    const elders = circle.links === null ? loading : circle.links.length ? circle.links.map(l => `<div class="member"><div class="avatar">${esc(initials(l.elder.full_name))}</div><div class="details"><p><strong>${esc(l.elder.full_name)}</strong></p><small>${esc(Phone.display(l.elder.phone))} · ${permissionLabel(l.permission)}</small></div><div class="row-actions"><a class="btn small" href="tel:${esc(l.elder.phone)}">${icon('phone')}${t('Call','कॉल')}</a><a class="btn secondary small" target="_blank" rel="noopener" href="${waLink(l.elder.phone)}">WhatsApp</a><button class="btn secondary small danger" data-link-remove="${l.id}">${t('Leave','छोड़ें')}</button></div></div>`).join('')
      : `<p class="empty">${t('You have not joined anyone’s care circle yet.','आप अभी किसी के देखभाल समूह में नहीं जुड़े हैं।')}</p>`;
    return `${head}${error}<section class="card wide-card"><div class="card-head"><div class="card-title">${icon('care')}<h2>${t('People you care for','जिनकी आप देखभाल करते हैं')}</h2></div><button class="text-btn" data-circle-refresh>${t('Refresh','ताज़ा करें')}</button></div>${elders}</section><section class="card wide-card" style="margin-top:24px"><h2>${t('Join a care circle','देखभाल समूह से जुड़ें')}</h2><p class="muted">${t('Ask your grandparent for their 6-digit code.','अपने दादा/दादी से उनका 6 अंकों का कोड माँगें।')}</p><form id="join-form"><label>${t('Their WhatsApp number','उनका व्हाट्सऐप नंबर')}<input name="phone" type="tel" inputmode="tel" required maxlength="16"></label><label>${t('6-digit code','6 अंकों का कोड')}<input name="code" inputmode="numeric" pattern="[0-9 ]{6,7}" maxlength="7" required autocomplete="one-time-code"></label><div class="form-actions"><button class="btn" type="submit">${t('Join','जुड़ें')}</button></div></form></section>`;
  }
  return `${head}<section class="card wide-card"><h2>${esc(Backend.home()?.org_name || p.full_name)}</h2>${homeStatus(Backend.home())}<p class="muted">${t('Verified homes receive alerts from older people nearby who need a safe place. Alerts arrive in the next update.','सत्यापित आश्रमों को पास के उन बुज़ुर्गों के अलर्ट मिलते हैं जिन्हें सुरक्षित जगह चाहिए। अलर्ट अगले अपडेट में आएँगे।')}</p></section>`;
};

const circleErrors = {bad_phone: ['Please enter a 10-digit Indian mobile number.','कृपया 10 अंकों का भारतीय मोबाइल नंबर लिखें।'], bad_code: ['The code has 6 digits.','कोड 6 अंकों का होता है।'], wrong_code: ['That code did not work. It may be wrong, used, or older than 24 hours.','यह कोड नहीं चला। हो सकता है ग़लत हो, इस्तेमाल हो चुका हो, या 24 घंटे पुराना हो।']};
const bindBeforePeople = bind;
bind = function() {
  bindBeforePeople();
  document.querySelector('[data-loved-add]')?.addEventListener('click', lovedForm);
  document.querySelectorAll('[data-loved]').forEach(b => b.onclick = () => lovedDetail(b.dataset.loved));
  document.querySelectorAll('#app [data-account-open]').forEach(b => b.onclick = openAccount);
  document.querySelector('[data-circle-refresh]')?.addEventListener('click', () => { circle.links = null; render(); });
  document.querySelectorAll('[data-invite]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { circle.code = {code: await Backend.createInvite(b.dataset.invite)}; render(); }
    catch { b.disabled = false; toast(t('Could not create a code. Please try again.','कोड नहीं बन पाया। फिर कोशिश करें।')); }
  });
  document.querySelectorAll('[data-link-perm]').forEach(b => b.onclick = async () => {
    try { await Backend.setPermission(b.dataset.linkPerm, b.dataset.perm); circle.links = null; render(); }
    catch { toast(t('Could not change this. Please try again.','बदल नहीं पाए। फिर कोशिश करें।')); }
  });
  document.querySelectorAll('[data-link-remove]').forEach(b => b.onclick = async () => {
    if (!confirmTwice(b)) return;
    try { await Backend.removeLink(b.dataset.linkRemove); circle.links = null; render(); }
    catch { toast(t('Could not remove. Please try again.','हटा नहीं पाए। फिर कोशिश करें।')); }
  });
  const join = document.querySelector('#join-form');
  if (join) join.onsubmit = async e => {
    e.preventDefault();
    const data = new FormData(join), button = join.querySelector('[type=submit]');
    button.disabled = true;
    try { await Backend.acceptInvite(data.get('phone'), String(data.get('code')).replace(/\s/g, '')); circle.links = null; render(); toast(t('You have joined the care circle.','आप देखभाल समूह से जुड़ गए।')); }
    catch (error) { button.disabled = false; toast(t(...(circleErrors[error.code] || ['Could not join. Please try again.','जुड़ नहीं पाए। फिर कोशिश करें।']))); }
  };
};
/* Signing in or out changes whose data is shown. */
for (const name of ['signIn', 'signUp', 'signOut', 'createProfile']) {
  const original = Backend[name];
  Backend[name] = async (...args) => {
    try { return await original(...args); }
    finally { circle = {links: null, loading: false, code: null, error: ''}; loved.items = null; }
  };
}
render();
