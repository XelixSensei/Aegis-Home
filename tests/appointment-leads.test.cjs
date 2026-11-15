const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../public/alarm-clock.js');
const visit=(leads)=>({appointments:[{id:'v',name:'Eye check',date:'2026-11-16',time:'10:00',leads}]});

test('an appointment rings one hour early, then at its time',()=>{
  const s=visit([60,0]);
  assert.equal(A.pending(s,{},new Date('2026-11-16T08:59:59+05:30')).length,0);
  const early=A.pending(s,{},new Date('2026-11-16T09:00:00+05:30'));
  assert.deepEqual(early.map(e=>e.lead),[60]);
  const onTime=A.pending(s,{[early[0].key]:{dismissed:true}},new Date('2026-11-16T10:00:00+05:30'));
  assert.deepEqual(onTime.map(e=>e.lead),[0]);
});
test('a day-before reminder rings on the previous IST day',()=>{
  const s=visit([1440]);
  assert.equal(A.pending(s,{},new Date('2026-11-15T09:59:59+05:30')).length,0);
  const [e]=A.pending(s,{},new Date('2026-11-15T10:00:00+05:30'));
  assert.equal(e.lead,1440);assert.equal(e.remindDay,'2026-11-15');assert.equal(e.date,'2026-11-16');
});
test('an early reminder stops once the visit time has arrived',()=>{
  const at=new Date('2026-11-16T10:00:00+05:30');
  assert.deepEqual(A.pending(visit([60]),{},at),[]);
});
test('Step 3 appointments without leads keep their original alarm key',()=>{
  const [e]=A.events({appointments:[{id:2,name:'Visit',date:'2026-11-15',time:'09:00'}]});
  assert.equal(e.key,'appointment:2:2026-11-15:09:00');assert.equal(e.lead,0);
});
test('unknown lead values are ignored and an empty list rings nothing',()=>{
  assert.deepEqual(A.leadsOf({leads:[60,999,'15']}),[60,15]);
  assert.equal(A.events(visit([])).length,0);
});
