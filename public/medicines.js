/* Step 2, first slice: local daily medication records and private photo check-ins. */
state.checkins ||= {};
let cameraStream, photoBlob, previewUrl, captureDay, captureId;
const photoDB = new Promise((resolve, reject) => {
  const request = indexedDB.open('aegis-medication-photos-v1', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('photos');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
photoDB.catch(() => {});
async function photoStore(method, key, blob) {
  const db = await photoDB;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', method === 'get' ? 'readonly' : 'readwrite');
    const store = tx.objectStore('photos');
    const request = method === 'put' ? store.put(blob, key) : store[method](key);
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Storage interrupted'));
  });
}
function stopCamera() {
  cameraStream?.getTracks().forEach(track => track.stop());
  cameraStream = null;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
}
document.querySelector('#modal').addEventListener('close', stopCamera);
window.addEventListener('pagehide', stopCamera);
const labels = () => ({taken:t('Check-in saved','चेक-इन सहेजा गया'), missed:t('Check-in still open · scheduled time passed','चेक-इन अभी खुला है · तय समय बीत गया'), due:t('Ready for your check-in?','चेक-इन के लिए तैयार हैं?'), upcoming:t('Coming up today','आज आने वाला समय')});
medRows = function(edit = false) {
  return [...state.meds].sort((a,b) => a.time.localeCompare(b.time)).map(m => {
    const status = DoseLedger.status(m, state.checkins), recorded = status === 'taken';
    return `<article class="med dose-row ${recorded?'done':''}"><div class="med-icon">${icon(recorded?'check':'pill')}</div><div class="med-info"><h3>${esc(localName(m))}</h3><p>${esc(state.lang==='hi'?(m.doseHi||m.dose):m.dose)} · ${esc(state.lang==='hi'?(m.noteHi||m.note):m.note)}</p><span class="dose-status ${status}">${labels()[status]}</span>${edit?`<button class="text-btn" data-edit-med="${m.id}">${t('Edit schedule','समय बदलें')}</button>`:''}</div><div class="dose-controls"><strong class="med-time">${time(m.time)}</strong><button class="btn ${recorded?'secondary':''}" data-checkin="${m.id}">${icon(recorded?'check':'plus')}${recorded?t('View check-in','चेक-इन देखें'):t('Take a photo','फोटो लें')}</button></div></article>`;
  }).join('') || `<p class="empty">${t('Add a medicine from your prescription to begin.','शुरू करने के लिए पर्चे में लिखी दवा जोड़ें।')}</p>`;
};
medCard = function() {
  const count = state.meds.filter(m => DoseLedger.status(m, state.checkins)==='taken').length;
  return `<section class="card"><div class="card-pad"><div class="card-head"><div class="card-title">${icon('pill')}<h2>${t("Today's medicines",'आज की दवाएं')}</h2></div><button class="text-btn" data-page="meds">${t('View all','सब देखें')}${icon('arrow')}</button></div><div class="progress-line"><span>${t('One check-in at a time.','एक-एक कदम, अपना खयाल रखें।')}</span><strong>${count}/${state.meds.length} ${t('recorded','दर्ज')}</strong></div><div class="progress" role="progressbar" aria-label="${t('Daily check-ins','आज के चेक-इन')}" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="${state.meds.length||1}"><div style="width:${state.meds.length?count/state.meds.length*100:0}%"></div></div>${medRows()}</div><div class="card-foot">${t('Times follow India Standard Time.','सभी समय भारतीय मानक समय के अनुसार हैं।')}</div></section>`;
};
medsPage = function() {
  return `${header(t('Your medicines, one step at a time.','आपकी दवाएं, एक-एक कदम।'),t('Follow your prescription. A photo saves your daily check-in.','अपने पर्चे का पालन करें। फोटो से आज का चेक-इन सहेजें।'))}<div class="notice">${t('Private device preview. Photos stay in this browser. Your care circle cannot see them yet, and no missed-dose messages are sent.','निजी डिवाइस पूर्वावलोकन। फोटो इसी ब्राउज़र में रहती हैं। आपके देखभाल साथी अभी इन्हें नहीं देख सकते और दवा छूटने के संदेश नहीं भेजे जाते।')}</div><section class="card wide-card"><div class="card-head"><h2>${t("Today's medicines",'आज की दवाएं')}</h2><button class="btn" data-action="add-med">${icon('plus')}${t('Add medicine','दवा जोड़ें')}</button></div>${medRows(true)}</section><p class="notice">${t('“Check-in still open” means no check-in was saved within 30 minutes of the scheduled time. It does not prove a dose was missed. A photo cannot confirm swallowing. If you are unsure about a dose, ask your doctor or pharmacist.','“समय बीत गया” का अर्थ है तय समय के 30 मिनट बाद भी चेक-इन दर्ज नहीं हुआ। इससे दवा छूटना साबित नहीं होता। फोटो से दवा निगलने की पुष्टि नहीं होती। दवा को लेकर संदेह हो तो डॉक्टर या फार्मासिस्ट से पूछें।')}</p><section class="card wide-card"><h2>${t('Recent check-ins','हाल के चेक-इन')}</h2>${Object.entries(state.checkins).sort((a,b)=>b[1].at.localeCompare(a[1].at)).slice(0,14).map(([key,r])=>`<div class="history-row"><strong>${esc(r.name)}</strong><span>${new Date(r.at).toLocaleString(state.lang==='hi'?'hi-IN':'en-IN',{timeZone:'Asia/Kolkata'})}</span><button class="text-btn" data-history="${esc(key)}">${t('View photo','फोटो देखें')}</button></div>`).join('')||`<p class="muted">${t('Your saved check-ins will appear here.','आपके सहेजे गए चेक-इन यहां दिखेंगे।')}</p>`}</section>`;
};
async function showCheckin(key) {
  const record = state.checkins[key];
  if (!record) return;
  modal(t('Your saved check-in','आपका सहेजा हुआ चेक-इन'), `<p>${esc(record.name)}</p><p class="muted">${new Date(record.at).toLocaleString(state.lang==='hi'?'hi-IN':'en-IN',{timeZone:'Asia/Kolkata'})} IST</p><div id="saved-photo" role="status">${t('Opening photo…','फोटो खुल रही है…')}</div><p class="notice">${t('Only on this device. Not shared with your care circle.','सिर्फ इस डिवाइस पर। देखभाल साथियों से साझा नहीं किया गया।')}</p><button class="btn secondary" id="remove-checkin">${t('Remove this check-in','यह चेक-इन हटाएं')}</button>`);
  try {
    const blob = await photoStore('get',record.photoId);
    if (!blob) throw new Error('Missing photo');
    if (!document.querySelector('#saved-photo')) return;
    previewUrl = URL.createObjectURL(blob);
    document.querySelector('#saved-photo').innerHTML = `<img class="checkin-photo" src="${previewUrl}" alt="${t('Your medication check-in photo','दवा लेते समय आपकी फोटो')}">`;
  } catch { const el=document.querySelector('#saved-photo'); if(el) el.textContent=t('The photo is unavailable on this device.','इस डिवाइस पर फोटो उपलब्ध नहीं है।'); }
  const remove = document.querySelector('#remove-checkin');
  if (remove) remove.onclick = () => {
    modal(t('Remove this record?','यह रिकॉर्ड हटाएं?'), `<p>${t('The photo and check-in will be deleted from this browser. This does not mean you should take another dose.','फोटो और चेक-इन इस ब्राउज़र से हट जाएंगे। इसका मतलब यह नहीं कि आपको फिर से दवा लेनी चाहिए।')}</p><button class="btn" id="confirm-remove">${t('Delete photo and check-in','फोटो और चेक-इन हटाएं')}</button>`);
    stopCamera();
    document.querySelector('#confirm-remove').onclick = async () => {
      try {
        const next = {...state.checkins}; delete next[key];
        localStorage.setItem('aegis-step2-v1',JSON.stringify({...state,checkins:next}));
        state.checkins = next;
        await photoStore('delete',record.photoId);
        document.querySelector('#modal').close(); render();
      } catch { toast(t('Could not finish deleting. Please try again.','हटाया नहीं जा सका। फिर कोशिश करें।')); }
    };
  };
}
function startCheckin(id) {
  const m = state.meds.find(x=>x.id===id); if(!m) return;
  const key = DoseLedger.key(id);
  if(state.checkins[key]) return showCheckin(key);
  captureDay = DoseLedger.day(); captureId = id; photoBlob = null; stopCamera();
  modal(t('A photo for your check-in','चेक-इन के लिए एक फोटो'), `<p><strong>${esc(localName(m))}</strong> · ${time(m.time)}</p><p>${t('Follow your usual prescription. Take a photo when you are ready, then review it before saving.','अपने पर्चे का पालन करें। तैयार होने पर फोटो लें और सहेजने से पहले देखें।')}</p><div id="camera-area" class="camera-area"><p>${t('Your camera is off.','आपका कैमरा बंद है।')}</p></div><div class="capture-actions"><button class="btn" id="open-camera">${t('Open camera','कैमरा खोलें')}</button><button class="btn secondary" id="snap" hidden>${t('Take photo','फोटो लें')}</button></div><label>${t('Or use your phone camera / choose a photo','या फोन के कैमरे से लें / फोटो चुनें')}<input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" capture="user"></label><label class="consent"><input type="checkbox" id="photo-consent"> <span>${t('Save this photo on this device. I understand it is not shared yet.','यह फोटो इसी डिवाइस पर सहेजें। मैं समझता/समझती हूं कि यह अभी साझा नहीं होती।')}</span></label><p id="capture-status" role="status"></p><button class="btn" id="save-checkin" disabled>${t('Save as taken today','आज ली गई के रूप में सहेजें')}</button>`);
  const status = message => { const el=document.querySelector('#capture-status');if(el)el.textContent=message; };
  const ready = () => document.querySelector('#save-checkin').disabled = !(photoBlob && document.querySelector('#photo-consent').checked);
  const preview = blob => {
    if(!document.querySelector('#camera-area'))return;
    stopCamera(); photoBlob=blob; previewUrl=URL.createObjectURL(blob);
    document.querySelector('#camera-area').innerHTML=`<img class="checkin-photo" src="${previewUrl}" alt="${t('Review your photo before saving','सहेजने से पहले फोटो देखें')}">`;
    document.querySelector('#snap').hidden=true;
    document.querySelector('#open-camera').textContent=t('Retake photo','फिर फोटो लें');ready();
  };
  document.querySelector('#open-camera').onclick=async()=>{
    try {
      stopCamera(); photoBlob=null;ready();
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('unavailable');
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
      if(!document.querySelector('#camera-area')){stream.getTracks().forEach(t=>t.stop());return;}
      cameraStream=stream;
      document.querySelector('#camera-area').innerHTML='<video id="camera-video" autoplay playsinline muted></video>';
      document.querySelector('#camera-video').srcObject=stream;
      document.querySelector('#snap').hidden=false;
      status(t('Camera ready. Take a photo when comfortable.','कैमरा तैयार है। आराम से फोटो लें।'));
    } catch {status(t('Camera could not open. Allow camera access or use the photo chooser below.','कैमरा नहीं खुला। कैमरे की अनुमति दें या नीचे से फोटो चुनें।'));}
  };
  document.querySelector('#snap').onclick=()=>{
    const video=document.querySelector('#camera-video');if(!video?.videoWidth)return;
    const canvas=document.createElement('canvas');canvas.width=Math.min(video.videoWidth,1280);canvas.height=video.videoHeight*canvas.width/video.videoWidth;
    canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
    canvas.toBlob(blob=>{if(blob)preview(blob);},'image/jpeg',.85);
  };
  document.querySelector('#photo-input').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){status(t('Choose a JPG, PNG or WebP under 10 MB.','10 MB से छोटी JPG, PNG या WebP फोटो चुनें।'));return;}
    try {
      const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');
      canvas.width=Math.min(bitmap.width,1280);canvas.height=bitmap.height*canvas.width/bitmap.width;
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      canvas.toBlob(blob=>{if(blob)preview(blob);},'image/jpeg',.85);
    } catch { status(t('That photo could not be read. Try another photo.','फोटो खुल नहीं सकी। दूसरी फोटो चुनें।')); }
  };
  document.querySelector('#photo-consent').onchange=ready;
  document.querySelector('#save-checkin').onclick=async e=>{
    if(!photoBlob||!document.querySelector('#photo-consent').checked)return;
    if(captureDay!==DoseLedger.day()){status(t('A new day has started. Close this window and start a new check-in.','नया दिन शुरू हो गया है। यह खिड़की बंद करके नया चेक-इन करें।'));return;}
    e.target.disabled=true;
    const photoId=crypto.randomUUID();
    try {
      await photoStore('put',photoId,photoBlob);
      const next={...state.checkins,[DoseLedger.key(captureId)]:{name:localName(m),at:new Date().toISOString(),photoId}};
      localStorage.setItem('aegis-step2-v1',JSON.stringify({...state,checkins:next}));
      state.checkins=next;
      document.querySelector('#modal').close();render();toast(t('Today’s check-in saved on this device.','आज का चेक-इन इस डिवाइस पर सहेजा गया।'));
    } catch {
      await photoStore('delete',photoId).catch(()=>{});
      status(t('Could not save. Free some device storage and try again. The dose has not been marked taken.','सहेजा नहीं जा सका। डिवाइस में जगह खाली करें और फिर कोशिश करें। दवा ली गई के रूप में दर्ज नहीं हुई है।'));e.target.disabled=false;
    }
  };
}
const originalBind=bind;
bind=function(){originalBind();document.querySelectorAll('[data-checkin]').forEach(b=>b.onclick=()=>startCheckin(Number(b.dataset.checkin)));document.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>showCheckin(b.dataset.history));};
actions.reset=()=>{
  modal(t('Start fresh?','नई शुरुआत करें?'),`<p>${t('This clears your saved preview schedules, conversations, check-ins and photos on this device.','इससे इस डिवाइस पर सहेजे गए पूर्वावलोकन के समय, बातचीत, चेक-इन और फोटो हट जाएंगे।')}</p><button class="btn" id="fresh-start">${t('Clear preview and start fresh','पूर्वावलोकन हटाकर नई शुरुआत करें')}</button>`);
  document.querySelector('#fresh-start').onclick=async()=>{
    try {await photoStore('clear');localStorage.removeItem('aegis-step2-v1');location.reload();}
    catch {toast(t('Please try again to finish clearing your preview.','पूर्वावलोकन पूरा साफ करने के लिए फिर कोशिश करें।'));}
  };
};
let lastMinute='';
setInterval(()=>{const stamp=new Date().toISOString().slice(0,16);if(stamp!==lastMinute){lastMinute=stamp;if(!document.querySelector('#modal').open&&['home','meds'].includes(page))render();}},15000);
render();
