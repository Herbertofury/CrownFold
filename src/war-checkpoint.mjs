// Optional extension to the existing v1 frontier save. A damaged/unsupported war
// checkpoint never prevents recovery of the independently stored frontier fields.
import {WAR_CAMPAIGNS,BATTALIONS,WAR_BUILDINGS,WAR_STANCES,WAR_SUPPORT,WAR_EXPEDITIONS,BELL_SIEGE_SORTIES} from './war.mjs';
import {validEra} from './temporal.mjs';
import {validateObjectiveCheckpoint} from './war-objectives.mjs';
const VERSION=1,MAX_BYTES=1024*1024;
const FIELDS=['seed','era','time','weather','player','squad','buildings','enemies','hostileShots','projectiles','drones','pickups','operation','war','nextId','spawnTimer','threat','lastZonePos'];
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const number=v=>Number.isFinite(v)&&Math.abs(v)<=1e12;
const nums=(v,keys)=>object(v)&&keys.split(' ').every(k=>number(v[k]));
const point=v=>nums(v,'x z');
const array=(v,max,predicate)=>Array.isArray(v)&&v.length<=max&&v.every(predicate);
const numbers=v=>object(v)&&Object.values(v).every(number);
const owns=(map,key)=>typeof key==='string'&&Object.hasOwn(map,key);
const order=v=>['move','follow','defend','assault'].includes(v);
const health=v=>point(v)&&nums(v,'hp maxHp')&&v.maxHp>0&&v.hp>=0&&v.hp<=v.maxHp;
// Detect accidental truncation/corruption, not an anti-cheat/security signature.
function checksum(text){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0).toString(16).padStart(8,'0');}
function boundedTree(value){let budget=50000;
 function visit(v,depth){
  if(--budget<0||depth>16)return false;
  if(v===null||typeof v==='boolean')return true;
  if(typeof v==='number')return number(v);
  if(typeof v==='string')return v.length<=2000;
  if(Array.isArray(v))return v.length<=4096&&v.every(x=>visit(x,depth+1));
  return object(v)&&Object.keys(v).length<=128&&Object.entries(v).every(([k,x])=>!['__proto__','constructor','prototype'].includes(k)&&visit(x,depth+1));
 }
 return visit(value,0);
}
const group=(g,side)=>point(g)&&nums(g,'id tx tz count maxCount hp range attackCooldown morale')&&
 Number.isSafeInteger(g.id)&&owns(BATTALIONS,g.type)&&g.side===side&&validEra(g.era)&&order(g.order)&&owns(WAR_STANCES,g.stance)&&
 Number.isInteger(g.count)&&g.count>=0&&g.count<=g.maxCount&&g.maxCount===BATTALIONS[g.type].count&&g.hp>=0&&(g.count===0||g.hp>0)&&g.hp<=BATTALIONS[g.type].hp&&
 nums(g.buffs,'ward rush hush')&&(!g.navPath||array(g.navPath,256,point))&&(!g.navGoal||point(g.navGoal));
