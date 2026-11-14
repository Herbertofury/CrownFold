// CROWNFOLD — five playable chronal strata. Original names, settings and counterplay.
import {makeLineage,migrateLineage} from './lineage.mjs';
// Time fracture is a civic/economic collapse, not an apocalypse: the world wasn't destroyed.
export const ERA_ORDER=Object.freeze(['medieval','primeval','steam','neon','farfuture']);
export const ERAS=Object.freeze({
 medieval:{name:'THE CROWNLESS MARCH',period:'THE LONG CASTLE AGE · 1278',year:1278,seedOffset:0,accent:'#dcb87d',terrain:[.28,.37,.23],threat:1,doctrine:'CUNNING',blurb:'Stone keeps beneath aurora-lit stars; a knight may carry a pulse rifle while a chronomancer taxes his ammunition.',faction:'THE ASHEN THRONES',resource:'grain',unit:'pikemen',commander:'THE MASON KING',siteNames:['THE WITNESS KEEP','THE MILL OF ELEVEN BELLS','SWORDWELL CROSSING']},
 primeval:{name:'THE FIRST GARDEN',period:'BEFORE WRITTEN HISTORY · 12,400 BCE',year:-12400,seedOffset:95113,accent:'#9edc91',terrain:[.12,.40,.29],threat:1.35,doctrine:'INSTINCT',blurb:'Ancient hunters memorize the air itself; their traps ignore sensors, shields and machine forecasts.',faction:'THE ROOTBOUND CIRCLES',resource:'amber',unit:'hunters',commander:'THE UNWRITTEN QUEEN',siteNames:['THE BONE ORRERY','THE FIRST FIRE','THE BEAST CHOIR']},
 steam:{name:'THE GILDED ENGINE',period:'COAL & CLOCKWORK · 1889',year:1889,seedOffset:35117,accent:'#edae67',terrain:[.43,.32,.21],threat:1.25,doctrine:'ENGINEERING',blurb:'Sooty palaces and steam artillery run on coal; mechanics pirate tomorrow with nothing but gears and nerve.',faction:'THE BRASS SYNDICATE',resource:'coal',unit:'clockguard',commander:'THE REGENT OF GEARS',siteNames:['THE BELLFOUNDRY','THE BLACKRAIL','THE CLOCKTOWER COURT']},
 neon:{name:'THE ELECTRIC REPUBLIC',period:'NETWORK AGE · 2086',year:2086,seedOffset:72071,accent:'#6ad9fc',terrain:[.17,.26,.43],threat:1.55,doctrine:'NETWORK',blurb:'Vertical bazaars trade memory as currency. A clever crossbow regiment can collapse a network army by cutting its physical couriers.',faction:'THE SIGNAL HOUSES',resource:'cells',unit:'signalers',commander:'THE PACKET PRINCE',siteNames:['THE CHROME BAZAAR','THE SKYLINE EXCHANGE','THE NULL TERMINAL']},
 farfuture:{name:'THE LAST TOMORROW',period:'AFTER THE ARCHIVE · 8420',year:8420,seedOffset:128893,accent:'#c59eff',terrain:[.28,.20,.42],threat:1.85,doctrine:'PREDICTION',blurb:'Algorithmic empires predict everything except people who have never learned to use an algorithm.',faction:'THE ORACLE CONSORTIUM',resource:'matter',unit:'synths',commander:'THE HOLLOW EMPRESS',siteNames:['THE UNBORN PALACE','THE GRAVITY COURT','THE ZERO HORIZON']}
});
// Named travelers, brokers and defectors: they exist in their own era, but companions can follow you through time.
export const ERA_ENVOYS=Object.freeze([
 {id:'aurelia',name:'AURELIA, THE UNWRITTEN',era:'medieval',role:'Chronal Court Interpreter',faction:'archive',x:-18,z:-10,line:"When the first gate opened, my father's oldest rival arrived before he had even been born.",vendor:true},
 {id:'hush',name:'HUSH-OF-THE-THICKET',era:'primeval',role:'Ancestor Spear-Singer',faction:'freefolk',x:-8,z:-8,line:'Your machines ask the future what I will do. I ask the wind, which has no answer to steal.',companion:'RANGER'},
 {id:'ogara',name:'OGARA OF THE BONE SEA',era:'primeval',role:'Mammoth-Path Wayfinder',faction:'archive',x:12,z:8,line:'The sky has seams now. We follow the herd through them and never walk the same season twice.',vendor:true},
 {id:'brass',name:'MADAME BRASSWELL',era:'steam',role:'Underground Union Mechanist',faction:'freefolk',x:-7,z:11,line:"If some emperor brings a starship, I'll dismantle it with a screwdriver and put the parts in my locomotive.",vendor:true},
 {id:'engren',name:'ENGREN THE CLOCKMAKER',era:'steam',role:'Clockwork Vanguard',faction:'wardens',x:15,z:-5,line:'Never underestimate a machine with no antenna. The future forgets how to pick a lock.',companion:'HEAVY'},
 {id:'iris',name:'IRIS NULL',era:'neon',role:'Underground Courier',faction:'freefolk',x:8,z:7,line:'Every century is a jurisdictional nightmare. Fortunately my gig economy pays by the dimension.',vendor:true},
 {id:'voss',name:'CAPTAIN VOSS',era:'neon',role:'Decommissioned Shock Trooper',faction:'wardens',x:-12,z:-5,line:'A knight beat my targeting AI by cutting its power cable with a sword. I joined his army that afternoon.',companion:'RANGER'},
 {id:'theorem',name:'THEOREM-9',era:'farfuture',role:'Dissident Predictive Mind',faction:'archive',x:-8,z:13,line:'I calculated 900 billion futures. A child with a stick invented the one I missed.',vendor:true},
 {id:'ell',name:'ELL OF NO TOMORROW',era:'farfuture',role:'Future-History Defector',faction:'freefolk',x:12,z:-8,line:'The last empire never fell. Its subjects simply learned that yesterday was hiring.',companion:'MEDIC'}
]);
export const eraPeople=(era)=>ERA_ENVOYS.filter(npc=>npc.era===era);
export const CHRONICLE={title:'THE GREAT ENTANGLEMENT',date:'YEAR ZERO OF THE COMMON NOW',incident:'The first public time engine was switched on at the Meridian Exchange. It did not explode. It made every door in the world a possible door to another century. Governments, cities, languages and armies stayed intact, but no law could decide which time had jurisdiction.',law:'Nobody inherits history. Everyone bargains for it.',principle:'The oldest technologies win through mechanical independence, unpredictability, terrain craft and training; future technologies win through reach and computation. Neither is a universal upgrade.'};
export const RIFT_SITES=Object.freeze([
 {era:'primeval',x:-25,z:-17,label:'FIRST GARDEN · 12,400 BCE'},
 {era:'steam',x:22,z:-24,label:'GILDED ENGINE · 1889'},
 {era:'neon',x:27,z:22,label:'ELECTRIC REPUBLIC · 2086'},
 {era:'farfuture',x:-22,z:27,label:'LAST TOMORROW · 8420'},
 {era:'medieval',x:0,z:24,label:'CROWNLESS MARCH · 1278'}
]);
// A date never hard-counters another date. Unit roles, a commander's discoveries and
// localized chronal fields create advantages; the same builds are available in any era.
export function battleAffinity(attacker,defender,facetEra=null){
 if(facetEra===attacker)return 1.14;
 if(facetEra===defender)return .94;
 return 1;
}
export const epochSeed=(base,era)=>((base^ERAS[era]?.seedOffset)||base)|0;
export function makeTemporal(seed){return {baseSeed:seed,eraPositions:{medieval:{x:0,z:0}},visited:['medieval'],selectedEra:'primeval',facets:[],foldRevision:0,worldCaches:[],worldFlags:{},wonCampaigns:[],insight:0,skill:{ancestor:0,engineer:0,oracle:0},lineage:makeLineage(),returnEra:'medieval',chronicleLog:['You awoke in the Crownless March, 1278. The bells ring in every century.']};}
export function validEra(era){return typeof era==='string'&&Object.hasOwn(ERAS,era);}
export function availableRifts(era){return RIFT_SITES.filter(x=>x.era!==era).map(x=>({...x,type:'advanced'}));}
export function eraSites(era){const e=ERAS[era];if(!e)return [];return e.siteNames.map((name,i)=>({id:`${era}-${i}`,era,name,x:[-72,96,14][i],z:[-78,55,125][i],kind:'chronicle',description:`A surviving landmark of ${e.period}. History was never erased; it was rearranged.`}));}
export function facetKey(era,zone,x,z){return `${era}:${zone}:${Math.round(x/24)}:${Math.round(z/24)}`;}
export function facetAt(s,x,z){const key=facetKey(s.era||'medieval',s.zone,x,z);return s.temporal?.facets.find(f=>f.key===key)||null;}
export function cycleFacetEra(s){if(!s.temporal)return 'primeval';const i=ERA_ORDER.indexOf(s.temporal.selectedEra);s.temporal.selectedEra=ERA_ORDER[(i+1)%ERA_ORDER.length];return s.temporal.selectedEra;}
export function stampFacet(s,x,z,direction=1,targetEra=null){const t=s.temporal;if(!t)return null;const key=facetKey(s.era,s.zone,x,z),index=t.facets.findIndex(f=>f.key===key),old=index>=0?t.facets[index]:null;
 const f={key,origin:s.era,zone:s.zone,x:Math.round(x/24)*24,z:Math.round(z/24)*24,era:validEra(targetEra)?targetEra:t.selectedEra,turn:((old?.turn||0)+direction+4)%4};
 if(index>=0)t.facets.splice(index,1);t.facets.push(f);if(t.facets.length>90)t.facets.shift();t.foldRevision++;t.insight+=1;return f;
}
export function spendInsight(s,path){const t=s.temporal;if(!t||!['ancestor','engineer','oracle'].includes(path))return false;const rank=t.skill[path]||0,cost=5+rank*5;if(rank>=3||t.insight<cost)return false;t.insight-=cost;t.skill[path]++;return true;}
export function temporalModifier(s,unitEra,defenderEra,x,z){const f=facetAt(s,x,z);let mult=battleAffinity(unitEra,defenderEra,f?.era||s.era);// Legacy Chronicle drills now benefit any battalion, independent of chronological origin.
 mult*=1+(s.temporal?.skill.ancestor||0)*.05;return mult;}
