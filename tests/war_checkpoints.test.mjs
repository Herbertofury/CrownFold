import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createGame,enterOperation,stepGame,serialize,restore,finishOperation,castAbility,grenade,addBuilding,changeEpoch,recruit,terrainHeight} from '../src/sim.mjs';
import {trainBattalion,callWarSupport,warOrder,signalWarExtraction,setWarControlGroup,selectWarBattalions,warExplosion} from '../src/war.mjs';
import {stampFacet} from '../src/temporal.mjs';
import {objectiveRuntime} from '../src/war-objectives.mjs';
const run=(s,n=1)=>{for(let i=0;i<n;i++)stepGame(s,{},.1);};
const war=(index=3)=>{const s=createGame();s.player.x=55;s.player.z=21;enterOperation(s,index);return s;};
const checkpoint=s=>JSON.parse(JSON.parse(serialize(s)).warCheckpoint.payload);
const hash=text=>{let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');};
const corrupt=(s,change)=>{const save=JSON.parse(serialize(s)),data=JSON.parse(save.warCheckpoint.payload);change(data);save.warCheckpoint.payload=JSON.stringify(data);save.warCheckpoint.checksum=hash(save.warCheckpoint.payload);return restore(save);};
test('all five war campaigns resume their exact combat checkpoint and original return position',()=>{
 for(let index=3;index<8;index++){
  const s=war(index);run(s,73);const loaded=restore(serialize(s));
  assert.equal(loaded.zone,'operation');assert.deepEqual(checkpoint(loaded),checkpoint(s));
  finishOperation(loaded,false);assert.equal(loaded.player.x,58);assert.equal(loaded.player.z,24);assert.equal(loaded.era,'medieval');
 }
});
test('save and resume retain training, support drops, cooldowns, cover, orders and control groups',()=>{
 const s=war();s.inventory.flux=300;s.war.supplies=900;trainBattalion(s,'riders');callWarSupport(s,'timefall_pod',9,4);
 s.war.cover[0].hp=13;selectWarBattalions(s,[s.war.army[0].id]);setWarControlGroup(s,1);warOrder(s,'move',-70,-50);
 castAbility(s,'drone');castAbility(s,'cloak');grenade(s);addBuilding(s,'turret',3,3,true);run(s,3);
 const loaded=restore(serialize(s));assert.equal(loaded.zone,'operation');assert.deepEqual(checkpoint(loaded),checkpoint(s));
 run(s,80);run(loaded,80);assert.deepEqual(checkpoint(loaded),checkpoint(s));
});
test('resumed simulation follows the same objective, economy and combat progression',()=>{
 const s=war();run(s,100);const loaded=restore(serialize(s));run(s,800);run(loaded,800);
 assert.deepEqual(checkpoint(loaded),checkpoint(s));assert.ok(objectiveRuntime().calls>0);assert.equal(objectiveRuntime().backend,'rust-wasm');
});
test('every siege act survives reload and extraction rewards settle once',()=>{
 for(const act of ['foothold','anchors','throne','extraction']){
  const s=war();s.war.act=act;s.war.footholdHold=act==='foothold'?12:24;
  const loaded=restore(serialize(s));assert.equal(loaded.war.act,act);assert.equal(loaded.war.footholdHold,s.war.footholdHold);
 }
 const s=war();s.war.act='extraction';s.war.anchors.forEach(a=>a.hp=0);s.war.enemyBase.hp=0;s.war.enemyArmy=[];
 s.player.x=s.war.extraction.x;s.player.z=s.war.extraction.z;signalWarExtraction(s);s.war.extraction.progress=35.7;s.war.extraction.nextWave=999;
 const loaded=restore(serialize(s));run(loaded,5);assert.equal(loaded.zone,'frontier');assert.equal(loaded.stats.missions,1);
 const reloaded=restore(serialize(loaded));const scrap=reloaded.inventory.scrap;run(reloaded,5);
 assert.equal(reloaded.stats.missions,1);assert.equal(reloaded.inventory.scrap,scrap);assert.equal(JSON.parse(serialize(reloaded)).warCheckpoint,null);
});
test('checkpoint restores cross-era return destination and Fold fields',()=>{
 const s=createGame();changeEpoch(s,'steam');s.player.x=-41;s.player.z=59;enterOperation(s,3);
 stampFacet(s,0,0,1,'primeval');const loaded=restore(serialize(s));
 assert.equal(loaded.era,'medieval');assert.deepEqual(loaded.temporal.facets,s.temporal.facets);finishOperation(loaded,false);
 assert.equal(loaded.era,'steam');assert.equal(loaded.player.x,-38);assert.equal(loaded.player.z,62);
});
test('legacy saves and classic shooter operations retain frontier migration',()=>{
 const s=war(),old=JSON.parse(serialize(s));delete old.warCheckpoint;const loaded=restore(old);
 assert.equal(loaded.zone,'frontier');assert.equal(loaded.player.x,55);assert.equal(loaded.checkpointWarning,undefined);
 const classic=war(0);assert.equal(JSON.parse(serialize(classic)).warCheckpoint,null);assert.equal(restore(serialize(classic)).zone,'frontier');
});
test('truncated, unknown-version or damaged checkpoints recover frontier without writing a victory',()=>{
 for(const mutation of [c=>c.payload=c.payload.slice(0,-4),c=>c.version=99,c=>c.checksum='bad']){
  const data=JSON.parse(serialize(war()));mutation(data.warCheckpoint);const loaded=restore(data);
  assert.equal(loaded.zone,'frontier');assert.equal(loaded.checkpointWarning,true);assert.equal(loaded.player.x,55);assert.equal(loaded.stats.missions,0);
 }
});
test('bounded schema rejects malformed payloads before touching frontier state',()=>{
 for(const change of [d=>d.war.act='invalid',d=>d.war.army[0].type='constructor',d=>delete d.war.army[0].buffs,
  d=>d.war.nodes=[],d=>d.operation.contract=99,d=>delete d.operation.pylons,d=>d.war.extraction.active=true,d=>d.war.extraction.target=0,
  d=>d.player.ammo={},d=>d.war.cover[0].hp=null,d=>d.war.victory='ally',d=>d.nextId=1]){
  const loaded=corrupt(war(),change);assert.equal(loaded.zone,'frontier');assert.equal(loaded.checkpointWarning,true);
 }
});
test('WebAssembly unavailable still resumes and completes via explicit compatibility mode',()=>{
 const result=spawnSync(process.execPath,['--input-type=module','-e',`globalThis.WebAssembly=undefined;
 const {createGame,enterOperation,restore,serialize,stepGame}=await import('./src/sim.mjs');
 const {objectiveRuntime}=await import('./src/war-objectives.mjs');
 let s=createGame();enterOperation(s,3);s.war.nodes[0].owner='ally';s.war.nodes[1].owner='ally';s.war.footholdHold=23.95;
 s=restore(serialize(s));stepGame(s,{},.1);if(s.war.act!=='anchors'||objectiveRuntime().backend!=='javascript')throw Error('fallback resume failed');
 `],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(result.status,0,result.stderr);
});

test('end-of-frame casualties remain safely saveable until next-tick cleanup',()=>{
 const s=war(),enemy=s.war.enemyArmy[0];enemy.count=1;enemy.hp=.1;
 warExplosion(s,enemy.x,enemy.z,10000,20);assert.equal(enemy.count,0);
 const loaded=restore(serialize(s));assert.equal(loaded.zone,'operation');
 run(s);run(loaded);assert.deepEqual(checkpoint(loaded),checkpoint(s));
});


test('cross-era siege keeps the exact combat squad and grounds the frontier recovery squad',()=>{
 const s=createGame(9184);changeEpoch(s,'steam');s.player.x=-41;s.player.z=59;
 s.inventory.scrap=100;assert.equal(recruit(s),true);assert.equal(recruit(s),true);
 const returnSeed=s.seed;enterOperation(s,3);assert.notEqual(s.seed,returnSeed);run(s,4);s.weather='storm';
 const text=serialize(s),save=JSON.parse(text),started=checkpoint(s);
 const assertGrounded=(squad,seed)=>{
  assert.equal(squad.length,started.squad.length);
  assert.deepEqual(squad.map(u=>[u.id,u.hp,u.era]),started.squad.map(u=>[u.id,u.hp,u.era]));
  for(const u of squad)assert.equal(u.y,terrainHeight(u.x,u.z,seed,'frontier'));
 };
 assert.equal(save.seed,returnSeed);
 assertGrounded(save.squad,returnSeed);
 // A valid battle checkpoint owns combat weather, not the frontier envelope.
 save.weather='rain';
 const live=restore(save);
 assert.equal(live.zone,'operation');assert.equal(live.weather,'storm');assert.deepEqual(checkpoint(live),started);
 assert.equal(finishOperation(live,false),true);assertGrounded(live.squad,returnSeed);
 save.warCheckpoint.checksum='damaged';
 save.squad.forEach(u=>u.y=terrainHeight(u.x,u.z,s.seed,'frontier'));
 const legacy=restore(save);
 assert.equal(legacy.zone,'frontier');assert.equal(legacy.era,'steam');assert.equal(legacy.checkpointWarning,true);assert.equal(legacy.weather,'rain');
 assertGrounded(legacy.squad,returnSeed);
});
