import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';

const offline=process.env.CROWNFOLD_OFFLINE_HTML;
const html=readFileSync(offline||new URL('../index.html',import.meta.url),'utf8');
const imports=offline?JSON.parse(html.match(/<script type="importmap">(.*?)<\/script>/s)[1]).imports:null;
const load=name=>offline?import('riftfront-'+name):import('../src/'+name+'.mjs');
async function usingModules(task){
 if(!imports)return task();
 const hook=registerHooks({resolve(name,context,next){
  return Object.hasOwn(imports,name)?{url:imports[name]+'#bellback-proof',format:'module',shortCircuit:true}:next(name,context);
 }});
 try{return await task();}finally{hook.deregister();}
}
const [sim,roamer,rpg,battle]=await usingModules(()=>Promise.all(['sim','bellback','rpg','battlefield'].map(load)));
const {createGame,stepGame,terrainHeight,nearestInteraction,interact,restore,serialize,biomeAt,changeEpoch,enterOperation}=sim;
const {bellbackPosition,bellbackEndpoints}=roamer;
const dt=1/30,clamp=x=>Math.min(1,Math.max(-1,x));
function deckAt(s,dt=0){
 const pose=bellbackPosition(s.bellback,s.temporal.baseSeed,s.time+dt);
 return {x:pose.x+Math.cos(pose.angle)*5.2,z:pose.z+Math.sin(pose.angle)*5.2,
  ux:Math.cos(pose.angle),uz:Math.sin(pose.angle)};
}
function move(s,t,jump=false){
 stepGame(s,{yaw:0,x:clamp(t.x-s.player.x),z:clamp(s.player.z-t.z),jump},dt);
}
function positionForApproach(s,phase=22){
 s.spawnTimer=9e6;s.squad=[];s.time=phase;
 const q=deckAt(s);
 Object.assign(s.player,{x:q.x+q.ux*10,z:q.z+q.uz*10,vy:0,yaw:0});
 s.player.y=terrainHeight(s.player.x,s.player.z,s.seed);
}
function approach(s){
 const before={x:s.player.x,z:s.player.z};
 for(let i=0;i<140;i++){
  const d=deckAt(s,dt);
  if(Math.hypot(s.player.x-d.x,s.player.z-d.z)<1.7)break;
  move(s,{x:d.x+d.ux*1.5,z:d.z+d.uz*1.5});
 }
 assert(Math.hypot(s.player.x-before.x,s.player.z-before.z)>5);
 assert(s.bellback.seen);
 assert.notEqual(s.bellbackRide,'harness');
 assert.notEqual(nearestInteraction(s)?.type,'bellback');
}
function climb(s){
 const center=()=>deckAt(s,dt);
 for(let i=0;i<150&&s.bellbackRide!=='step';i++){
  const d=center();move(s,{x:d.x+d.ux*1.3,z:d.z+d.uz*1.3},true);
 }
 assert.equal(s.bellbackRide,'step','actual first jump crosses low ledge');
 assert.notEqual(nearestInteraction(s)?.type,'bellback');
 const before={x:s.player.x,z:s.player.z},previous={...s.bellbackPose.deck};
 for(let i=0;i<6;i++)stepGame(s,{},dt);
 const after=s.bellbackPose.deck,p=s.player;
 const carry=Math.hypot(after.x-previous.x,after.z-previous.z);
 assert(carry>.01);
 assert(Math.abs((p.x-before.x)-(after.x-previous.x))<1e-8 &&
        Math.abs((p.z-before.z)-(after.z-previous.z))<1e-8,'deck physically carries the standing player');
 for(let i=0;i<160&&s.bellbackRide!=='harness';i++)move(s,center(),true);
 assert.equal(s.bellbackRide,'harness','actual second jump lands on raised harness');
 assert(Math.abs(s.player.y-s.bellbackPose.deck.harness)<.01);
}

test('deterministic route revisits actual different biomes and survives old-save and mid-route reopen',()=>{
 if(offline)assert.equal(battle.tacticalRuntime().backend,'rust-wasm');
 const layouts=new Set();
 for(let i=0;i<256;i++){
  const seed=i*3907+91,s=createGame(seed),state=s.bellback;
  assert(state,`no qualified route for ${seed}`);
  layouts.add(state.route);
  const [a,b]=bellbackEndpoints(state.route);
  assert.notEqual(biomeAt(a.x,a.z,seed),biomeAt(b.x,b.z,seed));
  const offset=(seed>>>0)%127/127;
  for(const [phase,wanted] of [[.75,a],[.25,b]]){
   const point=bellbackPosition(state,seed,(phase+1-offset)*182);
   assert(Math.hypot(point.x-wanted.x,point.z-wanted.z)<.001);
  }
  s.time=68+i/10;
  const old=JSON.parse(serialize(s));delete old.bellback;
  assert.deepEqual(restore(old).bellback,state);
  assert.deepEqual(bellbackPosition(restore(serialize(s)).bellback,seed,s.time),bellbackPosition(state,seed,s.time));
 }
 assert(layouts.size>15,'different world seeds have meaningfully different routes');
});

