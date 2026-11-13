import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,serialize,restore,stepGame} from '../src/sim.mjs';
import {generateGear,equipGear,rpgStat} from '../src/rpg.mjs';
for(const bad of ['broken','12',{},[],null,-1000]){
 test(`damaged equipped gear stats recover safely: ${JSON.stringify(bad)}`,()=>{
  const s=createGame();const gear=generateGear(s,'armor');equipGear(s,gear.id);s.inventory.scrap=731;
  const save=JSON.parse(serialize(s));save.rpg.gear[0].stats={health:bad,armor:bad,shield:bad,damage:bad};
  const loaded=restore(JSON.stringify(save));
  assert.equal(loaded.inventory.scrap,731);assert.equal(loaded.rpg.gear.length,1);assert.equal(loaded.rpg.equipped.armor,gear.id);
  assert.equal(loaded.player.maxHp,140);assert.equal(loaded.player.maxShield,40);assert.equal(rpgStat(loaded,'damage'),1);
  stepGame(loaded,{},1/30);assert.ok(Number.isFinite(loaded.player.hp));assert.ok(Number.isFinite(loaded.player.shield));
  assert.deepEqual(restore(serialize(loaded)).rpg.gear,loaded.rpg.gear);
 });
}
test('generated equipped gear keeps every valid stat across save and reload',()=>{
 for(const slot of ['armor','relic','mod'])for(const tier of [1,4,10,30]){
  const s=createGame(tier*13);const g=generateGear(s,slot,tier);equipGear(s,g.id);
  const loaded=restore(serialize(s));assert.deepEqual(loaded.rpg.gear,s.rpg.gear);assert.deepEqual(loaded.rpg.equipped,s.rpg.equipped);
  for(const stat of ['health','shield','damage','armor'])assert.equal(rpgStat(loaded,stat),rpgStat(s,stat));
 }
});
test('gear recovery bounds extreme finite stats and removes unknown properties',()=>{
 const s=createGame();const g=generateGear(s,'armor');equipGear(s,g.id);const save=JSON.parse(serialize(s));
 save.rpg.gear[0].stats={health:1e308,armor:1e308,shield:1e308,damage:1e308,unknown:7};
 const loaded=restore(JSON.stringify(save));assert.deepEqual(loaded.rpg.gear[0].stats,{health:10000,armor:10000,shield:10000,damage:10000});
 assert.ok(Number.isFinite(loaded.player.maxHp));assert.ok(Number.isFinite(loaded.player.maxShield));
});
