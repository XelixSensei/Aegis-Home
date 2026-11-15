/* Step 5 (accounts): sign in as a Grandparent, Caretaker or Elderly Home with a WhatsApp
   number and a 6-digit passcode. Uses the existing modal, card and button styles. */
let account = {view: 'choose', role: null, busy: false, error: '', loc: null};
const roleInfo = {
  grandparent: {en: 'I am a grandparent', hi: 'मैं दादा/दादी या नाना/नानी हूँ', sub: ['My medicines, routine and care circle', 'मेरी दवाएँ, दिनचर्या और देखभाल समूह'], short: ['Grandparent', 'दादा/दादी']},
  caretaker: {en: 'I take care of someone', hi: 'मैं किसी की देखभाल करता/करती हूँ', sub: ['Family member or caregiver', 'परिवार का सदस्य या देखभालकर्ता'], short: ['Caretaker', 'देखभालकर्ता']},
  elderly_home: {en: 'We are an elderly home', hi: 'हम एक वृद्धाश्रम हैं', sub: ['Government-registered care home', 'सरकार में पंजीकृत वृद्धाश्रम'], short: ['Elderly home', 'वृद्धाश्रम']},
};
const accountErrors = {
  bad_phone: ['Please enter a 10-digit Indian mobile number.', 'कृपया 10 अंकों का भारतीय मोबाइल नंबर लिखें।'],
  bad_passcode: ['The passcode must be exactly 6 digits.', 'पासकोड ठीक 6 अंकों का होना चाहिए।'],
  weak_passcode: ['That passcode is too easy to guess. Please choose different digits.', 'यह पासकोड आसानी से पता चल सकता है। कृपया दूसरे अंक चुनें।'],
  mismatch: ['The two passcodes are not the same.', 'दोनों पासकोड एक जैसे नहीं हैं।'],
  exists: ['This number already has an account. Please sign in instead.', 'इस नंबर का खाता पहले से है। कृपया साइन इन करें।'],
  wrong_login: ['The number or passcode is not right. Please try again.', 'नंबर या पासकोड सही नहीं है। फिर से कोशिश करें।'],
  need_location: ['Please share your home’s location, so nearby people can be sent to you.', 'कृपया अपने आश्रम की जगह साझा करें, ताकि पास के लोग आप तक भेजे जा सकें।'],
  need_licence: ['Please add your registration number and a photo or PDF of the certificate.', 'कृपया पंजीकरण नंबर और प्रमाणपत्र की फ़ोटो या PDF जोड़ें।'],
  file_too_big: ['The certificate file must be under 5 MB.', 'प्रमाणपत्र की फ़ाइल 5 MB से छोटी होनी चाहिए।'],
  confirm_email_on: ['Sign-up is not finished on the server yet (email confirmation is on). Please tell the app administrator.', 'सर्वर पर साइन-अप की सेटिंग अधूरी है। कृपया ऐप व्यवस्थापक को बताएँ।'],
};
const accountError = code => t(...(accountErrors[code] || ['Something went wrong. Please check your internet and try again.', 'कुछ गड़बड़ हुई। इंटरनेट देखकर फिर से कोशिश करें।']));
const homeStatus = h => !h ? '' : ({
  pending: `<span class="dose-status due">${t('Waiting for verification','सत्यापन बाकी है')}</span><p class="muted">${t('We check your government registration before your home can receive alerts.','अलर्ट पाने से पहले हम आपके सरकारी पंजीकरण की जाँच करते हैं।')}</p>`,
  approved: `<span class="dose-status taken">${t('Verified home','सत्यापित आश्रम')}</span>`,
  rejected: `<span class="dose-status missed">${t('Not verified','सत्यापित नहीं')}</span>${h.review_note ? `<p class="muted">${esc(h.review_note)}</p>` : ''}`,
})[h.status];

