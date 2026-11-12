import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import * as live from '../src/battlefield.mjs';
import * as reference from '../src/battlefield-js.mjs';
import {loadTactics,tactics} from '../src/rust-tactics.mjs';
import {WASM_BASE64,WASM_SHA256} from '../src/rust-tactics-data.mjs';
import {createGame,enterOperation,stepGame} from '../src/sim.mjs';
let seed=0xC0F01D;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const point=()=>({x:random()*240-120,z:random()*210-170});

test('committed Rust artifact has matching hash and versioned ABI',()=>{
 assert.equal(createHash('sha256').update(Buffer.from(WASM_BASE64,'base64')).digest('hex'),WASM_SHA256);
 assert.equal(tactics.backend,'rust-wasm');assert.equal(tactics.api.cf_version(),1);
});
test('Rust geometry matches the JS behavioral reference across seeded queries',()=>{
 for(let i=0;i<2000;i++){
  const a=point(),b=point(),c=point(),r=random()*20;
  const actual=live.segmentCircle(a,b,c,r),expected=reference.segmentCircle(a,b,c,r);
  if(expected===null)assert.equal(actual,null);else assert.ok(Math.abs(actual-expected)<1e-12);
  const covers=reference.makeBattlefieldCover(i%5);covers[i%7].hp=0;
  assert.equal(live.firstCoverBetween(a,b,covers,2.3),reference.firstCoverBetween(a,b,covers,2.3));
  assert.equal(live.positionBlocked(a.x,a.z,covers),reference.positionBlocked(a.x,a.z,covers));
 }
});
test('Rust routes preserve reachability and obstacle clearance across five campaigns',()=>{
 for(let campaign=0;campaign<5;campaign++)for(let i=0;i<70;i++){
  const covers=reference.makeBattlefieldCover(campaign),a=point(),b=point();
  // Gameplay accepts orders from free ground; cover endpoint escape behavior is separately tested.
  if(reference.positionBlocked(a.x,a.z,covers,3)||reference.positionBlocked(b.x,b.z,covers,3))continue;
  const actual=live.warPath(a,b,covers),expected=reference.warPath(a,b,covers);
  assert.equal(actual.length===0,expected.length===0);
  assert.deepEqual(actual,live.warPath(a,b,covers),'repeated Rust route must be deterministic');
  if(actual.length)assert.deepEqual(actual.at(-1),expected.at(-1));
  let cursor=a;for(const next of actual){assert.equal(reference.firstCoverBetween(cursor,next,covers,2.3),null);cursor=next;}
 }
});
test('cover destruction, moved cover, routing budget and negative grid ties stay compatible',()=>{
 const covers=[{x:0,z:0,radius:8,hp:300}],a={x:-24.5,z:0},b={x:24.5,z:0};
 assert.deepEqual(live.warPath(a,b,covers),reference.warPath(a,b,covers));
 assert.deepEqual(live.warPath(a,b,covers,1),[]);
 covers[0].hp=0;assert.deepEqual(live.warPath(a,b,covers),[b]);
 covers[0].hp=300;covers[0].z=40;assert.equal(live.firstCoverBetween(a,b,covers),null);
 covers[0].z=0;assert.equal(live.firstCoverBetween(a,b,covers),covers[0]);
});
test('real war simulation invokes the Rust kernel without JS fallback',()=>{
 const before=live.tacticalRuntime().calls,s=createGame();enterOperation(s,3);
 for(let i=0;i<1500;i++)stepGame(s,{},1/30);
 const after=live.tacticalRuntime().calls;
 assert.ok(after.path>before.path);assert.ok(after.occlusion>before.occlusion);assert.equal(after.fallback,before.fallback);
});
test('failed or unavailable WebAssembly selects explicit compatibility mode',async()=>{
 assert.equal((await loadTactics('',null)).backend,'javascript');
 assert.equal((await loadTactics('not wasm')).backend,'javascript');
 const bad={instantiate:async()=>({instance:{exports:{}}})};
 assert.equal((await loadTactics('',bad)).backend,'javascript');
 const child=spawnSync(process.execPath,['--input-type=module','-e',`globalThis.WebAssembly=undefined;const b=await import('./src/battlefield.mjs');if(b.tacticalRuntime().backend!=='javascript')throw Error('backend');if(!b.warPath({x:-25,z:0},{x:25,z:0},[{x:0,z:0,radius:8,hp:300}]).length)throw Error('route');`],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
 assert.equal(child.status,0,child.stderr);
});
test('large or invalid cover lists use the reference instead of truncating collision',()=>{
 const covers=Array.from({length:1025},()=>({x:90,z:40,radius:1,hp:1}));covers[1024]={x:0,z:0,radius:8,hp:1};
 assert.equal(live.firstCoverBetween({x:-20,z:0},{x:20,z:0},covers),covers[1024]);
 assert.equal(live.warPath({x:NaN,z:0},{x:0,z:0},[]).length,0);
});

test('route from a non-grid start never cuts through the nearest cover',()=>{
 const a={x:43.94145950675011,z:-34.775936633814126},b={x:-115.82985732704401,z:-97.03461139230058},covers=reference.makeBattlefieldCover();
 for(const implementation of [live,reference]){const path=implementation.warPath(a,b,covers);assert.ok(path.length);assert.deepEqual(path.at(-1),b);let cursor=a;for(const point of path){assert.equal(reference.firstCoverBetween(cursor,point,covers,2.3),null);cursor=point;}}
});
