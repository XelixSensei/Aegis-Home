const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../public/saathi-local.js');
const server=require('../server/saathi.cjs');
const music=require('../server/music.cjs');

test('emergencies always point to 112 in both languages',()=>{
  const en=S.reply('I have chest pain',{lang:'en'});
  assert.match(en.text,/112/);assert.equal(en.action.page,'emergency');
  const hi=S.reply('मुझे सीने में दर्द है',{lang:'en'});
  assert.equal(hi.lang,'hi');assert.match(hi.text,/112/);
});
test('Saathi never advises doses and offers the medicine page',()=>{
  const r=S.reply('Should I take two tablets?',{lang:'en',context:{meds:[{name:'BP tablet',time:'08:00'}]}});
  assert.match(r.text,/doctor or pharmacist/);assert.match(r.text,/BP tablet 08:00/);assert.equal(r.action.page,'meds');
});
test('Saathi remembers a name and uses it later',()=>{
  const first=S.reply('my name is Kamla',{lang:'en'});
  const later=S.reply('thank you',{lang:'en',memory:first.memory});
  assert.match(later.text,/Kamla ji/);
});
test('Saathi replies in Hinglish when written in Hinglish, and avoids repeating itself',()=>{
  assert.equal(S.detectLang('aap kaise ho','en'),'hi');
  let memory={};const seen=new Set();
  for(let i=0;i<6;i++){const r=S.reply('hmm okay',{lang:'en',memory});memory=r.memory;seen.add(r.text);}
  assert.ok(seen.size>1);
});
test('the server cleans chat history before it reaches the AI',()=>{
  const turns=server.buildMessages({messages:[{role:'assistant',text:'hi'},{role:'user',text:' a '},{role:'user',text:'b'},{role:'system',text:'x'}]});
  assert.deepEqual(turns,[{role:'user',content:'a\nb\nx'}]);
  assert.equal(server.buildMessages({messages:[{role:'user',text:'hi'},{role:'assistant',text:'ok'}]}),null);
  assert.match(server.contextNote({lang:'hi',context:{meds:[{name:'A',time:'08:00',status:'due'}]}}),/Hindi[\s\S]*A at 08:00 \(due\)/);
});
test('without keys the endpoints say so instead of failing',async()=>{
  delete process.env.ANTHROPIC_API_KEY;delete process.env.ANTHROPIC_AUTH_TOKEN;delete process.env.YOUTUBE_API_KEY;
  assert.deepEqual(await server.reply({messages:[{role:'user',text:'hi'}]}),[503,{error:'ai_unavailable'}]);
  const [status,body]=await music.find({query:'bhajan'});
  assert.equal(status,503);assert.match(body.searchUrl,/search_query=bhajan/);
  assert.equal((await music.find({}))[0],400);
});
test('YouTube video ids are extracted only from real YouTube links',()=>{
  const ids=[...'see https://www.youtube.com/watch?v=abcdefghijk and youtu.be/ABCDEFGHIJK, not https://evil.com/watch?v=zzzzzzzzzzz'.matchAll(music.VIDEO_ID)].map(m=>m[1]);
  assert.deepEqual(ids,['abcdefghijk','ABCDEFGHIJK']);
});