const phoneField = (autocomplete) => `<label>${t('WhatsApp number','व्हाट्सऐप नंबर')}<input name="phone" type="tel" inputmode="tel" autocomplete="${autocomplete}" required maxlength="16" placeholder="98765 43210"></label>`;
const passField = (name, label, autocomplete) => `<label>${label}<input name="${name}" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="${autocomplete}" required></label>`;

function accountBody() {
  if (!Backend.available()) {
    return `<div class="notice">${t('Accounts need the online app. In this preview, everything stays on this device.','खाते के लिए ऑनलाइन ऐप चाहिए। इस प्रीव्यू में सब कुछ इसी डिवाइस पर रहता है।')}</div>`;
  }
  const error = account.error ? `<div class="notice" role="alert">${esc(account.error)}</div>` : '';
  const busy = account.busy ? 'disabled' : '';
  const profile = Backend.profile();
  if (profile) {
    return `<div class="settings-row"><div><h3>${esc(profile.full_name)}</h3><p class="muted">${t(...roleInfo[profile.role].short)} · ${esc(Phone.display(profile.phone))}</p>${profile.role === 'elderly_home' ? homeStatus(Backend.home()) : ''}</div></div>${error}<div class="form-actions"><button class="btn secondary" data-account="signout" ${busy}>${t('Sign out','साइन आउट')}</button></div>`;
  }
  if (account.view === 'choose' || account.view === 'finish' && !account.role) {
    return `<p class="muted">${account.view === 'finish' ? t('Please finish setting up your account.','कृपया अपना खाता पूरा करें।') : t('Who is using Aegis Home?','Aegis Home कौन इस्तेमाल कर रहा है?')}</p><div class="guide-options">${Object.entries(roleInfo).map(([id, r]) => `<button class="btn secondary" data-role="${id}"><span><strong>${t(r.en, r.hi)}</strong><br><small>${t(...r.sub)}</small></span></button>`).join('')}</div>${account.view === 'choose' ? `<div class="form-actions"><button class="text-btn" data-account="signin">${t('I already have an account — sign in','मेरा खाता है — साइन इन करें')}</button><button class="text-btn" data-close-account>${t('Continue without an account','बिना खाते के आगे बढ़ें')}</button></div>` : ''}`;
  }
  if (account.view === 'signin') {
    return `<form id="account-form">${phoneField('tel')}${passField('passcode', t('6-digit passcode','6 अंकों का पासकोड'), 'current-password')}${error}<div class="form-actions"><button type="button" class="btn secondary" data-account="choose">${t('Back','पीछे')}</button><button class="btn" type="submit" ${busy}>${account.busy ? t('Signing in…','साइन इन हो रहा है…') : t('Sign in','साइन इन')}</button></div></form>`;
  }
  const isHome = account.role === 'elderly_home', finishing = account.view === 'finish';
  return `<form id="account-form"><p class="muted">${t(roleInfo[account.role].en, roleInfo[account.role].hi)}</p><label>${isHome ? t('Contact person’s name','संपर्क व्यक्ति का नाम') : t('Your name','आपका नाम')}<input name="name" required maxlength="80" autocomplete="name"></label>${isHome ? `<label>${t('Elderly home name','वृद्धाश्रम का नाम')}<input name="orgName" required maxlength="120"></label><label>${t('Government registration number','सरकारी पंजीकरण नंबर')}<input name="licenceNumber" required maxlength="60"></label><label>${t('Registration certificate (photo or PDF)','पंजीकरण प्रमाणपत्र (फ़ोटो या PDF)')}<input name="licence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required></label><div class="settings-row"><div><h3>${t('Home location','आश्रम की जगह')}</h3><p class="muted" id="loc-status">${account.loc ? t('Location saved.','जगह सहेज ली गई।') : t('Used to send nearby people who need help to you.','मदद चाहने वाले पास के लोगों को आप तक भेजने के लिए।')}</p></div><button type="button" class="btn secondary" data-account="locate">${t('Use my location','मेरी जगह लें')}</button></div><div class="notice">${t('Your home will be checked against its government registration before it can receive alerts.','अलर्ट पाने से पहले आपके आश्रम के सरकारी पंजीकरण की जाँच होगी।')}</div>` : ''}${finishing ? '' : `${phoneField('tel')}${passField('passcode', t('Choose a 6-digit passcode','6 अंकों का पासकोड चुनें'), 'new-password')}${passField('confirm', t('Type the passcode again','पासकोड फिर से लिखें'), 'new-password')}<p class="muted">${t('Remember this passcode. You will use it with your number to sign in.','यह पासकोड याद रखें। साइन इन के लिए नंबर के साथ इसकी ज़रूरत होगी।')}</p>`}${error}<div class="form-actions"><button type="button" class="btn secondary" data-account="${finishing ? 'finish' : 'choose'}">${t('Back','पीछे')}</button><button class="btn" type="submit" ${busy}>${account.busy ? t('Saving…','सहेज रहे हैं…') : finishing ? t('Finish','पूरा करें') : t('Create my account','मेरा खाता बनाएँ')}</button></div></form>`;
}