test('platforming survives a moving sweep and cannot collect from world ground or low ledge',()=>{
 for(let seed=1;seed<=128;seed++){
  const s=createGame(seed);
  positionForApproach(s,22+(seed%4)*21);
  approach(s);climb(s);
  assert.equal(nearestInteraction(s)?.type,'bellback');
 }
});

test('Sable cue leaves quests independent; collecting once pays spendable resources and reopening grounds the player',()=>{
 let s=createGame(418);
 Object.assign(s.player,{x:rpg.NPC_BY_ID.sable.x,z:rpg.NPC_BY_ID.sable.z});
 assert(rpg.dialogueOptions(s,'sable').some(o=>o.id==='bellback-tracks'));
 assert.match(rpg.dialogueChoice(s,'sable','bellback-tracks').text,/golden platform/);
 positionForApproach(s);approach(s);climb(s);
 const prior={ore:s.inventory.ore,flux:s.inventory.flux,quests:JSON.stringify(s.rpg.quests),loot:[...s.rpg.opened],kills:s.player.kills};
 assert(interact(s));
 assert.equal(s.inventory.ore,prior.ore+28);
 assert.equal(s.inventory.flux,prior.flux+45);
 assert.equal(s.player.level,2);
 assert.equal(s.player.xp,70);
 assert.equal(s.player.kills,prior.kills);
 assert.equal(JSON.stringify(s.rpg.quests),prior.quests);
 assert.deepEqual(s.rpg.opened,prior.loot);
 const stable=s.bellback.id;
 s=restore(serialize(s));
 assert.equal(s.bellback.id,stable);assert(s.bellback.claimed);assert.equal(s.bellbackRide,null);
 assert.equal(s.player.y,terrainHeight(s.player.x,s.player.z,s.seed));
 s.spawnTimer=9e6;s.squad=[];
 positionForApproach(s);approach(s);climb(s);
 assert.notEqual(nearestInteraction(s)?.type,'bellback');
 assert.equal(s.inventory.ore,prior.ore+28);
 assert(sim.castAbility(s,'blink'),'real gained Flux can be spent on mobility');
 assert(s.inventory.flux<prior.flux+45);
});

test('leaving its era, an optional corrupt receipt, and retreating off the mount cannot create duplicate or forced outcomes',()=>{
 const s=createGame(27);positionForApproach(s);approach(s);climb(s);
 for(let i=0;i<90;i++){const d=deckAt(s,dt);move(s,{x:d.x+d.ux*9,z:d.z+d.uz*9});}
 assert.equal(s.bellbackRide,null);assert.equal(s.bellbackBoarded,false);
 assert.notEqual(nearestInteraction(s)?.type,'bellback');assert.equal(s.bellback.claimed,false);
 assert(changeEpoch(s,'steam'));stepGame(s,{},dt);
 assert.equal(s.bellbackRide,null);assert(!s.bellbackPose);assert.equal(s.bellback.claimed,false);
 assert(changeEpoch(s,'medieval'));assert(enterOperation(s,3));stepGame(s,{},dt);
 assert.equal(s.bellbackRide,null);assert(!s.bellbackPose);
 const invalid=JSON.parse(serialize(s));invalid.bellback.id='wrong';
 const safe=restore(invalid);assert(safe);assert.equal(safe.bellback,null);assert.equal(safe.zone,'operation');
});

