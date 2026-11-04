import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBattlefieldCover,segmentCircle,firstCoverBetween,warPath,positionBlocked} from '../src/battlefield.mjs';
import {createGame,enterOperation,spawnEnemy,shoot,stepGame,dodge,resolveHostileShots,terrainHeight} from '../src/sim.mjs';
import {hitWarCover,warExplosion,routeWarGroup,warOrder,stepWarfront,shootWarBattalion} from '../src/war.mjs';

const war=()=>{const s=createGame();enterOperation(s,3);s.spawnTimer=1e9;s.war.enemyWaveTimer=1e9;return s;};
const step=(s,n=1)=>{for(let i=0;i<n;i++)stepGame(s,{},.1);};

test('battlefield cover is deterministic, solid, destructible and era-aesthetic-neutral',()=>{
 const first=makeBattlefieldCover(2),repeat=makeBattlefieldCover(2);
 assert.deepEqual(first,repeat);assert.equal(first.length,7);
 assert.ok(new Set(first.map(x=>x.kind)).size>=4);
 assert.ok(first.every(x=>x.hp===x.maxHp&&x.radius>5));
 assert.equal(positionBlocked(first[0].x,first[0].z,first),true);
});
test('segment-circle occlusion identifies straight lines and does not invent blockers',()=>{
 const a={x:0,z:0},b={x:80,z:0},c={x:40,z:0,radius:8,hp:300};
 assert.ok(segmentCircle(a,b,c,8)!==null);
 assert.equal(segmentCircle(a,{x:80,z:20},{x:30,z:-24},8),null);
 assert.equal(firstCoverBetween(a,b,[c]),c);
 c.hp=0;assert.equal(firstCoverBetween(a,b,[c]),null);
});
test('A* tactical routing detours around fortifications and is reproducible',()=>{
 const a={x:-38,z:-12},b={x:50,z:-57},cover=makeBattlefieldCover();
 const first=warPath(a,b,cover),again=warPath(a,b,cover);
 assert.ok(first.length>=2,JSON.stringify(first));
 assert.deepEqual(first,again);
 let previous=a;for(const point of first){
  assert.ok(!firstCoverBetween(previous,point,cover,2.3),JSON.stringify({previous,point}));previous=point;
 }
 assert.equal(first.at(-1).x,b.x);assert.equal(first.at(-1).z,b.z);
});
test('war formations travel around surviving cover without walking through its center',()=>{
 const s=war(),w=s.war,c=w.cover[0];w.army=w.army.slice(0,1);w.enemyArmy=[];
 const g=w.army[0];g.x=c.x-23;g.z=c.z;g.order='move';g.tx=c.x+23;g.tz=c.z;
 let passed=false;for(let i=0;i<160;i++){stepWarfront(s,.1);if(g.x>c.x+15)passed=true;assert.ok(Math.hypot(g.x-c.x,g.z-c.z)>c.radius-1.5,`intersect at ${g.x},${g.z}`);}
 assert.ok(passed,`group failed to navigate obstacle: ${g.x}, ${g.z}`);
});
test('cover takes projectile damage, can break and invalidates stale paths',()=>{
 const s=war(),w=s.war,c=w.cover[0],g=w.army[0];
 g.x=c.x-20;g.z=c.z;const dst={x:c.x+20,z:c.z};
 const before=routeWarGroup(w,g,dst,0);assert.ok(before);
 const revision=w.coverRevision;assert.equal(hitWarCover(w,c,c.hp+3),true);
 assert.equal(c.hp,0);assert.equal(w.coverRevision,revision+1);
 const next=routeWarGroup(w,g,dst,0.1);assert.ok(next);assert.deepEqual(next,dst);
});
test('player gunfire can blast physical cover before hitting enemies behind it',()=>{
 const s=war(),w=s.war,c=w.cover[0];w.enemyArmy=[];s.player.x=c.x;s.player.z=c.z+32;s.player.yaw=0;
 const before=c.hp;assert.ok(shootWarBattalion(s,{yaw:0},110));assert.ok(c.hp<before);
 const old=w.coverRevision;warExplosion(s,c.x,c.z,c.hp+1000,12);
 assert.equal(c.hp,0);assert.ok(w.coverRevision>old);
});
test('physical cover stops player walking through its footprint in RTS wars',()=>{
 const s=war(),c=s.war.cover[0];s.player.x=c.x-c.radius-2;s.player.z=c.z;
 for(let i=0;i<30;i++)stepGame(s,{x:1,z:0,yaw:0},.1);
 assert.ok(Math.hypot(s.player.x-c.x,s.player.z-c.z)>=c.radius*.87+.95);
});
function rangedState(){const s=createGame();s.spawnTimer=1e9;s.enemies=[];s.squad=[];
 s.player.x=0;s.player.z=0;spawnEnemy(s,'artillery',0,-29,{cooldown:0,aggro:true});return s;}
