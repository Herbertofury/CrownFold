import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,enterOperation,interact,nearestInteraction,stepGame} from '../src/sim.mjs';
import {WAR_ACTS,WAR_SUPPORT,WAR_CAMPAIGNS,BATTALIONS,createWarfront,warObjective,warSummary,stepWarfront,signalWarExtraction,canSignalWarExtraction,callWarSupport,warExplosion,selectWarBattalions,setWarControlGroup,recallWarControlGroup,warOrder,setWarStance} from '../src/war.mjs';

const makeWar=(contract=3)=>{const s=createGame();enterOperation(s,contract);s.spawnTimer=1e9;return s;};
const tick=(s,n=1,dt=1)=>{for(let i=0;i<n;i++)stepWarfront(s,dt);};
const toThrone=s=>{s.war.nodes[0].owner='ally';s.war.nodes[1].owner='ally';s.war.enemyArmy=[];s.war.enemyWaveTimer=1e9;tick(s,24);assert.equal(s.war.act,'anchors');for(const a of s.war.anchors)a.hp=0;tick(s);assert.equal(s.war.act,'throne');};

test('campaigns have four actual sequential goals with valid coordinates and UI progress',()=>{
 const s=makeWar(),w=s.war;assert.deepEqual(Object.keys(WAR_ACTS),['foothold','anchors','throne','extraction']);
 const obj=warObjective(w);assert.equal(obj.act,'foothold');assert.equal(obj.target,24);assert.ok(Number.isFinite(obj.x)&&Number.isFinite(obj.z));
 assert.equal(warSummary(w).act,'foothold');assert.equal(WAR_CAMPAIGNS.length,5);
});
test('destroying the throne early cannot bypass the mandatory campaign acts',()=>{
 const s=makeWar(),w=s.war;for(const a of w.anchors)a.hp=0;
 warExplosion(s,w.enemyBase.x,w.enemyBase.z,12000,10);
 assert.equal(w.act,'foothold');assert.ok(w.enemyBase.hp>=Math.ceil(w.enemyBase.maxHp*.45));
 tick(s,8);assert.equal(w.victory,null);
});
test('two held supply wells unlock siege, but losing a well interrupts progress',()=>{
 const s=makeWar(),w=s.war;w.enemyArmy=[];w.enemyWaveTimer=1e9;
 w.nodes[0].owner='ally';tick(s,10);assert.equal(w.footholdHold,0);
 w.nodes[1].owner='ally';tick(s,11);assert.equal(w.footholdHold,11);
 w.nodes[1].owner='neutral';tick(s,5);assert.ok(w.footholdHold<11);
 w.nodes[1].owner='ally';tick(s,21);assert.equal(w.act,'anchors');assert.ok(w.events.some(e=>e.includes('BEACHHEAD SECURED')));
});
test('anchor destruction, throne breach, and extraction are three different states',()=>{
 const s=makeWar();toThrone(s);const w=s.war;
 warExplosion(s,w.enemyBase.x,w.enemyBase.z,20000,10);tick(s);
 assert.equal(w.act,'extraction');assert.equal(w.victory,null);assert.equal(warObjective(w).target,36);
 assert.equal(signalWarExtraction(s),false);
});
test('extraction requires the player or a live battalion near the beacon',()=>{
 const s=makeWar();toThrone(s);const w=s.war;w.enemyBase.hp=0;tick(s);
 assert.equal(canSignalWarExtraction(s),false);assert.equal(signalWarExtraction(s),false);
 s.player.x=w.extraction.x;s.player.z=w.extraction.z;
 assert.equal(nearestInteraction(s).type,'war-extract');assert.equal(interact(s),true);
 assert.equal(w.extraction.active,true);assert.equal(signalWarExtraction(s),false);
});
test('RTS-only army can call extraction without physically moving the player',()=>{
 const s=makeWar();toThrone(s);const w=s.war;w.enemyBase.hp=0;tick(s);
 const g=w.army[0];g.x=w.extraction.x;g.z=w.extraction.z;
 assert.ok(canSignalWarExtraction(s));assert.ok(signalWarExtraction(s));
});
test('an uncontested evacuation finishes; enemies in the corridor stop progress',()=>{
 const s=makeWar();toThrone(s);const w=s.war;w.enemyBase.hp=0;tick(s);
 const ex=w.extraction;s.player.x=ex.x;s.player.z=ex.z;w.enemyArmy=[];signalWarExtraction(s);
 const enemy={...w.army[0],side:'enemy',id:9999,x:ex.x,z:ex.z,tx:ex.x,tz:ex.z,order:'move',count:4};w.enemyArmy.push(enemy);
 ex.progress=8;tick(s,1);assert.ok(ex.progress<8);assert.ok(ex.contested);
 w.enemyArmy=[];ex.nextWave=1e9;tick(s,40);assert.equal(w.victory,'ally');
});
test('extraction rearguard consumes finite supplies and has a small cap',()=>{
 const s=makeWar();toThrone(s);const w=s.war;w.enemyBase.hp=0;tick(s);s.player.x=w.extraction.x;s.player.z=w.extraction.z;
 w.enemySupplies=400;w.enemyArmy=[];signalWarExtraction(s);w.extraction.nextWave=0;
 tick(s);assert.equal(w.extraction.waves,1);assert.ok(w.enemySupplies<400);
 const count=w.extraction.waves;w.enemySupplies=0;w.extraction.nextWave=0;tick(s);assert.equal(w.extraction.waves,count);
});
test('battle support call-ins reserve real supplies and observe their cooldowns',()=>{
 const s=makeWar(),w=s.war;w.supplies=500;
 assert.ok(callWarSupport(s,'epoch_lance',-42,-114));assert.equal(w.supplies,500-WAR_SUPPORT.epoch_lance.cost);
 assert.equal(w.supportDrops.length,1);assert.equal(callWarSupport(s,'epoch_lance'),false);
 assert.equal(callWarSupport(s,'invalid'),false);
});
test('epoch lance has a real arming delay and destroys shield anchors',()=>{
 const s=makeWar(),w=s.war;w.enemyArmy=[];w.enemyWaveTimer=1e9;w.supplies=500;
 const anchor=w.anchors[0],hp=anchor.hp;assert.ok(callWarSupport(s,'epoch_lance',anchor.x,anchor.z));
 tick(s,3);assert.equal(anchor.hp,hp);assert.equal(w.supportDrops.length,1);
 tick(s,1);assert.ok(anchor.hp<hp);assert.equal(w.supportDrops.length,0);
});
test('timefall pod creates an era-specific battalion without any production building',()=>{
 for(const [era,type]of [['medieval','longbow'],['primeval','hunters'],['steam','clockguard'],['neon','signalers'],['farfuture','synths']]){
  const s=makeWar();s.temporal.lineage.commanderEra=era;const w=s.war;w.supplies=500;w.enemyArmy=[];w.enemyWaveTimer=1e9;
  const before=w.army.length;assert.ok(callWarSupport(s,'timefall_pod',9,4));tick(s,6);
  assert.equal(w.army.length,before+1);assert.equal(w.army.at(-1).type,type);
  assert.equal(w.army.at(-1).count,BATTALIONS[type].count);
 }
});
test('pending pod reserves population so rapid queues cannot exceed cap',()=>{
 const s=makeWar(),w=s.war;w.supplies=500;w.popCap=w.population+BATTALIONS.longbow.count-1;
 assert.equal(callWarSupport(s,'timefall_pod'),false);assert.equal(w.supportDrops.length,0);
 w.popCap++;assert.ok(callWarSupport(s,'timefall_pod'));assert.equal(w.population,w.popCap);
 assert.equal(callWarSupport(s,'timefall_pod'),false);
});
test('war support targeting validates map range and never spends money on an invalid order',()=>{
 const s=makeWar(),w=s.war;w.supplies=500;
 assert.equal(callWarSupport(s,'epoch_lance',9000,9000),false);assert.equal(w.supplies,500);
 assert.ok(callWarSupport(s,'epoch_lance',-5,-80));const d=w.supportDrops.at(-1);
 assert.equal(d.x,-5);assert.equal(d.z,-80);
});
test('all five era campaigns use the same objective and support rules',()=>{
 for(const campaign of WAR_CAMPAIGNS){const s=createGame();const w=createWarfront(s,campaign);
  s.war=w;s.zone='operation';s.operation={difficulty:campaign.difficulty};
  assert.equal(warObjective(w).act,'foothold');assert.deepEqual(Object.keys(WAR_ACTS).length,4);
  assert.ok(callWarSupport(s,'epoch_lance',0,-70));}
});
test('full extracted operation grants persistent rewards and returns to the original world',()=>{
 const s=makeWar(),w=s.war;w.enemyArmy=[];w.enemyWaveTimer=1e9;w.act='throne';w.anchors.forEach(a=>a.hp=0);w.enemyBase.hp=0;
 stepGame(s,{},.1);assert.equal(w.act,'extraction');assert.equal(s.zone,'operation');
 const ex=w.extraction;s.player.x=ex.x;s.player.z=ex.z;assert.ok(interact(s));ex.progress=ex.target-.08;
 for(let i=0;i<5&&s.zone==='operation';i++)stepGame(s,{},.1);
 assert.equal(s.zone,'frontier');assert.equal(s.stats.missions,1);assert.ok(s.temporal.wonCampaigns.length===1);
});
test('a lost home citadel still causes immediate defeat regardless of war act',()=>{
 const s=makeWar();s.war.base.hp=0;tick(s);assert.equal(s.war.victory,'enemy');
});


