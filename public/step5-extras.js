/* Step 5: thought for the day, three comfort sizes, a touch narrator, and a short first-use tour.
   Builds on earlier files by wrapping their functions. */
Object.assign(icons, {
  speaker: icons.speaker || '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6"/>',
});
const speakText = text => {
  text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!text || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = /[ऀ-ॿ]/.test(text) ? 'hi-IN' : 'en-IN';
  u.rate = 0.92;
  speechSynthesis.speak(u);
};

/* ---------- Thought for the day ---------- */
function advanceQuote() {
  const {index, deck} = Quotes.next(state.quoteDeck);
  state.quoteDeck = deck; state.quoteIndex = index; save();
}
advanceQuote(); // a fresh thought every time the app opens
function quoteCard() {
  const q = Quotes.quotes[state.quoteIndex] || Quotes.quotes[0];
  return `<section class="card card-pad quote-card" aria-label="${t('A thought for today','आज का विचार')}"><div class="eyebrow">${icon('quote')}${t('A THOUGHT FOR TODAY','आज का विचार')}</div><p class="quote-text">${esc(t(q.en, q.hi))}</p><div class="row-actions"><button class="btn secondary small" data-quote-speak>${icon('speaker')}${t('Listen','सुनें')}</button><button class="btn secondary small" data-quote-next>${t('Another thought','एक और विचार')}${icon('arrow')}</button></div></section>`;
}
const homeBeforeStep5 = home;
home = function() { return homeBeforeStep5().replace('<div class="grid">', `${quoteCard()}<div class="grid">`); };

/* ---------- Three comfort sizes: text, buttons and spacing grow together ---------- */
if (state.textSize === undefined) state.textSize = state.large ? 1 : 0;
const sizeNames = () => [t('Standard','सामान्य'), t('Large','बड़ा'), t('Extra large','बहुत बड़ा')];
function setSize(level) {
  state.textSize = Math.max(0, Math.min(2, level));
  state.large = state.textSize >= 1;
  save(); render();
  toast(`${t('Size','आकार')}: ${sizeNames()[state.textSize]}`);
}
actions.size = () => setSize((state.textSize + 1) % 3);
const sizeControl = () => `<div class="lang size-choice" role="group" aria-label="${t('Text and button size','अक्षर और बटन का आकार')}">${['A', 'A+', 'A++'].map((label, i) => `<button data-size="${i}" class="${state.textSize === i ? 'active' : ''}" aria-pressed="${state.textSize === i}" aria-label="${sizeNames()[i]}">${label}</button>`).join('')}</div>`;

/* ---------- Narrator: touch or hover anything to hear it ---------- */
state.narrator ??= false;
const Narrator = (() => {
  let armed = null, armedAt = 0, lastText = '', lastAt = 0, hoverTimer, pointerType = 'mouse';
  const pick = node => node?.closest?.('button,a,input,select,textarea,[role=button],label,h1,h2,h3,p,li,.message,.dose-status,.eyebrow,small,strong');
  const interactive = el => el.matches('button,a,[role=button]');
  function textOf(el) {
    if (el.matches('input,select,textarea')) {
      const label = el.closest('label')?.childNodes[0]?.textContent || el.getAttribute('aria-label') || el.placeholder || '';
      const value = el.type === 'password' ? '' : el.tagName === 'SELECT' ? el.selectedOptions[0]?.textContent : el.value;
      return `${label} ${value || ''}`;
    }
    return el.getAttribute('aria-label') && interactive(el) ? `${el.getAttribute('aria-label')}. ${el.innerText}` : el.innerText || el.getAttribute('aria-label') || '';
  }
  function say(text) {
    const now = Date.now();
    text = String(text || '').replace(/\s+/g, ' ').trim();
    if (!text || (text === lastText && now - lastAt < 1500)) return;
    lastText = text; lastAt = now; speakText(text);
  }
  const on = () => state.narrator;
  document.addEventListener('pointerdown', e => { pointerType = e.pointerType; }, true);
  document.addEventListener('touchstart', e => { if (!on()) return; const el = pick(e.target); if (el && !interactive(el)) say(textOf(el)); }, {passive: true, capture: true});
  document.addEventListener('touchmove', e => {
    if (!on()) return;
    const touch = e.touches[0], el = pick(document.elementFromPoint(touch.clientX, touch.clientY));
    if (el && el !== armed) { armed = el; armedAt = Date.now(); say(textOf(el)); }
  }, {passive: true, capture: true});
  // On touch screens: the first tap reads a button aloud, a second tap uses it.
  document.addEventListener('click', e => {
    if (!on() || pointerType !== 'touch') return;
    const el = pick(e.target);
    if (!el || !interactive(el) || el.hasAttribute('data-narrator-toggle')) return;
    if (armed === el && Date.now() - armedAt < 5000) { armed = null; return; }
    e.preventDefault(); e.stopImmediatePropagation();
    armed = el; armedAt = Date.now();
    say(`${textOf(el)}. ${t('Tap again to choose.','चुनने के लिए फिर से दबाएँ।')}`);
  }, true);
  document.addEventListener('mouseover', e => {
    if (!on() || pointerType === 'touch') return;
    clearTimeout(hoverTimer);
    const el = pick(e.target);
    if (el) hoverTimer = setTimeout(() => say(textOf(el)), 300);
  }, true);
  document.addEventListener('focusin', e => { if (on()) { const el = pick(e.target); if (el) say(textOf(el)); } }, true);
  return {say};
})();
function setNarrator(onOff) {
  state.narrator = onOff; save(); render();
  speakText(onOff ? t('Narrator is on. Touch anything on the screen to hear it. Tap a button twice to use it.','नैरेटर चालू है। सुनने के लिए स्क्रीन पर कुछ भी छुएँ। बटन इस्तेमाल करने के लिए दो बार दबाएँ।') : t('Narrator is off.','नैरेटर बंद है।'));
}

