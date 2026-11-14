import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/sim.mjs';
import {lostTechCost,researchLostTech,equipLostTech,setCommanderHeritage,LOST_TECH} from '../src/lineage.mjs';

for(const id of ['constructor','__proto__','toString','valueOf',['bone_lattice'],null])test(`invalid lineage identity ${String(id)} changes nothing`,()=>{
 const s=createGame();s.temporal.insight=100;
 const before=JSON.stringify(s.temporal);
 assert.equal(lostTechCost(s,id),Infinity);
 assert.equal(researchLostTech(s,id),false);
 assert.equal(equipLostTech(s,id),false);
 assert.equal(JSON.stringify(s.temporal),before);
});
test('heritage rejects coerced non-string identity without mutating lineage',()=>{
 const s=createGame(),before=JSON.stringify(s.temporal);
 assert.equal(setCommanderHeritage(s,['medieval']),false);
 assert.equal(JSON.stringify(s.temporal),before);
});
test('registered research charges once and retains valid selection behavior',()=>{
 const s=createGame();s.temporal.insight=100;
 assert.equal(researchLostTech(s,'bone_lattice'),true);
 assert.equal(s.temporal.insight,100-LOST_TECH.bone_lattice.cost);
 assert.equal(researchLostTech(s,'bone_lattice'),false);
 assert.equal(equipLostTech(s,'bone_lattice'),true);
 assert.equal(equipLostTech(s,'bone_lattice'),true);
});