test('RTS players can multi-select separate groups and issue precisely scoped orders',()=>{
 const s=makeWar(),w=s.war,ids=w.army.slice(0,2).map(g=>g.id);
 assert.ok(selectWarBattalions(s,[ids[0]]));assert.ok(selectWarBattalions(s,[ids[1]],true));
 assert.deepEqual(w.selectedBattalionIds,ids);
 const third={...w.army[0],id:987654,tx:99,tz:88};w.army.push(third);const was=[third.tx,third.tz];
 assert.ok(warOrder(s,'move',-37,-63));
 for(const g of w.army.filter(g=>ids.includes(g.id)))assert.deepEqual([g.tx,g.tz],[-37,-63]);
 assert.deepEqual([third.tx,third.tz],was);
});
test('RTS control groups persist during regrouping and can be recalled',()=>{
 const s=makeWar(),w=s.war,ids=w.army.slice(0,2).map(g=>g.id);
 assert.ok(selectWarBattalions(s,ids));assert.ok(setWarControlGroup(s,1));
 assert.ok(selectWarBattalions(s,[ids[0]]));assert.deepEqual(w.selectedBattalionIds,[ids[0]]);
 assert.ok(recallWarControlGroup(s,1));assert.deepEqual(w.selectedBattalionIds,ids);
 assert.deepEqual(w.controlGroups[1],ids);
});
test('invalid or empty tactical groups cannot produce phantom orders',()=>{
 const s=makeWar(),w=s.war;
 assert.equal(selectWarBattalions(s,[999999]),false);
 assert.equal(recallWarControlGroup(s,3),false);
 assert.equal(setWarControlGroup(s,0),false);
 assert.equal(setWarControlGroup(s,6),false);
 assert.equal(w.controlGroups[3],undefined);
});
test('multiselected stance only affects the intended army formations',()=>{
 const s=makeWar(),w=s.war,ids=w.army.slice(0,2).map(g=>g.id);
 assert.ok(selectWarBattalions(s,ids));assert.ok(setWarStance(s,'bulwark'));
 assert.ok(w.army.filter(g=>ids.includes(g.id)).every(g=>g.stance==='bulwark'));
 assert.ok(w.army.filter(g=>!ids.includes(g.id)).every(g=>g.stance!=='bulwark'));
});
test('invalid selections cannot replace currently selected tactical groups',()=>{
 const s=makeWar(),w=s.war,id=w.army[0].id;
 assert.ok(selectWarBattalions(s,[id]));
 assert.equal(selectWarBattalions(s,[1e8]),false);
 assert.deepEqual(w.selectedBattalionIds,[id]);
});
