import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,serialize,restore,stepGame,WEAPONS,addBuilding} from '../src/sim.mjs';
const snapshot=()=>JSON.parse(serialize(createGame()));
const inheritedNames=['constructor','toString','__proto__','valueOf'];
for(const name of inheritedNames){
 test(`save recovery rejects inherited catalog name ${name}`,()=>{
  const save=snapshot();save.inventory.scrap=731;
  save.player.weapon=name;
  save.buildings=[{kind:name,x:0,z:0,hp:10}];
  save.rpg.quests=JSON.parse(`{"${name}":{"status":"active","progress":1}}`);
  save.rpg.tracked=name;save.rpg.allegiance=name;save.rpg.worldEnding=name;
  save.rpg.gear=[{id:123,slot:name,rarity:1,name:'Invalid slot',stats:{}}];
  const loaded=restore(JSON.stringify(save));
  assert.ok(loaded,'valid campaign state remains recoverable');
  assert.equal(loaded.inventory.scrap,731);
  assert.equal(loaded.player.weapon,'rifle');
  assert.deepEqual(loaded.buildings,[]);assert.deepEqual(loaded.rpg.quests,{});
  assert.equal(loaded.rpg.tracked,null);assert.equal(loaded.rpg.allegiance,null);assert.equal(loaded.rpg.worldEnding,null);
  assert.deepEqual(loaded.rpg.gear,[]);
  assert.doesNotThrow(()=>stepGame(loaded,{fire:true},.1));
  assert.equal(loaded.player.ammo.rifle,WEAPONS.rifle.mag-1);
  assert.ok(Number.isFinite(loaded.player.hp));
 });
}
test('registered weapons and structures retain their saved identities',()=>{
 for(const weapon of Object.keys(WEAPONS)){
  const s=createGame();s.player.weapon=weapon;addBuilding(s,'turret',3,3,true);
  const loaded=restore(serialize(s));assert.equal(loaded.player.weapon,weapon);assert.equal(loaded.buildings[0].kind,'turret');
 }
});
