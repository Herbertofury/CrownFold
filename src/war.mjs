// CROWNFOLD v0.5 — an accountable RTS simulation for the browser vertical slice.
// Every era can field every battalion. Cost, logistics, stance, lost sciences and terrain win wars;
// date of origin does not confer power. The native AAA production will use entity-level battle simulation.
import {ERAS,ERA_ORDER,battleAffinity,facetAt,stampFacet,temporalModifier} from './temporal.mjs';
import {WAR_POWERS,COMMANDER_HERITAGES,equippedTech,lineageModifiers,lineageEconomy,lineageTrainingFactor,lineageCooldownFactor} from './lineage.mjs';
import {makeBattlefieldCover,warPath,firstCoverBetween} from './battlefield.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const WAR_STANCES=Object.freeze({
 balanced:{name:'BALANCED',description:'No drawbacks. Formations adapt to threats and objectives.',damage:1,defense:1,speed:1},
 bulwark:{name:'BULWARK',description:'Take 18% less damage but move 22% slower and deal 8% less.',damage:.92,defense:.82,speed:.78},
 skirmish:{name:'SKIRMISH',description:'Move 22% faster and strike from flanks, but take 12% extra damage.',damage:1,defense:1.12,speed:1.22},
 charge:{name:'CHARGE',description:'Deal 20% more damage and move 10% faster, but take 18% more.',damage:1.20,defense:1.18,speed:1.10}
});
export const BATTALIONS=Object.freeze({
 pikemen:{name:'PIKE WALL',era:'medieval',cost:38,count:12,hp:75,damage:8,range:5,speed:4.7,training:6,building:'barracks',description:'Disciplined analog shields and long pikes. Cheap enough to hold the line.'},
 longbow:{name:'LONGBOW CIRCLE',era:'medieval',cost:52,count:9,hp:53,damage:8,range:33,speed:4.0,training:8,building:'barracks',description:'Analog precision without an exploitable signal.'},
 riders:{name:'THUNDER CAVALRY',era:'medieval',cost:78,count:8,hp:115,damage:13,range:5.5,speed:10,training:11,building:'barracks',description:'Fast shock charges, defeated by good prepared formations.'},
 hunters:{name:'ROOTBOUND HUNTERS',era:'primeval',cost:56,count:10,hp:63,damage:8.5,range:26,speed:6,training:8,building:'barracks',description:'Unpredictable living-path tactics counter blind prediction.'},
 clockguard:{name:'CLOCKWORK GUARD',era:'steam',cost:78,count:8,hp:125,damage:12,range:23,speed:3.5,training:10,building:'foundry',description:'Armored gear soldiers with no wireless dependency.'},
 cannons:{name:'COAL SIEGE TRAIN',era:'steam',cost:140,count:3,hp:180,damage:31,range:49,speed:2.6,training:18,building:'foundry',description:'Slow, powerful siege engines; vulnerable to fast cavalry.'},
 signalers:{name:'SIGNAL RANGERS',era:'neon',cost:89,count:9,hp:70,damage:14,range:35,speed:6.5,training:12,building:'foundry',description:'Mobile network-age troops with reliable mid-range firepower.'},
 synths:{name:'ORACLE SYNTHS',era:'farfuture',cost:120,count:6,hp:135,damage:20,range:32,speed:6.2,training:16,building:'foundry',description:'Predictive machines vulnerable to non-computable human feints.'},
 // Alternate branches of history invented technologies which no contemporary archive preserved.
 chordwrights:{name:'CHORDWRIGHT TEMPLARS',era:'medieval',cost:110,count:7,hp:155,damage:15,range:21,speed:3.9,training:15,building:'foundry',description:'Cathedral harmonic projectors hold coherent shields without microchips.'},
 murmur:{name:'MURMURATION SEERS',era:'primeval',cost:106,count:7,hp:84,damage:16,range:31,speed:6.1,training:14,building:'foundry',description:'Biological probability computers: ancient ultra-tech grown in flocks.'},
 clockseers:{name:'ESCAPEMENT ORACLES',era:'steam',cost:109,count:6,hp:104,damage:17,range:32,speed:5.4,training:14,building:'foundry',description:'Mechanical computers that predict combat without digital networks.'},
 nullcouriers:{name:'NULL COURIERS',era:'neon',cost:72,count:8,hp:71,damage:11,range:27,speed:9.3,training:10,building:'barracks',description:'Untraceable scout companies who combine old couriers with modern stealth.'},
 gravitics:{name:'GRAVITY SHEPHERDS',era:'farfuture',cost:132,count:5,hp:160,damage:23,range:22,speed:5.5,training:16,building:'foundry',description:'Mobile living-gravity fortifications, strong on objectives, slow to train.'}
});
export const WAR_BUILDINGS=Object.freeze({
 barracks:{name:'MUSTER HALL',cost:65,hp:850,description:'Trains infantry, archers, cavalry and couriers.'},
 foundry:{name:'TIME FORGE',cost:105,hp:630,description:'Trains lost-tech specialists, clockwork, artillery and future-era battalions.'},
 watchtower:{name:'CHRONAL WATCHTOWER',cost:75,hp:570,description:'Defends nearby battalions and slows enemy advances.'},
 sanctuary:{name:'MEMORY SANCTUARY',cost:125,hp:500,description:'Uses recovered time to heal nearby battalions and fortify the supply line.'}
});
// Counterplay is about military roles rather than a calendar or an arbitrary tech tier.
// The tables are deliberately compact and inspectable, so balance is testable.
export const WAR_COUNTERS=Object.freeze({
 pikemen:['riders','nullcouriers'],longbow:['pikemen','clockguard'],riders:['longbow','clockseers','cannons'],
 hunters:['synths','clockseers'],clockguard:['pikemen','riders'],cannons:['clockguard','gravitics'],
 signalers:['hunters','riders'],synths:['signalers','clockguard'],chordwrights:['cannons','synths'],
 murmur:['synths','signalers'],clockseers:['gravitics','chordwrights'],nullcouriers:['cannons','longbow'],
 gravitics:['riders','pikemen']
});
export const WAR_ENEMY_DOCTRINES=Object.freeze({
 pressure:{name:'IRON PRESSURE',description:'Heavy formations contest the center and launch periodic siege attacks.'},
 hunter:{name:'PREDICTIVE HUNT',description:'Counter-units hunt exposed battalions and raid uncaptured wells.'},
 raider:{name:'BLACKRAIL RAID',description:'Fast expeditionary detachments target your supply chain.'},
 bulwark:{name:'HARMONIC BULWARK',description:'Defenders fortify the inner approach while artillery forces you to push.'},
 relentless:{name:'UNWRITTEN SWARM',description:'Cheap unpredictable skirmishers pressure several objectives at once.'}
});
export const WAR_EXPEDITIONS=Object.freeze({
 salvage:{name:'RECOVER THE LIVING ARCHIVE',description:'Secure the lost science cache with your soldier or nearby battalions. Enemy troops can contest the dig.',reward:'SUPPLIES + INSIGHT'},
 spire:{name:'SILENCE THE CHRONAL SPIRE',description:'Destroy the temporal transmitter using weapons, artillery, or your mixed-era army. Enemy waves weaken after sabotage.',reward:'SUPPLIES + SLOWED ENEMY WAVES'},
 escort:{name:'ESCORT THE TIMELESS',description:'Escort displaced civilians to your keep. Soldiers can cover the convoy while you fight or command.',reward:'SUPPLIES + FUTURE FAVOR'}
});
export const WAR_CAMPAIGNS=Object.freeze([
 {id:'siege_of_bells',name:'THE SIEGE OF ELEVEN BELLS',era:'medieval',region:'The Crownless March',subtitle:'A keep obeys no century. Cut the siege line, occupy the three timewells, then dethrone the Bell Regent.',difficulty:1,mode:'war',enemyEra:'steam',enemyDoctrine:'pressure'},
 {id:'before_the_first_fire',name:'BEFORE THE FIRST FIRE',era:'primeval',region:'The First Garden',subtitle:'The ancient mind-palace faces an army of algorithms that cannot imagine the unwritten.',difficulty:2,mode:'war',enemyEra:'farfuture',enemyDoctrine:'hunter'},
 {id:'iron_parliament',name:'THE IRON PARLIAMENT',era:'steam',region:'The Gilded Engine',subtitle:'Seize the foundries before their mechanized ministers assemble an army across centuries.',difficulty:2,mode:'war',enemyEra:'neon',enemyDoctrine:'raider'},
 {id:'the_blackout_coup',name:'THE BLACKOUT COUP',era:'neon',region:'The Electric Republic',subtitle:'An army of cathedral harmonics undermines the grid. Rescue the city using both networks and steel.',difficulty:3,mode:'war',enemyEra:'medieval',enemyDoctrine:'bulwark'},
 {id:'the_unborn_palace',name:'THE UNBORN PALACE',era:'farfuture',region:'The Last Tomorrow',subtitle:'The Hollow Empress sees every future but one: an army guided by an unwritten past.',difficulty:4,mode:'war',enemyEra:'primeval',enemyDoctrine:'relentless'}
]);
// v0.7 Operations 2.0: a campaign is a four-act battle, not a base-health speedrun.
// Objectives are state driven: no arbitrary real-time lockout prevents skilled play.
export const WAR_ACTS=Object.freeze({
 foothold:{name:'I / THE BEACHHEAD',description:'Secure and hold any two timewells for 24 seconds. A supplied front unlocks the inner siege.'},
 anchors:{name:'II / BREAK THE LATTICE',description:'Destroy both Chronal Anchors with guns, artillery or your battalions to unseal the enemy citadel.'},
 throne:{name:'III / THE LAST CITADEL',description:'Breach the now-exposed Chronal Throne. Protect your own supply line while assaulting.'},
 extraction:{name:'IV / HOLD THE EXIT',description:'Reach the evacuation beacon with your soldier or battalions, call extraction, and defend the corridor.'}
});
export const WAR_SUPPORT=Object.freeze({
 epoch_lance:{name:'EPOCH LANCE',cost:105,cooldown:70,delay:3.5,description:'Target the selected battalion position or your forward aim. A delayed spacetime strike breaches structures and scatters enemies.'},
 timefall_pod:{name:'TIMEFALL DROP',cost:132,cooldown:85,delay:5.5,description:'Request a mixed-century reserve company at your position or selected battalion. Requires population capacity; no foundry needed.'}
});
const HERITAGE_RESERVES=Object.freeze({medieval:'longbow',primeval:'hunters',steam:'clockguard',neon:'signalers',farfuture:'synths'});
function pushEvent(w,text){w.events.push(text);if(w.events.length>8)w.events.shift();}
function makeGroup(s,type,side,x,z){const def=BATTALIONS[type],id=++s.nextId;return {id,type,side,era:def.era,x,z,tx:0,tz:side==='ally'?-62:30,order:side==='ally'?'defend':'assault',stance:'balanced',count:def.count,maxCount:def.count,hp:def.hp,range:def.range,attackCooldown:id%5/8,morale:100,buffs:{ward:0,rush:0,hush:0}};}
export function createWarfront(s,campaign){const enemyEra=campaign.enemyEra||'neon',friendlyEra=campaign.era||s.era||'medieval';
 const army=[makeGroup(s,'pikemen','ally',-5,7),makeGroup(s,'longbow','ally',9,5)];
 const choices=Object.keys(BATTALIONS).filter(id=>BATTALIONS[id].era===enemyEra);const enemyArmy=[makeGroup(s,choices[0]||'pikemen','enemy',0,-103)];
 return {campaign:campaign.id,era:friendlyEra,enemyEra,cover:makeBattlefieldCover(Math.max(0,WAR_CAMPAIGNS.findIndex(c=>c.id===campaign.id))),coverRevision:0,supplies:205,income:2.6,popCap:120,population:army.reduce((n,a)=>n+a.count,0),base:{x:0,z:16,hp:2500,maxHp:2500},enemyBase:{x:0,z:-150,hp:2900,maxHp:2900},anchors:[{id:'west',name:'WESTERN CHRONAL ANCHOR',x:-42,z:-114,hp:860,maxHp:860},{id:'east',name:'EASTERN CHRONAL ANCHOR',x:42,z:-116,hp:860,maxHp:860}],nodes:[{x:-72,z:-45,owner:'neutral',progress:0},{x:72,z:-48,owner:'neutral',progress:0},{x:1,z:-70,owner:'enemy',progress:0}],buildings:[{kind:'barracks',x:-13,z:14,hp:850}],queue:[],army,enemyArmy,enemyWaveTimer:27,enemyDoctrine:campaign.enemyDoctrine||'pressure',enemySupplies:220,enemyIncome:2.3,enemyExhaustion:0,enemyWaves:0,elapsed:0,events:[],victory:null,selectedBattalionIds:[],controlGroups:{},act:'foothold',footholdHold:0,footholdTarget:24,extraction:{x:0,z:-96,active:false,progress:0,target:36,contested:false,nextWave:9,waves:0},supportDrops:[],supportCooldowns:{},selectedBattalionId:null,powerCooldowns:{},riftSurgeNext:70,riftSurgeIndex:0,expedition:null,expeditionNext:24,expeditionIndex:0,expeditionsCompleted:0,expeditionsFailed:0};
}
export function trainBattalion(s,type){const w=s.war,def=BATTALIONS[type];if(!w||!def||w.victory||s.zone!=='operation')return false;
 if(w.population+def.count>w.popCap||!w.buildings.some(b=>b.kind===def.building)||w.supplies<def.cost)return false;
 w.supplies-=def.cost;w.population+=def.count;w.queue.push({type,remaining:def.training*lineageTrainingFactor(s)*(1-.04*(s.temporal?.skill.engineer||0)),side:'ally'});return true;
}
export function constructWarBuilding(s,kind){const w=s.war,def=WAR_BUILDINGS[kind];if(!w||!def||w.victory||s.zone!=='operation'||w.supplies<def.cost||w.buildings.length>=15)return false;
 const n=w.buildings.filter(b=>b.kind===kind).length;w.supplies-=def.cost;w.buildings.push({kind,x:s.player.x+(-1)**n*(12+n*6),z:s.player.z+8+(n%3)*6,hp:def.hp});pushEvent(w,`${def.name} CONSTRUCTED`);return true;
}
export function selectWarBattalion(s,id=null){const w=s?.war;if(!w)return false;if(id===null){w.selectedBattalionId=null;w.selectedBattalionIds=[];return true;}return selectWarBattalions(s,[id]);}
export function selectWarBattalions(s,ids,append=false){const w=s?.war;if(!w||!Array.isArray(ids))return false;
 const allowed=new Set(w.army.filter(g=>g.count>0).map(g=>g.id));
 const next=[...(append?w.selectedBattalionIds||[]:[]),...ids].filter((id,i,all)=>allowed.has(id)&&all.indexOf(id)===i);
 if(!next.length)return false;w.selectedBattalionIds=next;w.selectedBattalionId=next.length===1?next[0]:null;return true;
}
export function setWarControlGroup(s,index){const w=s?.war;if(!w||!Number.isInteger(index)||index<1||index>5)return false;
 const selected=selectedGroups(w).filter(g=>g.count>0).map(g=>g.id);if(!selected.length)return false;
 w.controlGroups[index]=selected;pushEvent(w,`CONTROL GROUP ${index} / ${selected.length} FORMATIONS SAVED`);return true;
}
export function recallWarControlGroup(s,index){const w=s?.war;if(!w||!Number.isInteger(index)||index<1||index>5)return false;
 return selectWarBattalions(s,w.controlGroups[index]||[],false);
}
function selectedGroups(w){return w.selectedBattalionIds?.length?w.army.filter(g=>w.selectedBattalionIds.includes(g.id)):w.selectedBattalionId===null?w.army:w.army.filter(g=>g.id===w.selectedBattalionId);}
export function setWarStance(s,stance){const w=s.war;if(!w||!WAR_STANCES[stance]||w.victory)return false;const groups=selectedGroups(w);if(!groups.length)return false;for(const g of groups)g.stance=stance;pushEvent(w,`${WAR_STANCES[stance].name} STANCE / ${groups.length} BATTALION${groups.length===1?'':'S'}`);return true;}
export function warOrder(s,order,x,z){const w=s.war;if(!w||w.victory||!['follow','move','defend','assault'].includes(order))return false;const groups=selectedGroups(w);if(!groups.length)return false;
 for(const b of groups){b.order=order;b.tx=Number.isFinite(x)?x:s.player.x;b.tz=Number.isFinite(z)?z:s.player.z;b.navPath=[];b.navRepathAt=0;}
 pushEvent(w,`${order.toUpperCase()} ORDER / ${groups.length} FORMATION${groups.length===1?'':'S'}`);return true;
}
export function warCastPower(s,id){const w=s.war,power=WAR_POWERS[id];if(!w||!power||w.victory||s.zone!=='operation'||!equippedTech(s,power.unlock))return false;
 if((w.powerCooldowns[id]||0)>0||w.supplies<power.cost)return false;
 const selected=selectedGroups(w),center=(w.selectedBattalionIds?.length||w.selectedBattalionId!==null)&&selected.length?selected[0]:s.player,near=(b,r=power.radius)=>distance(b,center)<=r;
 let count=0;
 if(id==='oathwall'){for(const g of w.army)if(g.count>0&&near(g)){g.buffs.ward=Math.max(g.buffs.ward,power.duration);g.hp=Math.min(BATTALIONS[g.type].hp,g.hp+17);count++;}}
 if(id==='flux_rush'){for(const g of w.army)if(g.count>0&&near(g)){g.buffs.rush=Math.max(g.buffs.rush,power.duration);count++;}}
 if(id==='hushfield'){for(const g of w.enemyArmy)if(g.count>0&&near(g)){g.buffs.hush=Math.max(g.buffs.hush,power.duration);count++;}}
 if(id==='gravity_root'){const n=w.nodes.filter(n=>n.owner!=='enemy'&&near(n,power.radius+8)).sort((a,b)=>distance(a,center)-distance(b,center))[0];if(n){n.progress=Math.min(12,n.progress+9);if(n.progress>=12){n.owner='ally';n.progress=0;}for(const g of w.army)if(near(g,22))g.buffs.ward=Math.max(g.buffs.ward,6);count++;}}
 if(count===0)return false;w.supplies-=power.cost;w.powerCooldowns[id]=power.cooldown*lineageCooldownFactor(s)*(1-.05*(s.temporal?.skill.oracle||0));pushEvent(w,`${power.name} DEPLOYED / ${count} AFFECTED`);return true;
}
export function warObjective(w){
 if(!w)return null;
 const act=WAR_ACTS[w.act]||WAR_ACTS.foothold;
 if(w.act==='foothold'){const held=w.nodes.filter(n=>n.owner==='ally').length;const target=w.nodes.find(n=>n.owner!=='ally')||w.nodes[1];return {act:w.act,name:act.name,description:act.description,progress:w.footholdHold,target:w.footholdTarget,x:target.x,z:target.z,detail:`${held}/2 REQUIRED WELLS / ${Math.ceil(w.footholdHold)}/${w.footholdTarget}s HOLD`};}
 if(w.act==='anchors'){const live=w.anchors.filter(a=>a.hp>0);const anchor=live[0]||w.enemyBase;return {act:w.act,name:act.name,description:act.description,progress:w.anchors.reduce((n,a)=>n+(a.maxHp-a.hp),0),target:w.anchors.reduce((n,a)=>n+a.maxHp,0),x:anchor.x,z:anchor.z,detail:`${live.length}/2 ANCHORS STANDING`};}
 if(w.act==='throne')return {act:w.act,name:act.name,description:act.description,progress:w.enemyBase.maxHp-w.enemyBase.hp,target:w.enemyBase.maxHp,x:w.enemyBase.x,z:w.enemyBase.z,detail:`THRONE ${Math.ceil(w.enemyBase.hp)} HP`};
 const ex=w.extraction;return {act:'extraction',name:act.name,description:act.description,progress:ex.progress,target:ex.target,x:ex.x,z:ex.z,detail:ex.active?`EVAC ${Math.ceil(ex.progress)}/${ex.target}s ${ex.contested?' / CONTESTED':''}`:'CALL EXTRACTION / E NEAR BEACON OR FROM COMMAND VIEW'};
}
export function canSignalWarExtraction(s){const w=s?.war;if(!w||w.victory||w.act!=='extraction'||w.extraction.active||s.zone!=='operation')return false;
 const site=w.extraction;return distance(s.player,site)<13||w.army.some(g=>g.count>0&&distance(g,site)<18);
}
export function signalWarExtraction(s){const w=s?.war;if(!canSignalWarExtraction(s))return false;
 w.extraction.active=true;w.extraction.nextWave=8;pushEvent(w,'EVACUATION SIGNAL LIT / HOLD THE TEMPORAL CORRIDOR');return true;
}
export function callWarSupport(s,id,x=null,z=null){const w=s?.war,spec=WAR_SUPPORT[id];if(!w||!spec||w.victory||s.zone!=='operation')return false;
 if(w.supplies<spec.cost||(w.supportCooldowns[id]||0)>0)return false;
 const selected=w.army.find(g=>g.id===(w.selectedBattalionIds?.[0]??w.selectedBattalionId)&&g.count>0);
 const aim=s.player.yaw||0,base=selected||s.player;
 const tx=Number.isFinite(x)?x:id==='epoch_lance'&&!selected?base.x+Math.sin(aim)*34:base.x;
 const tz=Number.isFinite(z)?z:id==='epoch_lance'&&!selected?base.z-Math.cos(aim)*34:base.z;
 if(!Number.isFinite(tx)||!Number.isFinite(tz)||distance({x:tx,z:tz},w.base)>230)return false;
 const reserve=HERITAGE_RESERVES[s.temporal?.lineage?.commanderEra]||'longbow';
 if(id==='timefall_pod'&&w.population+BATTALIONS[reserve].count>w.popCap)return false;
 w.supplies-=spec.cost;w.supportCooldowns[id]=spec.cooldown;
 w.supportDrops.push({id,x:tx,z:tz,remaining:spec.delay,unit:id==='timefall_pod'?reserve:null});
 if(id==='timefall_pod')w.population+=BATTALIONS[reserve].count;
 pushEvent(w,`${spec.name} INBOUND / ${Math.ceil(spec.delay)}s TO IMPACT`);return true;
}
function processWarSupport(s,dt){const w=s.war;
 for(const id of Object.keys(w.supportCooldowns))w.supportCooldowns[id]=Math.max(0,w.supportCooldowns[id]-dt);
 for(const drop of w.supportDrops){drop.remaining-=dt;if(drop.remaining>0)continue;
  if(drop.id==='epoch_lance'){
   warExplosion(s,drop.x,drop.z,480,17);
   s.effects.push({type:'explosion',x:drop.x,z:drop.z,at:s.time,radius:17});
   pushEvent(w,'EPOCH LANCE IMPACT / LOCAL TIMELINE FRACTURED');
  }else if(drop.id==='timefall_pod'){
   const g=makeGroup(s,drop.unit,'ally',drop.x,drop.z);g.order='defend';g.tx=drop.x;g.tz=drop.z;
   w.army.push(g);s.effects.push({type:'deploy',x:drop.x,z:drop.z,at:s.time});
   pushEvent(w,`TIMEFALL RESERVES LANDED / ${BATTALIONS[drop.unit].name}`);
  }
 }
 w.supportDrops=w.supportDrops.filter(d=>d.remaining>0);
}
function warExtractionWave(s){const w=s.war,ex=w.extraction;if(ex.waves>=3||w.enemyArmy.length>=22)return;
 const list=w.enemyDoctrine==='relentless'?['hunters','murmur']:w.enemyDoctrine==='raider'?['riders','nullcouriers']:['clockguard','longbow'];
 const type=list[ex.waves%list.length],def=BATTALIONS[type];if(w.enemySupplies<def.cost)return;
 w.enemySupplies-=def.cost;const side=ex.waves%2?-1:1;
 const g=makeGroup(s,type,'enemy',side*93,-116+ex.waves*14);g.order='move';g.tx=ex.x;g.tz=ex.z;g.stance='charge';w.enemyArmy.push(g);
 ex.waves++;pushEvent(w,`ENEMY REARGUARD / ${BATTALIONS[type].name} APPROACHING EVAC`);
}
function stepWarActs(s,dt){const w=s.war;if(w.base.hp<=0){w.victory='enemy';pushEvent(w,'YOUR CITADEL FELL / CAMPAIGN LOST');return;}
 if(w.act==='foothold'){
  const count=w.nodes.filter(n=>n.owner==='ally').length;
  w.footholdHold=clamp(w.footholdHold+(count>=2?dt:-dt*.7),0,w.footholdTarget);
  if(w.footholdHold>=w.footholdTarget){w.act='anchors';w.supplies=Math.min(900,w.supplies+65);pushEvent(w,'BEACHHEAD SECURED / +65 SUPPLIES / BREAK THE TWO ANCHORS');}
 }else if(w.act==='anchors'){
  if(!activeAnchors(w).length){w.act='throne';pushEvent(w,'THE CHRONAL SHIELD HAS FALLEN / ASSAULT THE THRONE');}
 }else if(w.act==='throne'){
  if(w.enemyBase.hp<=0){w.act='extraction';w.enemyWaveTimer=1e9;w.expedition=null;pushEvent(w,'THRONE DOWN / EXTRACT BEFORE THE RIFT COLLAPSES');}
 }else if(w.act==='extraction'){
  const ex=w.extraction;if(!ex.active)return;
  ex.nextWave-=dt;if(ex.nextWave<=0){warExtractionWave(s);ex.nextWave=12;}
  const allies=w.army.some(g=>g.count>0&&distance(g,ex)<17),player=distance(s.player,ex)<12;
  const enemy=w.enemyArmy.some(g=>g.count>0&&distance(g,ex)<19);
  ex.contested=enemy;
  ex.progress=clamp(ex.progress+(allies||player?enemy?-.6:1:-.2)*dt,0,ex.target);
  if(ex.progress>=ex.target){w.victory='ally';pushEvent(w,'EXTRACTION COMPLETE / WAR WON / YOUR COMPANY SURVIVED');}
 }
}
// Cover has physical durability, blocks lines of fire, and is shared between both armies.
// Losing it changes subsequent pathfinding, so siege weaponry can open new routes.
export function hitWarCover(w,cover,damage){
 if(!cover||cover.hp<=0||!Number.isFinite(damage)||damage<=0)return false;
 cover.hp=Math.max(0,cover.hp-damage);
 if(cover.hp===0){w.coverRevision=(w.coverRevision||0)+1;pushEvent(w,`${cover.id.toUpperCase()} BROKEN / A NEW ROUTE IS OPEN`);}
 return true;
}
export function routeWarGroup(w,g,target,now=0){
 const covers=w.cover||[],dest={x:target.x,z:target.z};
 const changed=!g.navGoal||distance(dest,g.navGoal)>9||g.navRevision!==(w.coverRevision||0);
 if(changed||now>=(g.navRepathAt||0)||!Array.isArray(g.navPath)){
  g.navPath=warPath(g,dest,covers);
  g.navGoal=dest;g.navRevision=w.coverRevision||0;g.navRepathAt=now+2.6+(g.id%7)*.17;
 }
 while(g.navPath?.length>1&&distance(g,g.navPath[0])<3.4)g.navPath.shift();
 return g.navPath?.[0]||dest;
}
function nearOwnedWell(w,group){return w.nodes.some(n=>n.owner===group.side&&distance(n,group)<22);}
export function warCounterBonus(attackerType,defenderType){
 if(!Object.hasOwn(BATTALIONS,attackerType)||!Object.hasOwn(BATTALIONS,defenderType))return 1;
 if(WAR_COUNTERS[attackerType]?.includes(defenderType))return 1.24;
 if(WAR_COUNTERS[defenderType]?.includes(attackerType))return .88;
 return 1;
}
function damageReduction(s,g){const stance=WAR_STANCES[g.stance]||WAR_STANCES.balanced;let multiplier=stance.defense;
 if(g.side==='ally'){
  multiplier*=lineageModifiers(s,g,null,{nearOwnedWell:nearOwnedWell(s.war,g)}).defense;
  if(s.temporal?.lineage?.commanderEra==='medieval'&&g.stance==='bulwark')multiplier*=.95;
 }
 if(g.buffs?.ward>0)multiplier*=.65;if(g.buffs?.rush>0)multiplier*=1.10;
 return clamp(multiplier,.40,1.55);
}
function hitGroup(s,group,rawDamage){if(group.count<=0||rawDamage<=0)return;let damage=Math.max(0,rawDamage)*damageReduction(s,group);const unitHp=BATTALIONS[group.type].hp;
 while(damage>=group.hp&&group.count>0){damage-=group.hp;group.count--;group.morale=clamp(group.morale-6,0,100);group.hp=group.count>0?unitHp:0;}
 if(group.count>0)group.hp=Math.max(.01,group.hp-damage);
}
function unitOffense(s,attacker,target,isBase=false){let mult=temporalModifier(s,attacker.era,target?.era||s.war.enemyEra,attacker.x,attacker.z);
 const stance=WAR_STANCES[attacker.stance]||WAR_STANCES.balanced;mult*=stance.damage;
 if(!isBase&&target?.type)mult*=warCounterBonus(attacker.type,target.type);
 // Morale is an attrition mechanic: winning by maneuver and supply disruption is viable.
 mult*=.78+clamp(attacker.morale,0,100)*.0022;
 if(attacker.buffs?.rush>0)mult*=1.12;if(attacker.buffs?.hush>0)mult*=.67;
 if(attacker.side==='ally')mult*=lineageModifiers(s,attacker,{isBase},null).offense;
 return clamp(mult,.50,2.10);
}
function activeAnchors(w){return w.anchors.filter(a=>a.hp>0);}
function hitAnchor(w,anchor,damage){if(!anchor||anchor.hp<=0||!Number.isFinite(damage)||damage<=0)return false;
 const was=anchor.hp;anchor.hp=Math.max(0,anchor.hp-damage);
 if(was>0&&anchor.hp===0){pushEvent(w,`${anchor.name} DESTROYED / THE CHRONAL SHIELD WEAKENS`);if(!activeAnchors(w).length)pushEvent(w,'BOTH ANCHORS DOWN / THE ENEMY THRONE IS EXPOSED');}
 return true;
}
function damageEnemyBase(w,damage){const ward=activeAnchors(w).length;
 w.enemyBase.hp=Math.max(w.act==='throne'||w.act==='extraction'?0:Math.ceil(w.enemyBase.maxHp*.45),w.enemyBase.hp-damage*(ward===2?.08:ward===1?.35:1));
}
function fire(s,attacker,targets,base,dt){if(attacker.count<=0)return;const def=BATTALIONS[attacker.type];attacker.attackCooldown=Math.max(0,attacker.attackCooldown-dt);if(attacker.attackCooldown>0)return;
 let target=null,d=Infinity;for(const g of targets){if(g.count<=0)continue;const gap=distance(attacker,g);if(gap<d){d=gap;target=g;}}
 if(target&&d<=def.range){
   const raw=def.damage*(.7+attacker.count*.15)*unitOffense(s,attacker,target);
   const cover=def.range>9?firstCoverBetween(attacker,target,s.war.cover||[],1):null;
   if(cover)hitWarCover(s.war,cover,raw*(attacker.type==='cannons'?2.1:1.05));
   else hitGroup(s,target,raw);
   attacker.attackCooldown=attacker.buffs.rush>0?1.07:1.2;
  }
 else {
  const anchor=attacker.side==='ally'?activeAnchors(s.war).filter(a=>distance(attacker,a)<def.range+6).sort((a,b)=>distance(attacker,a)-distance(attacker,b))[0]:null;
  const era=attacker.side==='ally'?s.war.enemyEra:s.war.era;const targetEra={era};const siegeBonus=attacker.type==='cannons'?1.35:1;
  const damage=def.damage*(.7+attacker.count*.16)*siegeBonus*unitOffense(s,attacker,targetEra,true);
  if(anchor){hitAnchor(s.war,anchor,damage);attacker.attackCooldown=1.2;}
  else if(base&&distance(attacker,base)<def.range+7){if(attacker.side==='ally')damageEnemyBase(s.war,damage);else base.hp=Math.max(0,base.hp-damage);attacker.attackCooldown=1.2;}
 }
}
function closestLiving(group,units){let result=null,best=Infinity;for(const e of units)if(e.count>0){const d=distance(group,e);if(d<best){best=d;result=e;}}return result;}
function updateGroup(s,g,enemies,base,dt){const w=s.war,def=BATTALIONS[g.type];if(g.count<=0)return;
 for(const id of ['ward','rush','hush'])g.buffs[id]=Math.max(0,(g.buffs[id]||0)-dt);
 const rallyPoint=g.side==='ally'?w.base:w.enemyBase,nearFriendly=nearOwnedWell(w,g)||distance(g,rallyPoint)<24;
 g.morale=clamp(g.morale+(nearFriendly?3.0:.25)*dt,0,100);
 if(g.morale<17)g.retreating=true;
 if(g.retreating&&g.morale>=58)g.retreating=false;
 let tx=g.tx,tz=g.tz;
 if(g.retreating){tx=rallyPoint.x;tz=rallyPoint.z;}
 else if(g.order==='follow'&&g.side==='ally'){tx=s.player.x;tz=s.player.z;}
 else if(g.order==='assault'){
  if(g.side==='enemy'){
   const special=w.expedition&&w.expedition.type!=='spire'&&distance(g,w.expedition)<80?w.expedition:null;
   const target= special || (w.enemyDoctrine==='raider'?w.nodes.find(n=>n.owner==='ally'):null)
    ||w.nodes.find(n=>n.owner==='ally'&&distance(g,n)<95)||w.nodes.find(n=>n.owner==='neutral'&&distance(g,n)<70)||w.base;
   tx=target.x;tz=target.z;
  }
  else{const enemy=closestLiving(g,enemies);const anchor=activeAnchors(w).sort((a,b)=>distance(g,a)-distance(g,b))[0];const objective=enemy||anchor||w.enemyBase;tx=objective.x;tz=objective.z;}
 }
 const d=Math.hypot(tx-g.x,tz-g.z);
 if(d>Math.max(2.5,def.range*.65)||(g.order==='move'&&d>2)){
  const nearby=enemies.some(e=>e.count>0&&distance(e,g)<def.range*.9);
  if(!nearby||g.order==='move'){
   const stance=WAR_STANCES[g.stance]||WAR_STANCES.balanced,trait=s.temporal?.lineage?.commanderEra==='neon'&&g.side==='ally'&&(g.stance==='skirmish'||g.order==='move')?1.06:1;
   const tech=g.side==='ally'?lineageModifiers(s,g,null,null).speed:1;const buff=g.buffs.rush>0?1.35:1;
   const speed=def.speed*stance.speed*trait*tech*buff;
   const waypoint=routeWarGroup(w,g,{x:tx,z:tz},w.elapsed),wd=Math.hypot(waypoint.x-g.x,waypoint.z-g.z);
   if(wd>.01){let vx=(waypoint.x-g.x)/wd,vz=(waypoint.z-g.z)/wd;
    // Light formation separation; the aggregate simulation still does not model individual soldiers.
    const friends=g.side==='ally'?w.army:w.enemyArmy;let sx=0,sz=0;
    for(const other of friends)if(other.id!==g.id&&other.count>0){const dx=g.x-other.x,dz=g.z-other.z,sep=Math.hypot(dx,dz);
      if(sep>.05&&sep<8){const push=(8-sep)/8;sx+=dx/sep*push;sz+=dz/sep*push;}}
    const mix=Math.hypot(sx,sz)>0?.27:0;vx+=sx*mix;vz+=sz*mix;
    const norm=Math.hypot(vx,vz)||1,step=Math.min(wd,speed*dt);g.x+=vx/norm*step;g.z+=vz/norm*step;
    if(wd<=3.4&&g.navPath?.length>1)g.navPath.shift();
   }
  }
 }
 if(!g.retreating||distance(g,rallyPoint)>26)fire(s,g,enemies,base,dt);
}
// Return the closest impact in the horizontal battlefield plane. Targets use the
// same footprints as the existing RTS shooter; the caller compares this distance
// with individual-enemy hits before applying damage.
export function traceWarShot(s,origin,yaw,range=95,vertical=null){
 const w=s.war;if(!w)return null;
 const dir={x:Math.sin(yaw),z:-Math.cos(yaw)};let best=null;
 const consider=(kind,target,radius,maxRange=range)=>{
  const dx=target.x-origin.x,dz=target.z-origin.z,t=dx*dir.x+dz*dir.z;
  const perpendicular=dx*dx+dz*dz-t*t,rr=radius*radius;
  if(perpendicular>rr)return;
  const half=Math.sqrt(Math.max(0,rr-perpendicular));
  if(t+half<0)return;
  let distance=Math.max(0,t-half),exit=t+half;
  if(vertical){
   // Intersect the ray with a finite-height gameplay volume at the local terrain.
   const ground=vertical.ground(target.x,target.z)-1;
   const height=kind==='cover'?(target.kind==='clockwork'?8:7):kind==='group'?4:kind==='anchor'?18:kind==='spire'?16:15;
   const rise=Math.tan(vertical.pitch),y=origin.y;
   if(Math.abs(rise)<1e-8){if(y<ground||y>ground+height)return;}
   else {const a=(ground-y)/rise,b=(ground+height-y)/rise;distance=Math.max(distance,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));}
  }
  if(distance>exit||distance>Math.min(range,maxRange)||(best&&distance>=best.distance))return;
  best={kind,target,distance};
 };
 for(const cover of w.cover||[])if(cover.hp>0)consider('cover',cover,cover.radius+.2);
 for(const enemy of w.enemyArmy)if(enemy.count>0)consider('group',enemy,3.8,90);
 for(const anchor of activeAnchors(w))consider('anchor',anchor,6,95);
 if(w.expedition?.type==='spire'&&w.expedition.hp>0)consider('spire',w.expedition,5,100);
 consider('base',w.enemyBase,11,92);
 return best;
}
export function applyWarShot(s,impact,damage){
 if(!impact||!s.war)return false;
 const w=s.war,t=impact.target;
 if(impact.kind==='cover')return hitWarCover(w,t,damage*(s.player.weapon==='launcher'?1.5:1));
 if(impact.kind==='group'){hitGroup(s,t,damage*1.6);return true;}
 if(impact.kind==='anchor')return hitAnchor(w,t,damage*1.1);
 if(impact.kind==='spire'){t.hp=Math.max(0,t.hp-damage);return true;}
 if(impact.kind==='base'){damageEnemyBase(w,damage*.9);return true;}
 return false;
}
export function shootWarBattalion(s,aim,damage){
 const p=s.player,impact=traceWarShot(s,p,aim?.yaw??p.yaw);
 return applyWarShot(s,impact,damage);
}
export function warExplosion(s,x,z,damage,radius){const w=s.war;if(!w)return;for(const cover of w.cover||[])if(cover.hp>0){const d=distance(cover,{x,z});if(d<radius+cover.radius)hitWarCover(w,cover,damage*Math.max(.2,1-d/(radius+cover.radius)));}for(const enemy of w.enemyArmy)if(enemy.count>0){const d=distance(enemy,{x,z});if(d<radius+3)hitGroup(s,enemy,damage*Math.max(.12,1-d/(radius+3)));}for(const anchor of activeAnchors(w))if(distance(anchor,{x,z})<radius+7)hitAnchor(w,anchor,damage*.65);if(distance(w.enemyBase,{x,z})<radius+10)damageEnemyBase(w,damage*.5);if(w.expedition?.type==='spire'&&distance(w.expedition,{x,z})<radius+6)w.expedition.hp=Math.max(0,w.expedition.hp-damage*.65);}

