import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../src/game.mjs',import.meta.url),'utf8');
const code=source.slice(source.indexOf('const canCapturePointer='),source.indexOf('function setVisibility'));
function setup(){
 const events=new Map();let requested=0,exited=0;
 const canvas={requestPointerLock(){requested++;return Promise.resolve();}};
 const document={pointerLockElement:null,addEventListener(name,fn){events.set(name,fn);},exitPointerLock(){exited++;this.pointerLockElement=null;}};
 const state={arsenalDialog:{open:false},canvas,document,commander:false,paused:false,buildMenu:false,help:false,rpgMenu:false,dialogue:false,lockMenu:false,active:true};
 vm.createContext(state);vm.runInContext(code,state);
 return {state,events,counts:()=>({requested,exited})};
}
test('late pointer lock is released after pause, title or another modal opens',()=>{
 for(const field of ['paused','commander','buildMenu','help','rpgMenu','dialogue','lockMenu','active']){
  const {state,events,counts}=setup();state.pointer();state[field]=field!=='active';
  state.document.pointerLockElement=state.canvas;events.get('pointerlockchange')();
  assert.deepEqual(counts(),{requested:1,exited:1},field);assert.equal(state.document.pointerLockElement,null);
 }
});
test('normal gameplay keeps pointer lock and rejected browser requests are handled',async()=>{
 const {state,events,counts}=setup();state.document.pointerLockElement=state.canvas;events.get('pointerlockchange')();
 assert.equal(counts().exited,0);state.document.pointerLockElement=null;
 state.canvas.requestPointerLock=()=>Promise.reject(new Error('Escape cooldown'));
 state.pointer();await new Promise(resolve=>setImmediate(resolve));
 state.paused=true;state.canvas.requestPointerLock=()=>{throw Error('Must not request during pause');};state.pointer();
});

test('late pointer lock is released while inspecting the arsenal',()=>{
 const {state,events,counts}=setup();state.pointer();state.arsenalDialog.open=true;state.document.pointerLockElement=state.canvas;events.get('pointerlockchange')();
 assert.deepEqual(counts(),{requested:1,exited:1});state.pointer();assert.equal(counts().requested,1);
});
