/* Step 4: Saathi conversation, guided music player, and earlier appointment alarms.
   Builds on the earlier files by wrapping their functions, like alarms.js does. */
Object.assign(icons, {
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  speaker: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  next: '<path d="m6 5 9 7-9 7zM18 5v14"/>',
  prev: '<path d="m18 5-9 7 9 7zM6 5v14"/>',
  phone: '<path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2"/>',
});

/* ---------- Live services (only when served over http, e.g. npm start or Vercel) ---------- */
const live = {ai: false, music: false};
const onServer = /^https?:$/.test(location.protocol);
async function postJson(url, body, ms = 30000) {
  const response = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(ms)});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || String(response.status)), {status: response.status, data});
  return data;
}
if (onServer) fetch('/api/health', {signal: AbortSignal.timeout(8000)}).then(r => r.ok ? r.json() : {}).then(d => {
  live.ai = Boolean(d.ai); live.music = Boolean(d.music);
  const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if ((page === 'chat' || page === 'music') && !typing && !document.querySelector('#modal').open) render();
}).catch(() => {});
const decodeText = s => new DOMParser().parseFromString(String(s || ''), 'text/html').documentElement.textContent;

/* ---------- Saathi ---------- */
state.saathiMemory ||= {};
let saathiBusy = false;
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const greeting = () => t('Namaste! I’m Saathi. What would you like to talk about today — a favourite memory, music, or how your day feels?','नमस्ते! मैं साथी हूँ। आज किस बारे में बात करें — कोई प्यारी याद, संगीत, या आपका दिन कैसा रहा?');

