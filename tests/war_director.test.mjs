import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,enterOperation} from '../src/sim.mjs';
import {WAR_COUNTERS,WAR_EXPEDITIONS,WAR_ENEMY_DOCTRINES,chooseEnemyBattalion,warCounterBonus,startWarExpedition,stepWarExpedition,stepWarfront,shootWarBattalion,warExplosion,warSummary} from '../src/war.mjs';

const makeWar=()=>{const s=createGame();enterOperation(s,3);s.spawnTimer=1e9;return s;};

test('every campaign chooses an opposing strategic doctrine, not an era-based strength score',()=>{
 const s=makeWar();assert.ok(WAR_ENEMY_DOCTRINES[s.war.enemyDoctrine]);assert.equal(Object.keys(WAR_ENEMY_DOCTRINES).length,5);
 assert.equal(warCounterBonus('hunters','synths'),1.24);
 assert.equal(warCounterBonus('synths','hunters'),.88);
 assert.equal(warCounterBonus('hunters','unknown'),1);
 assert.equal(warCounterBonus('bad','synths'),1);
});
test('enemy commander trains with its own finite resources, not free infinite waves',()=>{
 const s=makeWar(),w=s.war;w.enemyWaveTimer=0;w.enemySupplies=0;w.nodes.forEach(n=>n.owner='neutral');
 const before=w.enemyArmy.length;stepWarfront(s,.1);assert.equal(w.enemyArmy.length,before);
 w.enemyWaveTimer=0;w.enemySupplies=300;stepWarfront(s,.1);assert.equal(w.enemyArmy.length,before+1);assert.ok(w.enemySupplies<300);
 assert.equal(w.enemyWaves,1);
});
test('counter recruitment responds to dangerous allied unit types from any era',()=>{
 const s=makeWar(),w=s.war;w.army[0].type='synths';w.army[0].era='farfuture';w.army[0].count=9;w.army[1].count=0;w.enemyWaves=1;w.enemySupplies=500;
 const counter=chooseEnemyBattalion(s);assert.ok(WAR_COUNTERS[counter].includes('synths'),counter);
});
test('a salvage crisis can be resolved by the player without needing to command an entire army',()=>{
 const s=makeWar(),w=s.war;assert.ok(startWarExpedition(s,'salvage'));const e=w.expedition;
 w.enemyArmy=[];s.player.x=e.x;s.player.z=e.z;const insight=s.temporal.insight;
 for(let i=0;i<35&&w.expedition;i++)stepWarExpedition(s,1);
 assert.equal(w.expedition,null);assert.equal(w.expeditionsCompleted,1);assert.equal(s.temporal.insight,insight+4);assert.ok(w.supplies>205);
});
test('destroying the time-spire with a weapon actually delays enemy reinforcements',()=>{
 const s=makeWar(),w=s.war;assert.ok(startWarExpedition(s,'spire'));let e=w.expedition;
 s.player.x=e.x;s.player.z=e.z+30;w.enemyArmy=[];
 assert.ok(shootWarBattalion(s,{yaw:0},100));assert.ok(e.hp<e.maxHp);
 warExplosion(s,e.x,e.z,1100,8);stepWarExpedition(s,.1);
 assert.equal(w.expedition,null);assert.equal(w.expeditionsCompleted,1);assert.ok(w.enemyExhaustion>0);
});
test('escort convoy traverses real space and awards benefits to troops when protected',()=>{
 const s=makeWar(),w=s.war;assert.ok(startWarExpedition(s,'escort'));const e=w.expedition;w.enemyArmy=[];
 const original={x:e.x,z:e.z};
 for(let i=0;i<100&&w.expedition;i++){s.player.x=e.x;s.player.z=e.z;stepWarExpedition(s,1);}
 assert.ok(Math.hypot(original.x-e.x,original.z-e.z)>80);
 assert.equal(w.expedition,null);assert.equal(w.expeditionsCompleted,1);assert.ok(w.army.every(g=>g.morale===100));
});
test('ignoring a crisis creates a strategic consequence and another crisis can spawn later',()=>{
 const s=makeWar(),w=s.war;assert.ok(startWarExpedition(s,'salvage'));const previous=w.enemySupplies;
 stepWarExpedition(s,126);assert.equal(w.expeditionsFailed,1);assert.equal(w.enemySupplies,previous+60);assert.equal(w.expedition,null);
 w.expeditionNext=.1;stepWarExpedition(s,.2);assert.ok(w.expedition);assert.ok(WAR_EXPEDITIONS[w.expedition.type]);
});
test('controlling enemy timewells changes its reinforcement income',()=>{
 const s=makeWar(),w=s.war;stepWarfront(s,1);const baseline=w.enemyIncome;
 w.nodes.forEach(n=>n.owner='enemy');stepWarfront(s,1);assert.ok(w.enemyIncome>baseline);
 w.nodes.forEach(n=>n.owner='ally');stepWarfront(s,1);assert.ok(w.enemyIncome<baseline);
});
test('low-morale troops fall back to supply lines and recover rather than fighting forever',()=>{
 const s=makeWar(),w=s.war,g=w.army[0];g.order='assault';g.morale=3;g.x=115;g.z=-80;w.enemyArmy=[];
 const before=Math.hypot(g.x-w.base.x,g.z-w.base.z);stepWarfront(s,1);
 assert.equal(g.retreating,true);assert.ok(Math.hypot(g.x-w.base.x,g.z-w.base.z)<before);
 g.x=w.base.x;g.z=w.base.z;
 for(let i=0;i<25;i++)stepWarfront(s,1);
 assert.equal(g.retreating,false);assert.ok(g.morale>=58);
});
test('the war status reports optional crises, enemy doctrine and consequences',()=>{
 const s=makeWar();startWarExpedition(s,'spire');const stats=warSummary(s.war);
 assert.equal(stats.expedition.kind,'spire');assert.equal(stats.expedition.progress,0);
 assert.ok(stats.enemyDoctrine);assert.ok(Number.isFinite(stats.enemySupplies));
});
test('replayable crisis timing stays deterministic for identical game input',()=>{
 const a=makeWar(),b=makeWar();for(let i=0;i<245;i++){stepWarfront(a,.2);stepWarfront(b,.2);}
 const pick=w=>[w.expedition?.type,w.expedition?.x,w.expedition?.z,w.expedition?.progress,w.enemyWaves,w.enemySupplies];
 assert.deepEqual(pick(a.war),pick(b.war));
});
test('sieges have two real destructible shield anchors and a protected throne',()=>{
 const s=makeWar(),w=s.war;assert.equal(w.anchors.length,2);assert.equal(warSummary(w).anchorsRemaining,2);
 w.enemyArmy=[];const before=w.enemyBase.hp;
 warExplosion(s,w.enemyBase.x,w.enemyBase.z,1000,7);
 const shielded=before-w.enemyBase.hp;assert.ok(shielded>0&&shielded<100,'shield must absorb most blast damage');
 for(const a of w.anchors){warExplosion(s,a.x,a.z,1800,10);assert.equal(a.hp,0);}
 assert.equal(warSummary(w).anchorsRemaining,0);
 const second=w.enemyBase.hp;warExplosion(s,w.enemyBase.x,w.enemyBase.z,1000,7);
 assert.ok(second-w.enemyBase.hp>shielded*5,'broken anchors should make a measurable difference');
});
test('the third-person player can snipe a time-anchor and squads can finish the siege',()=>{
 const s=makeWar(),w=s.war;w.enemyArmy=[];w.enemyWaveTimer=1e9;const target=w.anchors[0];s.player.x=target.x;s.player.z=target.z+38;
 assert.ok(shootWarBattalion(s,{yaw:0},120));assert.ok(target.hp<target.maxHp);
 const g=w.army[0];g.x=target.x;g.z=target.z+4;g.order='assault';
 for(let i=0;i<1000&&target.hp>0;i++)stepWarfront(s,.1);
 assert.equal(target.hp,0);
});
