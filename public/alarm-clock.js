/* Pure scheduling logic. All saved times use India Standard Time. */
(function(root) {
  const day = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const at = (date, time) => Date.parse(`${date}T${time}:00+05:30`);
  // Step 4: appointments can ring early. Minutes before the visit; 0 means at the visit time.
  const LEADS = [1440, 60, 15, 0];
  const leadsOf = a => {
    const list = Array.isArray(a.leads) ? a.leads.map(Number).filter(n => LEADS.includes(n)) : [0];
    return [...new Set(list)];
  };
  function events(state, now = new Date()) {
    const today = day(now);
    return [
      ...(state.routines || []).filter(r => r.alarm !== false && r.doneDate !== today).map(r => ({kind:'routine',id:r.id,name:r.name,hi:r.hi,time:r.time,date:today,due:at(today,r.time),key:`routine:${r.id}:${today}:${r.time}`})),
      ...(state.appointments || []).filter(a => a.alarm !== false).flatMap(a => leadsOf(a).map(lead => {
        const due = at(a.date,a.time) - lead*60000;
        // Lead 0 keeps the Step 3 key so saved acknowledgements still apply.
        const key = `appointment:${a.id}:${a.date}:${a.time}${lead ? `:${lead}` : ''}`;
        return {kind:'appointment',id:a.id,name:a.name,time:a.time,date:a.date,place:a.place,lead,due,remindDay:Number.isFinite(due)?day(new Date(due)):a.date,key};
      }))
    ].filter(e => Number.isFinite(e.due));
  }
  function pending(state, records, now = new Date()) {
    return events(state,now).filter(e => {
      const r = records[e.key];
      if(r?.dismissed) return false;
      // An early reminder is no longer useful once the visit time itself has arrived.
      if(e.lead && now.getTime() >= e.due + e.lead*60000) return false;
      const due = r?.snoozeUntil || e.due;
      // Catch up on today's reminders after returning to the app, not old visits.
      return (e.remindDay || e.date) === day(now) && due <= now.getTime();
    }).sort((a,b)=>a.due-b.due);
  }
  const api = {day,at,events,pending,LEADS,leadsOf};
  if(typeof module !== 'undefined') module.exports=api; else root.AlarmClock=api;
})(globalThis);
