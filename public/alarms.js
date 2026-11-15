/* Step 3: on-device reminders. No background-delivery or caregiver claims. */
state.alarmRecords ||= {};
let alarmsArmed=false, alarmAudio, alarmRepeat, alarmActive=null;
const heardThisSession=new Set();
const alarmDialog=document.createElement('dialog');
alarmDialog.id='alarm-dialog';alarmDialog.setAttribute('aria-labelledby','alarm-title');
document.body.append(alarmDialog);

function persistAlarmState(next) {
  try {localStorage.setItem('aegis-step2-v1',JSON.stringify(next));state=next;return true;}
  catch {toast(t('Please free a little device space and try saving again.','कृपया डिवाइस में थोड़ी जगह खाली करके फिर से सहेजें।'));return false;}
}
function chime() {
  if(alarmAudio?.state!=='running')return;
  [523.25,659.25,783.99].forEach((frequency,i)=>{
    const oscillator=alarmAudio.createOscillator(),gain=alarmAudio.createGain();
    const start=alarmAudio.currentTime+i*.28;
    oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start);
    gain.gain.linearRampToValueAtTime(.12,start+.04);gain.gain.exponentialRampToValueAtTime(.001,start+.65);
    oscillator.connect(gain);gain.connect(alarmAudio.destination);oscillator.start(start);oscillator.stop(start+.7);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  });
}
function stopChime(){clearInterval(alarmRepeat);alarmRepeat=null;}
async function enableAlarms(){
  try {const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){alarmAudio ||= new Audio();await alarmAudio.resume();}}
  catch { /* Visual reminders are still available. */ }
  alarmsArmed=true;chime();render();
  toast(alarmAudio?.state==='running'?t('Reminders are ready. You can try the sound below.','रिमाइंडर तैयार हैं। आप नीचे आवाज़ सुन सकते हैं।'):t('On-screen reminders are ready. Sound is unavailable in this browser.','स्क्रीन पर रिमाइंडर तैयार हैं। इस ब्राउज़र में आवाज़ उपलब्ध नहीं है।'));
  checkAlarms();
}
function alarmPanel(){return `<section class="alarm-panel" aria-label="${t('Reminder controls','रिमाइंडर के विकल्प')}"><h2>${icon('bell')} ${t('A gentle nudge, right on time','समय पर एक प्यारी याद')}</h2><p>${t('Keep this app open and your device awake for reminders. Closed apps and locked screens cannot reliably ring yet. Use one tab for this preview.','रिमाइंडर के लिए ऐप खुला और डिवाइस चालू रखें। अभी बंद ऐप या लॉक स्क्रीन पर घंटी भरोसे से नहीं बज सकती। इस प्रीव्यू का एक ही टैब खोलें।')}</p><p class="alarm-count">${alarmsArmed?(alarmAudio?.state==='running'?t('Sound and on-screen reminders are on for this visit.','इस बार आवाज़ और स्क्रीन रिमाइंडर चालू हैं।'):t('On-screen reminders are on. Tap Enable sound to hear the chime.','स्क्रीन रिमाइंडर चालू हैं। घंटी के लिए आवाज़ चालू करें।')):t('Tap below to start reminders each time you open the app.','जब भी ऐप खोलें, रिमाइंडर शुरू करने के लिए नीचे दबाएँ।')}</p><div class="alarm-actions"><button class="btn" data-alarm-enable>${alarmsArmed?t('Enable sound','आवाज़ चालू करें'):t('Start reminders','रिमाइंडर शुरू करें')}</button><button class="btn secondary" data-alarm-test>${t('Try an alarm','घंटी आज़माएँ')}</button>${alarmsArmed?`<button class="btn secondary" data-alarm-pause>${t('Pause reminders','रिमाइंडर रोकें')}</button>`:''}</div></section>`;}