function openAccount() {
  if (Backend.available() && !Backend.profile() && account.view !== 'finish' && !account.busy) account.view = account.view === 'signin' ? 'signin' : 'choose';
  modal(t('Your account','आपका खाता'), accountBody());
  bindAccount();
}
function refreshAccount(patch = {}) {
  account = {...account, ...patch};
  if (document.querySelector('#modal').open) { modal(t('Your account','आपका खाता'), accountBody()); bindAccount(); }
}

async function submitAccount(form) {
  const values = Object.fromEntries(new FormData(form));
  const isHome = account.role === 'elderly_home';
  if (account.view !== 'signin' && account.view !== 'finish') {
    if (!Phone.normalize(values.phone)) return refreshAccount({error: accountError('bad_phone')});
    if (!Phone.validPasscode(values.passcode)) return refreshAccount({error: accountError('bad_passcode')});
    if (Phone.weakPasscode(values.passcode)) return refreshAccount({error: accountError('weak_passcode')});
    if (values.passcode !== values.confirm) return refreshAccount({error: accountError('mismatch')});
  }
  if (isHome && account.view !== 'signin') {
    if (!account.loc) return refreshAccount({error: accountError('need_location')});
    if (!values.licenceNumber?.trim() || !values.licence?.size) return refreshAccount({error: accountError('need_licence')});
  }
  refreshAccount({busy: true, error: ''});
  const details = {role: account.role, name: values.name?.trim(), lang: state.lang, phone: values.phone, passcode: values.passcode,
    home: isHome ? {orgName: values.orgName.trim(), licenceNumber: values.licenceNumber.trim(), licenceFile: values.licence, lat: account.loc?.lat, lng: account.loc?.lng} : null};
  try {
    if (account.view === 'signin') await Backend.signIn(values);
    else if (account.view === 'finish') await Backend.createProfile(details);
    else await Backend.signUp(details);
    const profile = Backend.profile();
    if (!profile) { account = {...account, busy: false, view: 'finish', role: null}; return refreshAccount(); }
    if (profile.lang && profile.lang !== state.lang) { state.lang = profile.lang; save(); }
    account = {view: 'choose', role: null, busy: false, error: '', loc: null};
    document.querySelector('#modal').close(); render();
    toast(t(`Welcome, ${profile.full_name}.`, `स्वागत है, ${profile.full_name}।`));
  } catch (error) {
    refreshAccount({busy: false, error: accountError(error.code)});
  }
}