// Chrono-crises are optional short sorties inside the large 36-minute RTS war.
// They force the player to choose between advancing the front and helping people across time.
const EXPEDITION_SPOTS=Object.freeze([[-83,-84],[85,-102],[-21,-91],[68,-72],[-75,-128]]);
export function startWarExpedition(s,kind=null){const w=s?.war;if(!w||w.victory||s.zone!=='operation'||w.expedition)return false;
 const kinds=Object.keys(WAR_EXPEDITIONS),which=kind||kinds[w.expeditionIndex%kinds.length];if(!Object.hasOwn(WAR_EXPEDITIONS,which))return false;
 const [x,z]=EXPEDITION_SPOTS[(w.expeditionIndex+WAR_CAMPAIGNS.findIndex(c=>c.id===w.campaign)+EXPEDITION_SPOTS.length)%EXPEDITION_SPOTS.length];
 w.expeditionIndex++;w.expedition={id:w.expeditionIndex,type:which,x,z,originX:x,originZ:z,timeLeft:which==='escort'?150:125,progress:0,hp:which==='spire'?410:which==='escort'?320:1,maxHp:which==='spire'?410:which==='escort'?320:1};
 pushEvent(w,`OPTIONAL FRONTLINE CRISIS / ${WAR_EXPEDITIONS[which].name}`);return true;
}
function completeExpedition(s){const w=s.war,e=w.expedition;if(!e)return;
 w.supplies=Math.min(900,w.supplies+(e.type==='spire'?155:125));s.temporal.insight+=e.type==='salvage'?4:2;
 if(e.type==='spire'){w.enemyExhaustion=Math.max(w.enemyExhaustion,65);w.enemySupplies=Math.max(0,w.enemySupplies-75);}
 if(e.type==='escort'){for(const g of w.army){g.morale=Math.min(100,g.morale+22);g.hp=Math.min(BATTALIONS[g.type].hp,g.hp+15);}}
 w.expeditionsCompleted++;pushEvent(w,`CRISIS RESOLVED / ${WAR_EXPEDITIONS[e.type].name} / SUPPLIES RECOVERED`);w.expedition=null;w.expeditionNext=105;
}
function failExpedition(s){const w=s.war,e=w.expedition;if(!e)return;
 w.expeditionsFailed++;w.enemySupplies=Math.min(900,w.enemySupplies+60);
 pushEvent(w,`CRISIS LOST / ${WAR_EXPEDITIONS[e.type].name}`);w.expedition=null;w.expeditionNext=72;
}
export function stepWarExpedition(s,dt){const w=s?.war;if(!w||w.victory)return;
 if(!w.expedition){w.expeditionNext-=dt;if(w.expeditionNext<=0)startWarExpedition(s);return;}
 const e=w.expedition;e.timeLeft-=dt;const allies=w.army.filter(g=>g.count>0&&distance(g,e)<19);
 const enemies=w.enemyArmy.filter(g=>g.count>0&&distance(g,e)<19);
 const playerNear=distance(s.player,e)<12;
 if(e.type==='salvage'){
  if((allies.length||playerNear)&&!enemies.length)e.progress=Math.min(1,e.progress+dt*(.036+allies.length*.004));
  else if(enemies.length)e.progress=Math.max(0,e.progress-dt*.012);
 }else if(e.type==='spire'){
  if(allies.length)e.hp=Math.max(0,e.hp-dt*allies.reduce((total,g)=>total+1.9+Math.min(4,g.count*.32),0));
  e.progress=1-e.hp/e.maxHp;
 }else if(e.type==='escort'){
  if(enemies.length)e.hp=Math.max(0,e.hp-dt*enemies.length*(allies.length?2.5:6.5));
  if(allies.length||playerNear){const destination=w.base,d=distance(e,destination),movement=Math.min(d,dt*2.9);
   if(d>0){e.x+=(destination.x-e.x)/d*movement;e.z+=(destination.z-e.z)/d*movement;}
  }
  e.progress=clamp(1-distance(e,w.base)/Math.max(1,Math.hypot(e.originX-w.base.x,e.originZ-w.base.z)),0,1);
 }
 if(e.progress>=1 || (e.type==='spire'&&e.hp<=0)){completeExpedition(s);return;}
 if(e.timeLeft<=0||e.hp<=0)failExpedition(s);
}