export function migrateTemporal(data,seed){const defaults=makeTemporal(seed);if(!data||typeof data!=='object')return defaults;
 const eraPositions={};for(const [key,pos]of Object.entries(data.eraPositions||{}))if(validEra(key)&&pos&&Number.isFinite(pos.x)&&Number.isFinite(pos.z))eraPositions[key]={x:Math.max(-10000,Math.min(10000,pos.x)),z:Math.max(-10000,Math.min(10000,pos.z))};
 const facets=(Array.isArray(data.facets)?data.facets:[]).slice(-90).filter(f=>f&&typeof f==='object'&&!Array.isArray(f)&&validEra(f.era)&&validEra(f.origin)&&['frontier','operation'].includes(f.zone)&&Number.isFinite(f.x)&&Number.isFinite(f.z)).map(f=>({...f,key:facetKey(f.origin,f.zone,f.x,f.z),turn:Math.max(0,Math.min(3,Math.trunc(Number(f.turn)||0)))}));
 const skill={};for(const k of Object.keys(defaults.skill))skill[k]=Math.max(0,Math.min(3,Math.trunc(Number(data.skill?.[k])||0)));
 return {...defaults,returnEra:validEra(data.returnEra)?data.returnEra:defaults.returnEra,baseSeed:Number.isInteger(data.baseSeed)?data.baseSeed:seed,eraPositions:{...defaults.eraPositions,...eraPositions},selectedEra:validEra(data.selectedEra)?data.selectedEra:defaults.selectedEra,facets,foldRevision:facets.length,visited:[...new Set(['medieval',...(Array.isArray(data.visited)?data.visited.filter(validEra):[])])],worldCaches:Array.isArray(data.worldCaches)?data.worldCaches.filter(x=>typeof x==='string').slice(0,200):[],worldFlags:typeof data.worldFlags==='object'&&data.worldFlags?data.worldFlags:{},wonCampaigns:Array.isArray(data.wonCampaigns)?data.wonCampaigns.filter(x=>typeof x==='string').slice(0,100):[],insight:Math.max(0,Math.min(10000,Number(data.insight)||0)),skill,lineage:migrateLineage(data.lineage),chronicleLog:Array.isArray(data.chronicleLog)?data.chronicleLog.filter(x=>typeof x==='string').slice(-40):defaults.chronicleLog};
}