const homeBeforeAlarms=home;
home=function(){return homeBeforeAlarms()+alarmPanel();};
const settingsBeforeAlarms=settingsPage;
settingsPage=function(){return settingsBeforeAlarms()+alarmPanel();};
routineRows=function(){const today=AlarmClock.day();return state.routines.map(r=>`<div class="alarm-row"><div class="details"><h3>${esc(localName(r))}</h3><p>${time(r.time)} · IST</p><p>${r.doneDate===today?t('Lovely — today’s activity is complete.','बहुत अच्छा — आज की गतिविधि पूरी हुई।'):t('A little moment for you today.','आज का एक छोटा पल, आपके लिए।')} · ${r.alarm===false?t('Alarm off','घंटी बंद'):t('Alarm on','घंटी चालू')}</p></div><div class="alarm-actions"><button class="btn secondary" data-routine="${r.id}" aria-pressed="${r.doneDate===today}">${r.doneDate===today?t('Undo today','आज का निशान हटाएँ'):t('Done today','आज पूरा किया')}</button><button class="btn secondary" data-edit-routine="${r.id}">${t('Edit','बदलें')}</button></div></div>`).join('')||`<p>${t('Add a little activity you enjoy.','अपनी पसंद की छोटी-सी गतिविधि जोड़ें।')}</p>`;};
routinePage=function(){return `${header(t('My daily routine','मेरी दिनचर्या'),t('Make a little room for the things you enjoy.','अपनी पसंद की चीज़ों के लिए थोड़ा समय रखें।'))}${alarmPanel()}<section class="card wide-card"><div class="card-head"><h2>${t('My daily activities','मेरी रोज़ की गतिविधियाँ')}</h2><button class="btn" data-action="add-routine">${t('Add activity','गतिविधि जोड़ें')}</button></div>${routineRows()}</section>`;};
appointmentsPage=function(){return `${header(t('My appointments','मेरी अपॉइंटमेंट'),t('Your next visit, with a gentle reminder at its scheduled time.','अगली मुलाकात के तय समय पर एक प्यारी याद।'))}${alarmPanel()}<section class="card wide-card"><div class="card-head"><h2>${t('My visits','मेरी मुलाकातें')}</h2><button class="btn" data-action="appointment">${t('Add visit','मुलाकात जोड़ें')}</button></div>${state.appointments.map(a=>`<div class="alarm-row"><div class="details"><h3>${esc(a.name)}</h3><p>${esc(a.place)}</p><p>${new Date(a.date+'T12:00:00+05:30').toLocaleDateString(state.lang==='hi'?'hi-IN':'en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'})} · ${time(a.time)} IST</p><p>${a.alarm===false?t('Alarm off','घंटी बंद'):t('Alarm at the appointment time','मुलाकात के समय घंटी')}</p></div><button class="btn secondary" data-edit-visit="${a.id}">${t('Edit visit','मुलाकात बदलें')}</button></div>`).join('')||`<p class="empty">${t('Add your next visit whenever you are ready.','जब चाहें, अपनी अगली मुलाकात जोड़ें।')}</p>`}</section>`;};

function scheduleForm(kind,id){
  const routine=kind==='routine',list=routine?state.routines:state.appointments,item=list.find(x=>String(x.id)===String(id));
  modal(routine?t('Your daily activity','आपकी रोज़ की गतिविधि'):t('Your appointment','आपकी अपॉइंटमेंट'),`<form id="alarm-schedule"><label>${t('Name','नाम')}<input name="name" required maxlength="80" value="${esc(item?.name||'')}"></label>${routine?'':`<label>${t('Place','जगह')}<input name="place" required maxlength="100" value="${esc(item?.place||'')}"></label><label>${t('Date','तारीख')}<input name="date" type="date" required value="${esc(item?.date||AlarmClock.day())}"></label>`}<label>${t('Time in India (IST)','भारत का समय (IST)')}<input name="time" type="time" required value="${esc(item?.time||'09:00')}"></label><label class="alarm-check"><input type="checkbox" name="alarm" ${item?.alarm===false?'':'checked'}>${t('Remind me at this time','इस समय याद दिलाएँ')}</label><p>${t('The app needs to stay open for the alarm.','घंटी के लिए ऐप खुला रहना चाहिए।')}</p><div class="alarm-actions">${item?`<button type="button" class="btn secondary" id="remove-schedule">${t('Remove from my schedule','मेरी सूची से हटाएँ')}</button>`:''}<button class="btn" type="submit">${t('Save','सहेजें')}</button></div></form>`);
  document.querySelector('#alarm-schedule').onsubmit=e=>{
    e.preventDefault();const values=Object.fromEntries(new FormData(e.target));if(!values.name.trim())return;
    const record={...item,...values,id:item?.id||crypto.randomUUID(),name:values.name.trim(),alarm:values.alarm==='on'};
    if(item?.name!==record.name)delete record.hi;
    if(routine){record.type=item?.type||'sun';record.doneDate=item?.doneDate||null;}
    const next=item?list.map(x=>x.id===item.id?record:x):[...list,record];next.sort((a,b)=>((a.date||'')+a.time).localeCompare((b.date||'')+b.time));
    if(!persistAlarmState({...state,[routine?'routines':'appointments']:next}))return;
    document.querySelector('#modal').close();render();toast(t('Your schedule is saved.','आपका समय सहेज लिया है।'));checkAlarms();
  };
  if(item)document.querySelector('#remove-schedule').onclick=()=>{
    if(!persistAlarmState({...state,[routine?'routines':'appointments']:list.filter(x=>x.id!==item.id)}))return;
    document.querySelector('#modal').close();render();
  };
}
actions['add-routine']=()=>scheduleForm('routine');actions.appointment=()=>scheduleForm('appointment');
actions.notifications=()=>{modal(t('Your reminders','आपके रिमाइंडर'),alarmPanel());bindAlarmControls();};

