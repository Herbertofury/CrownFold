import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,enterOperation,finishOperation,serialize,restore,stepGame} from '../src/sim.mjs';
import {BELL_SIEGE_SORTIES,startWarExpedition,stepWarExpedition,stepWarfront,warExplosion,warSummary,signalWarExtraction,skipWarSortie} from '../src/war.mjs';
import {positionBlocked} from '../src/battlefield.mjs';

const makeWar=(index=3)=>{const s=createGame(880);enterOperation(s,index);return s;};
function recoverLedger(s){
 assert.equal(startWarExpedition(s),true);const e=s.war.expedition;
 assert.equal(e.sortieId,'ledger');s.war.enemyArmy=[];s.player.x=e.x;s.player.z=e.z;
 for(let i=0;i<30;i++)stepWarExpedition(s,1);
 assert.equal(s.war.bellSiege.outcomes.ledger,'success');
}
function silenceFoundry(s){
 s.war.act='anchors';assert.ok(startWarExpedition(s));const e=s.war.expedition;
 assert.equal(e.sortieId,'foundry');warExplosion(s,e.x,e.z,1000,8);stepWarExpedition(s,.1);
 assert.equal(s.war.bellSiege.outcomes.foundry,'success');
}
function rescueBellkeepers(s){
 s.war.act='throne';assert.ok(startWarExpedition(s));const e=s.war.expedition;
 assert.equal(e.sortieId,'bellkeepers');s.war.enemyArmy=[];
 for(let i=0;i<60&&s.war.expedition;i++){s.player.x=e.x;s.player.z=e.z;stepWarExpedition(s,1);}
 assert.equal(s.war.bellSiege.outcomes.bellkeepers,'success');
}

test('only Eleven Bells has authored sorties; all other campaigns retain repeatable crises',()=>{
 assert.deepEqual(makeWar().war.bellSiege.outcomes,{ledger:'pending',foundry:'pending',bellkeepers:'pending'});
 for(let i=4;i<8;i++){
  const s=makeWar(i);assert.equal(s.war.bellSiege,null);assert.ok(startWarExpedition(s));
  assert.equal(s.war.expedition.sortieId,undefined);assert.equal(s.war.expedition.type,'salvage');
  s.war.expedition.timeLeft=0;stepWarExpedition(s,.1);assert.equal(s.war.expeditionNext,72);
  assert.ok(startWarExpedition(s));assert.equal(s.war.expedition.type,'spire');
 }
});

test('each authored target and the entire escort lane avoid intact cover',()=>{
 const w=makeWar().war;
 for(const q of BELL_SIEGE_SORTIES)assert.equal(positionBlocked(q.x,q.z,w.cover,2.3),false,q.id);
 const q=BELL_SIEGE_SORTIES[2];
 for(let n=0;n<=100;n++){
  const t=n/100;assert.equal(positionBlocked(q.x+(w.base.x-q.x)*t,q.z+(w.base.z-q.z)*t,w.cover,2.3),false,`escort at ${t}`);
 }
});

test('authored dispatch waits for countdown, never unlocks a future act early, and never repeats a reward',()=>{
 const s=makeWar(),w=s.war;stepWarExpedition(s,23);assert.equal(w.expedition,null);
 stepWarExpedition(s,1);assert.equal(w.expedition.sortieId,'ledger');
 w.enemyArmy=[];s.player.x=w.expedition.x;s.player.z=w.expedition.z;
 for(let i=0;i<30;i++)stepWarExpedition(s,1);
 const insight=s.temporal.insight,supplies=w.supplies;
 for(let i=0;i<300;i++)stepWarExpedition(s,1);
 assert.equal(w.expedition,null);assert.equal(startWarExpedition(s),false);
 assert.equal(s.temporal.insight,insight);assert.equal(w.supplies,supplies);
 assert.equal(w.expeditionsCompleted,1);
 w.act='anchors';stepWarExpedition(s,7);assert.equal(w.expedition,null);
 stepWarExpedition(s,1);assert.equal(w.expedition.sortieId,'foundry');
});

test('survey ledger takes real uncontested occupation and improves later well capture by exactly 25%',()=>{
 const s=makeWar(),w=s.war;recoverLedger(s);
 assert.equal(s.temporal.insight,4);assert.equal(w.supplies,330);
 w.enemyWaveTimer=1e9;w.army=[];const node=w.nodes[1];s.player.x=node.x;s.player.z=node.z;
 stepWarfront(s,1);assert.equal(node.progress,1.25);
 const control=makeWar(),cw=control.war;cw.enemyArmy=[];cw.army=[];cw.enemyWaveTimer=1e9;
 control.player.x=cw.nodes[1].x;control.player.z=cw.nodes[1].z;stepWarfront(control,1);
 assert.equal(cw.nodes[1].progress,1);
});

