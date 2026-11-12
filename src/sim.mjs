// CROWNFOLD: RIFTFRONT — original dependency-free survival / RTS / TPS simulation.
// All persistent gameplay state lives here; rendering, audio and input never own it.
import {makeRPG,generateBounty,restoreRPG,rpgStat,grantXP,rpgEvent,discoverNearby,markDiscovered,openChest,LANDMARKS,LOCKBOXES,NPCS,DUNGEON_BY_ID,DUNGEONS,perkRank} from './rpg.mjs';
import {ERA_ORDER,ERAS,CHRONICLE,availableRifts,eraSites,makeTemporal,migrateTemporal,epochSeed,validEra,cycleFacetEra,stampFacet,facetAt,temporalModifier} from './temporal.mjs';
import {WAR_CAMPAIGNS,createWarfront,trainBattalion,constructWarBuilding,warOrder,stepWarfront,warObjective,bellSiegeReport,signalWarExtraction,traceWarShot,applyWarShot,warExplosion} from './war.mjs';
export const SEED = 0xC0F01D;
export const TAU = Math.PI * 2;
export const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
export const dist = (a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const fmtTime = secs=>`${Math.floor(Math.max(0,secs)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,secs)%60).toString().padStart(2,'0')}`;
export const WEAPONS = Object.freeze({
  rifle:{name:'VANGUARD / M7',mag:36,rate:.105,damage:18,reserve:180,range:98,spread:.012,shots:1},
  scatter:{name:'BREACHER / 12',mag:8,rate:.72,damage:11,reserve:64,range:39,spread:.09,shots:8},
  rail:{name:'LANCER / ARC',mag:6,rate:.92,damage:104,reserve:30,range:165,spread:.003,shots:1},
  smg:{name:'GHOSTFIRE / SMG',mag:60,rate:.058,damage:11,reserve:300,range:73,spread:.026,shots:1},
  cryo:{name:'WINTERSONG / CRYO',mag:24,rate:.24,damage:33,reserve:120,range:88,spread:.009,shots:1},
  launcher:{name:'THUNDERMOUTH / RPG',mag:4,rate:1.15,damage:75,reserve:28,range:120,spread:.013,shots:1}
});
export const STRUCTURES = Object.freeze({
  turret:{label:'AUTOGUN TURRET',scrap:24,ore:6,description:'Automated defense / 24m radius',hp:160},
  beacon:{label:'COMMAND BEACON',scrap:28,ore:10,description:'Generates flux and supplies squad',hp:220},
  shelter:{label:'FIELD SHELTER',scrap:12,fiber:9,description:'Regenerates nearby health and stamina',hp:140},
  barricade:{label:'COVER WALL',scrap:7,ore:2,description:'Deployable protective barricade',hp:240},
  greenhouse:{label:'GREENHOUSE DOME',scrap:18,fiber:15,ore:9,description:'Grow fresh rations near your settlement',hp:170},
  refinery:{label:'SCRAP REFINERY',scrap:26,ore:18,description:'Slowly convert mineral wealth into fresh scrap',hp:190},
  bastion:{label:'AEGIS BASTION',scrap:38,ore:22,flux:16,description:'Shield and empower nearby troops',hp:310}
});
export const ENEMIES = Object.freeze({
  crawler:{hp:47,speed:7.2,damage:9,radius:.85,range:1.9,reward:4,color:[.95,.34,.27]},
  raider:{hp:93,speed:4.3,damage:7,radius:.88,range:18,reward:7,color:[1,.58,.35]},
  warden:{hp:240,speed:2.5,damage:16,radius:1.5,range:20,reward:16,color:[.84,.42,.96]},
  artillery:{hp:135,speed:2.0,damage:16,radius:1.25,range:38,reward:13,color:[.9,.28,.50]},
  factory:{hp:310,speed:0,damage:0,radius:3.8,range:0,reward:35,color:[1,.23,.33]},
  titan:{hp:1650,speed:2.2,damage:22,radius:4.1,range:32,reward:200,color:[1,.65,.22]},
  specter:{hp:78,speed:7.4,damage:12,radius:.95,range:2.0,reward:10,color:[.55,.83,1]},
  corruptor:{hp:192,speed:3.0,damage:14,radius:1.3,range:25,reward:19,color:[.35,.97,.72]},
  oracle:{hp:520,speed:3.8,damage:24,radius:2.0,range:34,reward:85,color:[.86,.46,1]}
});
export const CONTRACTS = Object.freeze([
  {title:'GLASSFALL INCURSION',region:'The Ash Choir',biome:'wastes',subtitle:'Cut the manufactories. Silence the walking cathedral.',difficulty:2},
  {title:'THE SUNKEN SIGNAL',region:'Lumen Grave',biome:'marsh',subtitle:'Recover a living beacon from an enemy warfront.',difficulty:1},
  {title:'OPERATION THUNDERROOT',region:'The Verdant Scar',biome:'forest',subtitle:'Reclaim the signal lattice beneath a ruptured world.',difficulty:3},
  ...WAR_CAMPAIGNS.map(x=>({title:x.name,region:x.region,subtitle:x.subtitle,difficulty:x.difficulty,era:x.era,mode:'war',enemyEra:x.enemyEra,id:x.id}))
]);
export function hash(x,z,seed=SEED){let n=(Math.imul(x|0,374761393)+Math.imul(z|0,668265263)+Math.imul(seed|0,1442695041))|0;n=Math.imul(n^(n>>>13),1274126177);n^=n>>>16;return (n>>>0)/4294967296;}
const smooth=t=>t*t*(3-2*t);
function noise(x,z,seed=SEED){const ix=Math.floor(x),iz=Math.floor(z),fx=smooth(x-ix),fz=smooth(z-iz),a=hash(ix,iz,seed),b=hash(ix+1,iz,seed),c=hash(ix,iz+1,seed),d=hash(ix+1,iz+1,seed);return (a+(b-a)*fx)*(1-fz)+(c+(d-c)*fx)*fz;}
export function terrainHeight(x,z,seed=SEED,mode='frontier'){
  if(mode==='dungeon')return -5;
  const biome=mode==='operation'?.68:1;
  const warp=(noise(x*.006,z*.006,seed+123)-.5)*50;
  const n=(noise((x+warp)*.011,z*.011,seed)-.5)*18 + (noise(x*.034,(z-warp)*.034,seed+1)-.5)*6.2 + (noise(x*.11,z*.11,seed+2)-.5)*1.4;
  let y=n*biome+Math.sin(x*.017+z*.009)*2.0;
  if(mode==='frontier')y-=(Math.max(0,1-Math.hypot(x,z)/45))*3.5;
  if(mode==='operation')y-=Math.max(0,1-Math.hypot(x,z)/25)*3;
  return y;
}
export function biomeAt(x,z,seed=SEED,mode='frontier'){
  if(mode==='dungeon')return 'underworld';
  if(mode==='operation')return 'ashen';
  const a=noise(x*.003+8,z*.003-4,seed+451),b=noise(x*.008,z*.008,seed+99);
  return a>.63?'bloom':a<.35?'wastes':b>.68?'marsh':'highlands';
}
export function propsInChunk(cx,cz,seed=SEED,mode='frontier'){
  const out=[],size=32,bias=mode==='operation'?1234:0;if(mode==='dungeon')return out;
  for(let i=0;i<11;i++){
    const u=hash(cx*53+i,cz*37+18,seed+bias),v=hash(cx*19+i*3,cz*41+9,seed+bias);
    const x=cx*size+3+u*26,z=cz*size+3+v*26;
    const b=biomeAt(x,z,seed,mode),r=hash(cx*31+i,cz*13,seed+bias+91);
    const type=mode==='operation'?(r<.28?'pylon':r<.62?'crystal':'rock'):
      b==='wastes'?(r<.24?'deadwood':r<.75?'rock':'crystal'):
      b==='marsh'?(r<.62?'tree':r<.84?'mushroom':'rock'):
      b==='bloom'?(r<.55?'tree':r<.81?'crystal':'flower'):(r<.65?'tree':r<.87?'rock':'flower');
    if(Math.hypot(x,z)<24 && mode==='frontier')continue;
    out.push({id:`${mode}:${cx}:${cz}:${i}`,x,z,y:terrainHeight(x,z,seed,mode),type,scale:.65+hash(cx+i*7,cz-i*3,seed+54)*1.25,resource: ['tree','deadwood'].includes(type)?'fiber':type==='rock'?'ore':type==='crystal'?'flux':type==='flower'?'ration':type==='mushroom'?'water':null});
  }
  return out;
}
export function makePlayer(){return {x:0,z:0,y:0,vy:0,yaw:0,pitch:-.075,hp:140,maxHp:140,shield:40,maxShield:40,shieldDelay:0,stamina:100,hunger:100,thirst:100,level:1,xp:0,kills:0,shots:0,hit:0,weakHits:0,roll:0,ammo:{rifle:36,scatter:8,rail:6,smg:60,cryo:24,launcher:4},reserve:{rifle:180,scatter:64,rail:30,smg:300,cryo:120,launcher:28},weapon:'rifle',reload:0,fireCooldown:0,grenades:4,foldCooldown:0,echoCooldown:0,orbitalCooldown:0,resupplyCooldown:0,invulnerable:0,memories:[],sprint:false,crouch:false};}
const initialSquad=()=>[
  {id:1,x:-2.5,z:2,y:0,hp:125,maxHp:125,role:'VANGUARD',order:'follow',tx:0,tz:0,cooldown:0},
  {id:2,x:2.5,z:2.5,y:0,hp:105,maxHp:105,role:'MEDIC',order:'follow',tx:0,tz:0,cooldown:0}
];
export function createGame(seed=SEED){
  const p=makePlayer();
  const world={version:1,seed,era:'medieval',temporal:makeTemporal(seed),war:null,zone:'frontier',time:0,dayTime:8.9*3600,weather:'clear',player:p,inventory:{scrap:72,ore:25,fiber:30,flux:90,ration:5,water:5,medkit:4,lockpicks:5},
    rpg:makeRPG(),dungeon:null,drones:[],squad:initialSquad(),buildings:[],enemies:[],hostileShots:[],projectiles:[],effects:[],messages:[],harvested:[],cleared:[],operation:null,stats:{missions:0,waves:0,builds:0,folds:0,echoes:0,death:0,explore:0},
    nextId:100,spawnTimer:3,autosaveAt:0,pickups:[],threat:0,lastZonePos:{x:0,z:0},lastEvent:0};generateBounty(world);return world;
}
function emit(s,text,type='info'){s.messages.push({id:++s.lastEvent,text,type,at:s.time});if(s.messages.length>12)s.messages.shift();}
function effect(s,type,x,z,extra={}){s.effects.push({type,x,z,at:s.time,...extra});if(s.effects.length>80)s.effects.shift();}
export function spawnEnemy(s,kind,x,z,extra={}){const def=ENEMIES[kind];if(!def)throw Error('Unknown enemy type');const enemy={id:++s.nextId,kind,era:s.era,x,z,y:terrainHeight(x,z,s.seed,s.zone),hp:def.hp*(1+(s.operation?.difficulty||0)*.12),maxHp:def.hp*(1+(s.operation?.difficulty||0)*.12),cooldown:hash(s.nextId,9,s.seed)*2,stagger:0,aggro:false,dead:false,...extra};s.enemies.push(enemy);return enemy;}
export function addBuilding(s,kind,x,z,free=false){const spec=STRUCTURES[kind];if(!spec||!Number.isFinite(x)||!Number.isFinite(z))return false;if(!free&&dist({x,z},s.player)>15)return false;if(!free){const mod=rpgStat(s,'discount');for(const [k,cost] of Object.entries(spec))if(typeof cost==='number'&&k in s.inventory&&(s.inventory[k]||0)<Math.ceil(cost*mod))return false;for(const [k,cost] of Object.entries(spec))if(typeof cost==='number'&&k in s.inventory)s.inventory[k]-=Math.ceil(cost*mod);}
  const hp=spec.hp*rpgStat(s,'buildingHp');const o={id:++s.nextId,kind,x,z,y:terrainHeight(x,z,s.seed,s.zone),hp,maxHp:hp,cooldown:0,zone:s.zone,era:s.era};s.buildings.push(o);s.stats.builds++;rpgEvent(s,'build',kind);emit(s,`${spec.label} deployed`,'success');effect(s,'deploy',x,z);return o;
}
export function recruit(s){if(s.inventory.scrap<22 || s.squad.length>=8){emit(s,'Need 22 scrap / squad cap 8');return false;}s.inventory.scrap-=22;const id=++s.nextId;const p=s.player;s.squad.push({id,x:p.x+3,z:p.z+2,y:0,hp:115,maxHp:115,role:id%3?'RANGER':'HEAVY',era:s.era,order:'follow',tx:p.x,tz:p.z,cooldown:0});emit(s,'Reinforcement joined your command','success');return true;}
export function issueOrder(s,order,x,z,unitId=null){if(!['follow','move','defend','assault'].includes(order))return false;let count=0;for(const unit of s.squad){if(s.war&&(s.war.selectedBattalionId!==null||s.war.selectedBattalionIds?.length)&&unitId===null)continue;if(unitId!==null&&unit.id!==unitId)continue;unit.order=order;unit.tx=Number.isFinite(x)?x:s.player.x;unit.tz=Number.isFinite(z)?z:s.player.z;count++;}if(s.war&&unitId===null){warOrder(s,order,x,z);count+=s.war.selectedBattalionIds?.length||s.war.army.length;}if(count)emit(s,`SQUAD ${order.toUpperCase()} / ${count} UNIT${count===1?'':'S'}`,'command');return !!count;}
export function reload(s){const p=s.player,w=WEAPONS[p.weapon];if(p.reload>0||p.ammo[p.weapon]>=w.mag||p.reserve[p.weapon]<=0)return false;p.reload=p.weapon==='launcher'?2.6:p.weapon==='rail'?2.1:p.weapon==='scatter'?1.9:1.6;emit(s,'Reloading');return true;}
export function setWeapon(s,name){if(!(name in WEAPONS))return false;s.player.weapon=name;s.player.reload=0;emit(s,WEAPONS[name].name+' READY');return true;}
function hitEnemy(s,e,damage,source='player'){if(e.hp<=0)return;e.hp-=damage;effect(s,'hit',e.x,e.z,{amount:Math.round(damage),kind:e.kind});if(e.hp>0)return;e.hp=0;e.dead=true;if(source==='player'){s.player.kills++;grantXP(s,ENEMIES[e.kind].reward);rpgEvent(s,'kill',e.kind);for(const id of s.rpg.companions)s.rpg.affinity[id]=clamp((s.rpg.affinity[id]||0)+.3,0,100);if(e.elite&&s.rpg){s.rpg.coins+=15;emit(s,'ELITE TARGET / +15 CROWNS','success');}}s.pickups.push({id:++s.nextId,x:e.x,z:e.z,y:e.y,kind:e.kind==='factory'?'cache':e.kind==='titan'?'relic':'scrap',amount:e.kind==='factory'?55:e.kind==='titan'?150:3+ENEMIES[e.kind].reward,at:s.time});effect(s,'death',e.x,e.z,{kind:e.kind});if(e.kind==='factory'&&s.operation?.stage===1){s.operation.destroyed++;emit(s,`FABRICATOR DOWN / ${s.operation.destroyed}/2`,'success');}if(e.kind==='titan'&&s.operation?.stage===4){s.operation.bossDead=true;emit(s,'THE IRON SAINT HAS FALLEN','success');}if(s.dungeon?.bossId===e.id){s.dungeon.bossDead=true;emit(s,'DUNGEON GUARDIAN FALLEN / THE RELIC IS UNSEALED','success');}}
export function shoot(s,aim,force=false){const p=s.player,w=WEAPONS[p.weapon];if(p.reload>0||p.fireCooldown>0||p.hp<=0)return false;if(p.ammo[p.weapon]<=0){reload(s);return false;}p.ammo[p.weapon]--;p.fireCooldown=w.rate;p.shots++;
  p.lastShotAt=s.time;if(s.rpg.status.cloak>0){s.rpg.status.cloak=0;emit(s,'GHOST VEIL BROKEN BY GUNFIRE','warning');}
  const origin={x:p.x+Math.cos(p.yaw)*.33,z:p.z+Math.sin(p.yaw)*.33,y:terrainHeight(p.x,p.z,s.seed,s.zone)+1.7};let hadHit=false,explosiveImpact=null;
  for(let i=0;i<w.shots;i++){const driftYaw=(hash(p.shots*13+i,44,s.seed)-.5)*w.spread*2,driftPitch=(hash(p.shots*7+i,43,s.seed)-.5)*w.spread*2;
    const yaw=(aim?.yaw??p.yaw)+driftYaw,pitch=clamp((aim?.pitch??p.pitch)+driftPitch,-1.25,1.25),horizontal=Math.cos(pitch);
    const direction={x:Math.sin(yaw)*horizontal,y:Math.sin(pitch),z:-Math.cos(yaw)*horizontal};
    let closest=null,best=w.range,weak=false;
    for(const e of s.enemies){if(e.hp<=0)continue;const def=ENEMIES[e.kind],cy=terrainHeight(e.x,e.z,s.seed,s.zone)+(e.kind==='titan'?3.7:e.kind==='factory'?2.0:1.15);
      const dx=e.x-origin.x,dy=cy-origin.y,dz=e.z-origin.z,t=dx*direction.x+dy*direction.y+dz*direction.z;
      const radius=def.radius*(e.kind==='factory'?1.1:1),d2=dx*dx+dy*dy+dz*dz-t*t;
      const headY=cy+(e.kind==='titan'?2.3:.89),headRadius=e.kind==='titan'?1.25:.45;
      const headDelta=headY-origin.y,ht=dx*direction.x+headDelta*direction.y+dz*direction.z;
      const headDist=dx*dx+headDelta*headDelta+dz*dz-ht*ht;
      const critical=e.kind!=='factory'&&ht>0&&headDist<headRadius*headRadius;
      const body=d2<radius*radius&&t+Math.sqrt(Math.max(0,radius*radius-d2))>0;
      if(!body&&!critical)continue;
      const entry=critical?Math.max(0,ht-Math.sqrt(Math.max(0,headRadius*headRadius-headDist))):Math.max(0,t-Math.sqrt(Math.max(0,radius*radius-d2)));
      if(entry<best){best=entry;closest=e;weak=critical;}
    }
    // RTS objects are represented by horizontal footprints. Compare in 3D ray
    // distance so cover, battalions and individual enemies cannot all absorb one pellet.
    const warHit=s.war?traceWarShot(s,origin,yaw,best*horizontal,{pitch,ground:(x,z)=>terrainHeight(x,z,s.seed,s.zone)}):null;
    if(warHit){best=warHit.distance/horizontal;closest=null;weak=false;hadHit=applyWarShot(s,warHit,w.damage*.75)||hadHit;}
    else if(closest){const multiplier=weak?(p.weapon==='rail'?2.25:1.8):1;
      hitEnemy(s,closest,w.damage*multiplier*rpgStat(s,'damage')*(closest.hp/closest.maxHp<.5?rpgStat(s,'execute'):1)*(p.crouch&&!closest.aggro?1.65+perkRank(s,'shadow')*.1:1),'player');
      if(weak){p.weakHits=(p.weakHits||0)+1;closest.stagger=Math.max(closest.stagger||0,.43);effect(s,'weakpoint',closest.x,closest.z,{amount:Math.round(w.damage*multiplier)});}
      if(p.weapon==='cryo'&&closest.hp>0)closest.frozen=Math.max(closest.frozen||0,2.1);hadHit=true;
    }
    const end={x:origin.x+direction.x*best,z:origin.z+direction.z*best,y:origin.y+direction.y*best};
    if(p.weapon==='launcher'&&(closest||warHit))explosiveImpact=end;
    if(i===0||w.shots<=1)effect(s,'tracer',origin.x,origin.z,{fromY:origin.y,toX:end.x,toY:end.y,toZ:end.z,hit:!!closest||!!warHit});
  }
  if(p.weapon==='launcher'){const x=explosiveImpact?.x??origin.x+Math.sin(aim?.yaw??p.yaw)*31,z=explosiveImpact?.z??origin.z-Math.cos(aim?.yaw??p.yaw)*31;applyExplosion(s,x,z,125,10);}if(hadHit)p.hit++;
  if(p.ammo[p.weapon]===0 && p.reserve[p.weapon])p.fireCooldown=Math.max(p.fireCooldown,.35);
  return true;
}
export function grenade(s){const p=s.player;if(!p.grenades)return false;p.grenades--;const x=p.x+Math.sin(p.yaw)*18,z=p.z-Math.cos(p.yaw)*18;
  s.projectiles.push({id:++s.nextId,kind:'grenade',x:p.x,z:p.z,y:terrainHeight(p.x,p.z,s.seed,s.zone)+2,tx:x,tz:z,ttl:.9,total:.9,owner:'player'});emit(s,'STRIKE GRENADE AWAY');return true;}
export function orbital(s){const p=s.player;if(p.orbitalCooldown>0||s.inventory.flux<45)return false;s.inventory.flux-=45;p.orbitalCooldown=65;const x=p.x+Math.sin(p.yaw)*38,z=p.z-Math.cos(p.yaw)*38;s.projectiles.push({id:++s.nextId,kind:'orbital',x,z,y:terrainHeight(x,z,s.seed,s.zone)+110,tx:x,tz:z,ttl:2.0,total:2.0,owner:'player'});emit(s,'SKYBREAKER / ORBITAL LANCE MARKED','command');effect(s,'deploy',x,z);return true;}
export function resupply(s){const p=s.player;if(p.resupplyCooldown>0||s.inventory.scrap<18)return false;s.inventory.scrap-=18;p.resupplyCooldown=75;for(const [name,weapon] of Object.entries(WEAPONS)){p.reserve[name]=Math.min(weapon.reserve*3,p.reserve[name]+({rifle:120,scatter:40,rail:24,smg:180,cryo:68,launcher:12}[name]||24));p.ammo[name]=weapon.mag;}p.reload=0;p.grenades=Math.min(6,p.grenades+2);p.shield=Math.min(p.maxShield,p.shield+25);p.hp=Math.min(p.maxHp,p.hp+15);for(const unit of s.squad)unit.hp=Math.min(unit.maxHp,unit.hp+20);effect(s,'deploy',p.x,p.z);emit(s,'SKYHOOK / FULL RESUPPLY DELIVERED','success');return true;}
export function applyExplosion(s,x,z,damage=115,radius=9){damage*=rpgStat(s,'blast');effect(s,'explosion',x,z,{radius});if(s.war)warExplosion(s,x,z,damage,radius);for(const e of s.enemies)if(e.hp>0){const d=dist(e,{x,z});if(d<radius+ENEMIES[e.kind].radius)hitEnemy(s,e,damage*(1-clamp(d/radius,0,.9)),'player');}}
export function useConsumable(s,type){const p=s.player;if(type==='medkit'){if(s.inventory.medkit<=0||p.hp>=p.maxHp)return false;s.inventory.medkit--;p.hp=Math.min(p.maxHp,p.hp+rpgStat(s,'medkit'));emit(s,`BIOFOAM / +${rpgStat(s,'medkit')} HEALTH`,'success');return true;}if(type==='ration'){if(s.inventory.ration<=0)return false;s.inventory.ration--;p.hunger=Math.min(100,p.hunger+54);return true;}if(type==='water'){if(s.inventory.water<=0)return false;s.inventory.water--;p.thirst=Math.min(100,p.thirst+59);return true;}return false;}
export function echo(s){const p=s.player;if(s.inventory.flux<28||p.echoCooldown>0)return false;const target=p.memories.find(q=>q.at<=s.time-4.8)||p.memories[0];if(!target||s.time-target.at<2)return false;s.inventory.flux-=28;p.x=target.x;p.z=target.z;p.y=terrainHeight(p.x,p.z,s.seed,s.zone);p.hp=Math.max(p.hp,Math.min(p.maxHp,target.hp));p.shield=Math.max(p.shield,target.shield);p.echoCooldown=24*rpgStat(s,'cooldowns');p.invulnerable=.9;s.stats.echoes++;effect(s,'echo',p.x,p.z);emit(s,'ECHO / FIVE SECONDS RECLAIMED','success');return true;}
function rotateAround(o,c,dir=1){const x=o.x-c.x,z=o.z-c.z;o.x=c.x-z*dir;o.z=c.z+x*dir;if('tx'in o){const tx=o.tx-c.x,tz=o.tz-c.z;o.tx=c.x-tz*dir;o.tz=c.z+tx*dir;}}
export function fold(s){const p=s.player;if(s.inventory.flux<35||p.foldCooldown>0)return false;const anchor={x:Math.round(p.x/24)*24,z:Math.round(p.z/24)*24};const inside=o=>Math.abs(o.x-anchor.x)<11.5&&Math.abs(o.z-anchor.z)<11.5;
  const moved=[];for(const e of s.enemies)if(e.hp>0&&inside(e)){rotateAround(e,anchor);moved.push(e);}for(const u of s.squad)if(u.hp>0&&inside(u)){rotateAround(u,anchor);moved.push(u);}for(const b of s.buildings)if(b.hp>0&&inside(b)){rotateAround(b,anchor);moved.push(b);}if(s.war){for(const group of [...s.war.army,...s.war.enemyArmy])if(group.count>0&&inside(group)){rotateAround(group,anchor);moved.push(group);}for(const node of s.war.nodes)if(inside(node))rotateAround(node,anchor);for(const shield of s.war.anchors)if(shield.hp>0&&inside(shield)){rotateAround(shield,anchor);moved.push(shield);}}if(s.operation){const ob=s.operation.objectives[s.operation.stage];if(ob&&inside(ob)){rotateAround(ob,anchor);moved.push(ob);}for(const node of s.operation.pylons)if(inside(node))rotateAround(node,anchor);}
  s.inventory.flux-=35;p.foldCooldown=26*rpgStat(s,'cooldowns');s.stats.folds++;const phase=stampFacet(s,anchor.x,anchor.z);effect(s,'fold',anchor.x,anchor.z,{radius:16,units:moved.length});emit(s,`CHRONOFOLD / ${ERAS[phase?.era||s.era].name} / ${phase?.turn||0} QUARTER-TURNS / ${moved.length} RELOCATED`,'success');return true;
}
// Three authored, persistent dungeon wings: physical halls with relay puzzles, guardians and treasure.
export function enterDungeon(s,id){const def=DUNGEON_BY_ID[id];if(!def||s.zone!=='frontier')return false;
 const p=s.player;s.lastZonePos={x:p.x,z:p.z};s.zone='dungeon';s.operation=null;p.x=0;p.z=3;p.y=-5;p.vy=0;p.memories=[];p.shield=p.maxShield;
 const revisited=s.rpg.dungeonCleared.includes(id);s.dungeon={id,name:def.name,started:s.time,sigils:[false,false],bossDead:false,bossId:null,looted:false,revisited,exit:{x:-12,z:6}};
 s.enemies=[];s.projectiles=[];s.hostileShots=[];s.hostileShots=[];s.drones=[];s.pickups=[];for(const u of s.squad){u.x=p.x+(u.id%3-1)*2;u.z=p.z+3;u.order='follow';u.y=-5;}
 for(let i=0;i<5;i++)spawnEnemy(s,i%3?'specter':'raider',Math.sin(i*2.2)*10,-28-i*3,{dungeonGuard:true});
 for(let i=0;i<6;i++)spawnEnemy(s,i%2?'corruptor':'specter',Math.sin(i*3.3)*12,-68-i*2,{dungeonGuard:true});
 s.spawnTimer=1e9;s.threat=.15;emit(s,`ENTERED ${def.name} / TWO RELAYS LOCK THE GUARDIAN`,'command');return true;}
export function leaveDungeon(s,success=false){if(s.zone!=='dungeon'||!s.dungeon)return false;const d=s.dungeon,p=s.player;
 if(success&&!s.rpg.dungeonCleared.includes(d.id)){s.rpg.dungeonCleared.push(d.id);rpgEvent(s,'dungeon',d.id);grantXP(s,140);s.rpg.factions[DUNGEON_BY_ID[d.id].faction]+=12;emit(s,`DUNGEON CONQUERED / ${DUNGEON_BY_ID[d.id].reward}`,'success');}
 s.zone='frontier';p.x=s.lastZonePos.x+3;p.z=s.lastZonePos.z+3;p.y=terrainHeight(p.x,p.z,s.seed,'frontier');p.vy=0;p.memories=[];p.shield=Math.max(10,p.shield);
 s.enemies=[];s.projectiles=[];s.hostileShots=[];s.pickups=[];s.drones=[];s.spawnTimer=8;for(let i=0;i<s.squad.length;i++){const u=s.squad[i];u.x=p.x+(i%3-1)*3;u.z=p.z+3;u.order='follow';}s.dungeon=null;return true;}
function dungeonInteract(s,target){const d=s.dungeon;if(!d)return false;
 if(target.type==='dungeon-exit')return leaveDungeon(s,d.looted||d.revisited);
 if(target.type==='sigil'){const index=target.index;if(d.sigils[index])return false;
  const near=s.enemies.some(e=>e.hp>0&&dist(e,target)<15);if(near){emit(s,'RELAY JAMMED / CLEAR THE GUARDIANS','warning');return false;}
  d.sigils[index]=true;effect(s,'fold',target.x,target.z);emit(s,`MNEMONIC RELAY ${index+1}/2 RESTORED`,'success');
  if(d.sigils.every(Boolean)&&!d.bossId){const bossType=DUNGEON_BY_ID[d.id].boss;const e=spawnEnemy(s,bossType,0,-129,{hp:bossType==='titan'?1100:bossType==='artillery'?590:680,maxHp:bossType==='titan'?1100:bossType==='artillery'?590:680,elite:true,aggro:true});d.bossId=e.id;emit(s,`THE VAULT GUARDIAN WAKES / ${DUNGEON_BY_ID[d.id].bossName}`,'command');}return true;}
 if(target.type==='dungeon-treasure'){if(!d.bossDead){emit(s,'THE RELIC IS SEALED / THE GUARDIAN LIVES','warning');return false;}if(d.looted)return false;
  d.looted=true;openChest(s,`dungeon:${d.id}`,d.id.length*47);s.inventory.flux+=65;s.rpg.coins+=130;emit(s,'RELIC SECURED / RETURN THROUGH EITHER EXIT','success');return true;}
 return false;}
export function dungeonClamp(o,previous=null){if(!o)return;o.x=clamp(o.x,-18,18);o.z=clamp(o.z,-151,9);
 if(previous){for(const gate of [-20,-65,-107])if((previous.z>gate&&o.z<=gate||previous.z<gate&&o.z>=gate)&&Math.abs(o.x)>6.9)o.z=previous.z;}}
export function castAbility(s,id){const a={blink:{flux:12,cooldown:9},nova:{flux:28,cooldown:19},stasis:{flux:32,cooldown:28},cloak:{flux:24,cooldown:32},drone:{flux:38,cooldown:42},rally:{flux:20,cooldown:34}}[id];const p=s.player,rr=s.rpg;if(!a||p.hp<=0)return false;
 const flux=Math.ceil(a.flux*rpgStat(s,'fluxCosts'));if((rr.abilityCooldowns[id]||0)>0||s.inventory.flux<flux)return false;
 s.inventory.flux-=flux;rr.abilityCooldowns[id]=a.cooldown;const fx=p.x,fz=p.z;
 if(id==='blink'){p.x+=Math.sin(p.yaw)*13;p.z-=Math.cos(p.yaw)*13;if(s.zone==='dungeon')dungeonClamp(p,{x:fx,z:fz});p.y=terrainHeight(p.x,p.z,s.seed,s.zone);p.invulnerable=.65;effect(s,'echo',fx,fz);effect(s,'echo',p.x,p.z);}
 else if(id==='nova'){applyExplosion(s,p.x,p.z,150*rpgStat(s,'arcane'),17);for(const e of s.enemies)if(e.hp>0&&dist(p,e)<18){const dx=e.x-p.x,dz=e.z-p.z,mag=Math.max(.5,Math.hypot(dx,dz));e.x+=dx/mag*8;e.z+=dz/mag*8;if(s.zone==='dungeon')dungeonClamp(e);}}
 else if(id==='stasis'){let caught=0;for(const e of s.enemies)if(e.hp>0&&dist(p,e)<23){e.frozen=Math.max(e.frozen||0,6);caught++;}effect(s,'stasis',p.x,p.z,{radius:23});emit(s,`STASIS / ${caught} ENEMIES TRAPPED`,'success');}
 else if(id==='cloak'){rr.status.cloak=10;p.shieldDelay=0;effect(s,'echo',p.x,p.z);}
 else if(id==='drone'){for(let i=0;i<3;i++)s.drones.push({id:++s.nextId,x:p.x+Math.cos(i*TAU/3)*3,z:p.z+Math.sin(i*TAU/3)*3,expires:s.time+26,cooldown:i*.1});effect(s,'deploy',p.x,p.z);}
 else if(id==='rally'){rr.status.rally=16;for(const u of s.squad)u.hp=Math.min(u.maxHp,u.hp+55+15*perkRank(s,'fieldleader'));p.shield=Math.min(p.maxShield,p.shield+35);effect(s,'deploy',p.x,p.z);}
 emit(s,`ARCANE ART / ${id.toUpperCase()}`,'command');return true;}
export function sleepAtCamp(s,hours=8){const p=s.player;if(s.zone!=='frontier'||!Number.isFinite(hours)||hours<1||hours>12)return false;
 const canRest=dist(p,{x:0,z:0})<13||s.buildings.some(b=>b.kind==='shelter'&&b.zone==='frontier'&&dist(b,p)<11);if(!canRest||s.enemies.some(e=>e.hp>0&&dist(e,p)<24))return false;
 const elapsed=hours*3600;s.dayTime=(s.dayTime+elapsed)%86400;p.hp=Math.min(p.maxHp,p.hp+hours*12);p.shield=p.maxShield;p.stamina=100;p.hunger=clamp(p.hunger-hours*2.2,0,100);p.thirst=clamp(p.thirst-hours*3,0,100);s.weather=hash(Math.floor(s.dayTime/300),hours,s.seed)>.7?'storm':'clear';emit(s,`RESTED ${hours} HOURS / THE WAR CONTINUES`,'success');return true;}
export function dodge(s){const p=s.player;if(p.stamina<28||p.roll>0)return false;p.stamina-=28;p.roll=1.25;p.invulnerable=.34;
 const fx=p.x,fz=p.z;p.x+=Math.sin(p.yaw)*6;p.z-=Math.cos(p.yaw)*6;if(s.zone==='dungeon')dungeonClamp(p,{x:fx,z:fz});p.y=terrainHeight(p.x,p.z,s.seed,s.zone);effect(s,'echo',fx,fz);return true;}

export function nearestInteraction(s){const p=s.player,mode=s.zone;const near=[];
  if(mode==='dungeon'){
    const d=s.dungeon;if(d){for(const exit of [{x:-12,z:6},{x:0,z:-147}])if(dist(p,exit)<6)near.push({type:'dungeon-exit',label:'EXIT DUNGEON / RETURN TO FRONTIER',...exit,d:dist(p,exit)});
     for(const [index,point] of [{x:-11,z:-43},{x:12,z:-83}].entries())if(!d.sigils[index]&&dist(p,point)<6)near.push({type:'sigil',label:`ACTIVATE MEMORY RELAY ${index+1}`,index,...point,d:dist(p,point)});
     if(!d.looted&&dist(p,{x:7,z:-137})<6)near.push({type:'dungeon-treasure',label:'UNSEAL THE RELIC CACHE',x:7,z:-137,d:dist(p,{x:7,z:-137})});
    }
    return near.sort((a,b)=>a.d-b.d)[0]||null;
  }
  if(mode==='frontier'&&s.era==='medieval'){for(const lock of LOCKBOXES)if(!s.rpg.opened.includes('lock:'+lock.id)&&dist(p,lock)<7)near.push({type:'lock',lockId:lock.id,label:`PICK ${lock.name}`,x:lock.x,z:lock.z,d:dist(p,lock)});if(dist(p,{x:3,z:14})<7)near.push({type:'board',label:'READ THE RADIANT BOUNTY BOARD',x:3,z:14,d:dist(p,{x:3,z:14})});for(const npc of NPCS){if(s.rpg.companions.includes(npc.id))continue;if(npc.era&&npc.era!==s.era)continue;if(dist(p,npc)<6.2)near.push({type:'npc',label:`TALK TO ${npc.name}`,npcId:npc.id,x:npc.x,z:npc.z,d:dist(p,npc)});}
    for(const place of LANDMARKS){if(place.kind==='dungeon'&&dist(p,place)<8)near.push({type:'dungeon',label:`ENTER ${DUNGEON_BY_ID[place.id].name}`,dungeonId:place.id,x:place.x,z:place.z,d:dist(p,place)});
    if(place.kind==='cache'&&!s.rpg.opened.includes(`world:${place.id}`)&&dist(p,place)<7)near.push({type:'chest',label:`OPEN ${place.name} CACHE`,chestId:`world:${place.id}`,x:place.x,z:place.z,d:dist(p,place)});}
  }
  if(mode==='frontier'){for(const npc of NPCS)if(npc.era===s.era&&!s.rpg.companions.includes(npc.id)&&dist(p,npc)<6.2)near.push({type:'npc',label:`TALK TO ${npc.name}`,npcId:npc.id,x:npc.x,z:npc.z,d:dist(p,npc)});for(const gate of worldGates(s))if(dist(p,gate)<9)near.push({type:'gate',label:`WAR RIFT / ${CONTRACTS[gate.contract].title}`,x:gate.x,z:gate.z,contract:gate.contract,d:dist(p,gate)});for(const portal of availableRifts(s.era))if(dist(p,portal)<8)near.push({type:'advanced',label:`ADVANCED RIFT / ${portal.label}`,x:portal.x,z:portal.z,era:portal.era,d:dist(p,portal)});for(const place of eraSites(s.era))if(!s.temporal.worldCaches.includes(place.id)&&dist(p,place)<8)near.push({type:'chronicle-cache',label:`SURVEY ${place.name} / CHRONICLE REWARD`,id:place.id,x:place.x,z:place.z,d:dist(p,place)});}
  else if(s.war?.act==='extraction'){const ex=s.war.extraction;if(!ex.active&&dist(p,ex)<13)near.push({type:'war-extract',label:'CALL TIMEFALL EXTRACTION / HOLD THE CORRIDOR',x:ex.x,z:ex.z,d:dist(p,ex)});}
  else if(s.operation?.stage===5){const o=s.operation.objectives[5];if(dist(p,o)<8)near.push({type:'extract',label:'BEGIN EXTRACTION',x:o.x,z:o.z,d:dist(p,o)});}
  const cx=Math.floor(p.x/32),cz=Math.floor(p.z/32),harvested=new Set(s.harvested);
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)for(const prop of propsInChunk(cx+dx,cz+dz,s.seed,mode))if(prop.resource&&!harvested.has(prop.id)&&dist(p,prop)<4.2)near.push({type:'resource',label:`HARVEST ${prop.resource.toUpperCase()}`,id:prop.id,resource:prop.resource,x:prop.x,z:prop.z,d:dist(p,prop)});
  if(mode==='frontier'&&dist(p,{x:0,z:0})<8)near.push({type:'camp',label:'HOME CAMP / RESTORE SURVIVAL',x:0,z:0,d:dist(p,{x:0,z:0})});
  return near.sort((a,b)=>a.d-b.d)[0]||null;
}
export function worldGates(s=null){const old=[{x:58,z:-68,contract:0},{x:-88,z:-63,contract:1},{x:70,z:94,contract:2}];if(!s)return old;const war=CONTRACTS.findIndex(c=>c.mode==='war'&&c.era===s.era);return s.era==='medieval'?[...old,{x:52,z:23,contract:war}]:[{x:50,z:-43,contract:war}];}
export function changeEpoch(s,destination){if(s.zone!=='frontier'||!validEra(destination)||destination===s.era)return false;const old=s.era,p=s.player;s.temporal.eraPositions[old]={x:p.x,z:p.z};s.era=destination;s.seed=epochSeed(s.temporal.baseSeed,destination);const save=s.temporal.eraPositions[destination];p.x=save?.x||0;p.z=save?.z||0;p.y=terrainHeight(p.x,p.z,s.seed,s.zone);p.vy=0;p.memories=[];s.enemies=[];s.projectiles=[];s.hostileShots=[];s.pickups=[];s.drones=[];s.spawnTimer=8;for(const u of s.squad){u.x=p.x+2;u.z=p.z+3;u.era=u.era||old;u.order='follow';}if(!s.temporal.visited.includes(destination)){s.temporal.visited.push(destination);s.temporal.insight+=4;}s.temporal.chronicleLog.push(`${ERAS[old].name} → ${ERAS[destination].name}`);emit(s,`WORLD RIFT / ${ERAS[destination].period} / ${ERAS[destination].faction}`,'command');return true;}
export function caravanEra(s,id){const site=eraSites(s.era).find(p=>p.id===id);if(!site||s.zone!=='frontier'||!s.temporal.worldCaches.includes(id)||s.inventory.flux<12||s.enemies.some(e=>e.hp>0&&dist(e,s.player)<25))return false;s.inventory.flux-=12;s.player.x=site.x+3;s.player.z=site.z+3;s.player.y=terrainHeight(s.player.x,s.player.z,s.seed,s.zone);s.player.memories=[];emit(s,`CARAVAN RIFT / ${site.name} / -12 FLUX`,'command');return true;}
export function selectEpoch(s){const era=cycleFacetEra(s);emit(s,`CHRONOFOLD TARGET / ${ERAS[era].name}`,'command');return era;}
export function surveyChronicle(s,id){const place=eraSites(s.era).find(x=>x.id===id);if(!place||s.temporal.worldCaches.includes(id))return false;s.temporal.worldCaches.push(id);s.temporal.insight+=8;s.inventory.flux+=30;s.inventory.ore+=15;s.rpg.coins+=35;s.temporal.chronicleLog.push(`Explored ${place.name} in ${ERAS[s.era].period}`);emit(s,`CHRONICLE DISCOVERED / ${place.name} / +8 INSIGHT / +30 FLUX`,'success');return true;}
export function interact(s){const target=nearestInteraction(s);if(!target){emit(s,'Nothing in reach');return false;}if(target.type==='lock'){s.rpg.lockUI=target.lockId;return true;}if(target.type==='board'){s.rpg.boardOpen=true;return true;}if(target.type==='npc'){s.rpg.dialogue=target.npcId;return true;}if(target.type==='dungeon')return enterDungeon(s,target.dungeonId);if(target.type==='chest')return openChest(s,target.chestId,target.x|0);if(s.zone==='dungeon')return dungeonInteract(s,target);if(target.type==='advanced')return changeEpoch(s,target.era);if(target.type==='chronicle-cache')return surveyChronicle(s,target.id);if(target.type==='gate')return enterOperation(s,target.contract);if(target.type==='war-extract'){const called=signalWarExtraction(s);if(called)emit(s,'TIMEFALL EXTRACTION INBOUND / STAND YOUR GROUND','command');return called;}if(target.type==='extract'){s.operation.extracting=true;emit(s,'EXTRACTION SIGNAL / HOLD THE ZONE','command');return true;}if(target.type==='resource'){
  s.harvested.push(target.id);const base=target.resource==='fiber'?5:target.resource==='ore'?4:['ration','water'].includes(target.resource)?1:8,amount=Math.ceil(base*rpgStat(s,'harvest'));s.inventory[target.resource]+=amount;rpgEvent(s,'harvest',target.resource,amount);
  if(target.resource==='ore')s.inventory.scrap+=2;
  emit(s,`+${amount} ${target.resource.toUpperCase()}`,'success');effect(s,'harvest',target.x,target.z);return true;
}if(target.type==='camp'){s.player.hunger=Math.min(100,s.player.hunger+25);s.player.thirst=Math.min(100,s.player.thirst+25);s.player.hp=Math.min(s.player.maxHp,s.player.hp+40);emit(s,'CAMP REST / SUPPLIES RESTORED','success');return true;}return false;}
export function makeObjectives(seed=SEED,index=0){let k=index*73 + (seed%37);const wig=(i)=>((hash(i,k,seed)-.5)*24);return [
  {type:'signal',name:'SECURE THE SIGNAL SPIRE',x:12+wig(1),z:-95+wig(2),progress:0,target:20,description:'Hold the signal circle and cut the jammer.'},
  {type:'factories',name:'ERASE THE TWO FOUNDRIES',x:-112+wig(3),z:-58+wig(4),progress:0,target:2,description:'Breach the war foundries. Destroy their molten cores.'},
  {type:'drill',name:'DEFEND THE GRAVITY DRILL',x:-91+wig(5),z:115+wig(6),progress:0,target:90,description:'Charge the drill while waves attempt to destroy it.'},
  {type:'pylons',name:'REBUILD THE SUPPLY LATTICE',x:99+wig(7),z:114+wig(8),progress:0,target:3,description:'Control all three pylons. Command troops to hold positions.'},
  {type:'boss',name:'DESTROY THE IRON SAINT',x:145+wig(9),z:-77+wig(10),progress:0,target:1,description:'An enormous machine walks the fault. Break its armor.'},
  {type:'extract',name:'EXTRACT WITH THE RELIC',x:-8,z:6,progress:0,target:26,description:'Return to the landing zone, transmit, and survive.'}
];}
export function enterOperation(s,index=0){if(s.zone!=='frontier'||!CONTRACTS[index])return false;
  const p=s.player;s.lastZonePos={x:p.x,z:p.z};s.temporal.returnEra=s.era;const targetEra=CONTRACTS[index].era||s.era;s.era=targetEra;s.seed=epochSeed(s.temporal.baseSeed,targetEra);s.zone='operation';p.x=0;p.z=0;p.y=terrainHeight(0,0,s.seed,'operation');p.vy=0;p.memories=[];p.hp=Math.min(p.maxHp,p.hp+20);p.shield=p.maxShield;
  const objectives=makeObjectives(s.seed,s.stats.missions+index),contract=CONTRACTS[index];s.operation={id:s.stats.missions+index+1,contract:index,name:contract.title,stage:0,objectives,timeLeft:36*60,timeElapsed:0,difficulty:contract.difficulty,destroyed:0,bossDead:false,extracting:false,pylons:[],drillHp:700,completed:false,stageStart:0};
  s.enemies=[];s.projectiles=[];s.hostileShots=[];s.buildings=s.buildings.filter(b=>b.zone==='frontier');for(const u of s.squad){u.x=p.x+(u.id%3)*2;u.z=p.z+3;u.order='follow';u.hp=Math.max(70,u.hp);}
  s.war=contract.mode==='war'?createWarfront(s,contract):null;if(s.war){s.operation.kind='war';s.operation.objectives=[{type:'throne',name:'BREAK THE CHRONAL THRONE',x:s.war.enemyBase.x,z:s.war.enemyBase.z,progress:0,target:2900,description:'Build production, capture three timewells, command battalions and destroy the enemy citadel.'}];s.operation.stage=0;s.spawnTimer=1e10;}else{s.spawnTimer=5;}s.threat=.15;emit(s,`DROP COMPLETE / ${contract.title}`,'command');emit(s,contract.mode==='war'?'36:00 WAR / LIVE RTS PRODUCTION AND THIRD-PERSON COMBAT':'36:00 EXTRACTION WINDOW / 6-PHASE OPERATION');return true;
}
function startStage(s){const op=s.operation;if(!op)return;op.stageStart=s.time;const o=op.objectives[op.stage];
  if(op.stage===1){for(const dx of [-16,16])spawnEnemy(s,'factory',o.x+dx,o.z,{hp:310,maxHp:310});for(let i=0;i<6;i++)spawnEnemy(s,i%2?'raider':'crawler',o.x+(i-3)*7,o.z+16+(i%2)*5);}
  else if(op.stage===2){for(let i=0;i<7;i++)spawnEnemy(s,i%3?'raider':'warden',o.x+Math.cos(i*TAU/7)*28,o.z+Math.sin(i*TAU/7)*28);}
  else if(op.stage===3){op.pylons=[{x:o.x-23,z:o.z+24,progress:0,active:false},{x:o.x+28,z:o.z+18,progress:0,active:false},{x:o.x+2,z:o.z-25,progress:0,active:false}];}
  else if(op.stage===4){spawnEnemy(s,'titan',o.x,o.z,{hp:1650,maxHp:1650});for(let i=0;i<8;i++)spawnEnemy(s,i%3?'raider':'warden',o.x+Math.cos(i*TAU/8)*37,o.z+Math.sin(i*TAU/8)*37);}
  if(op.stage===5){op.extracting=false;}
  emit(s,`PHASE ${op.stage+1}/6 / ${o.name}`,'success');}
