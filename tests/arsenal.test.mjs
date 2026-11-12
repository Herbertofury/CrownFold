import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,WEAPONS,reloadDuration,reload,setWeapon,stepGame,serialize,restore} from '../src/sim.mjs';
import {WEAPON_ROLES,weaponCard,reloadProgress} from '../src/arsenal.mjs';

test('all six weapon cards describe actual simulation stats without changing state',()=>{
 const s=createGame(),before=serialize(s);assert.deepEqual(Object.keys(WEAPON_ROLES),Object.keys(WEAPONS));
 for(const [id,w] of Object.entries(WEAPONS)){const card=weaponCard(s.player,id);assert.equal(card.range,`${w.range}m`);assert.equal(card.ammo,w.mag);assert.equal(card.reserve,w.reserve);assert.equal(card.reload,`${reloadDuration(id).toFixed(1)}s`);assert.equal(card.status,'READY');assert.ok(card.description.length>25);}
 assert.equal(serialize(s),before);assert.equal(weaponCard(s.player,'missing'),null);assert.equal(weaponCard(s.player,'constructor'),null);
});
test('arsenal shows loaded, reload-needed and exhausted ammunition honestly',()=>{
 const p=createGame().player;p.ammo.launcher=0;
 assert.equal(weaponCard(p,'launcher').status,'RELOAD NEEDED');p.reserve.launcher=0;
 assert.equal(weaponCard(p,'launcher').status,'OUT OF AMMO');p.ammo.launcher=1;
 assert.equal(weaponCard(p,'launcher').status,'READY');
});
test('keeping an equipped weapon preserves reload and generates no false ready event',()=>{
 const s=createGame();s.player.ammo.rifle=0;assert.equal(reload(s),true);const time=s.player.reload,event=s.lastEvent;
 assert.equal(setWeapon(s,'rifle'),true);assert.equal(s.player.reload,time);assert.equal(s.lastEvent,event);
});
test('switching cancels only the old reload without transferring or creating ammunition',()=>{
 const s=createGame();s.player.ammo.rifle=0;reload(s);const magazines={...s.player.ammo},reserve={...s.player.reserve};
 assert.equal(setWeapon(s,'launcher'),true);assert.equal(s.player.weapon,'launcher');assert.equal(s.player.reload,0);assert.deepEqual(s.player.ammo,magazines);assert.deepEqual(s.player.reserve,reserve);
 assert.equal(setWeapon(s,'constructor'),false);assert.equal(s.player.weapon,'launcher');
});
test('all six reloads display bounded progress and complete in the existing simulation',()=>{
 for(const id of Object.keys(WEAPONS)){
  const s=createGame();setWeapon(s,id);s.player.ammo[id]=0;reload(s);assert.equal(s.player.reload,reloadDuration(id));assert.equal(reloadProgress(s.player),0);
  stepGame(s,{},.05);assert.ok(reloadProgress(s.player)>0&&reloadProgress(s.player)<1);
  for(let i=0;i<60;i++)stepGame(s,{},.05);
  assert.equal(reloadProgress(s.player),1);assert.equal(s.player.ammo[id],WEAPONS[id].mag);assert.equal(s.player.reserve[id],WEAPONS[id].reserve-WEAPONS[id].mag);
 }
});
test('weapon choice and existing reload survive frontier save roundtrip',()=>{
 const s=createGame();setWeapon(s,'cryo');s.player.ammo.cryo=0;reload(s);const restored=restore(serialize(s));
 assert.equal(restored.player.weapon,'cryo');assert.equal(restored.player.reload,s.player.reload);assert.equal(restored.player.ammo.cryo,0);assert.equal(restored.player.reserve.cryo,120);
});
