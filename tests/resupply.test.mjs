import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,resupply,WEAPONS} from '../src/sim.mjs';

test('Skyhook never confiscates earned grenades above its delivery ceiling',()=>{
 for(const count of [6,7,10,12]){const s=createGame();s.player.grenades=count;assert.ok(resupply(s));assert.equal(s.player.grenades,count);}
});
test('Skyhook tops up grenades only to its existing delivery ceiling',()=>{
 for(const [before,after] of [[0,2],[4,6],[5,6]]){const s=createGame();s.player.grenades=before;assert.ok(resupply(s));assert.equal(s.player.grenades,after);}
});
test('Skyhook preserves larger earned reserves for every weapon',()=>{
 const s=createGame();for(const [id,w] of Object.entries(WEAPONS))s.player.reserve[id]=w.reserve*3+17;
 const before=structuredClone(s.player.reserve);assert.ok(resupply(s));assert.deepEqual(s.player.reserve,before);
});
test('Skyhook caps near-full deliveries and fills empty magazines',()=>{
 const s=createGame();for(const [id,w] of Object.entries(WEAPONS)){s.player.reserve[id]=w.reserve*3-1;s.player.ammo[id]=0;}
 assert.ok(resupply(s));for(const [id,w] of Object.entries(WEAPONS)){assert.equal(s.player.reserve[id],w.reserve*3);assert.equal(s.player.ammo[id],w.mag);}
});
test('blocked Skyhook calls preserve all supplies and cooldown',()=>{
 for(const reason of ['cooldown','scrap']){const s=createGame();s.player.grenades=12;if(reason==='cooldown')s.player.resupplyCooldown=1;else s.inventory.scrap=17;
 const before=JSON.stringify(s);assert.equal(resupply(s),false);assert.equal(JSON.stringify(s),before);}
});
