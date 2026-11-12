import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,serialize,restore,enterOperation,propsInChunk} from '../src/sim.mjs';
import {takeQuest,rpgEvent,turnInQuest,NPC_BY_ID,LANDMARKS} from '../src/rpg.mjs';
import {frontierGuidance,guidanceQuest,markerPlacement} from '../src/navigation.mjs';
const game=()=>createGame(12345);
const quest=id=>{const s=game();takeQuest(s,id);return s;};
test('first-time players are guided to Mira instead of a random era rift',()=>{
 const s=game(),before=serialize(s),g=frontierGuidance(s);assert.equal(g.goal.title,'MEET MIRA VALE');assert.equal(g.goal.x,NPC_BY_ID.mira.x);assert.equal(serialize(s),before);
});
test('harvesting guides only to real remaining resource props and advances after use',()=>{
 const s=quest('first_light'),g=frontierGuidance(s),prop=propsInChunk(Math.floor(g.goal.x/32),Math.floor(g.goal.z/32),s.seed).find(p=>p.x===g.goal.x&&p.z===g.goal.z);
 assert.equal(prop.resource,'fiber');s.harvested.push(prop.id);assert.notDeepEqual(frontierGuidance(s).goal,g.goal);
});
test('ready quests retain focus and point to their actual giver through reload',()=>{
 const s=quest('first_light');takeQuest(s,'iron_oath');s.rpg.tracked='first_light';rpgEvent(s,'harvest','fiber',8);
 const reloaded=restore(serialize(s));assert.equal(guidanceQuest(reloaded).id,'first_light');assert.match(frontierGuidance(reloaded).goal.title,/RETURN TO MIRA/);turnInQuest(reloaded,'first_light');assert.equal(guidanceQuest(reloaded).id,'iron_oath');
});
test('ready quests can be found even with a stale tracked value',()=>{
 const s=quest('first_light');rpgEvent(s,'harvest','fiber',8);s.rpg.tracked=null;assert.equal(guidanceQuest(s).id,'first_light');
});
test('quests guide through the right return rift in all non-medieval eras',()=>{
 const s=quest('the_glass_key');for(const era of ['primeval','steam','neon','farfuture']){s.era=era;assert.equal(frontierGuidance(s).goal.title,'RETURN / CROWNLESS MARCH');assert.equal(frontierGuidance(s).goal.z,24);}
});
test('discovery quests exclude already discovered places and respect named targets',()=>{
 const s=quest('scout_the_wild');let g=frontierGuidance(s);const first=LANDMARKS.find(l=>l.x===g.goal.x&&l.z===g.goal.z);assert.notEqual(first.id,'home');s.rpg.discovered.push(first.id);assert.notDeepEqual(frontierGuidance(s).goal,g.goal);takeQuest(s,'lost_ledger');assert.equal(frontierGuidance(s).goal.title,'THE GHOST CONVOY');
});
test('unique dungeon quests never send players to a previously counted vault',()=>{
 const s=quest('relic_hunter');s.rpg.quests.relic_hunter.unique=['glass'];assert.notEqual(frontierGuidance(s).goal.title,'THE MIRROR MAW');s.rpg.tracked='the_glass_key';takeQuest(s,'the_glass_key');assert.equal(frontierGuidance(s).goal.title,'THE MIRROR MAW');
});
test('cache quests exclude opened caches and never fall back to unrelated rifts',()=>{
 const s=quest('the_broker');s.rpg.opened=LANDMARKS.filter(l=>l.kind==='cache').map(l=>'world:'+l.id);assert.equal(frontierGuidance(s).goal,null);assert.match(frontierGuidance(s).hint,/dungeon/);
});
test('kill quests ignore dead and wrong-kind enemies and update moving targets',()=>{
 const s=quest('iron_oath');s.enemies=[{x:1,z:1,hp:0,kind:'raider'},{x:2,z:2,hp:20,kind:'warden'},{x:50,z:60,hp:20,kind:'raider'}];assert.equal(frontierGuidance(s).goal.x,50);s.enemies[2].x=70;assert.equal(frontierGuidance(s).goal.x,70);s.enemies=[];assert.equal(frontierGuidance(s).goal,null);
});
test('build and craft objectives give usable controls instead of fake coordinates',()=>{
 for(const [id,key]of [['field_engineer','B'],['winter_stores','I']]){const g=frontierGuidance(quest(id));assert.equal(g.goal,null);assert.match(g.hint,new RegExp('Press '+key));}
});
test('war and dungeon navigation are never replaced with a frontier quest',()=>{
 const s=quest('first_light');enterOperation(s,3);assert.equal(frontierGuidance(s),null);s.zone='dungeon';assert.equal(frontierGuidance(s),null);
});
test('visible targets retain projected placement',()=>{
 assert.deepEqual(markerPlacement({x:0,z:0,yaw:0},{x:0,z:-10},{x:450,y:350},1000,800),{x:450,y:350,icon:'◆',direction:'',offscreen:false});
});
test('behind-camera targets point behind rather than claiming to be straight ahead',()=>{
 const p=markerPlacement({x:0,z:0,yaw:0},{x:0,z:10},null,1000,800);assert.equal(p.direction,'BEHIND');assert.equal(p.icon,'↓');assert.ok(p.y>400);
});
test('camera-relative left and right follow yaw across the angle wrap',()=>{
 for(const yaw of [0,2*Math.PI,-2*Math.PI]){assert.equal(markerPlacement({x:0,z:0,yaw},{x:-10,z:0},null,1000,800).direction,'TURN LEFT');assert.equal(markerPlacement({x:0,z:0,yaw},{x:10,z:0},null,1000,800).direction,'TURN RIGHT');}
});
test('offscreen placement stays in safe bounds for small and wide screens',()=>{
 for(const [width,height]of [[520,640],[1440,1000],[320,240]])for(const project of [{x:-9000,y:200},{x:9000,y:-5000},{x:0,y:9000},null]){
  const p=markerPlacement({x:0,z:0,yaw:0},{x:0,z:50},project,width,height);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.x>=0&&p.x<=width);assert.ok(p.y>=0&&p.y<=height);assert.ok(p.offscreen);
 }
});
