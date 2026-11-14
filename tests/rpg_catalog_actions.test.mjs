import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/sim.mjs';
import {buyGood,buyPerk,generateGear,craft,craftingStatus,takeQuest,turnInQuest,GOODS,PERKS,RECIPES} from '../src/rpg.mjs';
const balances=s=>JSON.stringify({inventory:s.inventory,coins:s.rpg.coins,points:s.rpg.perkPoints,perks:s.rpg.perks,gear:s.rpg.gear,nextId:s.nextId,quests:s.rpg.quests});
for(const id of ['constructor','__proto__','toString','valueOf',null])test(`invalid RPG identity ${String(id)} cannot spend or throw`,()=>{
 const s=createGame(),before=balances(s);
 assert.equal(buyGood(s,id),false);assert.equal(buyPerk(s,id),false);
 assert.equal(generateGear(s,id),null);assert.equal(craftingStatus(s,id).ok,false);
 assert.equal(craft(s,id),false);assert.equal(takeQuest(s,id),false);assert.equal(turnInQuest(s,id),false);
 assert.equal(balances(s),before);
});
test('array-coerced catalog identities cannot spend resources',()=>{
 const s=createGame(),before=balances(s);
 assert.equal(buyGood(s,[Object.keys(GOODS)[0]]),false);
 assert.equal(buyPerk(s,[Object.keys(PERKS)[0]]),false);
 assert.equal(generateGear(s,['armor']),null);
 assert.equal(craft(s,[Object.keys(RECIPES)[0]]),false);
 assert.equal(takeQuest(s,['first_light']),false);
 assert.equal(balances(s),before);
});
