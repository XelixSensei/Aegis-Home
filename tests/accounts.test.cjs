const {test}=require('node:test');
const assert=require('node:assert/strict');
const P=require('../public/phone.js');
const config=require('../api/config.js');

test('Indian mobile numbers are normalised in every common format',()=>{
  for(const input of ['9876543210','98765 43210','098765-43210','+91 98765 43210','919876543210','(+91) 98765-43210'])
    assert.equal(P.normalize(input),'+919876543210',input);
  for(const bad of ['','12345','5876543210','98765432101','+44 7700 900123','abc'])
    assert.equal(P.normalize(bad),null,bad);
});
test('the login address keeps the number, which the database checks',()=>{
  assert.equal(P.loginEmail('+919876543210'),`919876543210@${P.LOGIN_DOMAIN}`);
  assert.equal(P.display('+919876543210'),'+91 98765 43210');
});
test('passcodes are exactly six digits and easy ones are refused',()=>{
  assert.ok(P.validPasscode('482915'));
  for(const bad of ['48291','4829155','48291a','',null]) assert.ok(!P.validPasscode(bad),String(bad));
  for(const weak of ['111111','123456','654321','000000']) assert.ok(P.weakPasscode(weak),weak);
  assert.ok(!P.weakPasscode('482915'));
});
function call(handler){
  return new Promise(resolve=>{const res={headers:{},setHeader(k,v){this.headers[k]=v},end(body){resolve({status:this.statusCode,body:JSON.parse(body)})}};handler({method:'GET',headers:{}},res);});
}
test('the browser only gets the public Supabase settings, and only when configured',async()=>{
  delete process.env.SUPABASE_URL;delete process.env.SUPABASE_ANON_KEY;
  assert.equal((await call(config)).status,503);
  Object.assign(process.env,{SUPABASE_URL:'https://x.supabase.co',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'secret'});
  const {status,body}=await call(config);
  assert.equal(status,200);assert.deepEqual(body,{url:'https://x.supabase.co',anonKey:'anon'});
  assert.ok(!JSON.stringify(body).includes('secret'));
  delete process.env.SUPABASE_URL;delete process.env.SUPABASE_ANON_KEY;delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});
