const {test}=require('node:test');
const assert=require('node:assert/strict');
const ledger=require('../public/dose-ledger.js');
const medicine={id:7,time:'08:00'};
test('India midnight starts a fresh daily check-in',()=>{
  const before=new Date('2026-11-15T18:29:59Z'),after=new Date('2026-11-15T18:30:00Z');
  assert.equal(ledger.day(before),'2026-11-15');
  assert.equal(ledger.day(after),'2026-11-16');
  const records={[ledger.key(7,before)]:{photoId:'private-photo'}};
  assert.equal(ledger.status(medicine,records,before),'taken');
  assert.equal(ledger.status(medicine,records,after),'upcoming');
});
test('scheduled time and 30-minute grace period have exact boundaries',()=>{
  for(const [at,status] of [['02:29:59','upcoming'],['02:30:00','due'],['02:59:59','due'],['03:00:00','missed']])
    assert.equal(ledger.status(medicine,{},new Date(`2026-11-15T${at}Z`)),status);
});
test('another medicine record cannot mark this medicine taken',()=>{
  const now=new Date('2026-11-15T06:00:00Z');
  assert.equal(ledger.status(medicine,{[ledger.key(8,now)]:{}},now),'missed');
});
test('a late check-in replaces overdue status',()=>{
  const now=new Date('2026-11-15T06:00:00Z');
  assert.equal(ledger.status(medicine,{[ledger.key(7,now)]:{photoId:'photo'}},now),'taken');
});
