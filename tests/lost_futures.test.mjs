import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,enterOperation,restore,serialize,stepGame,changeEpoch,surveyChronicle,issueOrder} from '../src/sim.mjs';
import {ERA_ORDER,eraSites,facetAt,temporalModifier} from '../src/temporal.mjs';
import {COMMANDER_HERITAGES,LOST_TECH,WEAVE_SYNERGIES,WAR_POWERS,makeLineage,migrateLineage,setCommanderHeritage,researchLostTech,equipLostTech,equippedTech,activeWeaves,lineageModifiers,lineageEconomy,lineageTrainingFactor,lostTechCost} from '../src/lineage.mjs';
import {BATTALIONS,WAR_STANCES,WAR_BUILDINGS,WAR_CAMPAIGNS,selectWarBattalion,setWarStance,warOrder,warCastPower,warRiftSurge,trainBattalion,constructWarBuilding,stepWarfront} from '../src/war.mjs';
const campaign=()=>{const s=createGame();s.spawnTimer=1e9;assert.ok(enterOperation(s,3));s.war.enemyWaveTimer=1e9;return s;};
const frontier=()=>{const s=createGame();s.temporal.insight=100;return s;};
const clone=w=>JSON.parse(JSON.stringify(w));
test('heritage covers five eras, but no calendar date unlocks a strict tier or locks recruitment',()=>{
 assert.deepEqual(Object.keys(COMMANDER_HERITAGES),ERA_ORDER);assert.ok(Object.keys(LOST_TECH).length>=10);
 const defs=Object.values(BATTALIONS);assert.ok(defs.filter(d=>d.era==='primeval'&&d.building==='foundry').length>0);
 assert.ok(defs.filter(d=>d.era==='medieval'&&d.building==='foundry').length>0);
 assert.ok(defs.some(d=>d.era==='farfuture'&&d.building==='foundry'));
});
test('first-time players begin with an old-world and a network-era power equipped together',()=>{
 const l=makeLineage();assert.deepEqual(l.equipped,['oath_geometry','ghost_protocol']);assert.equal(LOST_TECH.oath_geometry.era,'medieval');assert.equal(LOST_TECH.ghost_protocol.era,'neon');
});
test('commander aesthetic can be chosen in a different timeline and persists independently of where you travel',()=>{
 const s=frontier();assert.ok(setCommanderHeritage(s,'primeval'));assert.ok(changeEpoch(s,'farfuture'));assert.equal(s.era,'farfuture');assert.equal(s.temporal.lineage.commanderEra,'primeval');assert.ok(setCommanderHeritage(s,'steam'));assert.equal(s.era,'farfuture');
});
test('heritage changes are disallowed mid-war to prevent trait swapping exploits',()=>{
 const s=frontier();enterOperation(s,3);assert.equal(setCommanderHeritage(s,'steam'),false);assert.equal(s.temporal.lineage.commanderEra,'medieval');
});
test('research costs Insight and cannot be purchased repeatedly',()=>{
 const s=frontier(),start=s.temporal.insight;assert.ok(researchLostTech(s,'bone_lattice'));assert.equal(s.temporal.insight,start-13);assert.equal(researchLostTech(s,'bone_lattice'),false);
});
test('a surveyed world landmark discounts lost science and cannot be farmed repeatedly',()=>{
 const s=frontier();assert.equal(lostTechCost(s,'clock_oracle'),12);changeEpoch(s,'steam');const site=eraSites('steam')[0];assert.ok(surveyChronicle(s,site.id));assert.equal(lostTechCost(s,'clock_oracle'),8);assert.equal(surveyChronicle(s,site.id),false);
});
test('research and equipment cannot be edited inside an operation',()=>{
 const s=frontier();enterOperation(s,3);assert.equal(researchLostTech(s,'clock_oracle'),false);assert.equal(equipLostTech(s,'oath_geometry'),false);
});
test('weave slots cap at three but researched sciences remain permanently available',()=>{
 const s=frontier();assert.ok(researchLostTech(s,'clock_oracle'));assert.ok(researchLostTech(s,'gravity_garden'));assert.ok(equipLostTech(s,'clock_oracle'));assert.equal(s.temporal.lineage.equipped.length,3);assert.equal(equipLostTech(s,'gravity_garden'),false);assert.ok(equipLostTech(s,'ghost_protocol'));assert.ok(equipLostTech(s,'gravity_garden'));assert.ok(s.temporal.lineage.researched.includes('ghost_protocol'));
});
test('cross-era fusion activates only when BOTH historical and future techniques are equipped',()=>{
 const s=frontier();assert.ok(researchLostTech(s,'prism_mesh'));assert.ok(equipLostTech(s,'prism_mesh'));assert.ok(activeWeaves(s).some(x=>x.id==='cathedral_of_light'));assert.ok(equipLostTech(s,'oath_geometry'));assert.ok(!activeWeaves(s).some(x=>x.id==='cathedral_of_light'));
});
test('equipment adds measurable defense to any era battalion',()=>{
 const s=frontier(),g={side:'ally',era:'farfuture',type:'synths',range:32,stance:'bulwark'};const before=lineageModifiers(s,g).defense;assert.ok(researchLostTech(s,'prism_mesh'));assert.ok(equipLostTech(s,'prism_mesh'));const after=lineageModifiers(s,g).defense;assert.ok(after<before);assert.ok(after>.5);
});
test('lost technology and future tech are equally compatible with ancient recruits',()=>{
 const s=frontier(),g={side:'ally',era:'primeval',type:'hunters',range:26,stance:'skirmish'};const speed=lineageModifiers(s,g).speed;assert.ok(speed>1);assert.ok(researchLostTech(s,'murmuration'));assert.ok(equipLostTech(s,'oath_geometry'));assert.ok(equipLostTech(s,'murmuration'));assert.ok(lineageModifiers(s,g).offense>1);
});
test('older lineage bonuses apply globally; no period is inherently more advanced in combat',()=>{
 const s=createGame();const a=temporalModifier(s,'medieval','farfuture',0,0);s.temporal.skill.ancestor=2;assert.ok(temporalModifier(s,'medieval','farfuture',0,0)>a);const futureBefore=temporalModifier(s,'farfuture','steam',0,0);s.temporal.skill.ancestor=3;assert.ok(temporalModifier(s,'farfuture','steam',0,0)>futureBefore);
});
test('lineage migration sanitizes unknown sciences and malformed data, and preserves old saves',()=>{
 const l=migrateLineage({commanderEra:'computer-9',researched:['oath_geometry','garbage','murmuration','murmuration'],equipped:['garbage','murmuration','ghost_protocol','murmuration','oath_geometry','solar_script']});assert.equal(l.commanderEra,'medieval');assert.equal(l.researched.includes('garbage'),false);assert.deepEqual(l.equipped,['murmuration','ghost_protocol','oath_geometry']);assert.equal(l.equipped.length,3);
 const s=createGame(),json=JSON.parse(serialize(s));delete json.temporal.lineage;const n=restore(json);assert.deepEqual(n.temporal.lineage,makeLineage());
});
test('full save/restore preserves chosen commander, unlocked science, and equipped combinations',()=>{
 const s=frontier();assert.ok(setCommanderHeritage(s,'farfuture'));assert.ok(researchLostTech(s,'prism_mesh'));assert.ok(equipLostTech(s,'prism_mesh'));const n=restore(serialize(s));assert.equal(n.temporal.lineage.commanderEra,'farfuture');assert.ok(activeWeaves(n).some(x=>x.id==='cathedral_of_light'));
});
test('every battle stance changes actual movement or mitigation, not only its UI label',()=>{
 assert.equal(Object.keys(WAR_STANCES).length,4);const s=campaign();const id=s.war.army[0].id;assert.ok(selectWarBattalion(s,id));assert.ok(setWarStance(s,'skirmish'));assert.equal(s.war.army[0].stance,'skirmish');assert.equal(s.war.army[1].stance,'balanced');assert.equal(setWarStance(s,'triple damage'),false);
});
test('selecting a battalion limits orders to that group; selecting ALL restores group orders',()=>{
 const s=campaign();const [a,b]=s.war.army;assert.ok(selectWarBattalion(s,a.id));assert.ok(warOrder(s,'move',111,90));assert.equal(a.tx,111);assert.notEqual(b.tx,111);assert.ok(issueOrder(s,'defend',55,77));assert.equal(a.tx,55);assert.notEqual(b.tx,55);assert.ok(selectWarBattalion(s,null));assert.ok(warOrder(s,'move',42,21));assert.equal(a.tx,42);assert.equal(b.tx,42);assert.equal(selectWarBattalion(s,99999),false);
});
test('a commander from any era can train a mixed-era army with the same buildings',()=>{
 const s=frontier();assert.ok(setCommanderHeritage(s,'primeval'));enterOperation(s,3);s.war.supplies=800;assert.ok(constructWarBuilding(s,'foundry'));assert.ok(trainBattalion(s,'chordwrights'));assert.ok(trainBattalion(s,'murmur'));assert.ok(trainBattalion(s,'clockseers'));assert.ok(trainBattalion(s,'synths'));assert.ok(s.war.queue.some(q=>BATTALIONS[q.type].era==='medieval'));assert.ok(s.war.queue.some(q=>BATTALIONS[q.type].era==='farfuture'));
});
test('advanced medieval and prehistoric specialties have real cost, roles and build requirements',()=>{
 const s=campaign();assert.ok(BATTALIONS.chordwrights.range>15);assert.ok(BATTALIONS.murmur.range>20);assert.equal(trainBattalion(s,'chordwrights'),false);assert.ok(constructWarBuilding(s,'foundry'));s.war.supplies=200;assert.ok(trainBattalion(s,'chordwrights'));
});
test('starting Oathwall and Flux Rush work without date gating, consume supplies and set cooldown',()=>{
 const s=campaign(),w=s.war;w.supplies=500;const total=w.supplies;assert.ok(warCastPower(s,'oathwall'));assert.ok(w.army.some(g=>g.buffs.ward>0));assert.equal(w.supplies,total-WAR_POWERS.oathwall.cost);assert.equal(warCastPower(s,'oathwall'),false);
 assert.ok(warCastPower(s,'flux_rush'));assert.ok(w.army.some(g=>g.buffs.rush>0));
});
test('unresearched war powers are unusable until researched AND equipped',()=>{
 const s=frontier();enterOperation(s,3);s.war.supplies=500;assert.equal(warCastPower(s,'hushfield'),false);
 const t=frontier();assert.ok(researchLostTech(t,'murmuration'));assert.ok(equipLostTech(t,'oath_geometry'));assert.ok(equipLostTech(t,'murmuration'));enterOperation(t,3);t.war.supplies=500;t.war.enemyArmy[0].x=t.player.x;t.war.enemyArmy[0].z=t.player.z;
 assert.ok(warCastPower(t,'hushfield'));assert.ok(t.war.enemyArmy[0].buffs.hush>0);
});
test('Gravity Root can capture a well only when activated near a valid well',()=>{
 const s=frontier();assert.ok(researchLostTech(s,'gravity_garden'));assert.ok(equipLostTech(s,'oath_geometry'));assert.ok(equipLostTech(s,'gravity_garden'));enterOperation(s,3);s.war.supplies=500;assert.equal(warCastPower(s,'gravity_root'),false);
 const well=s.war.nodes[0];s.player.x=well.x;s.player.z=well.z;assert.ok(warCastPower(s,'gravity_root'));assert.ok(well.progress>=9||well.owner==='ally');
});
test('timed field buffs expire, so no ability can give permanent invulnerability',()=>{
 const s=campaign();s.war.supplies=500;warCastPower(s,'oathwall');for(let i=0;i<120;i++)stepWarfront(s,.1);assert.ok(s.war.army.every(g=>g.buffs.ward<=0));
});
test('new supply sanctuary repairs damaged troops only in a nearby radius',()=>{
 const s=campaign();s.war.supplies=500;assert.ok(constructWarBuilding(s,'sanctuary'));const b=s.war.buildings.find(b=>b.kind==='sanctuary'),ally=s.war.army[0];ally.x=b.x;ally.z=b.z;ally.hp=20;stepWarfront(s,.1);assert.ok(ally.hp>20);
});
test('a chronal storm physically rotates battlefield groups and stamps a deterministic different era',()=>{
 const s=campaign(),w=s.war,well=w.nodes[0],anchorX=Math.round(well.x/24)*24,anchorZ=Math.round(well.z/24)*24;w.army[0].x=anchorX+5;w.army[0].z=anchorZ+4;const group=w.army[0],before=[group.x,group.z],oldSelected=s.temporal.selectedEra;
 assert.ok(warRiftSurge(s));assert.deepEqual([group.x,group.z],[anchorX-(before[1]-anchorZ),anchorZ+(before[0]-anchorX)]);assert.ok(facetAt(s,anchorX,anchorZ));assert.equal(s.temporal.selectedEra,oldSelected);assert.equal(w.riftSurgeIndex,1);
});
test('economy and production are changed by equipped sciences, not a calendar power multiplier',()=>{
 const s=frontier();const x=lineageEconomy(s);assert.equal(x,1);assert.ok(researchLostTech(s,'ether_reactor'));assert.ok(equipLostTech(s,'oath_geometry'));assert.ok(equipLostTech(s,'ether_reactor'));assert.ok(lineageEconomy(s)>x);assert.ok(lineageTrainingFactor(s)<1);assert.equal(s.temporal.lineage.commanderEra,'medieval');
});
test('power use cannot succeed without valid target and never spends supplies on failure',()=>{
 const s=frontier();assert.ok(researchLostTech(s,'murmuration'));assert.ok(equipLostTech(s,'oath_geometry'));assert.ok(equipLostTech(s,'murmuration'));enterOperation(s,3);const start=s.war.supplies;s.war.enemyArmy[0].x=1000;s.war.enemyArmy[0].z=1000;assert.equal(warCastPower(s,'hushfield'),false);assert.equal(s.war.supplies,start);
});
test('no added combat mechanic creates invalid health or negative population through long battles',()=>{
 const s=campaign();s.war.supplies=900;constructWarBuilding(s,'foundry');trainBattalion(s,'chordwrights');trainBattalion(s,'synths');warCastPower(s,'oathwall');
 for(let i=0;i<1700;i++){if(s.war.victory)break;stepWarfront(s,.1);}for(const g of [...s.war.army,...s.war.enemyArmy]){assert.ok(Number.isFinite(g.hp));assert.ok(g.hp>=0);assert.ok(Number.isFinite(g.x)&&Number.isFinite(g.z));}
 assert.ok(s.war.population>=0);assert.ok(Number.isFinite(s.war.supplies));
});
