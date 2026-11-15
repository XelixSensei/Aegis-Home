/* Date-scoped check-ins. Deliberately independent of the interface and camera. */
(function (root) {
  const parts = now => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).map(p => [p.type, p.value]));
  const day = (now = new Date()) => { const p = parts(now); return `${p.year}-${p.month}-${p.day}`; };
  const key = (id, now = new Date()) => `${day(now)}:${id}`;
  const status = (medicine, records, now = new Date()) => {
    if (records[key(medicine.id, now)]) return 'taken';
    const p = parts(now), [h, m] = medicine.time.split(':').map(Number);
    const elapsed = Number(p.hour) * 60 + Number(p.minute) - (h * 60 + m);
    return elapsed >= 30 ? 'missed' : elapsed >= 0 ? 'due' : 'upcoming';
  };
  const api = {day, key, status};
  if (typeof module !== 'undefined') module.exports = api;
  else root.DoseLedger = api;
})(globalThis);