test('contested ledger cannot complete and abandoning it can fail without blocking the siege',()=>{
 const s=makeWar(),w=s.war;startWarExpedition(s);const e=w.expedition;
 s.player.x=e.x;s.player.z=e.z;w.enemyArmy[0].x=e.x;w.enemyArmy[0].z=e.z;
 for(let i=0;i<30;i++)stepWarExpedition(s,1);assert.equal(e.progress,0);
 e.timeLeft=.1;const supplies=w.enemySupplies;stepWarExpedition(s,.2);
 assert.equal(w.bellSiege.outcomes.ledger,'failed');assert.equal(w.enemySupplies,supplies+60);
 assert.equal(s.temporal.insight,0);assert.equal(w.act,'foothold');
 w.act='anchors';assert.ok(startWarExpedition(s));assert.equal(w.expedition.sortieId,'foundry');
});

test('destroying Ash Foundry applies a permanent multiplicative income cut, not an era advantage',()=>{
 const s=makeWar(),w=s.war;recoverLedger(s);silenceFoundry(s);
 w.enemyArmy=[];w.army=[];w.enemyWaveTimer=1e9;w.nodes.forEach(n=>n.owner='neutral');
 stepWarfront(s,1);assert.ok(Math.abs(w.enemyIncome-1.75*1.08*.65)<1e-9);
 w.enemyExhaustion=0;stepWarfront(s,1);assert.ok(Math.abs(w.enemyIncome-1.75*1.08*.65)<1e-9);
 assert.equal(w.expeditionsCompleted,2);assert.equal(s.temporal.insight,6);
});

test('Bellkeepers stop when unaccompanied and can die under enemy pressure',()=>{
 const s=makeWar(),w=s.war;recoverLedger(s);silenceFoundry(s);w.act='throne';startWarExpedition(s);
 const e=w.expedition;w.army=[];s.player.x=0;s.player.z=16;
 const original={x:e.x,z:e.z};stepWarExpedition(s,10);assert.deepEqual({x:e.x,z:e.z},original);
 w.enemyArmy=[{count:2,x:e.x,z:e.z}];e.hp=1;stepWarExpedition(s,1);
 assert.equal(w.bellSiege.outcomes.bellkeepers,'failed');assert.equal(w.extraction.target,36);
});

test('protected Bellkeepers traverse the map, reduce evacuation by 12 seconds, and remain a one-time rescue',()=>{
 const s=makeWar(),w=s.war;recoverLedger(s);silenceFoundry(s);rescueBellkeepers(s);
 assert.equal(w.extraction.target,24);assert.equal(w.expeditionsCompleted,3);assert.equal(s.temporal.insight,8);
 assert.equal(startWarExpedition(s),false);assert.equal(warSummary(w).bellSiege.filter(q=>q.status==='success').length,3);
});

test('rushing the throne cleanly misses unfinished sorties and does not start them during evacuation',()=>{
 const s=makeWar(),w=s.war;startWarExpedition(s);w.act='throne';w.enemyBase.hp=0;
 w.enemyArmy=[];w.enemyWaveTimer=1e9;stepWarfront(s,.1);
 assert.equal(w.act,'extraction');assert.equal(w.expedition,null);assert.equal(w.extraction.target,36);
 assert.deepEqual(w.bellSiege.outcomes,{ledger:'missed',foundry:'missed',bellkeepers:'missed'});
 for(let i=0;i<200;i++)stepWarExpedition(s,1);
 assert.equal(startWarExpedition(s),false);assert.equal(w.expedition,null);assert.equal(w.expeditionsFailed,0);
});

test('a successful sortie can carry across an act change without being erased',()=>{
 const s=makeWar(),w=s.war;startWarExpedition(s);const e=w.expedition;w.act='anchors';
 w.enemyArmy=[];s.player.x=e.x;s.player.z=e.z;
 for(let i=0;i<30;i++)stepWarExpedition(s,1);
 assert.equal(w.bellSiege.outcomes.ledger,'success');
 stepWarExpedition(s,8);assert.equal(w.expedition.sortieId,'foundry');
});

