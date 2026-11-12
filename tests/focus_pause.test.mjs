import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/game.mjs',import.meta.url),'utf8');
const body=source.match(/function pauseForFocusLoss\(\)\{([\s\S]*?)\n\}/)[1];
function run(active,paused){
 const state={active,paused,keys:new Set(['KeyW','Space']),input:{x:1,z:-1,sprint:true,jump:true,aim:true,fire:true},bank:0.05,calls:[],commanderDrag:{x:1},selectBox:{classList:{add:value=>assert.equal(value,'hidden')}},document:{body:{classList:{remove:value=>assert.equal(value,'aiming')}}}};
 state.togglePause=value=>{state.calls.push(value);state.paused=value;};
 vm.runInNewContext(body,state);return state;
}
test('focus loss freezes an active game and clears all held inputs',()=>{
 const s=run(true,false);assert.equal(s.paused,true);assert.deepEqual(s.calls,[true]);assert.equal(s.keys.size,0);assert.equal(s.bank,0);assert.equal(s.commanderDrag,null);
 assert.deepEqual(s.input,{x:0,z:0,sprint:false,jump:false,aim:false,fire:false});
});
test('duplicate blur and hidden notifications do not save/pause twice',()=>{const s=run(true,true);assert.deepEqual(s.calls,[]);assert.equal(s.paused,true);});
test('title screen interruption never starts a game',()=>{const s=run(false,false);assert.deepEqual(s.calls,[]);assert.equal(s.active,false);});
test('both interruption routes are connected without automatic resume',()=>{
 assert.match(source,/window\.addEventListener\('blur',pauseForFocusLoss\)/);
 assert.match(source,/document\.addEventListener\('visibilitychange',\(\)=>\{if\(document.hidden\)pauseForFocusLoss\(\);\}\)/);
 assert.doesNotMatch(source,/addEventListener\('focus',/);
});
