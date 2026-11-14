import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,enterOperation} from '../src/sim.mjs';
import {trainBattalion,constructWarBuilding,setWarStance,warCastPower,callWarSupport} from '../src/war.mjs';
for(const id of ['constructor','__proto__','toString','valueOf',null])test(`invalid war catalog ID ${String(id)} cannot corrupt resources or state`,()=>{
 for(const action of [trainBattalion,constructWarBuilding,setWarStance,warCastPower,callWarSupport]){
  const s=createGame();enterOperation(s,3);s.war.supplies=10000;
  const before=JSON.stringify(s);
  assert.equal(action(s,id),false);
  assert.equal(JSON.stringify(s),before);
 }
});
test('array-coerced war catalog IDs cannot perform paid actions',()=>{
 for(const [action,id] of [[trainBattalion,'pikemen'],[constructWarBuilding,'barracks'],[setWarStance,'balanced'],[warCastPower,'oathwall'],[callWarSupport,'epoch_lance']]){
  const s=createGame();enterOperation(s,3);s.war.supplies=10000;
  const before=JSON.stringify(s);
  assert.equal(action(s,[id]),false);
  assert.equal(JSON.stringify(s),before);
 }
});