function saathiContext() {
  const now = new Intl.DateTimeFormat('en-IN', {timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short'}).format(new Date());
  return {
    now, name: state.saathiMemory.name || '',
    meds: state.meds.map(m => ({name: localName(m), time: m.time, status: DoseLedger.status(m, state.checkins || {})})),
    routines: state.routines.map(r => ({name: localName(r), time: r.time})),
    appointments: state.appointments.filter(a => AlarmClock.at(a.date, a.time) > Date.now()).map(a => ({name: a.name, date: a.date, time: a.time})),
  };
}
function messageActions(m) {
  if (!m.action) return '';
  if (m.action.page === 'emergency') {
    return `<div class="msg-tools"><a class="btn" href="tel:112">${icon('phone')}${t('Call 112','112 पर कॉल करें')}</a><a class="btn secondary" href="tel:108">${t('Ambulance 108','एम्बुलेंस 108')}</a>${m.action.crisis?`<a class="btn secondary" href="tel:14416">${t('Tele-MANAS 14416','टेली-मानस 14416')}</a>`:`<a class="btn secondary" href="tel:14567">${t('Elderline 14567','एल्डरलाइन 14567')}</a>`}</div>`;
  }
  const labels = {meds: ['Open My medicines','मेरी दवाएँ खोलें'], music: ['Open Peace & music','सुकून और संगीत खोलें']};
  const label = labels[m.action.page];
  return label ? `<div class="msg-tools"><button class="btn secondary small" data-page="${m.action.page}">${t(...label)}</button></div>` : '';
}
const listenButton = key => 'speechSynthesis' in window ? `<div class="msg-tools"><button class="text-btn" data-speak="${key}">${icon('speaker')}${t('Listen','सुनें')}</button></div>` : '';

chatPage = function() {
  const status = live.ai
    ? t('Saathi is an AI companion, not a person or a doctor. Live conversation is on.','साथी एक AI साथी है, कोई इंसान या डॉक्टर नहीं। लाइव बातचीत चालू है।')
    : t('Saathi is a computer helper, not a person or a doctor. Live AI is not connected here, so Saathi gives simple replies from this device.','साथी एक कंप्यूटर सहायक है, कोई इंसान या डॉक्टर नहीं। यहाँ लाइव AI जुड़ा नहीं है, इसलिए साथी इसी डिवाइस से आसान जवाब देता है।');
  const prompts = [["Tell me about music","संगीत की बात करें"],["I feel lonely","मैं अकेला महसूस कर रहा हूँ"],["Help me with my medicines","दवाओं के बारे में मदद चाहिए"],["Tell me a joke","कोई चुटकुला सुनाओ"],["Tell me a story","कोई कहानी सुनाओ"]];
  return `${header(t('A conversation with Saathi','साथी से बातचीत'),t('A little company, whenever you feel like talking.','जब बात करने का मन हो, थोड़ा साथ।'))}<div class="notice">${status}</div><div class="card"><div class="chat-area" aria-live="polite"><div class="message">${esc(greeting())}${listenButton('greet')}</div>${state.messages.map((m,i)=>`<div class="message ${m.user?'user':''}">${esc(m.text)}${m.user?'':listenButton(i)+messageActions(m)}</div>`).join('')}${saathiBusy?`<div class="message typing">${t('Saathi is typing…','साथी लिख रहा है…')}</div>`:''}</div><div class="suggestions">${prompts.map(([en,hi])=>`<button class="btn secondary small" data-prompt="${t(en,hi)}" ${saathiBusy?'disabled':''}>${t(en,hi)}</button>`).join('')}</div><form class="chat-form" id="chat-form">${Recognition?`<button class="btn secondary mic" type="button" data-mic aria-label="${t('Speak your message','बोलकर संदेश दें')}">${icon('mic')}</button>`:''}<input id="chat-input" maxlength="1000" required aria-label="${t('Your message','आपका संदेश')}" placeholder="${t('Type what’s on your mind…','अपने मन की बात लिखें…')}"><button class="btn" type="submit" ${saathiBusy?'disabled':''}>${t('Send','भेजें')}${icon('arrow')}</button></form></div>`;
};
function scrollChat() { const area = document.querySelector('.chat-area'); if (area) area.scrollTop = area.scrollHeight; }

chatSend = async function(text) {
  text = String(text || '').trim().slice(0, 1000);
  if (!text || saathiBusy) return;
  state.messages.push({user: true, text});
  saathiBusy = true; save(); render(); scrollChat();
  const local = SaathiLocal.reply(text, {lang: state.lang, memory: state.saathiMemory, context: saathiContext()});
  let reply = local.text, source = 'local';
  if (live.ai) {
    try {
      const history = state.messages.slice(-20).map(m => ({role: m.user ? 'user' : 'assistant', text: m.text}));
      const data = await postJson('/api/saathi', {lang: state.lang, messages: history, context: saathiContext()});
      if (data.reply) { reply = data.reply; source = 'ai'; }
    } catch { /* The offline reply keeps the conversation going. */ }
  }
  state.saathiMemory = local.memory;
  state.messages.push({user: false, text: reply, source, action: local.action || null});
  state.messages = state.messages.slice(-40);
  saathiBusy = false; save();
  if (page === 'chat') { render(); scrollChat(); document.querySelector('#chat-input')?.focus(); }
};

function speak(text) {
  if (!('speechSynthesis' in window) || !text) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = /[ऀ-ॿ]/.test(text) ? 'hi-IN' : 'en-IN';
  utterance.rate = 0.9;
  speechSynthesis.speak(utterance);
}
function listen() {
  const recognition = new Recognition();
  recognition.lang = state.lang === 'hi' ? 'hi-IN' : 'en-IN';
  recognition.interimResults = false;
  recognition.onresult = e => chatSend(e.results[0][0].transcript);
  recognition.onerror = () => toast(t('I could not hear that. Please try again or type your message.','मैं सुन नहीं पाया। फिर से बोलें या लिखें।'));
  recognition.start();
  toast(t('Listening… please speak now.','सुन रहा हूँ… अब बोलिए।'));
}

/* ---------- Guided music ---------- */
let mg = {answers: [], results: null, index: 0, query: '', loading: false, note: '', searchUrl: ''};
const dock = {el: document.createElement('section'), id: null};
dock.el.id = 'music-dock'; dock.el.className = 'card'; dock.el.hidden = true;
document.body.append(dock.el);

function stopSong() { dock.el.innerHTML = ''; dock.el.hidden = true; dock.id = null; if (page === 'music') render(); }
function playSong(i) {
  const song = mg.results?.[i];
  if (!song || !/^[\w-]{11}$/.test(song.id)) return;
  mg.index = i; dock.id = song.id;
  const title = decodeText(song.title) || t('Now playing','अभी बज रहा है');
  dock.el.setAttribute('aria-label', t('Music player','संगीत प्लेयर'));
  dock.el.innerHTML = `<div class="dock-head"><strong>${esc(title)}</strong><button class="icon-btn" data-dock-close aria-label="${t('Stop music','संगीत बंद करें')}">${icon('close')}</button></div><div class="dock-frame"><iframe src="https://www.youtube-nocookie.com/embed/${song.id}?autoplay=1&rel=0&playsinline=1" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><div class="dock-actions"><button class="btn secondary small" data-dock-prev ${i ? '' : 'disabled'}>${icon('prev')}${t('Previous','पिछला')}</button><button class="btn secondary small" data-dock-next ${i < mg.results.length - 1 ? '' : 'disabled'}>${t('Next song','अगला गाना')}${icon('next')}</button></div>`;
  dock.el.hidden = false;
  dock.el.querySelector('[data-dock-close]').onclick = stopSong;
  dock.el.querySelector('[data-dock-prev]').onclick = () => playSong(mg.index - 1);
  dock.el.querySelector('[data-dock-next]').onclick = () => playSong(mg.index + 1);
  if (page === 'music') render();
}

async function findMusic(body) {
  mg = {...mg, loading: true, note: '', results: null};
  render();
  try {
    if (!onServer) throw new Error('offline');
    const data = await postJson('/api/music', {...body, lang: state.lang}, 45000);
    mg.query = data.query; mg.searchUrl = data.searchUrl; mg.results = (data.results || []).filter(s => /^[\w-]{11}$/.test(s.id));
    if (!mg.results.length) mg.note = t('I could not find a song to play here. You can open the search on YouTube.','यहाँ बजाने के लिए गाना नहीं मिला। आप YouTube पर खोज खोल सकते हैं।');
  } catch (error) {
    const q = error.data?.query || body.query || body.wish;
    mg.query = q; mg.results = [];
    mg.searchUrl = error.data?.searchUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    mg.note = t('Music search is not connected in this preview, so songs cannot play inside the app here. You can open them on YouTube instead.','इस प्रीव्यू में संगीत खोज जुड़ी नहीं है, इसलिए गाने ऐप के अंदर नहीं बज सकते। आप उन्हें YouTube पर खोल सकते हैं।');
  }
  mg.loading = false;
  if (mg.results.length) playSong(0); else if (page === 'music') render();
}
/* A named singer plays straight away; otherwise the guide asks the next question. */
function answerGuide(nodeId, value, playNow = false) {
  mg.answers = [...mg.answers, {node: nodeId, value}];
  if (playNow || MusicGuide.nextNode(mg.answers) === null) { mg.fromGuide = true; findMusic({query: MusicGuide.buildQuery(mg.answers)}); }
  else render();
}

function guideCard() {
  let body;
  if (mg.loading) body = `<p class="guide-q" aria-live="polite">${t('Finding something lovely for you…','आपके लिए कुछ अच्छा ढूँढ रहे हैं…')}</p>`;
  else if (mg.results) {
    body = `<p class="muted">${t('Songs for','इनके गाने')}: <strong>${esc(mg.query)}</strong></p>${mg.note ? `<div class="notice">${esc(mg.note)}</div>` : ''}<div class="song-list">${mg.results.map((s, i) => `<button class="song ${dock.id === s.id ? 'playing' : ''}" data-song="${i}" ${dock.id === s.id ? 'aria-current="true"' : ''}><img src="https://i.ytimg.com/vi/${s.id}/mqdefault.jpg" alt="" loading="lazy"><span><strong>${esc(decodeText(s.title) || `${t('Song','गाना')} ${i + 1}`)}</strong><small>${esc(decodeText(s.channel))}</small></span></button>`).join('')}</div><a class="btn secondary" href="${esc(mg.searchUrl)}" target="_blank" rel="noopener">${icon('play')}${t('Open on YouTube','YouTube पर खोलें')}</a>`;
  } else {
    const id = MusicGuide.nextNode(mg.answers), node = MusicGuide.nodes[id];
    body = `<h3 class="guide-q">${t(node.en, node.hi)}</h3>${node.input
      ? `<p class="muted">${t(...node.help)}</p><form id="singer-form" class="chat-form guide-input"><input id="singer-input" maxlength="60" aria-label="${t('Singer name','गायक का नाम')}" placeholder="${t('Singer’s name','गायक का नाम')}"><button class="btn" type="submit">${icon('play')}${t('Play their songs','उनके गाने सुनें')}</button><button class="btn secondary" type="button" data-guide-skip>${t('Skip','आगे बढ़ें')}</button></form>`
      : `<div class="guide-options">${node.options.map(o => `<button class="btn secondary" data-guide="${id}:${o.id}">${t(o.en, o.hi)}</button>`).join('')}</div>`}`;
  }
  const nav = (mg.answers.length || mg.results) && !mg.loading ? `<div class="guide-nav"><button class="btn secondary small" data-guide-back>${t('Back','पीछे')}</button><button class="btn secondary small" data-guide-restart>${t('Start over','फिर से शुरू करें')}</button></div>` : '';
  const wish = mg.results || mg.loading ? '' : `<form id="wish-form" class="chat-form guide-input"><input id="wish-input" maxlength="200" aria-label="${t('Tell Saathi what you would like to hear','साथी को बताइए क्या सुनना है')}" placeholder="${t('Or just tell me, like “calm songs for the evening”','या बस बताइए, जैसे “शाम के लिए शांत गाने”')}"><button class="btn" type="submit">${t('Find','खोजें')}</button></form>`;
  return `<section class="card wide-card guide-card"><div class="card-head"><div class="card-title">${icon('music')}<h2>${t('Let Saathi find your music','साथी से संगीत चुनवाएँ')}</h2></div></div>${body}${nav}${wish}</section>`;
}
const musicBeforeStep4 = musicPage;
musicPage = function() { return musicBeforeStep4().replace('<div class="music-grid">', `${guideCard()}<div class="music-grid">`); };

/* ---------- Appointment alarms: ring early as well as on time ---------- */
const leadLabel = n => ({1440: t('1 day before','1 दिन पहले'), 60: t('1 hour before','1 घंटा पहले'), 15: t('15 minutes before','15 मिनट पहले'), 0: t('At the appointment time','मुलाकात के समय')})[n];
function appointmentForm4(id) {
  const item = state.appointments.find(x => String(x.id) === String(id));
  const leads = item ? (item.alarm === false ? [] : AlarmClock.leadsOf(item)) : [60, 0];
  modal(t('Your appointment','आपकी अपॉइंटमेंट'), `<form id="alarm-schedule"><label>${t('Name','नाम')}<input name="name" required maxlength="80" value="${esc(item?.name||'')}"></label><label>${t('Place','जगह')}<input name="place" required maxlength="100" value="${esc(item?.place||'')}"></label><label>${t('Date','तारीख')}<input name="date" type="date" required value="${esc(item?.date||AlarmClock.day())}"></label><label>${t('Time in India (IST)','भारत का समय (IST)')}<input name="time" type="time" required value="${esc(item?.time||'09:00')}"></label><fieldset class="lead-set"><legend>${t('When should the alarm ring?','घंटी कब बजे?')}</legend>${AlarmClock.LEADS.map(n => `<label class="alarm-check"><input type="checkbox" name="lead" value="${n}" ${leads.includes(n)?'checked':''}>${leadLabel(n)}</label>`).join('')}</fieldset><p>${t('The app needs to stay open for the alarm.','घंटी के लिए ऐप खुला रहना चाहिए।')}</p><div class="alarm-actions">${item?`<button type="button" class="btn secondary" id="remove-schedule">${t('Remove from my schedule','मेरी सूची से हटाएँ')}</button>`:''}<button class="btn" type="submit">${t('Save','सहेजें')}</button></div></form>`);
  document.querySelector('#alarm-schedule').onsubmit = e => {
    e.preventDefault();
    const form = new FormData(e.target), name = String(form.get('name')).trim();
    if (!name) return;
    const chosen = form.getAll('lead').map(Number).filter(n => AlarmClock.LEADS.includes(n));
    const record = {...item, name, place: String(form.get('place')).trim(), date: String(form.get('date')), time: String(form.get('time')), id: item?.id || crypto.randomUUID(), leads: chosen, alarm: chosen.length > 0};
    if (item?.name !== record.name) delete record.hi;
    const next = item ? state.appointments.map(x => x.id === item.id ? record : x) : [...state.appointments, record];
    next.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    if (!persistAlarmState({...state, appointments: next})) return;
    document.querySelector('#modal').close(); render(); toast(t('Your schedule is saved.','आपका समय सहेज लिया है।')); checkAlarms();
  };
  if (item) document.querySelector('#remove-schedule').onclick = () => {
    if (!persistAlarmState({...state, appointments: state.appointments.filter(x => x.id !== item.id)})) return;
    document.querySelector('#modal').close(); render();
  };
}
const scheduleFormBeforeStep4 = scheduleForm;
scheduleForm = function(kind, id) { return kind === 'appointment' ? appointmentForm4(id) : scheduleFormBeforeStep4(kind, id); };

const reminderSummary = a => a.alarm === false || !AlarmClock.leadsOf(a).length
  ? t('Alarm off','घंटी बंद')
  : `${t('Alarm','घंटी')}: ${AlarmClock.LEADS.filter(n => AlarmClock.leadsOf(a).includes(n)).map(leadLabel).join(' · ')}`;
appointmentsPage = function() {
  return `${header(t('My appointments','मेरी अपॉइंटमेंट'),t('Your next visit, with a gentle reminder before it and at its scheduled time.','अगली मुलाकात से पहले और उसके तय समय पर एक प्यारी याद।'))}${alarmPanel()}<section class="card wide-card"><div class="card-head"><h2>${t('My visits','मेरी मुलाकातें')}</h2><button class="btn" data-action="appointment">${t('Add visit','मुलाकात जोड़ें')}</button></div>${state.appointments.map(a=>`<div class="alarm-row"><div class="details"><h3>${esc(a.name)}</h3><p>${esc(a.place)}</p><p>${new Date(a.date+'T12:00:00+05:30').toLocaleDateString(state.lang==='hi'?'hi-IN':'en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'})} · ${time(a.time)} IST</p><p>${reminderSummary(a)}</p></div><button class="btn secondary" data-edit-visit="${a.id}">${t('Edit visit','मुलाकात बदलें')}</button></div>`).join('')||`<p class="empty">${t('Add your next visit whenever you are ready.','जब चाहें, अपनी अगली मुलाकात जोड़ें।')}</p>`}</section>`;
};

function inTime(minutes) {
  if (minutes < 60) return t(`${minutes} minutes`, `${minutes} मिनट`);
  if (minutes < 1440) { const h = Math.round(minutes / 60); return t(`about ${h} hour${h > 1 ? 's' : ''}`, `लगभग ${h} घंटे`); }
  const d = Math.round(minutes / 1440); return t(`${d} day${d > 1 ? 's' : ''}`, `${d} दिन`);
}
const showAlarmBeforeStep4 = showAlarm;
showAlarm = function(event) {
  showAlarmBeforeStep4(event);
  if (event.kind !== 'appointment' || !event.lead) return;
  const minutes = Math.max(1, Math.round((AlarmClock.at(event.date, event.time) - Date.now()) / 60000));
  const line = alarmDialog.querySelector('h2 + p');
  if (line) line.textContent = t(`Your appointment is in ${inTime(minutes)}. A good time to get ready.`, `आपकी मुलाकात ${inTime(minutes)} में है। तैयार होने का अच्छा समय है।`);
};

/* ---------- Event wiring ---------- */
const bindBeforeStep4 = bind;
bind = function() {
  bindBeforeStep4();
  document.querySelectorAll('[data-speak]').forEach(b => b.onclick = () => speak(b.dataset.speak === 'greet' ? greeting() : state.messages[+b.dataset.speak]?.text));
  document.querySelector('[data-mic]')?.addEventListener('click', listen);
  document.querySelectorAll('[data-guide]').forEach(b => b.onclick = () => { const [nodeId, value] = b.dataset.guide.split(':'); answerGuide(nodeId, value); });
  document.querySelector('[data-guide-skip]')?.addEventListener('click', () => answerGuide('singer', ''));
  const singer = document.querySelector('#singer-form');
  if (singer) singer.onsubmit = e => { e.preventDefault(); const name = document.querySelector('#singer-input').value.trim(); if (name) answerGuide('singer', name, true); };
  const wish = document.querySelector('#wish-form');
  if (wish) wish.onsubmit = e => { e.preventDefault(); const text = document.querySelector('#wish-input').value.trim(); if (text) { mg.fromGuide = false; findMusic({wish: text}); } };
  document.querySelector('[data-guide-back]')?.addEventListener('click', () => {
    if (mg.results) mg = {...mg, results: null, note: '', answers: mg.fromGuide ? mg.answers.slice(0, -1) : mg.answers};
    else mg = {...mg, answers: mg.answers.slice(0, -1)};
    render();
  });
  document.querySelector('[data-guide-restart]')?.addEventListener('click', () => { mg = {...mg, answers: [], results: null, note: ''}; render(); });
  document.querySelectorAll('[data-song]').forEach(b => b.onclick = () => playSong(+b.dataset.song));
};
render();