function advance(s){const op=s.operation;if(!op)return;op.stage++;if(op.stage>=6){finishOperation(s,true);return;}startStage(s);}
export function finishOperation(s,success=true){const op=s.operation;if(!op)return false;const p=s.player;const earned=success?100+op.difficulty*60+Math.round(op.timeLeft/30):25;
  const siegeReport=bellSiegeReport(s.war,success);if(siegeReport){s.temporal.chronicleLog.push(siegeReport);s.temporal.chronicleLog=s.temporal.chronicleLog.slice(-40);emit(s,'ELEVEN BELLS FIELD REPORT SAVED / C TO READ THE CHRONICLE','command');}
  s.inventory.scrap+=earned;s.inventory.ore+=success?24:7;s.inventory.flux+=success?70:18;if(success&&op.kind==='war'){const id=CONTRACTS[op.contract].id;if(id&&!s.temporal.wonCampaigns.includes(id)){s.temporal.wonCampaigns.push(id);s.temporal.insight+=18;s.temporal.chronicleLog.push(`Liberated ${CONTRACTS[op.contract].region} from the ${ERAS[op.era||s.era].name}`);}}if(success){s.inventory.medkit+=2;s.stats.missions++;rpgEvent(s,'operation',String(op.contract));grantXP(s,230+op.difficulty*45);s.rpg.coins+=130+op.difficulty*30;}s.temporal.chronicleLog=s.temporal.chronicleLog.slice(-40);s.zone='frontier';s.era=s.temporal.returnEra||'medieval';s.seed=epochSeed(s.temporal.baseSeed,s.era);p.x=s.lastZonePos.x+3;p.z=s.lastZonePos.z+3;p.y=terrainHeight(p.x,p.z,s.seed,'frontier');p.memories=[];p.hp=Math.max(45,p.hp);p.shield=p.maxShield;
  s.enemies=[];s.projectiles=[];s.hostileShots=[];s.buildings=s.buildings.filter(b=>b.zone==='frontier');s.spawnTimer=6;for(const u of s.squad){u.x=p.x+2;u.z=p.z+3;u.order='follow';}
  emit(s,success?`OPERATION SUCCESS / +${earned} SCRAP / RELIC SECURED`:`OPERATION ABORTED / +${earned} SALVAGE`,success?'success':'warning');s.operation=null;s.war=null;return true;
}
function updateOperation(s,dt){const op=s.operation;if(!op)return;op.timeElapsed+=dt;op.timeLeft-=dt;if(op.timeLeft<=0){finishOperation(s,false);return;}if(op.kind==='war'){if(s.war){const outcome=stepWarfront(s,dt),objective=warObjective(s.war);Object.assign(op.objectives[0],objective);if(outcome){finishOperation(s,outcome==='ally');}}return;}
  const o=op.objectives[op.stage],p=s.player,near=dist(p,o)<12;
  if(op.stage===0){const contested=s.enemies.some(e=>e.hp>0&&dist(e,o)<17);o.progress=clamp(o.progress+(near&&!contested?dt:-dt*.65),0,o.target);if(o.progress>=o.target)advance(s);}
  else if(op.stage===1){o.progress=op.destroyed;if(op.destroyed>=2)advance(s);}
  else if(op.stage===2){if(near){o.progress+=dt;op.drillHp=Math.max(0,op.drillHp-dt*(s.enemies.filter(e=>e.hp>0&&dist(e,o)<17).length)*.6);}if(op.drillHp<=0){o.progress=0;op.drillHp=650;emit(s,'DRILL BROKEN / DEFEND IT AGAIN','warning');}if(o.progress>=o.target)advance(s);}
  else if(op.stage===3){for(const node of op.pylons){if(node.active)continue;const enemies=s.enemies.some(e=>e.hp>0&&dist(e,node)<7);if(dist(p,node)<9&&!enemies)node.progress+=dt;else if(node.progress>0)node.progress=Math.max(0,node.progress-dt*.25);if(node.progress>=15){node.active=true;emit(s,'SUPPLY PYLON ONLINE','success');}}
    o.progress=op.pylons.filter(n=>n.active).length;if(o.progress>=3)advance(s);}
  else if(op.stage===4){if(op.bossDead){o.progress=1;advance(s);}}
  else if(op.stage===5&&op.extracting){const enemies=s.enemies.filter(e=>e.hp>0&&dist(e,o)<11).length;o.progress=clamp(o.progress+(near&&!enemies?dt:-dt*.4),0,o.target);if(o.progress>=o.target)finishOperation(s,true);}
}
const HOSTILE_TELEGRAPHS=Object.freeze({raider:{delay:.48,radius:2},warden:{delay:.78,radius:2.9},artillery:{delay:1.45,radius:5.5},titan:{delay:1.15,radius:6},corruptor:{delay:.68,radius:3.3},oracle:{delay:.85,radius:3.2}});
export function resolveHostileShots(s,dt){
 const shots=s.hostileShots||[];
 for(const shot of shots){shot.remaining-=dt;if(shot.remaining>0)continue;
   const target=shot.team==='player'?s.player:shot.team==='squad'?s.squad.find(u=>u.id===shot.targetId):s.buildings.find(b=>b.id===shot.targetId);
   if(target&&target.hp>0){const separation=Math.hypot(shot.tx-target.x,shot.tz-target.z);
     if(separation<shot.radius){const amount=shot.damage*(1-.35*separation/shot.radius);
       if(shot.team==='player'&&target.invulnerable<=0){let left=amount;if(target.shield>0){const shielded=Math.min(target.shield,left);target.shield-=shielded;left-=shielded;}target.hp-=left*(1-rpgStat(s,'armor'));target.shieldDelay=6;effect(s,'damage',target.x,target.z,{amount:Math.round(amount)});}
       else if(shot.team!=='player')target.hp-=amount;
     }
   }
   effect(s,'enemytracer',shot.x,shot.z,{fromY:shot.y,toX:shot.tx,toY:terrainHeight(shot.tx,shot.tz,s.seed,s.zone)+1.3,toZ:shot.tz});
   if(shot.radius>4)effect(s,'explosion',shot.tx,shot.tz,{radius:shot.radius});
 }
 s.hostileShots=shots.filter(q=>q.remaining>0);
}
function enemyBrain(s,e,dt){const def=ENEMIES[e.kind],p=s.player;e.cooldown-=dt;
 if(e.stagger>0){e.stagger=Math.max(0,e.stagger-dt);return;}
 if(e.frozen>0){e.frozen=Math.max(0,e.frozen-dt);return;}
  if(e.kind==='factory'){if(e.cooldown<=0 && s.enemies.filter(a=>a.hp>0&&!['factory','titan'].includes(a.kind)).length<36){const a=hash(e.id,Math.floor(s.time),s.seed)*TAU;spawnEnemy(s,'crawler',e.x+Math.cos(a)*7,e.z+Math.sin(a)*7);e.cooldown=10;}return;}
  let target=p,team='player',d=s.rpg.status.cloak>0?1e5:dist(e,p);
  for(const u of s.squad)if(u.hp>0&&dist(e,u)<d*.72){target=u;d=dist(e,u);team='squad';}
  for(const b of s.buildings)if(b.zone===s.zone && b.hp>0&&dist(e,b)<d*.75){target=b;d=dist(e,b);team='structure';}
  if(d<(p.crouch&&s.time-(p.lastShotAt||-1e6)>3?18:Math.max(def.range+22,40)))e.aggro=true;
  if(s.rpg.status.cloak>0&&team==='player')return;if(!e.aggro && d>90)return;
  const dx=target.x-e.x,dz=target.z-e.z,length=Math.max(.01,Math.hypot(dx,dz)),keep=def.range<4?1.7:def.range*.75;
  if(def.speed>0&&d>keep){let move=def.speed*dt;if(e.kind==='crawler')move*=1+Math.sin(s.time*7+e.id)*.08;e.x+=dx/length*Math.min(move,d-keep);e.z+=dz/length*Math.min(move,d-keep);e.y=terrainHeight(e.x,e.z,s.seed,s.zone);}
  else if(def.speed>0&&def.range>8&&d>7){const strafe=Math.sin(s.time*1.1+e.id*2.7)*def.speed*dt*.29;e.x+=-dz/length*strafe;e.z+=dx/length*strafe;e.y=terrainHeight(e.x,e.z,s.seed,s.zone);}
  if(e.cooldown<=0&&d<def.range+2){const hurt=def.damage*(.7+hash(e.id,Math.floor(s.time*3),s.seed)*.6);
    if(def.range>4){const spec=HOSTILE_TELEGRAPHS[e.kind]||{delay:.65,radius:2};
      if(s.hostileShots.length<85)s.hostileShots.push({id:++s.nextId,sourceId:e.id,kind:e.kind,team,targetId:team==='player'?null:target.id,
        x:e.x,z:e.z,y:e.y+1.6,tx:target.x,tz:target.z,damage:hurt,remaining:spec.delay,radius:spec.radius});
    }else if(team==='player'){if(p.invulnerable<=0){let remaining=hurt;if(p.shield>0){const absorbed=Math.min(p.shield,remaining);p.shield-=absorbed;remaining-=absorbed;}p.hp-=remaining*(1-rpgStat(s,'armor'));p.shieldDelay=6;effect(s,'damage',p.x,p.z,{amount:Math.round(hurt)});}}
    else target.hp-=hurt;
    e.cooldown=e.kind==='titan'?2.0:e.kind==='crawler'?.87:e.kind==='artillery'?3.1:1.65;
  }
}
function squadBrain(s,u,dt){if(u.hp<=0)return;u.cooldown-=dt;const p=s.player;
  let tx=u.order==='follow'?p.x+(u.id%3-1)*2.8:u.tx,tz=u.order==='follow'?p.z+3+(u.id%2)*2.2:u.tz;
  if(u.order==='assault'){const nearest=s.enemies.filter(e=>e.hp>0).sort((a,b)=>dist(u,a)-dist(u,b))[0];if(nearest){tx=nearest.x;tz=nearest.z;}}
  const d=Math.hypot(tx-u.x,tz-u.z),gap=u.order==='follow'?4:u.order==='assault'?13:2.1;if(d>gap){const speed=(u.role==='HEAVY'?5.0:6.2)*(s.rpg.status.rally>0?1.28:1);u.x+=(tx-u.x)/d*Math.min(speed*dt,d-gap);u.z+=(tz-u.z)/d*Math.min(speed*dt,d-gap);}u.y=terrainHeight(u.x,u.z,s.seed,s.zone);
  let target=null,best=30;for(const e of s.enemies)if(e.hp>0){const d=dist(u,e);if(d<best){best=d;target=e;}}
  if(target&&u.cooldown<=0){hitEnemy(s,target,(u.role==='HEAVY'?26:14)*rpgStat(s,'squad')*(s.rpg.status.rally>0?1.4:1)*(u.npcId?1+(s.rpg.affinity[u.npcId]||0)*.004:1),'squad');effect(s,'allytracer',u.x,u.z,{fromY:u.y+1.5,toX:target.x,toY:target.y+1.1,toZ:target.z});u.cooldown=u.role==='HEAVY'?.53:.42;}
  if(u.role==='MEDIC'&&p.hp<p.maxHp&&dist(u,p)<11&&hash(u.id,Math.floor(s.time),s.seed)>.9)p.hp=Math.min(p.maxHp,p.hp+dt*3);
}
function structureBrain(s,b,dt){if(b.hp<=0||b.zone!==s.zone)return;b.cooldown-=dt;if(b.kind==='greenhouse'&&b.cooldown<=0){s.inventory.ration=Math.min(999,s.inventory.ration+1);b.cooldown=24;}if(b.kind==='refinery'&&b.cooldown<=0){s.inventory.scrap=Math.min(9999,s.inventory.scrap+3);b.cooldown=18;}if(b.kind==='bastion'){for(const u of s.squad)if(dist(u,b)<18&&u.hp>0)u.hp=Math.min(u.maxHp,u.hp+dt*2.8);}if(b.kind==='beacon'&&b.cooldown<=0){s.inventory.flux=Math.min(999,s.inventory.flux+2);b.cooldown=2;}if(b.kind==='shelter'&&dist(s.player,b)<12){s.player.hp=Math.min(s.player.maxHp,s.player.hp+4*dt);s.player.stamina=Math.min(100,s.player.stamina+3*dt);}if(b.kind==='turret'&&b.cooldown<=0){let target=null,best=31;for(const e of s.enemies)if(e.hp>0&&dist(b,e)<best){target=e;best=dist(b,e);}if(target){hitEnemy(s,target,24*rpgStat(s,'squad'),'squad');effect(s,'allytracer',b.x,b.z,{fromY:b.y+2.3,toX:target.x,toY:target.y+1.3,toZ:target.z});b.cooldown=.28;}}}
function spawnDirector(s,dt){if(s.zone==='dungeon'||s.war)return;s.spawnTimer-=dt;if(s.spawnTimer>0)return;const op=s.operation,p=s.player,difficulty=op?.difficulty||0;
  const living=s.enemies.filter(e=>e.hp>0&&!['factory','titan'].includes(e.kind)).length;
  if(living>(op?26:9)){s.spawnTimer=4;return;}
  const count=op?clamp(2+op.stage+Math.round(op.timeElapsed/240),2,8):1+Math.floor(hash(Math.round(p.x),Math.round(p.z),s.seed)*2);
  for(let i=0;i<count;i++){let angle=hash(s.nextId+11,i+Math.floor(s.time),s.seed)*TAU,r=op?38+hash(i,s.nextId,s.seed)*28:43+hash(i,s.nextId,s.seed)*30;
    const x=p.x+Math.sin(angle)*r,z=p.z+Math.cos(angle)*r;
    const roll=hash(s.nextId,i+1,s.seed);const kind=op?(roll<.31?'crawler':roll<.68?'raider':roll<.89?'warden':'artillery'):(roll<.52?'crawler':roll<.86?'raider':'warden');spawnEnemy(s,kind,x,z);
  }
  if(op)s.stats.waves++;s.spawnTimer=op?clamp(13-op.stage*.8-difficulty,5,15):(s.rpg.worldEnding==='wardens'?32:22);
}
function updatePlayer(s,input,dt){const p=s.player;
  p.roll=Math.max(0,p.roll-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);p.fireCooldown=Math.max(0,p.fireCooldown-dt);p.foldCooldown=Math.max(0,p.foldCooldown-dt);p.echoCooldown=Math.max(0,p.echoCooldown-dt);p.orbitalCooldown=Math.max(0,p.orbitalCooldown-dt);p.resupplyCooldown=Math.max(0,p.resupplyCooldown-dt);p.shieldDelay=Math.max(0,p.shieldDelay-dt);
  if(p.reload>0){p.reload-=dt;if(p.reload<=0){const w=WEAPONS[p.weapon],wanted=w.mag-p.ammo[p.weapon],loaded=Math.min(wanted,p.reserve[p.weapon]);p.ammo[p.weapon]+=loaded;p.reserve[p.weapon]-=loaded;emit(s,'MAGAZINE CHARGED','success');}}
  const front={x:Math.sin(p.yaw),z:-Math.cos(p.yaw)},right={x:Math.cos(p.yaw),z:Math.sin(p.yaw)};
  const mx=clamp(input.x||0,-1,1),mz=clamp(input.z||0,-1,1),mag=Math.max(1,Math.hypot(mx,mz));
  p.crouch=!!input.crouch&&!input.commander;p.sprint=!!input.sprint&&!p.crouch&&p.stamina>1&&mz>0&&!input.commander;const speed=(input.commander?0:p.crouch?2.8:p.sprint?10.7:input.aim?3.3:6.2)*rpgStat(s,'speed')*(p.hunger<15||p.thirst<15?.70:1);
  const previous={x:p.x,z:p.z};p.x+=(right.x*mx+front.x*mz)/mag*speed*dt;p.z+=(right.z*mx+front.z*mz)/mag*speed*dt;if(s.zone==='dungeon')dungeonClamp(p,previous);
  if(s.war)for(const cover of s.war.cover||[])if(cover.hp>0){const dx=p.x-cover.x,dz=p.z-cover.z,d=Math.hypot(dx,dz),limit=cover.radius*.87+1;
    if(d<limit){if(d>.05){p.x=cover.x+dx/d*limit;p.z=cover.z+dz/d*limit;}else{p.x=previous.x;p.z=previous.z;}}}
  p.yaw=Number.isFinite(input.yaw)?input.yaw:p.yaw;p.pitch=clamp(Number.isFinite(input.pitch)?input.pitch:p.pitch,-1.05,.55);
  const floor=terrainHeight(p.x,p.z,s.seed,s.zone),grounded=p.y<=floor+.02;
  if(input.jump&&grounded&&!input.commander){p.vy=7.5;p.y=floor+.1;p.stamina=Math.max(0,p.stamina-12);}
  p.vy-=21*dt;p.y+=p.vy*dt;if(p.y<floor){p.y=floor;p.vy=0;}
  p.stamina=clamp(p.stamina+(p.sprint?-21*rpgStat(s,'staminaCost'):15)*dt,0,100);
  p.hunger=clamp(p.hunger-dt*(p.sprint?.035:.018),0,100);p.thirst=clamp(p.thirst-dt*(p.sprint?.058:.031),0,100);
  if((p.hunger<=0||p.thirst<=0)&&Math.floor(s.time)%3===0)p.hp-=dt*2.5;
  if(!p.shieldDelay)p.shield=Math.min(p.maxShield,p.shield+(9+perkRank(s,'aegis')*1.7)*dt);
  if(input.fire&&!input.commander)shoot(s,{yaw:p.yaw,pitch:p.pitch});
  if(s.time-(p.memories.at(-1)?.at??-100)>.22){p.memories.push({at:s.time,x:p.x,z:p.z,hp:p.hp,shield:p.shield});while(p.memories.length>42)p.memories.shift();}
  for(const item of s.pickups)if(!item.collected&&dist(p,item)<3.7){item.collected=true;if(item.kind==='scrap')s.inventory.scrap+=item.amount;else if(item.kind==='cache'){s.inventory.scrap+=item.amount;s.inventory.ore+=10;s.inventory.flux+=12;}else{s.inventory.scrap+=item.amount;s.inventory.flux+=60;s.inventory.medkit+=2;}emit(s,`SALVAGE ACQUIRED / +${item.amount}`,'success');}
  if(p.hp<=0){s.stats.death++;if(s.zone==='operation'){finishOperation(s,false);}else if(s.zone==='dungeon'){leaveDungeon(s,false);p.hp=Math.max(45,p.maxHp*.5);emit(s,'THE VAULT SPAT YOU OUT / RELIC LOST','warning');}else {p.x=0;p.z=0;p.hp=p.maxHp;p.shield=p.maxShield;p.hunger=Math.max(40,p.hunger);p.thirst=Math.max(40,p.thirst);s.inventory.scrap=Math.max(0,s.inventory.scrap-15);emit(s,'YOU WERE RECOVERED AT HOME CAMP / 15 SCRAP LOST','warning');}p.hp=Math.max(40,p.hp);}
  if(p.y<-30){p.y=floor;p.vy=0;}
}
function droneBrain(s,d,dt){if(s.time>=d.expires)return;d.cooldown=Math.max(0,d.cooldown-dt);const p=s.player;const orb=d.id*1.8+s.time*.7;const goal={x:p.x+Math.sin(orb)*4,z:p.z+Math.cos(orb)*4},dx=goal.x-d.x,dz=goal.z-d.z,sep=Math.hypot(dx,dz)||1;d.x+=dx/sep*Math.min(sep,14*dt);d.z+=dz/sep*Math.min(sep,14*dt);
 if(d.cooldown<=0){let best=30,target=null;for(const e of s.enemies)if(e.hp>0&&dist(d,e)<best){best=dist(d,e);target=e;}if(target){hitEnemy(s,target,23*rpgStat(s,'squad'),'squad');effect(s,'allytracer',d.x,d.z,{fromY:terrainHeight(d.x,d.z,s.seed,s.zone)+3,toX:target.x,toY:target.y+1,toZ:target.z});d.cooldown=.46;}}}