/* ---------- Short first-use tour ---------- */
const tourSteps = () => [
  [t('Namaste! Welcome to Aegis Home','नमस्ते! Aegis Home में स्वागत है'), t('Let’s take a one-minute tour. You can skip it any time, and open it again from Settings.','एक मिनट की छोटी-सी सैर करें। कभी भी छोड़ सकते हैं, और सेटिंग्स से फिर खोल सकते हैं।')],
  [t('Today','आज'), t('The Today page shows your medicines, daily routine, music, next appointment and a thought for the day.','आज वाले पेज पर आपकी दवाएँ, दिनचर्या, संगीत, अगली मुलाकात और आज का विचार दिखता है।')],
  [t('My medicines','मेरी दवाएँ'), t('When it is time for a medicine, take a photo as you take it. The photo saves your check-in.','दवा का समय होने पर, दवा लेते हुए एक फ़ोटो लें। फ़ोटो से आपका चेक-इन सहेजा जाता है।')],
  [t('Alarms','अलार्म'), t('Tap “Start reminders” when you open the app and keep it open. Your routine and appointment alarms will ring on time.','ऐप खोलते ही “रिमाइंडर शुरू करें” दबाएँ और ऐप खुला रखें। दिनचर्या और मुलाकात की घंटी समय पर बजेगी।')],
  [t('Saathi and music','साथी और संगीत'), t('Talk to Saathi about anything. In Peace & music, Saathi asks a few easy questions and plays songs you love.','साथी से किसी भी बारे में बात करें। सुकून और संगीत में साथी कुछ आसान सवाल पूछकर आपके पसंदीदा गाने बजाता है।')],
  [t('Your people','आपके अपने'), t('Keep photos, videos and voice notes of your loved ones in My loved ones. Invite family to your care circle.','मेरे अपने में अपनों की फ़ोटो, वीडियो और आवाज़ें रखें। परिवार को अपने देखभाल समूह में जोड़ें।')],
  [t('Make it comfortable','अपनी सुविधा से'), t('Choose a bigger size, or turn on the narrator to hear the screen read aloud.','बड़ा आकार चुनें, या स्क्रीन को पढ़कर सुनाने के लिए नैरेटर चालू करें।'), true],
];
let tourAt = 0;
function showTour(at = 0) {
  tourAt = at;
  const steps = tourSteps(), [title, text, comfort] = steps[at], last = at === steps.length - 1;
  modal(title, `<p class="tour-text">${esc(text)}</p>${comfort ? `<div class="settings-row"><div><h3>${t('Size','आकार')}</h3></div>${sizeControl()}</div><div class="settings-row"><div><h3>${t('Narrator','नैरेटर')}</h3></div><button class="btn secondary" data-narrator-toggle aria-pressed="${state.narrator}">${state.narrator ? t('On','चालू') : t('Off','बंद')}</button></div>` : ''}<p class="muted tour-count">${at + 1} / ${steps.length}</p><div class="form-actions tour-actions"><button class="btn secondary" data-tour-speak>${icon('speaker')}${t('Listen','सुनें')}</button>${at ? `<button class="btn secondary" data-tour="${at - 1}">${t('Back','पीछे')}</button>` : `<button class="btn secondary" data-tour-done>${t('Skip','छोड़ें')}</button>`}<button class="btn" ${last ? 'data-tour-done' : `data-tour="${at + 1}"`}>${last ? t('Start using the app','ऐप इस्तेमाल करें') : t('Next','आगे')}</button></div>`);
  const m = document.querySelector('#modal');
  m.querySelectorAll('[data-tour]').forEach(b => b.onclick = () => showTour(+b.dataset.tour));
  m.querySelectorAll('[data-tour-done]').forEach(b => b.onclick = finishTour);
  m.querySelector('[data-tour-speak]').onclick = () => speakText(`${title}. ${text}`);
  m.querySelectorAll('[data-size]').forEach(b => b.onclick = () => { setSize(+b.dataset.size); showTour(tourAt); });
  m.querySelector('[data-narrator-toggle]')?.addEventListener('click', () => { setNarrator(!state.narrator); showTour(tourAt); });
  if (state.narrator) speakText(`${title}. ${text}`);
}
function finishTour() {
  state.tourDone = true; save();
  document.querySelector('#modal').close();
  (window.afterTour || []).splice(0).forEach(fn => fn());
}

