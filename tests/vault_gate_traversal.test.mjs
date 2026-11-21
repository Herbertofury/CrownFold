import test from 'node:test';
import assert from 'node:assert/strict';
import {castAbility,createGame,dodge,interact,nearestInteraction,restore,serialize,stepGame} from '../src/sim.mjs';
import {LANDMARKS} from '../src/rpg.mjs';

const vault=(id='glass')=>{
 const s=createGame(7331),entrance=LANDMARKS.find(l=>l.kind==='dungeon'&&l.id===id);
 Object.assign(s.player,{x:entrance.x,z:entrance.z});
 assert.equal(nearestInteraction(s)?.type,'dungeon');
 assert.equal(interact(s),true);
 return s;
};
const near=(s,x,z,yaw)=>Object.assign(s.player,{x,z,yaw});
const step=(s,input={})=>stepGame(s,input,1/30);

test('actual dodge tests its crossing, not the landing, cutting neither wall nor legal retreat',()=>{
 for(const [wall,direction] of [[-20,-1],[-65,1],[-107,-1],[-107,1]]){
  const from=wall-direction;
  const blocked=vault();near(blocked,10,from,direction<0?-Math.PI/4:-3*Math.PI/4);
  assert.equal(dodge(blocked),true);
  assert.ok(Math.abs(blocked.player.x)<6.9,'dash would land inside the doorway span');
  assert.equal(blocked.player.z,from,'solid span blocks crossing even with a landing inside the doorway');
  const open=vault();near(open,4,from,direction<0?Math.PI/4:3*Math.PI/4);
  assert.equal(dodge(open),true);
  assert.ok(Math.abs(open.player.x)>6.9,'dash landing is past the edge');
  assert.ok(direction*(open.player.z-wall)>0,'legal crossing of the actual opening is not blocked');
  assert.equal(open.zone,'dungeon');
 }
});

test('Blink evaluates both approaches, without tunneling through a wall toward a center landing',()=>{
 const blocked=vault();near(blocked,12,-68,-3*Math.PI/4);
 assert.equal(castAbility(blocked,'blink'),true);
 assert.equal(blocked.player.z,-68);
 assert.ok(Math.abs(blocked.player.x)<6.9);
 const open=vault();near(open,5,-68,3*Math.PI/4);
 assert.equal(castAbility(open,'blink'),true);
 // This path crosses at x=8. Moving the start to x=3 crosses at x=6.
 assert.equal(open.player.z,-68);
 const pass=vault();near(pass,3,-68,3*Math.PI/4);
 assert.equal(castAbility(pass,'blink'),true);
 assert.ok(pass.player.z>-65);
 assert.ok(pass.player.x>6.9);
});

test('normal movement cannot sidestep into the gate plane, but can leave a valid doorway',()=>{
 const s=vault();near(s,6.85,-20,0);
 for(let i=0;i<5;i++)step(s,{x:1});
 assert.equal(s.player.z,-20);
 assert.ok(s.player.x<=6.9);
 step(s,{z:-1});
 assert.ok(s.player.z>-20,'player can retreat through this opening from its exact plane');
});

test('legal retreat through the doorway followed by an actual portal interaction remains non-paying',()=>{
 const s=vault(),from={...s.lastZonePos};
 const before=JSON.stringify({coins:s.rpg.coins,clears:s.rpg.dungeonCleared,gear:s.rpg.gear,missions:s.stats.missions});
 near(s,4,-21,3*Math.PI/4);
 assert.equal(dodge(s),true);
 assert.ok(s.player.z>-20);
 s.player.yaw=0;
 for(let i=0;i<200&&nearestInteraction(s)?.type!=='dungeon-exit';i++){
  const dx=-12-s.player.x,dz=6-s.player.z,d=Math.hypot(dx,dz);
  step(s,{x:dx/d,z:-dz/d});
 }
 assert.equal(s.zone,'dungeon');
 assert.equal(nearestInteraction(s)?.type,'dungeon-exit');
 assert.equal(interact(s),true);
 assert.equal(s.zone,'frontier');
 assert.deepEqual({x:s.player.x,z:s.player.z},{x:from.x+3,z:from.z+3});
 const recovered=restore(serialize(s));
 assert.equal(JSON.stringify({coins:recovered.rpg.coins,clears:recovered.rpg.dungeonCleared,gear:recovered.rpg.gear,missions:recovered.stats.missions}),before);
});
