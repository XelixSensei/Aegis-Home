const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../public/alarm-clock.js');
const state={routines:[{id:1,name:'Water',time:'09:00'}],appointments:[{id:2,name:'Visit',date:'2026-11-15',time:'09:00'}]};
test('routine and appointment trigger at their IST time, never before',()=>{
  assert.equal(A.pending(state,{},new Date('2026-11-15T03:29:59Z')).length,0);
  assert.equal(A.pending(state,{},new Date('2026-11-15T03:30:00Z')).length,2);
});
test('dismissed reminders stay dismissed after a reload; snooze waits five minutes',()=>{
  const now=new Date('2026-11-15T03:30:00Z');const [r,a]=A.events(state,now);
  const records={[r.key]:{dismissed:true},[a.key]:{snoozeUntil:+now+300000}};
  assert.equal(A.pending(state,records,new Date(+now+299999)).length,0);
  assert.equal(A.pending(state,records,new Date(+now+300000))[0].kind,'appointment');
});
test('a new IST day resets routines and leaves yesterday appointments behind',()=>{
  const before=new Date('2026-11-15T18:29:59Z'),after=new Date('2026-11-15T18:30:00Z');
  assert.equal(A.day(before),'2026-11-15');assert.equal(A.day(after),'2026-11-16');
  assert.equal(A.pending(state,{},after).length,0);
  assert.equal(A.pending(state,{},new Date('2026-11-16T04:00:00Z')).length,1);
});
test('completed and disabled activities do not ring; changed and removed schedules are respected',()=>{
  const now=new Date('2026-11-15T10:00:00+05:30');
  assert.equal(A.pending({routines:[{...state.routines[0],doneDate:A.day(now)}]}, {},now).length,0);
  assert.equal(A.pending({routines:[{...state.routines[0],alarm:false}]},{},now).length,0);
  assert.equal(A.pending({routines:[{...state.routines[0],time:'11:00'}]},{},now).length,0);
  assert.equal(A.pending({routines:[]},{},now).length,0);
});
