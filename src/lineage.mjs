// CROWNFOLD v0.5 — LOST FUTURES / THE WEAVE
// An era is a visual identity and a tactical philosophy, never an upgrade tier.
// Civilizations reached different, equally sophisticated peaks, many of which future archives forgot.
const ERA_IDS=['medieval','primeval','steam','neon','farfuture'];
export const COMMANDER_HERITAGES=Object.freeze({
 medieval:{name:'OATHBOUND ARCHITECT',age:'1278',trait:'HOLD THE LINE',description:'Command with cathedral geometry, resonant masonry and trained shield formations. Defensive stances protect supply lines.',effect:'defense'},
 primeval:{name:'UNWRITTEN PATHFINDER',age:'12,400 BCE',trait:'READ THE LAND',description:'Biological pattern-computers and living maps find routes predictive networks cannot model. Capture neutral wells faster.',effect:'capture'},
 steam:{name:'ESCAPEMENT MAGISTER',age:'1889',trait:'BUILD THE IMPOSSIBLE',description:'Machines without chips, mechanical oracles and pressure engines. War industries complete training sooner.',effect:'production'},
 neon:{name:'SIGNAL CORSAIR',age:'2086',trait:'NEVER STAND STILL',description:'Distributed squads and rapid radio coordination. Mobile stances reach distant timewells more quickly.',effect:'speed'},
 farfuture:{name:'GRAVITY GARDENER',age:'8420',trait:'BEND THE WEATHER',description:'Living gravity engines and grown architectures. Chronal field powers recover slightly faster.',effect:'cooldowns'}
});
export const LOST_TECH=Object.freeze({
 oath_geometry:{name:'OATH GEOMETRY',era:'medieval',cost:0,rarity:'LOST MATHEMATICS',effect:'Bulwark units take 15% less damage. No electronics required.',tag:'guard',story:'The masons of the Eleven Bells solved defensive topology with voices and carved arches. The answer was erased by a later empire.'},
 solar_script:{name:'THE SUNLESS SUN',era:'medieval',cost:15,rarity:'FORBIDDEN REACTOR',effect:'Allied siege damage increases by 18% against citadels, regardless of unit era.',tag:'siege',story:'Beneath monastery glass rests a miniature star whose light contains no heat. Their skyships once sailed without fuel.'},
 murmuration:{name:'MURMURATION ENGINE',era:'primeval',cost:11,rarity:'LIVING COMPUTATION',effect:'Skirmishing battalions deal 13% more damage with pattern-driven feints. Unlocks Hushfield.',tag:'ambush',story:'Before written language, the First Garden grew a living probability engine in migrating birds. It has no signal to intercept.'},
 bone_lattice:{name:'BONE LATTICE',era:'primeval',cost:13,rarity:'BIO-ARCHITECTURE',effect:'Every allied battalion takes 7% less damage using fossil-grown metamaterials.',tag:'armor',story:'The oldest cities were not made of stone. They were grown from a self-healing mineral that later histories misnamed bone.'},
 clock_oracle:{name:'ESCAPEMENT ORACLE',era:'steam',cost:12,rarity:'ANALOG PREDICTION',effect:'Ranged battalions gain 9% damage using mechanical probability tables.',tag:'aim',story:'An impossible pocketwatch solves trajectories through fluid gears. It cannot be hacked because it does not speak.'},
 ether_reactor:{name:'ETHER REACTOR',era:'steam',cost:15,rarity:'ENERGY WITHOUT WIRES',effect:'War supplies accrue 12% faster; all trained troops arrive 8% sooner.',tag:'economy',story:'The foundry queens distilled raw time into steam. The original recipes survived in a rhyme.'},
 ghost_protocol:{name:'GHOST PROTOCOL',era:'neon',cost:0,rarity:'RELAY-FREE SIGNAL',effect:'Skirmishers move 12% faster with courier-mesh tactics. Unlocks Flux Rush.',tag:'mobility',story:'One network engineer rediscovered the oldest network: people carrying messages without central servers.'},
 prism_mesh:{name:'PRISM MESH',era:'neon',cost:12,rarity:'REFRACTIVE ARMOR',effect:'Ranged battalions take 10% less damage while defending.',tag:'ranged_ward',story:'A city knitted protective fields from thousands of cheap glass lenses, not a single supercomputer.'},
 gravity_garden:{name:'GRAVITY GARDEN',era:'farfuture',cost:13,rarity:'LIVING GRAVITICS',effect:'Allies guarding friendly timewells take 12% less damage. Unlocks Gravity Root.',tag:'well_guard',story:'These forests grow their own down. Their roots hold stations in orbit and castles on ceilings.'},
 phase_archive:{name:'PHASE ARCHIVE',era:'farfuture',cost:15,rarity:'REMEMBERED PHYSICS',effect:'Battalion abilities recharge 10% faster; the battlefield can remember folded structures.',tag:'recharge',story:'After the computers stopped knowing why, people stored entire physics experiments inside living memories.'}
});
export const WEAVE_SYNERGIES=Object.freeze([
 {id:'cathedral_of_light',a:'oath_geometry',b:'prism_mesh',name:'CATHEDRAL OF LIGHT',effect:'Guarded ranged battalions gain another 8% protection.',summary:'Medieval geometry bends neon refraction into a floating cathedral shield.'},
 {id:'wild_oracle',a:'murmuration',b:'clock_oracle',name:'WILD ORACLE',effect:'Skirmish ranged damage gains an extra 8%.',summary:'Fossil birds provide the uncertainty mechanical futures cannot calculate.'},
 {id:'sun_garden',a:'solar_script',b:'gravity_garden',name:'SUN GARDEN',effect:'Sieges regain 6% of their damage as allied repairs.',summary:'A miniature medieval sun feeds a gravity orchard that repairs structures.'},
 {id:'phantom_gear',a:'ghost_protocol',b:'ether_reactor',name:'PHANTOM RAIL',effect:'Skirmish movement gains an extra 8% and war economy gains 4%.',summary:'Invisible couriers coordinate a steam railway that no network can see.'}
]);
export const WAR_POWERS=Object.freeze({
 oathwall:{name:'OATHWALL',key:'1',unlock:'oath_geometry',cost:55,cooldown:28,radius:28,duration:11,description:'Historic lost-tech: protect friendly battalions inside a resonant stone-time shield. Damage taken -35%.'},
 flux_rush:{name:'FLUX RUSH',key:'2',unlock:'ghost_protocol',cost:48,cooldown:24,radius:30,duration:10,description:'Network couriers accelerate nearby battalions (+35% speed / +12% attack), at the cost of +10% incoming damage.'},
 hushfield:{name:'HUSHFIELD',key:'3',unlock:'murmuration',cost:66,cooldown:38,radius:32,duration:10,description:'Ancient living computation disrupts enemy targeting inside the circle, reducing their attacks by 33%.'},
 gravity_root:{name:'GRAVITY ROOT',key:'4',unlock:'gravity_garden',cost:85,cooldown:48,radius:36,duration:10,description:'Fold a friendly timewell into a high-gravity bastion, advancing its capture and strengthening defenders.'}
});
export const MAX_WEAVE_SLOTS=3;
export function makeLineage(){return {commanderEra:'medieval',researched:['oath_geometry','ghost_protocol'],equipped:['oath_geometry','ghost_protocol']};}
export function migrateLineage(data){const def=makeLineage();if(!data||typeof data!=='object')return def;
 const researched=[...new Set([...def.researched,...(Array.isArray(data.researched)?data.researched:[]).filter(id=>Object.hasOwn(LOST_TECH,id))])];
 const equipped=[...new Set(Array.isArray(data.equipped)?data.equipped.filter(id=>researched.includes(id)):def.equipped)].slice(0,MAX_WEAVE_SLOTS);
 return {commanderEra:ERA_IDS.includes(data.commanderEra)?data.commanderEra:def.commanderEra,researched,equipped};}
