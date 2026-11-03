// CROWNFOLD — deterministic aggregate real-time strategy layer, run alongside the shooter.
// Battalions represent individuals without trying to draw thousands of autonomous sprites in this browser slice.
import {ERAS,ERA_ORDER,battleAffinity,facetAt,temporalModifier} from './temporal.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const BATTALIONS=Object.freeze({
 pikemen:{name:'PIKE WALL',era:'medieval',cost:38,count:12,hp:75,damage:8,range:5,speed:4.7,training:6,building:'barracks',description:'Disciplined anti-tech shields and long pikes.'},
 longbow:{name:'LONGBOW CIRCLE',era:'medieval',cost:52,count:9,hp:53,damage:8,range:33,speed:4.0,training:8,building:'barracks',description:'Analog precision ignores spoofing and jamming.'},
 riders:{name:'THUNDER CAVALRY',era:'medieval',cost:78,count:8,hp:115,damage:13,range:5.5,speed:10,training:11,building:'barracks',description:'Fast flanks and shock charges.'},
 hunters:{name:'ROOTBOUND HUNTERS',era:'primeval',cost:56,count:10,hp:63,damage:8.5,range:26,speed:6,training:8,building:'barracks',description:'Unpredictable ambush veterans strong versus future prediction.'},
 clockguard:{name:'CLOCKWORK GUARD',era:'steam',cost:78,count:8,hp:125,damage:12,range:23,speed:3.5,training:10,building:'foundry',description:'Armored clockwork troops, fierce against plate armor.'},
 cannons:{name:'COAL SIEGE TRAIN',era:'steam',cost:140,count:3,hp:180,damage:31,range:49,speed:2.6,training:18,building:'foundry',description:'Mobile cannons that knock down formations and keeps.'},
 signalers:{name:'SIGNAL RANGERS',era:'neon',cost:89,count:9,hp:70,damage:14,range:35,speed:6.5,training:12,building:'foundry',description:'Fast networked troops; best when supply is uninterrupted.'},
 synths:{name:'ORACLE SYNTHS',era:'farfuture',cost:120,count:6,hp:135,damage:20,range:32,speed:6.2,training:16,building:'foundry',description:'Predictive future machines, vulnerable to ancient hunters.'}
});
export const WAR_BUILDINGS=Object.freeze({
 barracks:{name:'MUSTER HALL',cost:65,hp:850,description:'Trains infantry, archers, cavalry and ancient hunters.'},
 foundry:{name:'TIME FORGE',cost:105,hp:630,description:'Trains clockwork, artillery and future-era battalions.'},
 watchtower:{name:'CHRONAL WATCHTOWER',cost:75,hp:570,description:'Protects nearby battalions and slows enemy advances.'}
});
export const WAR_CAMPAIGNS=Object.freeze([
 {id:'siege_of_bells',name:'THE SIEGE OF ELEVEN BELLS',era:'medieval',region:'The Crownless March',subtitle:'A keep obeys no century. Cut the siege line, occupy the three timewells, then dethrone the Bell Regent.',difficulty:1,mode:'war',enemyEra:'steam'},
 {id:'before_the_first_fire',name:'BEFORE THE FIRST FIRE',era:'primeval',region:'The First Garden',subtitle:'A hunting circle has trapped an oracle army in a forest older than memory. Learn why instinct beats prediction.',difficulty:2,mode:'war',enemyEra:'farfuture'},
 {id:'iron_parliament',name:'THE IRON PARLIAMENT',era:'steam',region:'The Gilded Engine',subtitle:'Seize the foundries before their mechanized ministers assemble an army across centuries.',difficulty:2,mode:'war',enemyEra:'neon'},
 {id:'the_blackout_coup',name:'THE BLACKOUT COUP',era:'neon',region:'The Electric Republic',subtitle:'An army of knights breaks the city network. You cannot hack a sword. Defend the grid using cunning.',difficulty:3,mode:'war',enemyEra:'medieval'},
 {id:'the_unborn_palace',name:'THE UNBORN PALACE',era:'farfuture',region:'The Last Tomorrow',subtitle:'The Hollow Empress sees every future but one: an army guided by an unwritten past.',difficulty:4,mode:'war',enemyEra:'primeval'}
]);
export function createWarfront(s,campaign){const t=s.temporal,enemyEra=campaign.enemyEra||'neon';const friendlyEra=campaign.era||s.era||'medieval';const army=[makeGroup(s,'pikemen','ally',-5,7),makeGroup(s,'longbow','ally',9,5)];
 const enemyArmy=[makeGroup(s,ERAS[enemyEra].unit==='synths'?'synths':ERAS[enemyEra].unit==='hunters'?'hunters':ERAS[enemyEra].unit==='clockguard'?'clockguard':ERAS[enemyEra].unit==='signalers'?'signalers':'pikemen','enemy',0,-103)];
 return {campaign:campaign.id,era:friendlyEra,enemyEra,supplies:205,income:2.6,popCap:120,population:army.reduce((v,a)=>v+a.count,0),base:{x:0,z:16,hp:2500,maxHp:2500},enemyBase:{x:0,z:-150,hp:2900,maxHp:2900},nodes:[{x:-72,z:-45,owner:'neutral',progress:0},{x:72,z:-48,owner:'neutral',progress:0},{x:1,z:-70,owner:'enemy',progress:0}],buildings:[{kind:'barracks',x:-13,z:14,hp:850}],queue:[],army,enemyArmy,enemyWaveTimer:27,combatTimer:0,elapsed:0,events:[],victory:null};
}
function makeGroup(s,type,side,x,z){const def=BATTALIONS[type],id=++s.nextId;return {id,type,side,era:def.era,x,z,tx:side==='ally'?0:0,tz:side==='ally'?-62:30,order:side==='ally'?'defend':'assault',count:def.count,maxCount:def.count,hp:def.hp,attackCooldown:id%5/8,morale:100};}
export function trainBattalion(s,type){const w=s.war,def=BATTALIONS[type];if(!w||!def||w.victory||s.zone!=='operation')return false;if(w.population+def.count> w.popCap)return false;if(!w.buildings.some(b=>b.kind===def.building))return false;if(w.supplies<def.cost)return false;w.supplies-=def.cost;w.population+=def.count;w.queue.push({type,remaining:def.training,side:'ally'});return true;}
export function constructWarBuilding(s,kind){const w=s.war,def=WAR_BUILDINGS[kind];if(!w||!def||s.zone!=='operation'||w.supplies<def.cost||w.buildings.length>=15)return false;const n=w.buildings.filter(b=>b.kind===kind).length;w.supplies-=def.cost;w.buildings.push({kind,x:s.player.x+(-1)**n*(12+n*6),z:s.player.z+8+(n%3)*6,hp:def.hp});return true;}
export function warOrder(s,order,x,z){const w=s.war;if(!w)return false;for(const b of w.army){b.order=order;b.tx=Number.isFinite(x)?x:s.player.x;b.tz=Number.isFinite(z)?z:s.player.z;}return w.army.length>0;}
function pushEvent(w,text){w.events.push(text);if(w.events.length>8)w.events.shift();}
function hitGroup(s,group,damage){const def=BATTALIONS[group.type],hit=damage/def.hp;group.hp-=hit*def.hp;if(group.hp<=0){group.count--;group.hp+=def.hp;group.morale=Math.max(0,group.morale-5);}if(group.count<=0){group.count=0;group.hp=0;}}
function fire(s,attacker,targets,base,dt){const w=s.war;if(attacker.count<=0)return;const def=BATTALIONS[attacker.type];attacker.attackCooldown=Math.max(0,attacker.attackCooldown-dt);if(attacker.attackCooldown>0)return;
 let target=null,d=Infinity;for(const g of targets){if(g.count<=0)continue;const range=distance(attacker,g);if(range<d){d=range;target=g;}}
 if(target&&d<=def.range){const mult=temporalModifier(s,attacker.era,target.era,attacker.x,attacker.z);hitGroup(s,target,def.damage*(.7+attacker.count*.15)*mult);attacker.attackCooldown=1.2;}else if(base&&distance(attacker,base)<def.range+7){base.hp=Math.max(0,base.hp-def.damage*(.7+attacker.count*.16)*battleAffinity(attacker.era,w.enemyEra==='neon'?'medieval':w.enemyEra,facetAt(s,attacker.x,attacker.z)?.era||null));attacker.attackCooldown=1.2;}
}
function updateGroup(s,g,enemies,base,dt){const w=s.war,def=BATTALIONS[g.type];if(g.count<=0)return;
 let tx=g.tx,tz=g.tz;if(g.order==='follow'&&g.side==='ally'){tx=s.player.x;tz=s.player.z;}else if(g.order==='assault'){if(g.side==='enemy'){const target=w.nodes.find(n=>n.owner==='ally')||w.base;tx=target.x;tz=target.z;}else {const target=enemies.filter(e=>e.count>0).sort((a,b)=>distance(g,a)-distance(g,b))[0]||w.enemyBase;tx=target.x;tz=target.z;}}
 const d=Math.hypot(tx-g.x,tz-g.z);if(d>Math.max(2.5,def.range*.65) || (g.order==='move'&&d>2)){const enemy=enemies.find(e=>e.count>0&&distance(e,g)<def.range*.9);if(!enemy||g.order==='move'){const step=Math.min(d,def.speed*dt);g.x+=(tx-g.x)/(d||1)*step;g.z+=(tz-g.z)/(d||1)*step;}}
 fire(s,g,enemies,base,dt);
}
export function shootWarBattalion(s,aim,damage){const w=s.war;if(!w)return false;const p=s.player,yaw=aim?.yaw??p.yaw,dir={x:Math.sin(yaw),z:-Math.cos(yaw)};let best=null,along=Infinity;for(const enemy of w.enemyArmy){if(enemy.count<=0)continue;const dx=enemy.x-p.x,dz=enemy.z-p.z,t=dx*dir.x+dz*dir.z,off=Math.abs(dx*dir.z-dz*dir.x);if(t>0&&t<90&&off<3.8&&t<along){best=enemy;along=t;}}if(best){hitGroup(s,best,damage*1.6);return true;}const b=w.enemyBase;const dx=b.x-p.x,dz=b.z-p.z,t=dx*dir.x+dz*dir.z;if(t>0&&t<92&&Math.abs(dx*dir.z-dz*dir.x)<11){b.hp=Math.max(0,b.hp-damage*.9);return true;}return false;}
export function warExplosion(s,x,z,damage,radius){const w=s.war;if(!w)return;for(const enemy of w.enemyArmy)if(enemy.count>0){const d=distance(enemy,{x,z});if(d<radius+3)hitGroup(s,enemy,damage*Math.max(.12,1-d/(radius+3)));}if(distance(w.enemyBase,{x,z})<radius+10)w.enemyBase.hp=Math.max(0,w.enemyBase.hp-damage*.5);}
export function stepWarfront(s,dt){const w=s.war;if(!w||w.victory)return w?.victory||null;w.elapsed+=dt;w.enemyWaveTimer-=dt;const held=w.nodes.filter(n=>n.owner==='ally').length;w.income=2.1+held*2.3+w.buildings.filter(b=>b.kind==='foundry').length*.18;w.supplies=Math.min(900,w.supplies+w.income*dt);
 for(const item of w.queue){item.remaining-=dt;if(item.remaining<=0){const i=w.buildings.find(b=>b.kind===BATTALIONS[item.type].building)||w.base;w.army.push(makeGroup(s,item.type,'ally',i.x+3,i.z-6));pushEvent(w,`${BATTALIONS[item.type].name} READY`);}}w.queue=w.queue.filter(q=>q.remaining>0);
 for(const group of w.army)updateGroup(s,group,w.enemyArmy,w.enemyBase,dt);for(const group of w.enemyArmy)updateGroup(s,group,w.army,w.base,dt);
 for(const node of w.nodes){let nearbyAllies=w.army.some(b=>b.count>0&&distance(b,node)<15)||distance(s.player,node)<10,nearbyEnemies=w.enemyArmy.some(b=>b.count>0&&distance(b,node)<15);if(nearbyAllies&&!nearbyEnemies){node.progress=clamp(node.progress+dt,0,12);if(node.progress>=12&&node.owner!=='ally'){node.owner='ally';node.progress=0;pushEvent(w,'TIMEWELL SECURED / INCOME INCREASED');}}else if(nearbyEnemies&&!nearbyAllies){node.progress=clamp(node.progress-dt, -12, 12);if(node.progress<=-12&&node.owner!=='enemy'){node.owner='enemy';node.progress=0;pushEvent(w,'TIMEWELL LOST / SUPPLY CUT');}}else node.progress*=.99;}
 w.army=w.army.filter(g=>g.count>0);w.enemyArmy=w.enemyArmy.filter(g=>g.count>0);w.population=w.army.reduce((n,b)=>n+b.count,0)+w.queue.reduce((n,q)=>n+BATTALIONS[q.type].count,0);
 if(w.enemyWaveTimer<=0){const choices=Object.values(BATTALIONS).filter(b=>b.era===w.enemyEra),spec=choices[Math.floor(w.elapsed/70)%choices.length]||BATTALIONS.pikemen;const type=Object.keys(BATTALIONS).find(k=>BATTALIONS[k]===spec);w.enemyArmy.push(makeGroup(s,type,'enemy',w.enemyBase.x+(w.enemyArmy.length%3-1)*7,w.enemyBase.z+9));w.enemyWaveTimer=clamp(38-(s.operation?.difficulty||1)*3,18,38);pushEvent(w,`ENEMY REINFORCEMENTS / ${spec.name}`);}
 // Allied watchtowers chip at units in proximity; capturing wells outproduces raw tech.
 for(const structure of w.buildings)if(structure.kind==='watchtower')for(const enemy of w.enemyArmy)if(distance(structure,enemy)<24&&enemy.count>0)hitGroup(s,enemy,dt*10);
 if(w.enemyBase.hp<=0){w.victory='ally';pushEvent(w,'THRONE BROKEN / CAMPAIGN WON');}if(w.base.hp<=0){w.victory='enemy';pushEvent(w,'YOUR CITADEL FELL / CAMPAIGN LOST');}return w.victory;
}
export function warSummary(w){if(!w)return null;return {supplies:Math.floor(w.supplies),income:Math.round(w.income*10)/10,population:w.population,popCap:w.popCap,held:w.nodes.filter(n=>n.owner==='ally').length,alliedBattalions:w.army.length,enemyBattalions:w.enemyArmy.length,enemyBaseHp:Math.round(w.enemyBase.hp),baseHp:Math.round(w.base.hp),queue:w.queue.length};}