function finishAlarm(snooze=false){
  if(alarmActive&&!alarmActive.test){
    const value=snooze?{snoozeUntil:Date.now()+5*60000}:{dismissed:true};
    if(!persistAlarmState({...state,alarmRecords:{...state.alarmRecords,[alarmActive.key]:value}}))return;
  }
  stopChime();alarmActive=null;alarmDialog.close();render();checkAlarms();
}
function showAlarm(event){
  alarmActive=event;const late=!event.test&&Date.now()-event.due>60000;
  alarmDialog.innerHTML=`<div class="alarm-kind">${event.test?t('A practice reminder','एक अभ्यास रिमाइंडर'):event.kind==='routine'?t('A moment for your routine','आपकी दिनचर्या का समय'):t('Your appointment reminder','आपकी मुलाकात की याद')}</div><h2 id="alarm-title">${event.test?t('This is your gentle alarm','यह आपकी प्यारी घंटी है'):esc(localName(event))}</h2><p>${event.test?t('When a reminder arrives, you can acknowledge it or snooze for five minutes.','याद आने पर आप ठीक है दबा सकते हैं या पाँच मिनट बाद फिर याद दिला सकते हैं।'):t(late?'This was scheduled earlier today. Take a moment to review it.':'It is time for your planned activity.',late?'यह आज पहले के समय के लिए तय था। एक बार देख लें।':'आपकी तय गतिविधि का समय हो गया है।')}</p>${event.test?'':`<p>${esc(event.date)} · ${time(event.time)} IST${event.place?`<br>${esc(event.place)}`:''}</p>`}<p id="alarm-sound-state">${alarmAudio?.state==='running'?t('A gentle chime accompanies this reminder.','इस याद के साथ हल्की घंटी बजती है।'):t('This reminder is on screen. Enable sound from the reminder controls when you are ready.','यह याद स्क्रीन पर है। जब चाहें, रिमाइंडर के विकल्पों से आवाज़ चालू करें।')}</p><div class="alarm-actions"><button class="btn" id="alarm-okay" autofocus>${t('Okay, thank you','ठीक है, धन्यवाद')}</button>${event.test?'':`<button class="btn secondary" id="alarm-snooze">${t('In 5 minutes','5 मिनट बाद')}</button>`}</div>`;
  document.querySelector('#alarm-okay').onclick=()=>finishAlarm();if(!event.test)document.querySelector('#alarm-snooze').onclick=()=>finishAlarm(true);
  alarmDialog.showModal();chime();let repeats=0;
  alarmRepeat=setInterval(()=>{if(++repeats>=5)stopChime();else chime();},4000);
}
alarmDialog.addEventListener('cancel',e=>{e.preventDefault();finishAlarm();});
alarmDialog.addEventListener('close',stopChime);
function checkAlarms(){
  if(!alarmsArmed||alarmDialog.open||document.querySelector('#modal').open||document.hidden)return;
  const pending=AlarmClock.pending(state,state.alarmRecords);
  const next=pending.find(e=>!heardThisSession.has(e.key)||state.alarmRecords[e.key]?.snoozeUntil);
  if(next){heardThisSession.add(next.key);showAlarm(next);}
}
function bindAlarmControls(){
  document.querySelectorAll('[data-alarm-enable]').forEach(b=>b.onclick=async()=>{document.querySelector('#modal').close();await enableAlarms();});
  document.querySelectorAll('[data-alarm-test]').forEach(b=>b.onclick=async()=>{
    document.querySelector('#modal').close();try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){alarmAudio ||= new Audio();await alarmAudio.resume();}}catch{}
    showAlarm({test:true});
  });
  document.querySelectorAll('[data-alarm-pause]').forEach(b=>b.onclick=()=>{alarmsArmed=false;stopChime();document.querySelector('#modal').close();render();});
}
const bindBeforeAlarms=bind;
bind=function(){bindBeforeAlarms();bindAlarmControls();
  document.querySelectorAll('[data-routine]').forEach(b=>b.onclick=()=>{
    const next=state.routines.map(r=>String(r.id)===b.dataset.routine?{...r,doneDate:r.doneDate===AlarmClock.day()?null:AlarmClock.day()}:r);
    if(persistAlarmState({...state,routines:next}))render();
  });
  document.querySelectorAll('[data-edit-routine]').forEach(b=>b.onclick=()=>scheduleForm('routine',b.dataset.editRoutine));
  document.querySelectorAll('[data-edit-visit]').forEach(b=>b.onclick=()=>scheduleForm('appointment',b.dataset.editVisit));
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();checkAlarms();}});
window.addEventListener('pagehide',stopChime);
let alarmDay=AlarmClock.day();
setInterval(()=>{const today=AlarmClock.day();if(today!==alarmDay&&!alarmDialog.open&&!document.querySelector('#modal').open){alarmDay=today;render();}checkAlarms();},1000);
render();
