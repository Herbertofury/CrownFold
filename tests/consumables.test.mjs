import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,consumableStatus,useConsumable} from '../src/sim.mjs';
for(const [type,meter,max]of [['medkit','hp',140],['ration','hunger',100],['water','thirst',100]]){
 test(`${type} full meter never wastes stock`,()=>{const s=createGame();s.player[meter]=max;const n=s.inventory[type];assert.equal(useConsumable(s,type),false);assert.equal(s.inventory[type],n);assert.equal(consumableStatus(s,type).reason,'ALREADY FULL');});
 test(`${type} preview matches capped recovery and repeated use is safe`,()=>{const s=createGame();s.player[meter]=max-3.5;const n=s.inventory[type],info=consumableStatus(s,type);assert.equal(info.recovery,3.5);assert.ok(info.usable);assert.ok(useConsumable(s,type));assert.equal(s.player[meter],max);assert.equal(s.inventory[type],n-1);assert.equal(useConsumable(s,type),false);assert.equal(s.inventory[type],n-1);});
 test(`${type} empty pack does not change meter`,()=>{const s=createGame();s.player[meter]=30;s.inventory[type]=0;assert.equal(consumableStatus(s,type).reason,'OUT OF STOCK');assert.equal(useConsumable(s,type),false);assert.equal(s.player[meter],30);});
}
test('field surgeon ranks are reflected in medkit recovery',()=>{const s=createGame();s.rpg.perks.fieldmedic=2;s.player.hp=1;assert.equal(consumableStatus(s,'medkit').recovery,125);assert.ok(useConsumable(s,'medkit'));assert.equal(s.player.hp,126);});
test('incapacitated characters cannot consume or revive themselves',()=>{const s=createGame();s.player.hp=0;for(const type of ['medkit','ration','water']){const before=s.inventory[type];assert.equal(useConsumable(s,type),false);assert.equal(s.inventory[type],before);}assert.equal(s.player.hp,0);});
test('unknown supplies never mutate inventory',()=>{const s=createGame(),before=structuredClone(s.inventory);assert.equal(consumableStatus(s,'nope'),null);assert.equal(useConsumable(s,'nope'),false);assert.deepEqual(s.inventory,before);});

test('small positive recovery is never labelled zero',()=>{const s=createGame();s.player.thirst=99.99;assert.equal(consumableStatus(s,'water').recoveryText,'<0.1');});
test('prototype property names are not supplies',()=>{const s=createGame();for(const type of ['toString','__proto__','constructor']){assert.equal(consumableStatus(s,type),null);assert.equal(useConsumable(s,type),false);}});