function validPayload(c){
 if(!boundedTree(c)||!nums(c,'seed time nextId spawnTimer threat')||!validEra(c.era)||!['clear','rain','storm'].includes(c.weather)||!point(c.lastZonePos)||!Number.isSafeInteger(c.nextId))return false;
 const p=c.player,w=c.war,op=c.operation,campaign=WAR_CAMPAIGNS[op?.contract-3];
 if(!campaign||op.kind!=='war'||op.completed!==false||op.stage!==0||!array(op.pylons,0,point)||!nums(op,'id timeLeft timeElapsed difficulty')||op.timeLeft<=0||op.timeLeft>2160||op.timeElapsed<0||op.difficulty!==campaign.difficulty||!array(op.objectives,1,point)||op.objectives.length!==1)return false;
 if(!w||w.campaign!==campaign.id||w.era!==campaign.era||c.era!==campaign.era||!validEra(w.enemyEra)||!validateObjectiveCheckpoint(w)||w.victory!==null)return false;
 if(!health(w.base)||!health(w.enemyBase)||w.base.hp<=0||!nums(w,'supplies income popCap population enemyWaveTimer enemySupplies enemyIncome enemyExhaustion enemyWaves elapsed coverRevision riftSurgeNext riftSurgeIndex expeditionNext expeditionIndex expeditionsCompleted expeditionsFailed'))return false;
 if(!nums(w.extraction,'x z nextWave waves')||typeof w.extraction.contested!=='boolean'||!numbers(w.powerCooldowns)||!numbers(w.supportCooldowns))return false;
 if(!array(w.cover,1024,v=>health(v)&&nums(v,'radius')&&v.radius>=0&&typeof v.id==='string'))return false;
 if(!array(w.anchors,2,v=>health(v)&&typeof v.name==='string')||w.anchors.length!==2||!array(w.nodes,3,v=>point(v)&&number(v.progress)&&['neutral','ally','enemy'].includes(v.owner))||w.nodes.length!==3)return false;
 if(!array(w.army,256,v=>group(v,'ally'))||!array(w.enemyArmy,256,v=>group(v,'enemy'))||!array(w.buildings,15,v=>point(v)&&number(v.hp)&&owns(WAR_BUILDINGS,v.kind)))return false;
 if(!array(w.queue,256,v=>owns(BATTALIONS,v.type)&&number(v.remaining))||!array(w.supportDrops,16,v=>point(v)&&number(v.remaining)&&owns(WAR_SUPPORT,v.id)&&(v.id!=='timefall_pod'||owns(BATTALIONS,v.unit))))return false;
 if(!array(w.events,8,v=>typeof v==='string')||!array(w.selectedBattalionIds,256,Number.isSafeInteger)||!(w.selectedBattalionId===null||Number.isSafeInteger(w.selectedBattalionId))||!object(w.controlGroups)||!Object.entries(w.controlGroups).every(([k,v])=>['1','2','3','4','5'].includes(k)&&array(v,256,Number.isSafeInteger)))return false;
 const ids=[...w.army,...w.enemyArmy].map(g=>g.id);if(new Set(ids).size!==ids.length||ids.some(id=>id>c.nextId))return false;
 if(w.bellSiege){if(w.campaign!=='siege_of_bells'||!object(w.bellSiege.outcomes)||!BELL_SIEGE_SORTIES.every(q=>['pending','active','success','failed','skipped','missed'].includes(w.bellSiege.outcomes[q.id])))return false;}
 else if(w.campaign==='siege_of_bells')return false;
 if(w.expedition!==null){const e=w.expedition;if(!nums(e,'id x z originX originZ timeLeft progress hp maxHp')||!owns(WAR_EXPEDITIONS,e.type)||e.sortieId&&!BELL_SIEGE_SORTIES.some(q=>q.id===e.sortieId))return false;}
 if(!nums(p,'x y z vy yaw pitch hp maxHp shield maxShield shieldDelay stamina hunger thirst level xp kills shots hit weakHits roll reload fireCooldown grenades foldCooldown echoCooldown orbitalCooldown resupplyCooldown invulnerable')||p.hp<=0||!numbers(p.ammo)||!numbers(p.reserve)||!['rifle','scatter','rail','smg','cryo','launcher'].includes(p.weapon)||!array(p.memories,128,v=>nums(v,'at x z hp shield')))return false;
 if(!['rifle','scatter','rail','smg','cryo','launcher'].every(k=>number(p.ammo[k])&&number(p.reserve[k])))return false;
 if(!array(c.squad,16,v=>nums(v,'id x y z hp maxHp tx tz cooldown')&&v.hp>0&&order(v.order)))return false;
 if(!array(c.buildings,4096,v=>health(v)&&nums(v,'id y cooldown')&&['frontier','operation'].includes(v.zone)&&['turret','beacon','shelter','barricade','greenhouse','refinery','bastion'].includes(v.kind)))return false;
 if(!array(c.enemies,256,v=>health(v)&&nums(v,'id y cooldown')&&['crawler','raider','warden','artillery','factory','titan','specter','corruptor','oracle'].includes(v.kind)))return false;
 if(!array(c.projectiles,256,v=>nums(v,'x y z tx tz ttl total')&&v.total>0&&['orbital','grenade'].includes(v.kind)))return false;
 if(!array(c.hostileShots,256,v=>nums(v,'id x y z tx tz remaining radius damage')))return false;
 if(!array(c.drones,64,v=>nums(v,'id x z expires cooldown')))return false;
 if(!array(c.pickups,4096,v=>nums(v,'id x y z amount at')&&['cache','relic','scrap'].includes(v.kind)))return false;
 return nums(c.status,'cloak rally')&&numbers(c.abilityCooldowns);
}
export function makeWarCheckpoint(s){
 if(s.zone!=='operation'||!s.war||s.operation?.kind!=='war')return null;
 const data=Object.fromEntries(FIELDS.map(k=>[k,s[k]]));
 data.status=s.rpg.status;data.abilityCooldowns=s.rpg.abilityCooldowns;
 const payload=JSON.stringify(data);
 if(payload.length>MAX_BYTES||!validPayload(JSON.parse(payload)))throw new Error('War checkpoint is not safely serializable');
 return {version:VERSION,checksum:checksum(payload),payload};
}
export function restoreWarCheckpoint(s,checkpoint){
 try{
  if(!checkpoint||checkpoint.version!==VERSION||typeof checkpoint.payload!=='string'||checkpoint.payload.length>MAX_BYTES||checkpoint.checksum!==checksum(checkpoint.payload))return false;
  const data=JSON.parse(checkpoint.payload);if(!validPayload(data))return false;
  // All validation completes before touching the recoverable frontier state.
  for(const key of FIELDS)s[key]=data[key];
  s.rpg.status=data.status;s.rpg.abilityCooldowns=data.abilityCooldowns;
  s.zone='operation';s.effects=[];s.messages=[];s.lastEvent=0;
  return true;
 }catch{return false;}
}