test('exact game input shows a Space cue, boards both moving decks and retries a failed E checkpoint without duplicating rewards',async()=>{
 const noop=()=>{},context=new Proxy({},{get:(_,k)=>k==='createLinearGradient'?()=>({addColorStop:noop}):noop});
 class Target{
  constructor(){this.listeners=new Map();}
  addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}
  emit(type,fields={}){for(const fn of this.listeners.get(type)||[])fn({type,preventDefault:noop,...fields});}
 }
 class Element extends Target{
  constructor(){super();this.children=[];this.style={};this.dataset={};this.classes=new Set();this.classList={
   add:(...v)=>v.forEach(x=>this.classes.add(x)),remove:(...v)=>v.forEach(x=>this.classes.delete(x)),
   contains:x=>this.classes.has(x),toggle:(v,on=!this.classes.has(v))=>on?this.classes.add(v):this.classes.delete(v)};
   this.width=180;this.height=100;
  }
  get textContent(){return this.text||'';}
  set textContent(value){this.text=value;this.children=[];}
  get childElementCount(){return this.children.length;}
  get lastElementChild(){return this.children.at(-1);}
  getBoundingClientRect(){return {left:0,top:0,right:960,bottom:540,width:960,height:540};}
  getContext(type){return type==='2d'?context:null;}
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  prepend(child){child.parentElement=this;this.children.unshift(child);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);}
  querySelector(){return null;}
  querySelectorAll(){return [];}
  setAttribute(){}
  requestPointerLock(){}
 }
 const nodes=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 const w='crownfold-riftfront-save-v1',q='crownfold-riftfront-quick-save-v1';
 const initial=createGame(418);positionForApproach(initial);
 let writes=0,blocked=true;
 const stored=new Map([[w,serialize(initial)],[q,'unrelated quick slot']]);
 const localStorage={getItem:id=>stored.get(id)??null,setItem:(id,value)=>{writes++;if(blocked&&id===w)throw Error('quota');stored.set(id,value);}};
 const document=Object.assign(new Target(),{localStorage,hidden:false,body:new Element(),
  getElementById:id=>{assert(nodes.has(id),id);return nodes.get(id);},querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>new Element()});
 const window=Object.assign(new Target(),{localStorage,matchMedia:()=>({matches:false}),confirm:()=>true,innerWidth:960,innerHeight:540});
 let nextFrame;
 Object.assign(globalThis,{document,window,localStorage,devicePixelRatio:1,requestAnimationFrame:fn=>{nextFrame=fn;}});
 await usingModules(()=>load('game'));
 nodes.get('continue-game').onclick();
 const {state:s,renderer}=window.__riftfront;
 assert(renderer?.software);
 s.spawnTimer=9e6;
 // Preserve real game input, simulation and HUD. Do not pretend the dummy
 // Canvas sink proves pixels or time the unrelated software rasterizer.
 renderer.drawScene=noop;
 let now=performance.now();
 const held=new Set();
 function hold(name,value){
  if(held.has(name)===value)return;
  held[value?'add':'delete'](name);
  window.emit(value?'keydown':'keyup',{code:name});
 }
 const press=name=>{hold(name,true);hold(name,false);};
 function guide(target,jump=false){
  const {x,z}=s.player;
  for(const [key,down]of [['KeyD',target.x-x>.16],['KeyA',target.x-x<-.16],['KeyW',z-target.z>.16],['KeyS',z-target.z<-.16],['Space',jump]])hold(key,down);
  nextFrame(now+=34);
 }
 for(let i=0;i<130;i++){const d=deckAt(s,dt);guide({x:d.x+d.ux*1.4,z:d.z+d.uz*1.4});}
 assert.equal(s.bellbackRide,null,'this ordinary slope needs a jump');
 const cue=()=>['interaction-key','interaction-title','interaction-detail'].map(id=>nodes.get(id).textContent).join(' ');
 assert.match(cue(),/SPACE.*LOW GOLD PLATFORM/);
 renderer.drawBellback(s);
 assert(renderer.meshes.cylinder.instancesData.length>0&&renderer.meshes.gem.instancesData.length>0,'actual geometry path builds two decks and a collectible');
 press('KeyE');assert.equal(s.bellback.claimed,false);
 for(let i=0;i<130&&s.bellbackRide!=='step';i++){const d=deckAt(s,dt);guide({x:d.x+d.ux*1.4,z:d.z+d.uz*1.4},true);}
 assert.equal(s.bellbackRide,'step');
 for(let i=0;i<10;i++){const d=deckAt(s,dt);guide({x:d.x+d.ux*1.4,z:d.z+d.uz*1.4});}
 assert.match(cue(),/SPACE.*JUMP INWARD/);
 for(let i=0;i<160&&s.bellbackRide!=='harness';i++)guide(deckAt(s,dt),true);
 assert.equal(s.bellbackRide,'harness');
 for(let i=0;i<8;i++)guide(deckAt(s,dt));
 assert.equal(nodes.get('interaction-key').textContent,'E');
 assert.match(nodes.get('interaction-title').textContent,/UNCLIP/);
 const balance=s.inventory.ore;
 press('KeyE');
 assert(s.bellback.claimed);assert.equal(s.inventory.ore,balance+28);
 assert.equal(writes,1);assert(!JSON.parse(stored.get(w)).bellback.claimed);
 assert(nodes.get('notifications').children.some(e=>/SAVE FROM PAUSE/.test(e.textContent)));
 press('KeyE');assert.equal(s.inventory.ore,balance+28);assert.equal(writes,1);
 blocked=false;nodes.get('pause-button').onclick();nodes.get('save-button').onclick();
 const reopened=restore(stored.get(w));
 assert(reopened.bellback.claimed);assert.equal(reopened.inventory.ore,balance+28);
 assert.equal(reopened.bellbackRide,null);
 assert.equal(stored.get(q),'unrelated quick slot');
 if(offline)assert.equal(window.__riftfront.tactics.backend,'rust-wasm');
});