export function setCommanderHeritage(s,era){if(!s?.temporal||s.zone!=='frontier'||!Object.hasOwn(COMMANDER_HERITAGES,era))return false;s.temporal.lineage=migrateLineage(s.temporal.lineage);s.temporal.lineage.commanderEra=era;return true;}
export function lostTechCost(s,id){const tech=LOST_TECH[id];if(!tech)return Infinity;const discovered=s?.temporal?.worldCaches?.some(site=>site.startsWith(tech.era+'-'))||false;return Math.max(0,tech.cost-(discovered?4:0));}
export function researchLostTech(s,id){const t=s?.temporal,tech=LOST_TECH[id];if(!t||!tech||s.zone!=='frontier'||!Number.isFinite(t.insight))return false;t.lineage=migrateLineage(t.lineage);const cost=lostTechCost(s,id);if(t.lineage.researched.includes(id)||t.insight<cost)return false;t.insight-=cost;t.lineage.researched.push(id);return true;}
export function equipLostTech(s,id){const t=s?.temporal;if(!t||s.zone!=='frontier'||!LOST_TECH[id])return false;t.lineage=migrateLineage(t.lineage);if(!t.lineage.researched.includes(id))return false;const list=t.lineage.equipped,i=list.indexOf(id);if(i>=0){list.splice(i,1);return true;}if(list.length>=MAX_WEAVE_SLOTS)return false;list.push(id);return true;}
export function equippedTech(s,id){return !!s?.temporal?.lineage?.equipped?.includes(id);}
export function activeWeaves(s){return WEAVE_SYNERGIES.filter(pair=>equippedTech(s,pair.a)&&equippedTech(s,pair.b));}
export function lineageModifiers(s,group,target=null,location=null){const stance=group?.stance||'balanced',tags=group?.type||'',has=id=>equippedTech(s,id),isRanged=(Number(group?.range)>=15) || (group?.type&&['longbow','hunters','cannons','signalers','synths','murmur','clockseers','sunlancers','nullcouriers','gravitics'].includes(tags));
 let offense=1,defense=1,speed=1;
 if(group?.side!=='ally')return {offense,defense,speed};
 if(has('oath_geometry')&&stance==='bulwark')defense*=.85;
 if(has('bone_lattice'))defense*=.93;
 if(has('prism_mesh')&&stance==='bulwark'&&isRanged)defense*=.90;
 if(has('clock_oracle')&&isRanged)offense*=1.09;
 if(has('murmuration')&&stance==='skirmish')offense*=1.13;
 if(has('ghost_protocol')&&stance==='skirmish')speed*=1.12;
 if(has('solar_script')&&target?.isBase)offense*=1.18;
 if(has('gravity_garden')&&location?.nearOwnedWell)defense*=.88;
 for(const weave of activeWeaves(s)){
  if(weave.id==='cathedral_of_light'&&isRanged&&stance==='bulwark')defense*=.92;
  if(weave.id==='wild_oracle'&&isRanged&&stance==='skirmish')offense*=1.08;
  if(weave.id==='phantom_gear'&&stance==='skirmish')speed*=1.08;
 }
 return {offense:Math.min(1.45,offense),defense:Math.max(.62,defense),speed:Math.min(1.35,speed)};
}
export function lineageEconomy(s){return (equippedTech(s,'ether_reactor')?1.12:1)*(activeWeaves(s).some(x=>x.id==='phantom_gear')?1.04:1);}
export function lineageTrainingFactor(s){return (equippedTech(s,'ether_reactor')?.92:1)*(s?.temporal?.lineage?.commanderEra==='steam'?.90:1);}
export function lineageCooldownFactor(s){return (equippedTech(s,'phase_archive')?.90:1)*(s?.temporal?.lineage?.commanderEra==='farfuture'?.90:1);}
