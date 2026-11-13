// CROWNFOLD: RIFTFRONT — original RPG rules. Pure-state, dependency-free systems.
// The shooter simulation owns enemies, terrain and movement; this module owns persistent RPG state.
import {ERA_ENVOYS} from './temporal.mjs';
const limit=(x,a,b)=>Math.max(a,Math.min(b,x));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const random01=(a,b,seed)=>{let n=(Math.imul(a|0,374761393)+Math.imul(b|0,668265263)+Math.imul(seed|0,1442695041))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
export const FACTIONS=Object.freeze({wardens:{name:'IRON WARDENS',motto:'No frontier falls while we stand.'},freefolk:{name:'FREEFOLK UNION',motto:'No banner owns the horizon.'},archive:{name:'THE PALE ARCHIVE',motto:'Every rift remembers something.'}});
export const NPCS=Object.freeze([
 {id:'mira',name:'MIRA VALE',role:'Outpost Quartermaster',faction:'wardens',x:-10,z:-5,line:'Every fortress begins with someone who knows how to keep it fed. The old world forgot that.',quests:['first_light','field_engineer','winter_stores']},
 {id:'rhys',name:'MARSHAL RHYS',role:'Iron Warden Commander',faction:'wardens',x:9,z:-7,line:'The gates are not invasion routes. They are wounds, and something is learning our names.',quests:['iron_oath','war_without_end','bastion_hunt']},
 {id:'lyra',name:'LYRA OF THE PALE ARCHIVE',role:'Rift Archaeologist',faction:'archive',x:-9,z:9,line:'The ruins remember an empire that existed tomorrow. Find me proof, and I will teach you to listen.',quests:['the_glass_key','the_three_echoes','relic_hunter']},
 {id:'vesper',name:'VESPER SIX',role:'Wandering Relic Broker',faction:'freefolk',x:10,z:9,line:'A good relic is like a good lie: valuable, dangerous, and only useful when somebody believes it.',quests:['the_broker','crystal_fever'],vendor:true},
 {id:'tamsin',name:'TAMSIN RHO',role:'Medic Companion',faction:'freefolk',x:-14,z:3,line:'I keep people breathing. You keep them out of my triage tent. We might get along.',companion:'MEDIC'},
 {id:'rooke',name:'ROOKE THE UNBOUND',role:'Heavy Companion',faction:'freefolk',x:42,z:32,line:'I was a siege engine once. The engineers forgot to install the off switch.',companion:'HEAVY',minRep:10},
 {id:'sable',name:'SABLE',role:'Freefolk Pathrunner',faction:'freefolk',x:37,z:29,line:'The road belongs to whoever walks it. Build your walls carefully.',quests:['scout_the_wild','lost_ledger']},
 ...ERA_ENVOYS
]);
export const LANDMARKS=Object.freeze([
 {id:'home',name:'WARDEN HEARTH',x:0,z:0,kind:'settlement',description:'Your home outpost, a fragile beginning to a larger civilization.'},
 {id:'freehold',name:'THE UNBOUND MARKET',x:40,z:32,kind:'settlement',description:'A caravan village that trades in secrets and reconstructed machines.'},
 {id:'glass',name:'THE MIRROR MAW',x:-43,z:-54,kind:'dungeon',description:'A vault folded inside itself, full of glass-born wardens.'},
 {id:'roots',name:'CATHEDRAL OF ROOTS',x:93,z:54,kind:'dungeon',description:'A living ruin that grows around the sleepers beneath it.'},
 {id:'archive',name:'THE DROWNED ARCHIVE',x:-93,z:54,kind:'dungeon',description:'A library where the tides carry things older than written history.'},
 {id:'watch',name:'ASHWATCH TOWER',x:89,z:-21,kind:'cache',description:'A forgotten watchtower with a locked reserve of supplies.'},
 {id:'bloom',name:'THE STARFALL GARDEN',x:-56,z:109,kind:'cache',description:'A field of singing crystals and shattered orbiting stone.'},
 {id:'wreck',name:'THE GHOST CONVOY',x:127,z:113,kind:'cache',description:'An abandoned military convoy with intact experimental gear.'}
]);
export const LOCKBOXES=Object.freeze([
 {id:'hearth',name:"THE QUARTERMASTER'S SECRET",x:22,z:24,difficulty:1,desc:'A forgotten pre-Fracture coffer buried beyond camp.'},
 {id:'watchsafe',name:'THE ASHWATCH BLACKBOX',x:93,z:-31,difficulty:2,desc:'A cipher-locked safe beneath the Ashwatch transmitter.'},
 {id:'starfall',name:'THE STARFALL CASKET',x:-61,z:113,difficulty:3,desc:'A crystal-wrapped lock that remembers every wrong turn.'}
]);
export const DUNGEONS=Object.freeze([
 {id:'glass',name:'MIRROR MAW VAULT',faction:'archive',theme:'violet',boss:'warden',bossName:'THE REFLECTED KNIGHT',subtitle:'Break the two reflection seals, defeat the Vault Knight, claim the prism.',reward:'PRISM OF OLD TOMORROWS'},
 {id:'roots',name:'CATHEDRAL OF ROOTS',faction:'freefolk',theme:'green',boss:'titan',bossName:'THE GARDEN THAT WALKS',subtitle:'Disrupt the growth hearts and confront the walking cathedral.',reward:'THE THORN CROWN'},
 {id:'archive',name:'THE DROWNED ARCHIVE',faction:'wardens',theme:'blue',boss:'artillery',bossName:'THE DROWNED CURATOR',subtitle:'Restore two mnemonic relays and silence the thing inside the stacks.',reward:'THE DEEP CHRONICLE'}
]);
export const PERKS=Object.freeze({
 sharpshooter:{name:'DEADEYE',tree:'WARFARE',max:3,description:'+9% outgoing weapon damage per rank.'},
 demolition:{name:'SIEGE MIND',tree:'WARFARE',max:3,description:'+16% blast damage per rank.'},
 executioner:{name:'EXECUTION PROTOCOL',tree:'WARFARE',max:3,description:'+14% damage versus enemies under half health per rank.'},
 armored:{name:'IRON SKIN',tree:'SURVIVAL',max:3,description:'+20 maximum health and 6% damage reduction per rank.'},
 aegis:{name:'AEGIS BORN',tree:'SURVIVAL',max:3,description:'+15 maximum shield and faster shield regeneration.'},
 pathfinder:{name:'WAYFINDER',tree:'SURVIVAL',max:3,description:'+8% movement speed and lower sprint exhaustion per rank.'},
 fieldmedic:{name:'FIELD SURGEON',tree:'SURVIVAL',max:3,description:'+20 medkit healing and +15% passive healing per rank.'},
 scavenger:{name:'SALVAGE SENSE',tree:'MASTERY',max:3,description:'+25% harvested resources per rank.'},
 craftsman:{name:'MASTER ARTIFICER',tree:'MASTERY',max:3,description:'Build and craft at a 10% material discount per rank.'},
 merchant:{name:'SILVER TONGUE',tree:'MASTERY',max:3,description:'Trade goods cost 12% fewer crowns per rank.'},
 tactician:{name:'WAR MARSHAL',tree:'COMMAND',max:3,description:'+12% squad and defense turret damage per rank.'},
 fieldleader:{name:'BANNER BEARER',tree:'COMMAND',max:3,description:'+15% squad health, plus stronger rally effects.'},
 architect:{name:'FOUNDRY HEART',tree:'COMMAND',max:3,description:'+20% structure durability per rank.'},
 chronomancer:{name:'CLOCKBREAKER',tree:'ARCANA',max:3,description:'Reduce Fold and Echo cooldowns by 12% per rank.'},
 fluxweaver:{name:'FLUX SAVANT',tree:'ARCANA',max:3,description:'Reduce arcane ability Flux costs by 12% per rank.'},
 stormcaller:{name:'STORMBINDER',tree:'ARCANA',max:3,description:'+18% damage of offensive arcane abilities per rank.'},
 locksmith:{name:'TUMBLER WHISPERER',tree:'MASTERY',max:3,description:'Increase mechanical safecracking tolerance by +2 dial points per rank.'},
 shadow:{name:'SOFT-FOOT LEGEND',tree:'SURVIVAL',max:3,description:'Lower chance of theft being noticed; bonus surprise strike damage when crouched.'}
});
export const ABILITIES=Object.freeze({
 blink:{name:'RIFT BLINK',key:'4',flux:12,cooldown:9,description:'Teleport 13 meters in your aim direction; dodge incoming fire.'},
 nova:{name:'GRAVITY NOVA',key:'5',flux:28,cooldown:19,description:'Blast a radius around you, damaging and launching nearby enemies.'},
 stasis:{name:'STASIS BLOOM',key:'6',flux:32,cooldown:28,description:'Freeze enemies in a 22m zone for six seconds.'},
 cloak:{name:'GHOST VEIL',key:'7',flux:24,cooldown:32,description:'Become invisible to most enemies for 10 seconds, broken by firing.'},
 drone:{name:'WISP SWARM',key:'8',flux:38,cooldown:42,description:'Summon three mobile friendly drones for 26 seconds.'},
 rally:{name:'WAR CHANT',key:'9',flux:20,cooldown:34,description:'Overcharge your squad with speed, strength, shields and healing.'}
});
export const RECIPES=Object.freeze({
 meds:{name:'FIELD MEDKIT ×2',cost:{fiber:6,ore:2},result:{medkit:2},description:'Restore health in combat.'},
 rations:{name:'SURVIVAL MEAL ×3',cost:{fiber:4,water:1},result:{ration:3},description:'Renew hunger through the wilderness.'},
 filters:{name:'WATER PURIFIER ×3',cost:{scrap:4,fiber:3},result:{water:3},description:'Clean drinking water.'},
 grenades:{name:'SHARD GRENADES ×3',cost:{scrap:6,ore:5},result:{grenades:3},description:'Area damage for hard targets.'},
 flux:{name:'CONDENSED FLUX ×25',cost:{ore:8,fiber:4},result:{flux:25},description:'Fuel rift spells and Fold powers.'},
 ammo:{name:'BALLISTIC AMMO CRATE',cost:{scrap:9,ore:5},result:{ammo:1},description:'Replenish weapon reserves.'},
 armor:{name:'FORGE ARMOR',cost:{scrap:42,ore:28,flux:12},result:{gear:'armor'},description:'Create randomized protective gear.'},
 relic:{name:'BIND A RELIC',cost:{ore:20,flux:40},result:{gear:'relic'},description:'Create a rare rift relic.'},
 mod:{name:'TUNE A WEAPON',cost:{scrap:35,ore:21,flux:15},result:{gear:'mod'},description:'Create a randomized weapon mod.'},
 picks:{name:'FIELD LOCKPICKS ×4',cost:{scrap:6,ore:2},result:{lockpicks:4},description:'Repairable tumblers for opening lost frontier safes.'}
});
const GEAR_NAMES={armor:['RIFTWALKER PLATING','TITANWEAVE ARMOR','FROSTLINE COAT','GLASSGUARD AEGIS','GHOSTPLATE'],relic:['BROKEN HOURGLASS','SINGING WISHBONE','STARFALL EMBER','THORNHEART','MIRROR SEED'],mod:['SIEGE BARREL','ARC CHAMBER','WHISPER SIGHT','KINETIC CHOKE','CHRONAL RECEIVER']};
export const RARITIES=Object.freeze([{name:'COMMON',color:'#aab8b8',mult:1},{name:'UNCOMMON',color:'#77dbac',mult:1.3},{name:'RARE',color:'#72b2ff',mult:1.7},{name:'EPIC',color:'#c699ff',mult:2.2},{name:'MYTHIC',color:'#ffc475',mult:3.0}]);
export const QUESTS=Object.freeze([
 {id:'first_light',name:'THE FIRST LIGHT',giver:'mira',goal:{type:'harvest',target:'fiber',count:8},description:'Harvest 8 fiber to reinforce the outpost before the night raid.',rewards:{xp:75,coins:45,rep:{wardens:8},medkit:2}},
 {id:'iron_oath',name:'BLOOD ON THE RADIO',giver:'rhys',goal:{type:'kill',target:'raider',count:4},description:'Kill 4 raiders scouting the Warden Hearth.',rewards:{xp:150,coins:90,rep:{wardens:15}}},
 {id:'field_engineer',name:'A CITY OUT OF SCRAP',giver:'mira',goal:{type:'build',target:'any',count:3},description:'Construct three defenses or support buildings in the open frontier.',rewards:{xp:180,coins:125,rep:{wardens:12},scrap:30}},
 {id:'the_glass_key',name:'THE GLASS KEY',giver:'lyra',goal:{type:'dungeon',target:'glass',count:1},description:'Explore the Mirror Maw vault and recover its impossible relic.',rewards:{xp:300,coins:165,rep:{archive:20},gear:'relic'}},
 {id:'scout_the_wild',name:'BEYOND THE LAST MAP',giver:'sable',goal:{type:'discover',target:'any',count:3},description:'Discover three new landmarks in the wild.',rewards:{xp:180,coins:75,rep:{freefolk:16}}},
 {id:'the_broker',name:'A DEAL WITH THE DEVIL',giver:'vesper',goal:{type:'chest',target:'any',count:2},description:'Open two forgotten supply caches or tomb chests.',rewards:{xp:140,coins:150,rep:{freefolk:10}}},
 {id:'crystal_fever',name:'THE COLOR OF LIGHTNING',giver:'vesper',goal:{type:'harvest',target:'flux',count:16},description:'Gather 16 Flux from mineral deposits.',rewards:{xp:130,coins:110,rep:{freefolk:8}}},
 {id:'winter_stores',name:'SUPPLY, SUPPLY, SUPPLY',giver:'mira',goal:{type:'craft',target:'any',count:3},description:'Craft three recipes to replenish the settlement.',rewards:{xp:160,coins:95,rep:{wardens:12}}},
 {id:'bastion_hunt',name:'THE MEN IN PURPLE',giver:'rhys',goal:{type:'kill',target:'warden',count:3},description:'Destroy three enemy Wardens before they find the settlement.',rewards:{xp:260,coins:165,rep:{wardens:20}}},
 {id:'war_without_end',name:'THE SIXTH BELL',giver:'rhys',goal:{type:'operation',target:'any',count:1},description:'Complete a six-phase Rift operation and survive extraction.',rewards:{xp:400,coins:220,rep:{wardens:26},gear:'armor'}},
 {id:'relic_hunter',name:'CATALOG OF IMPOSSIBLE THINGS',giver:'lyra',goal:{type:'dungeon',target:'any',count:2},description:'Return from two distinct lost dungeons alive.',rewards:{xp:370,coins:170,rep:{archive:28},gear:'mod'}},
 {id:'lost_ledger',name:'THE GHOST CONVOY',giver:'sable',goal:{type:'discover',target:'wreck',count:1},description:'Find the legendary convoy wreck beyond the eastern scar.',rewards:{xp:260,coins:150,rep:{freefolk:18}}},
 {id:'the_three_echoes',name:'THE THREE ECHOES',giver:'lyra',prerequisite:'the_glass_key',goal:{type:'dungeon',target:'any',count:3},description:'Clear all three old-world dungeons. Their memories must be reunited.',rewards:{xp:900,coins:500,rep:{archive:48},gear:'relic'}}
]);
export const QUEST_BY_ID=Object.fromEntries(QUESTS.map(q=>[q.id,q]));
export const NPC_BY_ID=Object.fromEntries(NPCS.map(n=>[n.id,n]));
export const DUNGEON_BY_ID=Object.fromEntries(DUNGEONS.map(n=>[n.id,n]));
export function makeRPG(){return {perkPoints:2,perks:{},quests:{},tracked:'first_light',factions:{wardens:0,freefolk:0,archive:0},allegiance:null,coins:120,gear:[],equipped:{armor:null,relic:null,mod:null},discovered:['home'],opened:[],dungeonCleared:[],companions:[],affinity:{},flags:{},abilityCooldowns:{},status:{cloak:0,rally:0},activeQuestHistory:[],totalCrafted:0,totalLooted:0,bountySerial:0,bounty:null,dialogue:null,worldEnding:null,crime:{bounty:0,stolen:0,caught:0}};}
export const perkRank=(s,id)=>limit(s.rpg?.perks?.[id]||0,0,3);
export const rpgStat=(s,stat)=>{const rank=id=>perkRank(s,id);const gear=Object.values(s.rpg?.equipped||{}).filter(Boolean).map(id=>s.rpg.gear.find(g=>g.id===id)).filter(Boolean);
 const item=(name)=>gear.reduce((total,g)=>total+(g.stats[name]||0),0);
 const values={damage:1+rank('sharpshooter')*.09+item('damage')*.01,blast:1+rank('demolition')*.16,execute:1+rank('executioner')*.14,armor:limit(rank('armored')*.06+item('armor')*.01,0,.75),health:140+rank('armored')*20+item('health'),shield:40+rank('aegis')*15+item('shield'),speed:1+rank('pathfinder')*.08,staminaCost:1-rank('pathfinder')*.12,healing:1+rank('fieldmedic')*.15,harvest:1+rank('scavenger')*.25,discount:1-rank('craftsman')*.1,prices:(1-rank('merchant')*.12)*((s.rpg?.factions?.freefolk||0)>=20?.87:(s.rpg?.factions?.freefolk||0)<-20?1.23:1),squad:1+rank('tactician')*.12,squadHealth:1+rank('fieldleader')*.15,buildingHp:1+rank('architect')*.2,cooldowns:1-rank('chronomancer')*.12,fluxCosts:1-rank('fluxweaver')*.12,arcane:1+rank('stormcaller')*.18,medkit:85+rank('fieldmedic')*20};return values[stat]??0;};
export function buyPerk(s,id){const perk=PERKS[id];if(!perk||!s.rpg||s.rpg.perkPoints<=0||perkRank(s,id)>=perk.max)return false;
 s.rpg.perkPoints--;s.rpg.perks[id]=(s.rpg.perks[id]||0)+1;const p=s.player;const oldMaxHp=p.maxHp,oldMaxShield=p.maxShield;p.maxHp=rpgStat(s,'health');p.maxShield=rpgStat(s,'shield');p.hp+=p.maxHp-oldMaxHp;p.shield+=p.maxShield-oldMaxShield;return true;}
export function grantXP(s,amount){if(!Number.isFinite(amount)||amount<=0)return 0;const p=s.player;p.xp+=amount;let gained=0;while(p.xp>=p.level*110&&gained<30){p.xp-=p.level*110;p.level++;gained++;s.rpg.perkPoints++;p.maxHp=rpgStat(s,'health');p.maxShield=rpgStat(s,'shield');p.hp=Math.min(p.maxHp,p.hp+30);p.shield=Math.min(p.maxShield,p.shield+15);}if(gained)rpgMessage(s,`LEVEL ${p.level} / +${gained} PERK POINT${gained===1?'':'S'}`,'success');return gained;}
function rpgMessage(s,text,type='info'){s.messages.push({id:++s.lastEvent,text,type,at:s.time});if(s.messages.length>12)s.messages.shift();}
export function generateGear(s,slot='relic',tier=1,source=0){if(!GEAR_NAMES[slot])return null;const id=++s.nextId,r=random01(id+source,Math.floor(s.time)+tier,s.seed),rarity=limit(Math.floor(Math.pow(r,.55)*5),0,4),base=GEAR_NAMES[slot],name=base[Math.floor(random01(id,source+51,s.seed)*base.length)];const scale=RARITIES[rarity].mult*(1+Math.max(0,tier-1)*.23);
 const stats=slot==='armor'?{armor:Math.round(5*scale),health:Math.round(12*scale)}:slot==='relic'?{shield:Math.round(9*scale),damage:Math.round(3*scale)}:{damage:Math.round(8*scale)};
 const gear={id,slot,name,rarity,level:tier,stats};s.rpg.gear.push(gear);rpgMessage(s,`${RARITIES[rarity].name} FIND / ${name}`,'success');return gear;}
export function equipGear(s,id){const g=s.rpg.gear.find(g=>g.id===id);if(!g)return false;const p=s.player,oldHp=p.maxHp,oldShield=p.maxShield;s.rpg.equipped[g.slot]=g.id;p.maxHp=rpgStat(s,'health');p.maxShield=rpgStat(s,'shield');p.hp=limit(p.hp+p.maxHp-oldHp,1,p.maxHp);p.shield=limit(p.shield+p.maxShield-oldShield,0,p.maxShield);rpgMessage(s,`EQUIPPED / ${g.name}`,'success');return true;}
export function salvageGear(s,id){const g=s.rpg.gear.find(g=>g.id===id);if(!g||Object.values(s.rpg.equipped).includes(id))return false;s.rpg.gear=s.rpg.gear.filter(item=>item.id!==id);s.inventory.scrap+=8+g.rarity*10;s.inventory.ore+=3+g.rarity*3;rpgMessage(s,`SALVAGED / ${g.name}`);return true;}
export function giveReward(s,reward){if(!reward)return;for(const [k,v] of Object.entries(reward)){if(k==='xp')grantXP(s,v);else if(k==='coins')s.rpg.coins+=v;else if(k==='gear')generateGear(s,v,Math.max(1,Math.floor(s.player.level/2)+1),s.nextId);else if(k==='rep'){for(const [f,n] of Object.entries(v))if(f in FACTIONS)s.rpg.factions[f]=limit(s.rpg.factions[f]+n,-100,100);}else if(k in s.inventory)s.inventory[k]+=v;}}
export function generateBounty(s){const r=s.rpg,i=r.bountySerial,types=[
 {name:'THE NESTS GO QUIET',goal:{type:'kill',target:'crawler',count:5},faction:'wardens'},
 {name:'NO MERCY FOR THE RAIDERS',goal:{type:'kill',target:'raider',count:4},faction:'freefolk'},
 {name:'SILENCE THE GIANTS',goal:{type:'kill',target:'warden',count:2},faction:'wardens'},
 {name:'SALVAGE RUN',goal:{type:'harvest',target:'ore',count:12},faction:'freefolk'},
 {name:'CHARGE THE BATTERIES',goal:{type:'harvest',target:'flux',count:18},faction:'archive'},
 {name:'FIELD INGENUITY',goal:{type:'craft',target:'any',count:3},faction:'freefolk'},
 {name:'THE WORK MUST CONTINUE',goal:{type:'build',target:'any',count:2},faction:'wardens'},
 {name:'BURIED TRUTHS',goal:{type:'dungeon',target:'any',count:1},faction:'archive'}];
 const template=types[Math.floor(random01(i+7,19,s.seed)*types.length)];r.bounty={id:i,name:template.name,goal:{...template.goal},faction:template.faction,progress:0,status:'offered',coins:80+Math.floor(s.player.level*21+i*.8),xp:95+s.player.level*32,unique:[]};return r.bounty;}
export function startBounty(s){const b=s.rpg.bounty||generateBounty(s);if(b.status!=='offered')return false;b.status='active';rpgMessage(s,`RADIANT BOUNTY / ${b.name}`,'command');return true;}
export function claimBounty(s){const b=s.rpg.bounty;if(!b||b.status!=='ready'||s.zone!=='frontier'||distance(s.player,{x:3,z:14})>13)return false;
 giveReward(s,{coins:b.coins,xp:b.xp,rep:{[b.faction]:9}});s.rpg.bountySerial++;rpgMessage(s,`BOUNTY PAID / ${b.coins} CROWNS`,'success');generateBounty(s);return true;}
// Vault victories are permanent world history. Accepting later or loading an older
// save must not make a finite, three-vault quest impossible. Reconcile credit only;
// rewards remain exclusively behind the existing ready -> done turn-in transition.
function reconcileDungeonQuest(r,id){
 const q=QUEST_BY_ID[id],state=r.quests[id];
 if(!q||q.goal.type!=='dungeon'||!state||!['active','ready'].includes(state.status))return;
 const valid=id=>typeof id==='string'&&Object.hasOwn(DUNGEON_BY_ID,id);
 const remembered=[...new Set([...(state.unique||[]),...r.dungeonCleared].filter(valid))].filter(id=>q.goal.target==='any'||q.goal.target===id);
 state.unique=remembered;
 state.progress=limit(Math.max(state.progress,remembered.length),0,q.goal.count);
 if(state.progress>=q.goal.count)state.status='ready';
}
// Finite discoveries remain usable after meeting Sable. Home is pre-known,
// not an earned discovery. Never pay rewards while repairing world-history credit.
function reconcileDiscoveryQuest(r,id){
 const q=QUEST_BY_ID[id],state=r.quests[id];
 if(q?.goal.type!=='discover'||!state||!['active','ready'].includes(state.status))return;
 const count=new Set(r.discovered.filter(place=>place!=='home'&&LANDMARKS.some(p=>p.id===place)&&(q.goal.target==='any'||q.goal.target===place))).size;
 state.progress=limit(Math.max(state.progress,count),0,q.goal.count);
 if(state.progress>=q.goal.count)state.status='ready';
}
export function takeQuest(s,id){const q=QUEST_BY_ID[id];if(!q||s.rpg.quests[id]||q.prerequisite&&s.rpg.quests[q.prerequisite]?.status!=='done')return false;s.rpg.quests[id]={status:'active',progress:0};reconcileDungeonQuest(s.rpg,id);reconcileDiscoveryQuest(s.rpg,id);s.rpg.tracked=id;rpgMessage(s,s.rpg.quests[id].status==='ready'?`QUEST READY / RETURN TO ${NPC_BY_ID[q.giver].name}`:`QUEST BEGUN / ${q.name}`,'command');return true;}
export function turnInQuest(s,id){const q=QUEST_BY_ID[id],state=s.rpg.quests[id];if(!q||state?.status!=='ready')return false;state.status='done';giveReward(s,q.rewards);for(const id of s.rpg.companions)s.rpg.affinity[id]=limit((s.rpg.affinity[id]||0)+6,0,100);s.rpg.tracked=QUESTS.find(a=>s.rpg.quests[a.id]?.status==='active')?.id||null;rpgMessage(s,`QUEST COMPLETE / ${q.name}`,'success');return true;}
export function rpgEvent(s,type,target='any',amount=1){if(!s.rpg)return;
 const b=s.rpg.bounty;if(b?.status==='active'&&b.goal.type===type&&(b.goal.target==='any'||b.goal.target===target)){
  let n=Math.max(0,amount);if(type==='dungeon'){if(b.unique.includes(target))n=0;else b.unique.push(target);}
  b.progress=limit(b.progress+n,0,b.goal.count);if(b.progress>=b.goal.count){b.status='ready';rpgMessage(s,`BOUNTY COMPLETE / RETURN TO THE NOTICE BOARD`,'success');}}
for(const [id,state] of Object.entries(s.rpg.quests)){if(state.status!=='active')continue;const q=QUEST_BY_ID[id];if(!q||q.goal.type!==type||q.goal.target!=='any'&&q.goal.target!==target)continue;const increment=type==='dungeon'&&q.goal.target==='any'?(state.unique??=[]).includes(target)?0:(state.unique.push(target),1):Math.max(0,amount);state.progress=limit(state.progress+increment,0,q.goal.count);if(state.progress>=q.goal.count){state.status='ready';rpgMessage(s,`QUEST READY / RETURN TO ${NPC_BY_ID[q.giver]?.name||'THE GIVER'}`,'success');}}}
// A recipe is atomic: never pay for output that cannot fit in the loadout.
export function craftingStatus(s,id){const spec=RECIPES[id];if(!spec)return{ok:false,reason:'UNKNOWN RECIPE',cost:{}};
 const discount=rpgStat(s,'discount'),cost=Object.fromEntries(Object.entries(spec.cost).map(([k,n])=>[k,Math.ceil(n*discount)]));
 if(spec.result.grenades&&s.player.grenades+spec.result.grenades>12)return{ok:false,reason:'NEED ROOM FOR 3 GRENADES',cost};
 const missing=Object.entries(cost).filter(([k,n])=>(s.inventory[k]||0)<n).map(([k,n])=>`${n-(s.inventory[k]||0)} ${k.toUpperCase()}`);
 return{ok:missing.length===0,reason:missing.length?`NEED ${missing.join(' · ')}`:'READY TO CRAFT',cost};}
export function craft(s,id){const status=craftingStatus(s,id);if(!status.ok){rpgMessage(s,status.reason,'warning');return false;}const spec=RECIPES[id],discount=rpgStat(s,'discount');
 for(const [k,n] of Object.entries(spec.cost))s.inventory[k]-=Math.ceil(n*discount);for(const [k,n]of Object.entries(spec.result)){if(k==='gear')generateGear(s,n,Math.max(1,Math.floor(s.player.level/2)+1),spec.cost.flux||0);else if(k==='grenades')s.player.grenades=limit(s.player.grenades+n,0,12);else if(k==='ammo')for(const [weapon,amt]of Object.entries({rifle:110,scatter:36,rail:24,smg:160,cryo:60,launcher:10}))s.player.reserve[weapon]+=amt;else s.inventory[k]=(s.inventory[k]||0)+n;}
 s.rpg.totalCrafted++;rpgEvent(s,'craft',id,1);rpgMessage(s,`CRAFTED / ${spec.name}`,'success');return true;}
export function markDiscovered(s,id){if(s.zone!=='frontier'||s.rpg.discovered.includes(id)||!LANDMARKS.some(p=>p.id===id))return false;s.rpg.discovered.push(id);rpgMessage(s,`DISCOVERED / ${LANDMARKS.find(p=>p.id===id).name}`,'success');grantXP(s,32);rpgEvent(s,'discover',id);return true;}
export function discoverNearby(s){if(s.zone!=='frontier'||s.era!=='medieval')return;for(const place of LANDMARKS)if(distance(place,s.player)<19)markDiscovered(s,place.id);}
export function fastTravel(s,id){const place=LANDMARKS.find(p=>p.id===id);if(!place||s.era!=='medieval'||s.zone!=='frontier'||!s.rpg.discovered.includes(id)||s.enemies.some(e=>e.hp>0&&distance(e,s.player)<25))return false;
 s.player.x=place.x+4;s.player.z=place.z+4;s.player.y=0;s.player.vy=0;s.player.memories=[];s.player.hunger=limit(s.player.hunger-5,0,100);s.player.thirst=limit(s.player.thirst-7,0,100);for(let i=0;i<s.squad.length;i++){const u=s.squad[i];u.x=s.player.x+(i%3-1)*2;u.z=s.player.z+3+i%2;u.order='follow';}rpgMessage(s,`CARAVAN TRAVEL / ${place.name}`,'success');return true;}
export function attemptLock(s,id,position){
 const lock=LOCKBOXES.find(l=>l.id===id),p=s.player;if(!lock||s.zone!=='frontier'||distance(p,lock)>8)return{ok:false,text:'You must be next to the safe.'};
 if(s.rpg.opened.includes('lock:'+id))return{ok:false,text:'This safe is already empty.'};
 if(!Number.isInteger(position)||position<0||position>99)return{ok:false,text:'Tune your dial between 0 and 99.'};
 if((s.inventory.lockpicks||0)<1)return{ok:false,text:'You need a lockpick. Forge more in the crafting menu.'};
 const target=Math.floor(random01(lock.x,lock.z,s.seed)*100),gap=Math.abs(target-position),tol=[0,9,6,3][lock.difficulty]+2*perkRank(s,'locksmith');
 if(gap<=tol){s.inventory.lockpicks--;openChest(s,'lock:'+id,lock.x+lock.z);s.rpg.coins+=30*lock.difficulty;grantXP(s,20*lock.difficulty);return{ok:true,opened:true,text:`TUMBLERS ALIGNED / ${lock.name} OPENED`};}
 s.inventory.lockpicks--;const temp=gap<=15?'HOT':gap<=32?'WARM':'COLD',direction=position<target?'HIGHER':'LOWER';
 return{ok:true,opened:false,text:`${temp} / ${direction} · ${s.inventory.lockpicks} PICKS LEFT`,heat:temp,direction};
}
export function attemptPickpocket(s,id){const npc=NPC_BY_ID[id],r=s.rpg;if(!npc||s.zone!=='frontier'||(npc.era||'medieval')!==s.era||distance(s.player,npc)>10||!s.player.crouch||r.flags['stole:'+id])return{ok:false,text:'Stay crouched, approach quietly, and choose an untouched target.'};
 r.flags['stole:'+id]=true;const roll=random01(id.length+Math.floor(s.time*19),Math.floor(npc.x+npc.z),s.seed),chance=.5+perkRank(s,'shadow')*.13;
 if(roll<chance){const gain=22+Math.floor(random01(npc.x,npc.z,s.seed)*43);r.coins+=gain;r.crime.stolen+=gain;r.factions[npc.faction]=limit(r.factions[npc.faction]-3,-100,100);rpgMessage(s,`PICKPOCKET SUCCESS / +${gain} CROWNS`,'success');return{ok:true,stolen:true,text:`A quick hand. ${gain} crowns changed owners. They haven't noticed yet.`};}
 r.crime.bounty+=50+15*perkRank(s,'shadow');r.crime.caught++;r.factions[npc.faction]=limit(r.factions[npc.faction]-25,-100,100);rpgMessage(s,`WANTED / ${r.crime.bounty} CROWN FINE`,'warning');return{ok:false,caught:true,text:`Caught! A ${r.crime.bounty}-crown fine now follows you. Find Marshal Rhys to pay it.`};
}
export function payFine(s){const c=s.rpg.crime;if(s.zone!=='frontier'||distance(s.player,NPC_BY_ID.rhys)>12||!c.bounty||s.rpg.coins<c.bounty)return false;s.rpg.coins-=c.bounty;c.bounty=0;s.rpg.factions.wardens=limit(s.rpg.factions.wardens+4,-100,100);rpgMessage(s,'YOUR RECORD IS CLEARED','success');return true;}
export function openChest(s,id,source=0){if(s.rpg.opened.includes(id))return false;s.rpg.opened.push(id);s.inventory.scrap+=18+Math.round(random01(s.rpg.opened.length,source,s.seed)*35);s.inventory.flux+=10;s.rpg.coins+=25+Math.floor(random01(source,9,s.seed)*45);generateGear(s,source%3===0?'armor':source%3===1?'relic':'mod',Math.max(1,Math.floor(s.player.level/2)),source);s.rpg.totalLooted++;rpgEvent(s,'chest',id);return true;}
export function recruitCompanion(s,id){const npc=NPC_BY_ID[id];if(!npc?.companion||(npc.era||'medieval')!==s.era||s.rpg.companions.includes(id)||s.squad.length>=8||s.rpg.coins<75||(npc.minRep||0)>(s.rpg.factions[npc.faction]||0))return false;
 s.rpg.coins-=75;s.rpg.companions.push(id);s.rpg.affinity[id]=0;s.squad.push({id:++s.nextId,npcId:id,x:s.player.x+2,z:s.player.z+2,y:0,hp:npc.companion==='HEAVY'?220:135,maxHp:npc.companion==='HEAVY'?220:135,role:npc.companion,order:'follow',tx:s.player.x,tz:s.player.z,cooldown:0});rpgMessage(s,`${npc.name} JOINED YOUR COMPANY`,'success');return true;}
export function dialogueOptions(s,id){const npc=NPC_BY_ID[id];if(!npc)return[];const result=[{id:'lore',text:'Tell me about this place.',kind:'lore'}];
 for(const qid of npc.quests||[]){const q=QUEST_BY_ID[qid],state=s.rpg.quests[qid];if(!state&&(!q.prerequisite||s.rpg.quests[q.prerequisite]?.status==='done'))result.unshift({id:'accept:'+qid,text:`Take quest: ${q.name}`,kind:'quest'});else if(state?.status==='ready')result.unshift({id:'turnin:'+qid,text:`Turn in: ${q.name}`,kind:'turnin'});}
 if(npc.vendor)result.push({id:'trade',text:'Show me your wares.',kind:'trade'});
 if(npc.companion&&!s.rpg.companions.includes(id))result.push({id:'recruit',text:'Join my company (75 crowns).',kind:'recruit'});
 if(['rhys','sable','lyra'].includes(id)&&!s.rpg.allegiance)result.push({id:'pledge',text:`Swear allegiance to ${FACTIONS[npc.faction].name}.`,kind:'pledge'});
 if(s.player.crouch&&!s.rpg.flags['stole:'+id])result.push({id:'steal',text:'[SNEAK] Try to pick their pocket.',kind:'crime'});
 if(id==='rhys'&&s.rpg.crime.bounty>0)result.push({id:'fine',text:`Pay ${s.rpg.crime.bounty} crowns to clear the bounty.`,kind:'fine'});
 if(id==='lyra'&&s.rpg.quests.the_three_echoes?.status==='done'&&!s.rpg.worldEnding)for(const f of Object.keys(FACTIONS))result.push({id:'shape:'+f,text:`Shape the frontier for ${FACTIONS[f].name}.`,kind:'ending'});
 if(s.rpg.companions.includes(id))result.push({id:'bond',text:'How are we holding together?',kind:'bond'});
 result.push({id:'leave',text:'Until next time.',kind:'leave'});return result;}
export function dialogueChoice(s,npcId,choiceId){const npc=NPC_BY_ID[npcId];if(!npc||distance(s.player,npc)>12||s.zone!=='frontier'||(npc.era||'medieval')!==s.era)return {ok:false,text:'No one is there.'};
 if(choiceId==='steal')return attemptPickpocket(s,npcId);
 if(choiceId==='fine'){const ok=npcId==='rhys'&&payFine(s);return{ok,text:ok?'Your criminal record has been cleared. Do not make us regret this.':'Not enough crowns to pay your fine.'};}
 if(choiceId==='lore')return {ok:true,text:npc.role==='Rift Archaeologist'?'There are three old vaults: mirrored glass, living roots, and a submerged library. Each remembers the same day differently.':npc.line};
 if(choiceId==='trade'&&npc.vendor)return {ok:true,trade:true,text:'Crowns first. Secrets later.'};
 if(choiceId==='recruit'){const ok=recruitCompanion(s,npcId);return{ok,text:ok?`${npc.name} is yours to command.`:'You need 75 crowns, an open squad slot, and sufficient faction standing.'};}
 if(choiceId==='pledge'&&!s.rpg.allegiance){s.rpg.allegiance=npc.faction;s.rpg.factions[npc.faction]=limit(s.rpg.factions[npc.faction]+25,-100,100);for(const f of Object.keys(FACTIONS))if(f!==npc.faction)s.rpg.factions[f]=limit(s.rpg.factions[f]-8,-100,100);rpgMessage(s,`ALLEGIANCE DECLARED / ${FACTIONS[npc.faction].name}`,'command');return{ok:true,text:`You are now sworn to ${FACTIONS[npc.faction].name}. Your choices will have consequences.`};}
 if(choiceId.startsWith('shape:')&&npcId==='lyra'&&s.rpg.quests.the_three_echoes?.status==='done'&&!s.rpg.worldEnding){const faction=choiceId.slice(6);if(!(faction in FACTIONS))return{ok:false,text:'That world is impossible.'};s.rpg.worldEnding=faction;s.rpg.factions[faction]=limit(s.rpg.factions[faction]+60,-100,100);giveReward(s,{xp:800,coins:350});rpgMessage(s,`A NEW AGE BEGINS / ${FACTIONS[faction].name}`,'success');return{ok:true,text:({wardens:'The fragments bind into a protective lattice. The skies quiet. Armies take their watch.',freefolk:'The old borders dissolve. Markets flourish and caravans cross places no map dared show.',archive:'The relics begin to speak. Flux seeps into the world; the future is no longer silent.'})[faction]};}
 if(choiceId==='bond')return{ok:true,text:`We've survived ${s.player.kills} battles. Their trust in you is growing.`,bond:true};
 if(choiceId.startsWith('accept:')){const id=choiceId.slice(7);return{ok:QUEST_BY_ID[id]?.giver===npcId&&takeQuest(s,id),text:QUEST_BY_ID[id]?.description||'Quest unavailable.'};}
 if(choiceId.startsWith('turnin:')){const id=choiceId.slice(7);const ok=QUEST_BY_ID[id]?.giver===npcId&&turnInQuest(s,id);return{ok,text:ok?'The frontier will remember what you did. Take your reward.':'This mission is not ready to turn in.'};}
 if(choiceId==='leave')return{ok:true,leave:true,text:''};return{ok:false,text:'That answer is not available.'};}
export const GOODS=Object.freeze({medkit:{name:'BIOFOAM MEDKIT',price:28,kind:'medkit',amount:1},ration:{name:'TRAIL RATIONS ×2',price:17,kind:'ration',amount:2},water:{name:'CLEAN WATER ×2',price:16,kind:'water',amount:2},ore:{name:'REFINED ORE ×12',price:36,kind:'ore',amount:12},flux:{name:'FLUX CELLS ×28',price:48,kind:'flux',amount:28},relic:{name:'MYSTERY RELIC',price:155,kind:'gear',amount:1}});
export function buyGood(s,id){const good=GOODS[id];if(!good)return false;const price=Math.ceil(good.price*rpgStat(s,'prices'));if(s.rpg.coins<price)return false;s.rpg.coins-=price;if(good.kind==='gear')generateGear(s,'relic',Math.ceil(s.player.level/2),s.nextId);else s.inventory[good.kind]+=good.amount;rpgMessage(s,`PURCHASED / ${good.name}`,'success');return true;}
export function activeQuest(s){const selected=QUEST_BY_ID[s.rpg.tracked],q=selected&&s.rpg.quests[selected.id]?.status==='active'?selected:QUESTS.find(a=>s.rpg.quests[a.id]?.status==='active');return q||null;}
export function restoreRPG(data,s){const defaultRpg=makeRPG();if(!data||typeof data!=='object')return defaultRpg;const r=defaultRpg;
 const records=(obj,keys,minimum,maximum)=>{for(const k of keys)if(Number.isFinite(obj?.[k]))r.factions[k]=limit(obj[k],minimum,maximum);};
 r.perkPoints=limit(Math.floor(Number(data.perkPoints)||0),0,1000);for(const id of Object.keys(PERKS))if(Number.isInteger(data.perks?.[id]))r.perks[id]=limit(data.perks[id],0,PERKS[id].max);
 for(const [id,q] of Object.entries(data.quests||{}))if(Object.hasOwn(QUEST_BY_ID,id)&&['active','ready','done'].includes(q?.status))r.quests[id]={status:q.status,progress:limit(Math.floor(Number(q.progress)||0),0,QUEST_BY_ID[id].goal.count),unique:Array.isArray(q.unique)?[...new Set(q.unique.filter(x=>typeof x==='string'&&Object.hasOwn(DUNGEON_BY_ID,x)))].slice(0,3):[]};
 r.tracked=typeof data.tracked==='string'&&Object.hasOwn(QUEST_BY_ID,data.tracked)?data.tracked:null;records(data.factions,Object.keys(FACTIONS),-100,100);r.coins=limit(Math.floor(Number(data.coins)||0),0,10000000);
 r.allegiance=typeof data.allegiance==='string'&&Object.hasOwn(FACTIONS,data.allegiance)?data.allegiance:null;r.worldEnding=typeof data.worldEnding==='string'&&Object.hasOwn(FACTIONS,data.worldEnding)?data.worldEnding:null;r.bountySerial=limit(Math.floor(Number(data.bountySerial)||0),0,100000);if(data.bounty&&['active','ready','offered'].includes(data.bounty.status)&&data.bounty.goal&&typeof data.bounty.name==='string'){r.bounty={...data.bounty,progress:limit(Number(data.bounty.progress)||0,0,500),unique:Array.isArray(data.bounty.unique)?data.bounty.unique.slice(0,5):[]};}
 r.gear=Array.isArray(data.gear)?data.gear.filter(g=>g&&Number.isSafeInteger(g.id)&&typeof g.slot==='string'&&Object.hasOwn(GEAR_NAMES,g.slot)&&Number.isInteger(g.rarity)&&g.rarity>=0&&g.rarity<=4&&typeof g.name==='string'&&g.stats&&typeof g.stats==='object').slice(0,100).map(g=>({...g,stats:Object.fromEntries(['armor','health','shield','damage'].filter(k=>Number.isFinite(g.stats[k])&&g.stats[k]>=0).map(k=>[k,Math.min(g.stats[k],10000)]))})):[];
 for(const k of Object.keys(r.equipped))if(r.gear.some(g=>g.id===data.equipped?.[k]&&g.slot===k))r.equipped[k]=data.equipped[k];
 r.discovered=Array.isArray(data.discovered)?[...new Set(['home',...data.discovered.filter(v=>LANDMARKS.some(p=>p.id===v))])]:['home'];r.opened=Array.isArray(data.opened)?[...new Set(data.opened.filter(v=>typeof v==='string').slice(0,2000))]:[];
 r.dungeonCleared=Array.isArray(data.dungeonCleared)?[...new Set(data.dungeonCleared.filter(x=>typeof x==='string'&&Object.hasOwn(DUNGEON_BY_ID,x)))]:[];
 for(const id of Object.keys(r.quests)){reconcileDungeonQuest(r,id);reconcileDiscoveryQuest(r,id);}
 r.companions=Array.isArray(data.companions)?[...new Set(data.companions.filter(x=>NPC_BY_ID[x]?.companion))]:[];r.affinity={...data.affinity};r.flags={...data.flags};r.crime={bounty:limit(Number(data.crime?.bounty)||0,0,100000),stolen:limit(Number(data.crime?.stolen)||0,0,100000),caught:limit(Number(data.crime?.caught)||0,0,100000)};r.totalCrafted=limit(Number(data.totalCrafted)||0,0,100000);r.totalLooted=limit(Number(data.totalLooted)||0,0,100000);return r;}
