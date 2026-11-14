import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,serialize,restore} from '../src/sim.mjs';
import {generateGear,equipGear,salvageGear} from '../src/rpg.mjs';

test('earned gear beyond 100 items survives repeated save/reload and stays actionable',()=>{
 const s=createGame();
 for(let i=0;i<125;i++)generateGear(s,['armor','relic','mod'][i%3],2,i);
 const equipped=s.rpg.gear.at(-1);equipGear(s,equipped.id);
 let recovered=restore(serialize(s));
 assert.deepEqual(recovered.rpg.gear,s.rpg.gear);
 assert.equal(recovered.rpg.equipped[equipped.slot],equipped.id);
 assert.equal(recovered.player.maxHp,s.player.maxHp);
 recovered=restore(serialize(recovered));assert.equal(recovered.rpg.gear.length,125);
 const spare=recovered.rpg.gear.at(-2),before=recovered.inventory.scrap;
 assert.equal(salvageGear(recovered,spare.id),true);assert.ok(recovered.inventory.scrap>before);
 assert.equal(recovered.rpg.gear.length,124);assert.equal(salvageGear(recovered,spare.id),false);
});
test('invalid gear remains rejected without limiting independently valid earned gear',()=>{
 const s=createGame();for(let i=0;i<110;i++)generateGear(s,'armor',1,i);
 const data=JSON.parse(serialize(s));data.rpg.gear.splice(100,0,null,{id:'broken',slot:'armor'});
 const recovered=restore(JSON.stringify(data));assert.deepEqual(recovered.rpg.gear,s.rpg.gear);
});