test('the shortened extraction still requires signaling, presence and an uncontested corridor',()=>{
 const s=makeWar(),w=s.war;recoverLedger(s);silenceFoundry(s);rescueBellkeepers(s);
 w.anchors.forEach(a=>a.hp=0);w.enemyBase.hp=0;w.enemyWaveTimer=1e9;stepWarfront(s,.1);
 assert.equal(w.act,'extraction');assert.equal(signalWarExtraction(s),false);
 const ex=w.extraction;s.player.x=ex.x;s.player.z=ex.z;assert.ok(signalWarExtraction(s));
 ex.nextWave=1e9;ex.progress=8;const invader={...w.army[0],side:'enemy',id:9999,x:ex.x,z:ex.z,tx:ex.x,tz:ex.z,order:'move',count:1};w.enemyArmy=[invader];
 stepWarfront(s,1);assert.ok(ex.progress<8);assert.equal(ex.contested,true);ex.progress=0;w.army=[];w.enemyArmy=[];
 for(let i=0;i<23;i++)stepWarfront(s,1);assert.equal(w.victory,null);
 for(let i=0;i<25&&s.war;i++)stepGame(s,{},.05);assert.equal(s.zone,'frontier');assert.equal(s.war,null);
 const restored=restore(serialize(s));assert.ok(restored.temporal.wonCampaigns.includes('siege_of_bells'));
 const report=restored.temporal.chronicleLog.find(x=>x.startsWith('Eleven Bells extracted.'));
 assert.ok(report);assert.equal((report.match(/SUCCESS/g)||[]).length,3);
});

test('withdrawal writes an honest bounded Chronicle report, does not claim a win, and cannot duplicate payout',()=>{
 const s=makeWar();s.temporal.chronicleLog=Array.from({length:40},(_,i)=>`Entry ${i}`);recoverLedger(s);
 assert.ok(finishOperation(s,false));const after=serialize(s);assert.equal(finishOperation(s,false),false);assert.equal(serialize(s),after);
 assert.equal(s.temporal.chronicleLog.length,40);assert.equal(s.temporal.wonCampaigns.length,0);
 const restored=restore(after),report=restored.temporal.chronicleLog.at(-1);
 assert.match(report,/Eleven Bells withdrawal/);assert.match(report,/LEDGER: SUCCESS/);assert.equal((report.match(/MISSED/g)||[]).length,2);
 assert.equal(restored.zone,'frontier');assert.equal(restored.war,null);
});

test('saving an ongoing siege keeps the established frontier-return contract and no mission buffs leak',()=>{
 const s=makeWar();recoverLedger(s);const loaded=restore(serialize(s));
 assert.equal(loaded.zone,'frontier');assert.equal(loaded.war,null);assert.equal(loaded.temporal.insight,4);
 assert.ok(enterOperation(loaded,3));assert.equal(loaded.war.bellSiege.outcomes.ledger,'pending');assert.equal(loaded.war.extraction.target,36);
});

test('summary exposes authored instructions and preserves generic expedition consumers',()=>{
 const s=makeWar();startWarExpedition(s);const q=warSummary(s.war).expedition;
 assert.equal(q.kind,'salvage');assert.equal(q.name,BELL_SIEGE_SORTIES[0].name);assert.match(q.reward,/25%/);
 assert.equal(q.progress,0);assert.equal(q.seconds,125);
 const other=makeWar(4);startWarExpedition(other,'spire');const generic=warSummary(other.war).expedition;
 assert.equal(generic.kind,'spire');assert.equal(generic.name,'SILENCE THE CHRONAL SPIRE');
});


test('leaving a sortie is an explicit no-reward choice that opens a later unlocked order',()=>{
 const s=makeWar(),w=s.war;assert.equal(skipWarSortie(s),false);startWarExpedition(s);
 const supplies=w.supplies,enemySupplies=w.enemySupplies,insight=s.temporal.insight;
 assert.ok(skipWarSortie(s));assert.equal(skipWarSortie(s),false);
 assert.equal(w.bellSiege.outcomes.ledger,'skipped');assert.equal(w.expedition,null);
 assert.equal(w.supplies,supplies);assert.equal(w.enemySupplies,enemySupplies);assert.equal(s.temporal.insight,insight);
 assert.equal(w.expeditionsCompleted,0);assert.equal(w.expeditionsFailed,0);
 assert.equal(startWarExpedition(s),false);w.act='throne';stepWarExpedition(s,8);
 assert.equal(w.expedition.sortieId,'foundry');assert.ok(skipWarSortie(s));stepWarExpedition(s,8);
 assert.equal(w.expedition.sortieId,'bellkeepers');w.victory='enemy';assert.equal(skipWarSortie(s),false);
 const other=makeWar(4);startWarExpedition(other);assert.equal(skipWarSortie(other),false);
});


test('winning also bounds the Chronicle after both the field report and liberation entry',()=>{
 const s=makeWar();s.temporal.chronicleLog=Array.from({length:40},(_,i)=>`Entry ${i}`);
 finishOperation(s,true);assert.equal(s.temporal.chronicleLog.length,40);
 assert.ok(s.temporal.chronicleLog.some(x=>x.startsWith('Eleven Bells extracted.')));
 assert.ok(s.temporal.chronicleLog.at(-1).startsWith('Liberated '));
});
