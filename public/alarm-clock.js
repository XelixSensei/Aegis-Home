/* Pure scheduling logic. All saved times use India Standard Time. */
(function(root) {
  const day = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const at = (date, time) => Date.parse(`${date}T${time}:00+05:30`);
  function events(state, now = new Date()) {
    const today = day(now);
    return [
      ...(state.routines || []).filter(r => r.alarm !== false && r.doneDate !== today).map(r => ({kind:'routine',id:r.id,name:r.name,hi:r.hi,time:r.time,date:today,due:at(today,r.time),key:`routine:${r.id}:${today}:${r.time}`})),
      ...(state.appointments || []).filter(a => a.alarm !== false).map(a => ({kind:'appointment',id:a.id,name:a.name,time:a.time,date:a.date,place:a.place,due:at(a.date,a.time),key:`appointment:${a.id}:${a.date}:${a.time}`}))
    ].filter(e => Number.isFinite(e.due));
  }
  function pending(state, records, now = new Date()) {
    return events(state,now).filter(e => {
      const r = records[e.key];
      if(r?.dismissed) return false;
      const due = r?.snoozeUntil || e.due;
      // Catch up on today's reminders after returning to the app, not old visits.
      return e.date === day(now) && due <= now.getTime();
    }).sort((a,b)=>a.due-b.due);
  }
  const api = {day,at,events,pending};
  if(typeof module !== 'undefined') module.exports=api; else root.AlarmClock=api;
})(globalThis);