// Finite, pressure-aware enemy logistics: capturing wells denies actual reinforcements.
export function chooseEnemyBattalion(s){const w=s.war;if(!w)return null;
 const living=w.army.filter(g=>g.count>0);if(!living.length)return Object.keys(BATTALIONS).find(id=>BATTALIONS[id].era===w.enemyEra);
 const priority=[...living].sort((a,b)=>((BATTALIONS[b.type].cost*b.count/BATTALIONS[b.type].count)-(BATTALIONS[a.type].cost*a.count/BATTALIONS[a.type].count)));
 const mostThreatening=priority[0],matching=Object.keys(BATTALIONS).filter(type=>WAR_COUNTERS[type].includes(mostThreatening.type));
 const native=Object.keys(BATTALIONS).filter(type=>BATTALIONS[type].era===w.enemyEra);
 const adaptive=w.enemyWaves%3!==0&&matching.length,choices=adaptive?matching:native;
 // Cheap fallback prevents the commander from stockpiling forever if its preferred counter is costly.
 const affordable=choices.filter(type=>BATTALIONS[type].cost<=w.enemySupplies);
 if(!affordable.length)return Object.keys(BATTALIONS).filter(type=>BATTALIONS[type].cost<=w.enemySupplies).sort((a,b)=>BATTALIONS[a].cost-BATTALIONS[b].cost)[0]||null;
 return affordable[(w.enemyWaves+priority.length)%affordable.length];
}
// Every ~70 seconds the chronal storm rotates a real 24m sector and changes its dominant era.
// This is deterministic: identical seeds and the same actions produce identical wars.
export function warRiftSurge(s){const w=s.war;if(!w||w.victory)return false;const index=w.riftSurgeIndex++,well=w.nodes[index%w.nodes.length],era=ERA_ORDER[(index+ERA_ORDER.indexOf(w.enemyEra)+2)%ERA_ORDER.length];
 const anchor={x:Math.round(well.x/24)*24,z:Math.round(well.z/24)*24},inSector=o=>Math.abs(o.x-anchor.x)<12&&Math.abs(o.z-anchor.z)<12;
 const rotate=o=>{const dx=o.x-anchor.x,dz=o.z-anchor.z;o.x=anchor.x-dz;o.z=anchor.z+dx;if(Number.isFinite(o.tx)&&Number.isFinite(o.tz)){const a=o.tx-anchor.x,b=o.tz-anchor.z;o.tx=anchor.x-b;o.tz=anchor.z+a;}};
 let moved=0;for(const g of [...w.army,...w.enemyArmy])if(g.count>0&&inSector(g)){rotate(g);g.navRepathAt=0;g.navPath=[];moved++;}for(const n of w.nodes)if(inSector(n)){rotate(n);moved++;}for(const a of activeAnchors(w))if(inSector(a)){rotate(a);moved++;}
 stampFacet(s,anchor.x,anchor.z,1,era);pushEvent(w,`RIFT STORM / ${ERAS[era].name} / ${moved} RELOCATED`);return true;
}
export function stepWarfront(s,dt){const w=s.war;if(!w||w.victory)return w?.victory||null;dt=clamp(dt,0,1);w.elapsed+=dt;w.enemyWaveTimer-=dt;w.riftSurgeNext-=dt;processWarSupport(s,dt);
 for(const id of Object.keys(w.powerCooldowns))w.powerCooldowns[id]=Math.max(0,w.powerCooldowns[id]-dt);
 const held=w.nodes.filter(n=>n.owner==='ally').length;w.income=(2.1+held*2.3+w.buildings.filter(b=>b.kind==='foundry').length*.18)*lineageEconomy(s)*(1+.07*(s.temporal?.skill.engineer||0));w.supplies=Math.min(900,w.supplies+w.income*dt);
 const enemyHeld=w.nodes.filter(n=>n.owner==='enemy').length;
 w.enemyIncome=w.act==='extraction'?0:(1.75+enemyHeld*2.25)*(1+.08*(s.operation?.difficulty||1));
 w.enemySupplies=Math.min(900,w.enemySupplies+w.enemyIncome*dt);
 w.enemyExhaustion=Math.max(0,w.enemyExhaustion-dt);
 for(const item of w.queue){item.remaining-=dt;if(item.remaining<=0){const i=w.buildings.find(b=>b.kind===BATTALIONS[item.type].building)||w.base;w.army.push(makeGroup(s,item.type,'ally',i.x+3,i.z-6));pushEvent(w,`${BATTALIONS[item.type].name} READY`);}}
 w.queue=w.queue.filter(q=>q.remaining>0);
 for(const group of w.army)updateGroup(s,group,w.enemyArmy,w.enemyBase,dt);
 for(const group of w.enemyArmy)updateGroup(s,group,w.army,w.base,dt);
 for(const node of w.nodes){const nearbyAllies=w.army.some(b=>b.count>0&&distance(b,node)<15)||distance(s.player,node)<10,nearbyEnemies=w.enemyArmy.some(b=>b.count>0&&distance(b,node)<15);
  const capTrait=s.temporal?.lineage?.commanderEra==='primeval'?1.18:1;
  if(nearbyAllies&&!nearbyEnemies){node.progress=clamp(node.progress+dt*capTrait,0,12);if(node.progress>=12&&node.owner!=='ally'){node.owner='ally';node.progress=0;pushEvent(w,'TIMEWELL SECURED / INCOME INCREASED');}}
  else if(nearbyEnemies&&!nearbyAllies){node.progress=clamp(node.progress-dt,-12,12);if(node.progress<=-12&&node.owner!=='enemy'){node.owner='enemy';node.progress=0;pushEvent(w,'TIMEWELL LOST / SUPPLY CUT');}}
  else node.progress*=.99;
 }
 w.army=w.army.filter(g=>g.count>0);w.enemyArmy=w.enemyArmy.filter(g=>g.count>0);
 w.selectedBattalionIds=(w.selectedBattalionIds||[]).filter(id=>w.army.some(g=>g.id===id));if(w.selectedBattalionIds.length===1)w.selectedBattalionId=w.selectedBattalionIds[0];else if(w.selectedBattalionIds.length!==1)w.selectedBattalionId=null;
 w.population=w.army.reduce((n,b)=>n+b.count,0)+w.queue.reduce((n,q)=>n+BATTALIONS[q.type].count,0)+w.supportDrops.filter(d=>d.id==='timefall_pod').reduce((n,d)=>n+BATTALIONS[d.unit].count,0);
 if(w.enemyWaveTimer<=0&&w.act!=='extraction'){const type=chooseEnemyBattalion(s);
  if(type&&w.enemyArmy.length<28){w.enemySupplies-=BATTALIONS[type].cost;
   const group=makeGroup(s,type,'enemy',w.enemyBase.x+(w.enemyArmy.length%3-1)*7,w.enemyBase.z+9);
   if(w.enemyDoctrine==='bulwark')group.stance='bulwark';else if(w.enemyDoctrine==='raider')group.stance='skirmish';else if(w.enemyDoctrine==='relentless')group.stance='charge';
   w.enemyArmy.push(group);w.enemyWaves++;pushEvent(w,`ENEMY ${WAR_ENEMY_DOCTRINES[w.enemyDoctrine]?.name||'COMMAND'} / ${BATTALIONS[type].name}`);
  }
  w.enemyWaveTimer=clamp((33-(s.operation?.difficulty||1)*2)+(w.enemyExhaustion>0?16:0),15,49);
 }
 stepWarExpedition(s,dt);
 for(const building of w.buildings){
  if(building.kind==='watchtower')for(const enemy of w.enemyArmy)if(enemy.count>0&&distance(building,enemy)<24)hitGroup(s,enemy,dt*10);
  if(building.kind==='sanctuary')for(const ally of w.army)if(ally.count>0&&distance(building,ally)<25)ally.hp=Math.min(BATTALIONS[ally.type].hp,ally.hp+dt*5);
 }
 if(w.riftSurgeNext<=0){warRiftSurge(s);w.riftSurgeNext=76;}
 stepWarActs(s,dt);
 return w.victory;
}
export function warSummary(w){if(!w)return null;const objective=warObjective(w);return {objective,act:w.act,extractionActive:w.extraction.active,supportDrops:w.supportDrops.map(d=>({id:d.id,seconds:Math.ceil(d.remaining)})),supportCooldowns:{...w.supportCooldowns},supplies:Math.floor(w.supplies),income:Math.round(w.income*10)/10,population:w.population,popCap:w.popCap,held:w.nodes.filter(n=>n.owner==='ally').length,alliedBattalions:w.army.length,enemyBattalions:w.enemyArmy.length,enemyBaseHp:Math.round(w.enemyBase.hp),baseHp:Math.round(w.base.hp),anchorsRemaining:activeAnchors(w).length,queue:w.queue.length,stormIn:Math.ceil(w.riftSurgeNext),selectedBattalionId:w.selectedBattalionId,selectedBattalionIds:[...(w.selectedBattalionIds||[])],enemyDoctrine:WAR_ENEMY_DOCTRINES[w.enemyDoctrine]?.name||'ADAPTIVE',enemySupplies:Math.floor(w.enemySupplies),coverRemaining:(w.cover||[]).filter(c=>c.hp>0).length,expedition:w.expedition?{kind:w.expedition.type,name:WAR_EXPEDITIONS[w.expedition.type]?.name,progress:Math.round(w.expedition.progress*100),seconds:Math.ceil(w.expedition.timeLeft)}:null,crisesResolved:w.expeditionsCompleted,crisesLost:w.expeditionsFailed};}
