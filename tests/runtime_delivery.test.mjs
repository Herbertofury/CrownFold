import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {handleRequest} from '../server.mjs';
async function request(url,method='GET'){
 const result={};await handleRequest({url,method},{writeHead(status,headers){Object.assign(result,{status,headers});},end(body){result.body=body;}});return result;
}
test('local server serves every gameplay module with Wasm-compatible CSP',async()=>{
 for(const name of await readdir(new URL('../src/',import.meta.url))){
  if(!name.endsWith('.mjs'))continue;
  const result=await request(`/src/${name}`);
  assert.equal(result.status,200,name);assert.match(result.headers['content-type'],/javascript/);
  assert.match(result.headers['content-security-policy'],/'wasm-unsafe-eval'/);
  assert.equal(result.headers['x-content-type-options'],'nosniff');assert.ok(result.body.length>0);
 }
 assert.equal((await request('/src/game.mjs','HEAD')).body,null);
});
test('server retains explicit file allowlist and read-only requests',async()=>{
 for(const path of ['/rust/Cargo.toml','/.git/config','/../server.mjs','/src/../server.mjs','/missing'])assert.equal((await request(path)).status,404);
 assert.equal((await request('/src/game.mjs','POST')).status,404);
});
test('offline artifact includes every module dependency and embedded Rust runtime',async()=>{
 const html=await readFile(new URL('../dist/CROWNFOLD-RIFTFRONT.html',import.meta.url),'utf8');
 const {imports}=JSON.parse(html.match(/<script type="importmap">(.*?)<\/script>/s)[1]);
 for(const [name,url]of Object.entries(imports)){
  assert.ok(url.startsWith('data:text/javascript;base64,'));
  const source=Buffer.from(url.split(',')[1],'base64').toString();
  for(const [,dep]of source.matchAll(/from '(riftfront-[^']+)'/g))assert.ok(imports[dep],`${name} missing ${dep}`);
  assert.ok(!source.includes("from './"),`${name} contains external relative import`);
 }
 assert.ok(imports['riftfront-rust-tactics-data']);assert.ok(imports['riftfront-battlefield-js']);
 assert.ok(!html.includes('src="src/game.mjs"'));assert.match(html,/id="tactics-runtime"/);
});
