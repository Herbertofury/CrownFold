import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/sim.mjs';
import {craft,craftingStatus,takeQuest} from '../src/rpg.mjs';
function ready(){const s=createGame();s.inventory.scrap=100;s.inventory.ore=100;takeQuest(s,'winter_stores');return s;}
for(const count of [10,11,12])test(`grenade recipe at ${count}/12 preserves materials and quest progress`,()=>{
 const s=ready();s.player.grenades=count;const inventory=structuredClone(s.inventory),progress=s.rpg.quests.winter_stores.progress;
 assert.equal(craftingStatus(s,'grenades').ok,false);assert.equal(craft(s,'grenades'),false);
 assert.deepEqual(s.inventory,inventory);assert.equal(s.player.grenades,count);assert.equal(s.rpg.totalCrafted,0);assert.equal(s.rpg.quests.winter_stores.progress,progress);
});
test('exact-fit grenade batch gives every output and charges once',()=>{const s=ready();s.player.grenades=9;assert.equal(craft(s,'grenades'),true);assert.equal(s.player.grenades,12);assert.equal(s.inventory.scrap,94);assert.equal(s.inventory.ore,95);assert.equal(s.rpg.totalCrafted,1);assert.equal(craft(s,'grenades'),false);assert.equal(s.inventory.scrap,94);});
test('crafting availability matches discounted material costs and missing amounts',()=>{const s=ready();s.rpg.perks.craftsman=3;s.player.grenades=0;s.inventory.scrap=4;s.inventory.ore=4;assert.deepEqual(craftingStatus(s,'grenades').cost,{scrap:5,ore:4});assert.match(craftingStatus(s,'grenades').reason,/1 SCRAP/);assert.equal(craft(s,'grenades'),false);s.inventory.scrap=5;assert.equal(craft(s,'grenades'),true);assert.equal(s.inventory.scrap,0);assert.equal(s.inventory.ore,0);});
test('unknown recipe is rejected without resource changes',()=>{const s=ready(),before=structuredClone(s.inventory);assert.equal(craft(s,'missing'),false);assert.deepEqual(s.inventory,before);});
