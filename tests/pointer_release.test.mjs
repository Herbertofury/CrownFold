import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/game.mjs',import.meta.url),'utf8');
const body=source.match(/function releasePointerInput\(e\)\{([\s\S]*?)\n\}/)[1];
function release(type,button){
 const state={e:{type,button},input:{fire:true,aim:true},commanderDrag:{startX:12},hidden:false,aiming:true};
 state.selectBox={classList:{add:()=>state.hidden=true}};
 state.document={body:{classList:{remove:()=>state.aiming=false}}};
 vm.runInNewContext(body,state);return state;
}
test('right release outside canvas clears aim without dropping a held left button',()=>{
 const s=release('pointerup',2);assert.equal(s.input.aim,false);assert.equal(s.aiming,false);assert.equal(s.input.fire,true);assert.notEqual(s.commanderDrag,null);
});
test('left release clears firing and unfinished selection without dropping held aim',()=>{
 const s=release('pointerup',0);assert.equal(s.input.fire,false);assert.equal(s.commanderDrag,null);assert.equal(s.hidden,true);assert.equal(s.input.aim,true);
});
test('cancel clears all pointer input even with no button reported',()=>{
 const s=release('pointercancel',-1);assert.equal(s.input.fire,false);assert.equal(s.input.aim,false);assert.equal(s.commanderDrag,null);assert.equal(s.hidden,true);assert.equal(s.aiming,false);
});
test('middle release does not cancel other held buttons or selection',()=>{
 const s=release('pointerup',1);assert.equal(s.input.fire,true);assert.equal(s.input.aim,true);assert.notEqual(s.commanderDrag,null);
});
test('release recovery listens globally for outside-canvas and cancellation events',()=>{
 assert.match(source,/window\.addEventListener\('pointerup',releasePointerInput\)/);
 assert.match(source,/window\.addEventListener\('pointercancel',releasePointerInput\)/);
});