export function stepGame(s,input={},dt=1/30){if(!s||dt<=0)return s;dt=Math.min(dt,.1);s.time+=dt;for(const key of Object.keys(s.rpg.abilityCooldowns))s.rpg.abilityCooldowns[key]=Math.max(0,s.rpg.abilityCooldowns[key]-dt);for(const key of ['cloak','rally'])s.rpg.status[key]=Math.max(0,s.rpg.status[key]-dt);s.dayTime=(s.dayTime+dt*7)%86400;if(Math.floor(s.time/180)!==Math.floor((s.time-dt)/180)){const r=hash(Math.floor(s.time/180),0,s.seed);s.weather=r<.26?'storm':r<.49?'rain':'clear';emit(s,`WEATHER SHIFT / ${s.weather.toUpperCase()}`,'command');}updatePlayer(s,input,dt);
  if(s.zone==='operation')updateOperation(s,dt);else if(s.zone==='frontier'){discoverNearby(s);if(s.rpg.worldEnding==='archive')s.inventory.flux=Math.min(999,s.inventory.flux+dt*.12);}
  for(const e of [...s.enemies])if(e.hp>0)enemyBrain(s,e,dt);
  resolveHostileShots(s,dt);
  for(const u of s.squad)squadBrain(s,u,dt);for(const d of s.drones)droneBrain(s,d,dt);s.drones=s.drones.filter(d=>s.time<d.expires);
  for(const b of s.buildings)if(b.zone===s.zone&&(s.zone!=='frontier'||(b.era||'medieval')===s.era))structureBrain(s,b,dt);
  for(const p of s.projectiles){p.ttl-=dt;const t=clamp(1-p.ttl/p.total,0,1);p.x+=(p.tx-p.x)*Math.min(1,dt/Math.max(.01,p.ttl+dt));p.z+=(p.tz-p.z)*Math.min(1,dt/Math.max(.01,p.ttl+dt));p.y=terrainHeight(p.x,p.z,s.seed,s.zone)+1+Math.sin(t*Math.PI)*9;if(p.ttl<=0)applyExplosion(s,p.tx,p.tz,p.kind==='orbital'?390:134,p.kind==='orbital'?22:10);}
  s.projectiles=s.projectiles.filter(p=>p.ttl>0);
  s.enemies=s.enemies.filter(e=>e.hp>0||s.time-(e.deadAt??(e.deadAt=s.time))<1.1);
  s.pickups=s.pickups.filter(p=>!p.collected && s.time-p.at<600);
  s.effects=s.effects.filter(e=>s.time-e.at<1.4);
  s.squad=s.squad.filter(u=>u.hp>0);
  s.buildings=s.buildings.filter(b=>b.hp>0);
  spawnDirector(s,dt);return s;
}
export function serialize(s){return JSON.stringify({rpg:{...s.rpg,dialogue:null,status:{cloak:0,rally:0},abilityCooldowns:{}},version:s.version,seed:s.zone==='operation'?epochSeed(s.temporal.baseSeed,s.temporal.returnEra):s.seed,era:s.zone==='operation'?s.temporal.returnEra:s.era,temporal:s.temporal,dayTime:s.dayTime,weather:s.weather,inventory:s.inventory,player:{...s.player,x:s.zone!=='frontier'?s.lastZonePos.x:s.player.x,z:s.zone!=='frontier'?s.lastZonePos.z:s.player.z,memories:[]},squad:s.zone!=='frontier'?s.squad.map((u,i)=>({...u,x:s.lastZonePos.x+(i-2)*2,z:s.lastZonePos.z+3+i%2,y:terrainHeight(s.lastZonePos.x+(i-2)*2,s.lastZonePos.z+3+i%2,s.seed,'frontier'),order:'follow'})):s.squad,buildings:s.buildings.filter(b=>b.zone==='frontier'),harvested:s.harvested,cleared:s.cleared,stats:s.stats,nextId:s.nextId});}
export function restore(raw){let data;try{data=typeof raw==='string'?JSON.parse(raw):raw;}catch{return null;}if(!data||data.version!==1||!Number.isFinite(data.seed)||!data.inventory||!data.player||!Array.isArray(data.buildings)||!Array.isArray(data.squad))return null;
  const s=createGame(data.seed);s.temporal=migrateTemporal(data.temporal,data.seed);s.era=validEra(data.era)?data.era:'medieval';s.seed=epochSeed(s.temporal.baseSeed,s.era);s.rpg=restoreRPG(data.rpg,s);s.dayTime=Number.isFinite(data.dayTime)?data.dayTime:s.dayTime;
  for(const name of Object.keys(s.inventory))if(Number.isFinite(data.inventory[name]))s.inventory[name]=clamp(data.inventory[name],0,100000);
  for(const name of Object.keys(s.player))if(name in data.player){const v=data.player[name];if(typeof s.player[name]==='number'&&Number.isFinite(v))s.player[name]=clamp(v,-10000,10000);else if(name==='weapon'&&v in WEAPONS)s.player.weapon=v;else if(['ammo','reserve'].includes(name)&&v&&typeof v==='object'){for(const type of Object.keys(WEAPONS))if(Number.isFinite(v[type]))s.player[name][type]=clamp(v[type],0,9999);}}
  s.player.maxHp=rpgStat(s,'health');s.player.maxShield=rpgStat(s,'shield');s.player.shield=clamp(s.player.shield,0,s.player.maxShield);s.player.memories=[];s.player.x=clamp(s.player.x,-10000,10000);s.player.z=clamp(s.player.z,-10000,10000);s.player.y=terrainHeight(s.player.x,s.player.z,s.seed);s.player.hp=clamp(s.player.hp,1,s.player.maxHp);
  s.buildings=data.buildings.filter(b=>b&&STRUCTURES[b.kind]&&Number.isFinite(b.x)&&Number.isFinite(b.z)&&Number.isFinite(b.hp)).map(b=>({...b,zone:'frontier',era:validEra(b.era)?b.era:'medieval'}));
  s.squad=data.squad.filter(u=>u&&Number.isFinite(u.x)&&Number.isFinite(u.z)&&Number.isFinite(u.hp)&&u.hp>0).map(u=>({...u,order:'follow'}));s.rpg.companions=s.rpg.companions.filter(id=>s.squad.some(u=>u.npcId===id));
  s.harvested=Array.isArray(data.harvested)?data.harvested.filter(v=>typeof v==='string'):[];
  s.cleared=Array.isArray(data.cleared)?data.cleared.filter(v=>typeof v==='string'):[];
  if(data.stats&&typeof data.stats==='object')for(const k of Object.keys(s.stats))if(Number.isFinite(data.stats[k]))s.stats[k]=clamp(data.stats[k],0,1000000);
  if(Number.isSafeInteger(data.nextId))s.nextId=clamp(data.nextId,100,10000000);
  emit(s,'SURVIVAL SAVE RESTORED','success');return s;
}