function bindAccount() {
  const modalEl = document.querySelector('#modal');
  modalEl.querySelectorAll('[data-role]').forEach(b => b.onclick = () => refreshAccount({role: b.dataset.role, view: account.view === 'finish' ? 'finish' : 'signup', error: ''}));
  modalEl.querySelectorAll('[data-account]').forEach(b => b.onclick = async () => {
    const action = b.dataset.account;
    if (action === 'signout') { await Backend.signOut(); modalEl.close(); render(); return toast(t('You are signed out.','आप साइन आउट हो गए।')); }
    if (action === 'locate') {
      if (!navigator.geolocation) return refreshAccount({error: t('Location is not available on this device.','इस डिवाइस पर जगह उपलब्ध नहीं है।')});
      document.querySelector('#loc-status').textContent = t('Finding your location…','आपकी जगह ढूँढ रहे हैं…');
      return navigator.geolocation.getCurrentPosition(
        p => { account.loc = {lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5)}; document.querySelector('#loc-status').textContent = t('Location saved.','जगह सहेज ली गई।'); },
        () => { document.querySelector('#loc-status').textContent = t('Please allow location access and try again.','कृपया जगह की अनुमति दें और फिर कोशिश करें।'); },
        {enableHighAccuracy: true, timeout: 15000});
    }
    if (action === 'finish') return refreshAccount({role: null, error: ''});
    refreshAccount({view: action, role: action === 'choose' ? null : account.role, error: ''});
  });
  modalEl.querySelector('[data-close-account]')?.addEventListener('click', () => { try { sessionStorage.setItem('aegis-account-skipped', '1'); } catch {} modalEl.close(); });
  const form = modalEl.querySelector('#account-form');
  if (form) form.onsubmit = e => { e.preventDefault(); if (!account.busy) submitAccount(form); };
}

/* The account appears in the top bar (desktop) and at the top of Settings (all screens). */
const settingsBeforeStep5 = settingsPage;
settingsPage = function() {
  const p = Backend.profile();
  const card = `<div class="card wide-card account-card" style="margin-bottom:24px"><div class="settings-row"><div><h3>${t('Your account','आपका खाता')}</h3><p class="muted">${p ? `${esc(p.full_name)} · ${t(...roleInfo[p.role].short)}` : Backend.available() ? t('Sign in to share care with your family.','परिवार के साथ देखभाल साझा करने के लिए साइन इन करें।') : t('Accounts need the online app.','खाते के लिए ऑनलाइन ऐप चाहिए।')}</p></div><button class="btn secondary" data-account-open>${p ? t('Manage','संभालें') : t('Sign in','साइन इन')}</button></div></div>`;
  return settingsBeforeStep5().replace('<div class="card wide-card">', `${card}<div class="card wide-card">`);
};
const bindBeforeStep5 = bind;
bind = function() {
  bindBeforeStep5();
  document.querySelectorAll('[data-account-open]').forEach(b => b.onclick = openAccount);
  const chip = document.querySelector('.profile');
  if (chip) {
    const p = Backend.profile();
    chip.setAttribute('role', 'button'); chip.tabIndex = 0;
    chip.setAttribute('aria-label', t('Your account','आपका खाता'));
    if (p) {
      chip.querySelector('.avatar').textContent = p.full_name.trim().charAt(0).toUpperCase();
      chip.querySelector('span').innerHTML = `${esc(p.full_name)}<small>${t(...roleInfo[p.role].short)}</small>`;
    } else if (Backend.available()) chip.querySelector('span small').textContent = t('Tap to sign in','साइन इन करें');
    chip.onclick = openAccount;
    chip.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAccount(); } };
  }
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => Backend.setLang(b.dataset.lang)));
};

Backend.start().then(async online => {
  render();
  if (!online) return;
  let skipped = false;
  try { skipped = sessionStorage.getItem('aegis-account-skipped') === '1'; } catch {}
  const signedIn = await Backend.signedIn();
  if (signedIn && !Backend.profile()) { account.view = 'finish'; openAccount(); }
  else if (!signedIn && !skipped && !document.querySelector('#modal').open) openAccount();
});
