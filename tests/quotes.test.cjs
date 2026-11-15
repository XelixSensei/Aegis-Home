const {test}=require('node:test');
const assert=require('node:assert/strict');
const Q=require('../public/quotes.js');

test('every thought has English and Hindi, and none are duplicated',()=>{
  assert.ok(Q.quotes.length>=50);
  for(const q of Q.quotes){
    assert.ok(q.en.length>20&&q.en.length<220,q.en);
    assert.match(q.hi,/[\u0900-\u097F]/,q.en);
  }
  assert.equal(new Set(Q.quotes.map(q=>q.en)).size,Q.quotes.length);
  assert.equal(new Set(Q.quotes.map(q=>q.hi)).size,Q.quotes.length);
});
test('the topics the app promises are all covered',()=>{
  const topics=new Set(Q.quotes.map(q=>q.topic));
  for(const topic of ['harmony','beliefs','civic','safety','health','equality','kindness']) assert.ok(topics.has(topic),topic);
});
test('a full round shows every thought exactly once',()=>{
  let deck;const seen=[];
  for(let i=0;i<Q.quotes.length;i++){const r=Q.next(deck);deck=r.deck;seen.push(r.index);}
  assert.equal(new Set(seen).size,Q.quotes.length);
});
test('a new round never starts with the thought just shown',()=>{
  for(let trial=0;trial<200;trial++){
    let deck,last;
    for(let i=0;i<Q.quotes.length;i++){const r=Q.next(deck);deck=r.deck;last=r.index;}
    assert.notEqual(Q.next(deck).index,last);
  }
});
test('a missing or damaged saved deck starts fresh instead of failing',()=>{
  for(const bad of [undefined,null,{},{order:[1,2],pos:0},{order:'x'}]){
    const r=Q.next(bad);
    assert.ok(Number.isInteger(r.index)&&Q.quotes[r.index]);
  }
});
