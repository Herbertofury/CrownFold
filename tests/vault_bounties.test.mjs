import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,enterDungeon,interact,nearestInteraction,restore,serialize,setWeapon,shoot,stepGame,vaultReadyToLeave} from '../src/sim.mjs';
import {claimBounty,generateBounty,startBounty} from '../src/rpg.mjs';

const all=['glass','roots','archive'];
const at=(s,x,z)=>Object.assign(s.player,{x,z,yaw:0});
const tick=(s,n)=>{for(let i=0;i<n;i++)stepGame(s,{},.1);};
const snapshot=s=>JSON.stringify({coins:s.rpg.coins,inventory:s.inventory,gear:s.rpg.gear,perks:s.rpg.perkPoints,standing:s.rpg.factions,clears:s.rpg.dungeonCleared,story:s.rpg.quests});
const fromBoard=(existing=all)=>{
 const s=createGame(500);s.squad=[];
 s.rpg.dungeonCleared=[...existing];s.rpg.opened=existing.map(id=>'dungeon:'+id);
 s.rpg.quests.the_glass_key={status:'done',progress:1,unique:['glass']};
 for(let i=0;i<500;i++){
  s.rpg.bountySerial=i;
  if(generateBounty(s).name==='BURIED TRUTHS'){at(s,3,14);assert.ok(startBounty(s));return s;}
 }
 assert.fail('Expected a deterministic vault bounty');
};
function battle(s){
 assert.ok(enterDungeon(s,'glass'));
 // Isolate normal relay/guardian/weapon code from unrelated spawned guard
 // pathfinding. The guardian retains normal HP, ammo cost and damage rules.
 s.enemies=[];
 for(const [x,z] of [[-11,-43],[12,-83]]){at(s,x,z);assert.equal(nearestInteraction(s).type,'sigil');assert.ok(interact(s));}
 const guardian=s.enemies.find(e=>e.id===s.dungeon.bossId);
 assert.ok(guardian);guardian.frozen=1000;
 at(s,0,-121);assert.ok(setWeapon(s,'rail'));
 for(let i=0;i<30&&guardian.hp>0;i++){shoot(s,{yaw:0,pitch:0});tick(s,12);}
 assert.equal(guardian.hp,0);
 assert.equal(s.dungeon.bossDead,true);
}
function exit(s,x=0,z=-147){at(s,x,z);assert.equal(nearestInteraction(s).type,'dungeon-exit');assert.ok(interact(s));assert.equal(s.zone,'frontier');}
test('existing late-run vault bounty can be completed after all first clears, and paid once after reload',()=>{
 let s=restore(serialize(fromBoard()));
 assert.equal(s.rpg.bounty.status,'active');
 assert.deepEqual(s.rpg.dungeonCleared,all);
 battle(s);
 assert.ok(vaultReadyToLeave(s.dungeon));
 assert.equal(s.rpg.bounty.progress,0,'defeat alone cannot settle a bounty');
 const combatComplete=snapshot(s);
 at(s,7,-137);assert.notEqual(nearestInteraction(s)?.type,'dungeon-treasure');assert.equal(interact(s),false);
 assert.equal(snapshot(s),combatComplete,'replay does not dispense the already-claimed chest');
 exit(s);assert.equal(s.rpg.bounty.status,'ready');assert.deepEqual(s.rpg.bounty.unique,['glass']);
 assert.equal(snapshot(s),combatComplete,'replay extraction does not re-grant relic, XP, or story standing');
 s=restore(serialize(s));s=restore(serialize(s));
 const bounty=s.rpg.bounty,coins=s.rpg.coins,serial=s.rpg.bountySerial;
 at(s,80,14);assert.equal(claimBounty(s),false);
 at(s,3,14);assert.equal(claimBounty(s),true);
 assert.equal(s.rpg.coins,coins+bounty.coins);
 assert.equal(s.rpg.bountySerial,serial+1);
 assert.equal(claimBounty(s),false);
 const paid=snapshot(s);s=restore(serialize(s));
 assert.equal(claimBounty(s),false);assert.equal(snapshot(s),paid);
});
test('retreat, death, and mid-vault close do not grant repeat bounty credit',()=>{
 let s=fromBoard();
 assert.ok(enterDungeon(s,'glass'));assert.equal(vaultReadyToLeave(s.dungeon),false);exit(s,-12,6);
 assert.equal(s.rpg.bounty.progress,0);
 battle(s);
 const mid=restore(serialize(s));assert.equal(mid.zone,'frontier');assert.equal(mid.rpg.bounty.progress,0);
 s.player.hp=0;tick(s,1);
 assert.equal(s.zone,'frontier');assert.equal(s.rpg.bounty.progress,0);assert.equal(s.rpg.bounty.status,'active');
 assert.deepEqual(s.rpg.dungeonCleared,all);
});
test('first-time loot and story clear remain intact for players with the same bounty',()=>{
 const s=fromBoard([]);
 battle(s);
 assert.equal(vaultReadyToLeave(s.dungeon),false);
 const coins=s.rpg.coins,flux=s.inventory.flux,gear=s.rpg.gear.length;
 at(s,7,-137);assert.equal(nearestInteraction(s).type,'dungeon-treasure');assert.ok(interact(s));
 assert.ok(s.rpg.coins>=coins+130);assert.equal(s.inventory.flux,flux+75);
 assert.equal(s.rpg.gear.length,gear+1);assert.ok(s.rpg.opened.includes('dungeon:glass'));
 exit(s);assert.deepEqual(s.rpg.dungeonCleared,['glass']);assert.equal(s.rpg.bounty.status,'ready');
});
test('old saves returning after a relic was looted but before first extraction can still finish without duplicate payouts',()=>{
 const old=fromBoard([]);battle(old);at(old,7,-137);assert.ok(interact(old));
 const s=restore(serialize(old));
 assert.equal(s.zone,'frontier');assert.deepEqual(s.rpg.dungeonCleared,[]);
 assert.ok(s.rpg.opened.includes('dungeon:glass'));
 battle(s);
 const coins=s.rpg.coins,flux=s.inventory.flux,gear=s.rpg.gear.length;
 at(s,7,-137);assert.ok(interact(s));assert.equal(s.rpg.coins,coins);assert.equal(s.inventory.flux,flux);assert.equal(s.rpg.gear.length,gear);
 assert.ok(vaultReadyToLeave(s.dungeon));exit(s);
 assert.deepEqual(s.rpg.dungeonCleared,['glass']);assert.equal(s.rpg.bounty.status,'ready');
});
