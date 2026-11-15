const {test}=require('node:test');
const assert=require('node:assert/strict');
const G=require('../public/music-guide.js');

test('the guide asks for a singer first, then the type of music',()=>{
  assert.equal(G.nextNode([]),'singer');
  assert.equal(G.nextNode([{node:'singer',value:''}]),'type');
});
test('religious music asks which faith, and Hindu asks which bhajan',()=>{
  const a=[{node:'singer',value:''},{node:'type',value:'religious'}];
  assert.equal(G.nextNode(a),'faith');
  assert.equal(G.nextNode([...a,{node:'faith',value:'hindu'}]),'deity');
  const done=[...a,{node:'faith',value:'hindu'},{node:'deity',value:'hanuman'}];
  assert.equal(G.nextNode(done),null);
  assert.equal(G.buildQuery(done),'hanuman chalisa');
});
test('every faith option leads to a playable search',()=>{
  for(const option of G.nodes.faith.options){
    let answers=[{node:'singer',value:''},{node:'type',value:'religious'},{node:'faith',value:option.id}];
    const next=G.nextNode(answers);
    if(next) answers=[...answers,{node:next,value:G.nodes[next].options[0].id}];
    assert.equal(G.nextNode(answers),null,option.id);
    assert.ok(G.buildQuery(answers).length>3,option.id);
  }
});
test('a singer name alone searches their songs, and is cleaned',()=>{
  assert.equal(G.buildQuery([{node:'singer',value:'Lata Mangeshkar'}]),'Lata Mangeshkar songs');
  assert.equal(G.buildQuery([{node:'singer',value:'<b>Rafi</b>"'}]),'bRafib songs');
  assert.equal(G.buildQuery([{node:'singer',value:'किशोर कुमार'},{node:'type',value:'oldfilm'},{node:'era',value:'70s'}]),'किशोर कुमार old hindi film songs 1970s');
});
test('folk and regional music ask for a language',()=>{
  const a=[{node:'singer',value:''},{node:'type',value:'folk'}];
  assert.equal(G.nextNode(a),'language');
  assert.equal(G.buildQuery([...a,{node:'language',value:'marathi'}]),'folk songs Marathi');
});