test('ranged artillery announces an aimed impact instead of instant damage',()=>{
 const s=rangedState(),sh=s.player.shield,hp=s.player.hp;
 step(s,1);assert.ok(s.hostileShots.length>0);assert.equal(s.player.shield,sh);assert.equal(s.player.hp,hp);
 assert.ok(s.hostileShots[0].radius>4);
});
test('a moving player can dodge the warned impact',()=>{
 const s=rangedState();step(s,1);const sh=s.player.shield,hp=s.player.hp;
 s.player.x+=14;resolveHostileShots(s,2);
 assert.equal(s.player.shield,sh);assert.equal(s.player.hp,hp);assert.equal(s.hostileShots.length,0);
});
test('staying inside the targeting ring takes damage, and dodge roll grants immunity',()=>{
 const s=rangedState();step(s,1);const hp=s.player.hp,shield=s.player.shield;
 resolveHostileShots(s,2);assert.ok(s.player.shield<shield||s.player.hp<hp);
 const second=rangedState();step(second,1);second.player.stamina=100;assert.ok(dodge(second));
 const shieldBefore=second.player.shield;resolveHostileShots(second,2);
 assert.equal(second.player.shield,shieldBefore);
});
test('headshots reward precision and briefly stagger responsive enemies',()=>{
 const s=createGame();s.spawnTimer=1e9;s.squad=[];s.enemies=[];s.player.weapon='rail';
 const enemy=spawnEnemy(s,'warden',0,-30,{cooldown:1e9,aggro:true});
 const eY=enemy.y+1.15+.89,originY=terrainHeight(s.player.x,s.player.z,s.seed,s.zone)+1.7;
 const headAngle=Math.atan2(eY-originY,30);
 assert.ok(shoot(s,{yaw:0,pitch:headAngle}));
 assert.ok(s.player.weakHits>0,`weak spot missed at pitch ${headAngle}`);
 assert.ok(enemy.stagger>0);
 assert.ok(enemy.hp<enemy.maxHp-18);
 assert.ok(s.effects.some(e=>e.type==='weakpoint'));
});

test('a real player shot hits cover before an individual enemy and stops the tracer there',()=>{
 const s=war(),c=s.war.cover[0];s.war.cover=[c];s.war.enemyArmy=[];s.enemies=[];
 s.player.x=c.x;s.player.z=c.z+30;s.player.yaw=0;s.player.weapon='rail';
 const e=spawnEnemy(s,'warden',c.x,c.z-22,{aggro:true});
 const hp=e.hp,cover=c.hp;
 shoot(s,{yaw:0,pitch:Math.atan2(e.y+1.15-(terrainHeight(s.player.x,s.player.z,s.seed,s.zone)+1.7),52)});
 assert.equal(e.hp,hp);assert.ok(c.hp<cover);assert.equal(s.player.hit,1);
 const tracer=s.effects.find(x=>x.type==='tracer');assert.ok(tracer.hit);assert.ok(tracer.toZ>c.z);
});
test('a nearer individual enemy absorbs a shot before cover and a battalion',()=>{
 const s=war(),c=s.war.cover[0];s.war.cover=[c];s.enemies=[];
 s.player.x=c.x;s.player.z=c.z+45;s.player.yaw=0;s.player.weapon='rail';
 const enemy=spawnEnemy(s,'warden',c.x,c.z+25,{aggro:true});
 const g=s.war.enemyArmy[0];g.x=c.x;g.z=c.z-25;
 const groupCount=g.count,groupHp=g.hp,coverHp=c.hp;
 const pitch=Math.atan2(enemy.y+1.15-(terrainHeight(s.player.x,s.player.z,s.seed,s.zone)+1.7),20);
 shoot(s,{yaw:0,pitch});
 assert.ok(enemy.hp<enemy.maxHp);assert.equal(c.hp,coverHp);assert.equal(g.hp,groupHp);assert.equal(g.count,groupCount);
});
test('the nearest war object is hit even when a farther battalion is in the same line',()=>{
 const s=war(),w=s.war;w.cover=[];s.enemies=[];s.player.x=0;s.player.z=-60;s.player.weapon='rail';s.player.yaw=0;
 const anchor=w.anchors[0];anchor.x=0;anchor.z=-85;const group=w.enemyArmy[0];group.x=0;group.z=-115;w.enemyArmy=[group];
 const hp=anchor.hp,count=group.count,groupHp=group.hp;shoot(s,{yaw:0,pitch:0});
 assert.ok(anchor.hp<hp);assert.equal(group.count,count);assert.equal(group.hp,groupHp);assert.equal(s.player.hit,1);
});
test('launcher explodes at the cover impact instead of a fixed distance beyond it',()=>{
 const s=war(),c=s.war.cover[0];s.war.cover=[c];s.war.enemyArmy=[];s.enemies=[];
 s.player.x=c.x;s.player.z=c.z+42;s.player.weapon='launcher';s.player.yaw=0;
 shoot(s,{yaw:0,pitch:0});const blast=s.effects.find(e=>e.type==='explosion');
 assert.ok(blast);assert.ok(Math.abs(blast.z-(c.z+c.radius))<2,JSON.stringify(blast));
});
test('shots aimed well above cover do not strike its battlefield footprint',()=>{
 const s=war(),c=s.war.cover[0];s.war.cover=[c];s.war.enemyArmy=[];s.enemies=[];
 s.player.x=c.x;s.player.z=c.z+32;s.player.weapon='rail';s.player.yaw=0;
 const hp=c.hp;shoot(s,{yaw:0,pitch:.9});assert.equal(c.hp,hp);assert.equal(s.player.hit,0);
});
test('a target outside the equipped weapon range is not damaged',()=>{
 const s=war(),w=s.war;w.cover=[];s.enemies=[];s.player.x=0;s.player.z=0;s.player.weapon='scatter';s.player.yaw=0;
 const g=w.enemyArmy[0];g.x=0;g.z=-60;w.enemyArmy=[g];const before=g.hp,count=g.count;
 shoot(s,{yaw:0,pitch:0});assert.equal(g.hp,before);assert.equal(g.count,count);
});