/* ---------- Settings: size, narrator, tour ---------- */
const settingsBeforeExtras = settingsPage;
settingsPage = function() {
  return settingsBeforeExtras()
    .replace(/<h3>[^<]*<\/h3><p class="muted">[^<]*<\/p><\/div><button class="btn secondary" data-action="size"[^>]*>[^<]*<\/button>/,
      `<h3>${t('Text and button size','अक्षर और बटन का आकार')}</h3><p class="muted">${t('Three sizes. Everything grows together.','तीन आकार। सब कुछ साथ में बड़ा होता है।')}</p></div>${sizeControl()}`)
    .replace(/(<div class="settings-row"><div><h3>[^<]*<\/h3><p class="muted">[^<]*Asia\/Kolkata[^<]*<\/p><\/div><\/div>)/,
      `<div class="settings-row"><div><h3>${t('Narrator','नैरेटर')}</h3><p class="muted">${t('Touch or point at anything to hear it read aloud. On touch screens, tap a button twice to use it.','सुनने के लिए किसी भी चीज़ को छुएँ। टच स्क्रीन पर बटन इस्तेमाल करने के लिए दो बार दबाएँ।')}</p></div><button class="btn secondary" data-narrator-toggle aria-pressed="${state.narrator}">${state.narrator ? t('On','चालू') : t('Off','बंद')}</button></div><div class="settings-row"><div><h3>${t('App tour','ऐप की सैर')}</h3><p class="muted">${t('A one-minute guide to the app.','ऐप की एक मिनट की जानकारी।')}</p></div><button class="btn secondary" data-tour-open>${t('Show the tour','सैर दिखाएँ')}</button></div>$1`);
};

const bindBeforeExtras = bind;
bind = function() {
  bindBeforeExtras();
  document.body.classList.toggle('xlarge', state.textSize === 2);
  const sizeBtn = document.querySelector('.top-actions [data-action="size"]');
  if (sizeBtn) { sizeBtn.setAttribute('aria-label', `${t('Text size','अक्षर का आकार')}: ${sizeNames()[state.textSize]}`); sizeBtn.setAttribute('aria-pressed', String(state.textSize > 0)); }
  document.querySelectorAll('#app [data-size]').forEach(b => b.onclick = () => setSize(+b.dataset.size));
  document.querySelectorAll('#app [data-narrator-toggle]').forEach(b => b.onclick = () => setNarrator(!state.narrator));
  document.querySelector('[data-tour-open]')?.addEventListener('click', () => showTour(0));
  document.querySelector('[data-quote-next]')?.addEventListener('click', () => { advanceQuote(); render(); });
  document.querySelector('[data-quote-speak]')?.addEventListener('click', () => { const q = Quotes.quotes[state.quoteIndex]; speakText(t(q.en, q.hi)); });
  if (matchMedia('(max-width: 540px)').matches) {
    const nav = document.querySelector('nav'), active = nav?.querySelector('button.active');
    if (active) nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
  }
};
render();
if (!state.tourDone) showTour(0);
