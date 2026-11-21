import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';

const offline=process.env.CROWNFOLD_OFFLINE_HTML;
const doc=readFileSync(offline||new URL('../index.html',import.meta.url),'utf8');
const map=offline?JSON.parse(doc.match(/<script type="importmap">(.*?)<\/script>/s)[1]).imports:null;
const load=async name=>offline?import('riftfront-'+name):import('../src/'+name+'.mjs');
const withModules=async task=>{
 if(!map)return task();
 const hook=registerHooks({resolve(name,context,next){
  return Object.hasOwn(map,name)?{url:map[name]+'#fourth-echo-fixture',format:'module',shortCircuit:true}:next(name,context);
 }});
 try{return await task();}finally{hook.deregister();}
};
const [sim,rpg,time,battle,echo]=await withModules(()=>Promise.all(['sim','rpg','temporal','battlefield','echo-trial'].map(name=>map&&name==='echo-trial'&&!map['riftfront-echo-trial']?null:load(name))));
const {createGame,stepGame,shoot,setWeapon,interact,nearestInteraction,restore,serialize}=sim;
const {LANDMARKS,dialogueOptions,dialogueChoice}=rpg;
const lens={x:10,z:-127},exit={x:0,z:-147},front={x:-12,z:6};
const at=(s,loc)=>Object.assign(s.player,{x:loc.x,z:loc.z});
const step=(s,n=1)=>{for(let i=0;i<n;i++)stepGame(s,{},.1);};
const countReward=s=>[s.temporal.insight,s.inventory.flux,s.rpg.coins,s.player.xp,s.player.kills,s.pickups.length];
const prepare=(finished=true)=>{
 const s=createGame(89);
 s.squad=[];
 s.inventory.medkit=6;
 s.temporal.insight=0;
 if(finished){
  s.rpg.dungeonCleared=['glass','roots','archive'];
  s.rpg.opened=s.rpg.dungeonCleared.map(id=>'dungeon:'+id);
  s.rpg.quests.the_three_echoes={status:'done',progress:3,unique:[...s.rpg.dungeonCleared]};
 }
 return s;
};
function shootDown(s,e){
 assert(setWeapon(s,'rail'));
 for(let i=0;i<290&&e.hp>0;i++){
  const p=s.player,yaw=Math.atan2(e.x-p.x,p.z-e.z);
  const pitch=Math.atan2(-.55,Math.max(1,Math.hypot(e.x-p.x,e.z-p.z)));
  if(p.hp<90)sim.useConsumable(s,'medkit');
  stepGame(s,{yaw,pitch,fire:true},.1);
  assert.equal(s.zone,'dungeon','the authored encounter stays survivable in this deterministic run');
 }
 assert.equal(e.hp,0,'normal combat brought the target down');
}
function chamber(s,id='glass',press=()=>interact(s)){
 at(s,LANDMARKS.find(l=>l.id===id));press();
 assert.equal(s.zone,'dungeon');
 // Prior corridors keep their existing population; omit unrelated guard pressure
 // in this focused replay. The ordinary guardian retains HP and real weapon damage.
 s.enemies=[];
 for(const loc of [{x:-11,z:-43},{x:12,z:-83}]){at(s,loc);assert.equal(nearestInteraction(s)?.type,'sigil');press();}
 const g=s.enemies.find(e=>e.id===s.dungeon.bossId);
 at(s,{x:0,z:-121});g.frozen=100;shootDown(s,g);
 assert(s.dungeon.bossDead);
 at(s,lens);
}
function firstEcho(s,press=()=>interact(s)){
 assert.equal(nearestInteraction(s)?.type,'echo-trial');
 assert.match(nearestInteraction(s).label,/OPTIONAL/);
 press();
 assert.equal(s.dungeon.echoTrial.phase,1);
 assert.equal(s.dungeon.echoTrial.targets.length,1);
 assert.equal(nearestInteraction(s)?.type,undefined,'holding the lens cannot spawn a second sentinel');
 const enemy=s.enemies.find(e=>s.dungeon.echoTrial.targets.includes(e.id));
 assert.equal(enemy.kind,'warden');assert.equal(enemy.aggro,true);
 const before=countReward(s);
 shootDown(s,enemy);
 assert.deepEqual(countReward(s).slice(0,5),before.slice(0,5),'side enemies only pay through successful extraction');
 assert(!s.pickups.some(p=>p.x===enemy.x&&p.z===enemy.z));
 assert.equal(echo.echoTrialDirective(s).title,'ANSWER THE SECOND ECHO');
}
function secondEcho(s,press=()=>interact(s)){
 at(s,lens);
 assert.match(nearestInteraction(s).label,/SECOND ECHO/);
 press();
 assert.equal(s.dungeon.echoTrial.phase,2);
 const ids=[...s.dungeon.echoTrial.targets];
 assert.equal(ids.length,2);
 const active=ids.map(id=>s.enemies.find(e=>e.id===id));
 assert.deepEqual(active.map(e=>e.kind),['corruptor','specter']);
 assert(active.every(e=>e.aggro));
 assert(active[0].x*active[1].x<0&&active[0].z!==active[1].z,'attackers start on conflicting sides of the lens');
 shootDown(s,active[0]);
 assert.match(echo.echoTrialDirective(s).hint,/1 of 2/);
 shootDown(s,active[1]);
 assert.equal(echo.echoTrialDirective(s).title,'CARRY THE FOURTH ECHO OUT');
}

test('completed story adds a discoverable Lyra rumor and opt-in lens, not a compulsory new objective',()=>{
 if(offline)assert.equal(battle.tacticalRuntime().backend,'rust-wasm');
 const s=prepare();
 at(s,rpg.NPC_BY_ID.lyra);
 assert(dialogueOptions(s,'lyra').some(o=>o.id==='fourth-echo-rumor'));
 assert.match(dialogueChoice(s,'lyra','fourth-echo-rumor').text,/east side/);
 chamber(s);
 assert.equal(nearestInteraction(s)?.type,'echo-trial');
 assert.equal(echo.echoTrialDirective(s),null,'do not reroute a player who never opted in');
 at(s,exit);
 assert.equal(nearestInteraction(s)?.type,'dungeon-exit');assert(interact(s));
 assert.equal(s.temporal.insight,0,'normal replay and exits are not paying optional objectives');
 for(const [state,id] of [[prepare(false),'glass'],[prepare(),'roots']]){
  chamber(state,id);
  assert.notEqual(nearestInteraction(state)?.type,'echo-trial');
 }
});

test('live sentinel and pincer pay once only when exiting alive, and Insight buys a real upgrade',()=>{
 let s=prepare();
 chamber(s);
 const oldFlux=s.inventory.flux;
 firstEcho(s);
 assert.equal(s.temporal.insight,0);
 secondEcho(s);
 assert.equal(s.temporal.insight,0);
 at(s,exit);
 assert(interact(s));assert.equal(s.zone,'frontier');
 assert.equal(s.temporal.insight,8);assert.equal(s.inventory.flux,oldFlux+35);
 assert.equal(s.rpg.flags[echo.ECHO_TRIAL.flag],true);
 s=restore(serialize(s));
 assert(time.spendInsight(s,'engineer'));
 assert.equal(s.temporal.insight,3);
 assert.equal(s.temporal.skill.engineer,1);
 chamber(s);
 assert.notEqual(nearestInteraction(s)?.type,'echo-trial');
 at(s,exit);
 assert(interact(s));
 assert.equal(restore(serialize(s)).temporal.insight,3,'reload/replay never issues another award');
});

test('abandoning, dying, or closing after the fight does not pay and permits a clean retry',()=>{
 for(const failure of ['front retreat','death','close']){
  let s=prepare();chamber(s);firstEcho(s);
  if(failure==='front retreat'){at(s,front);assert(interact(s));}
  else {
   secondEcho(s);
   if(failure==='death'){s.player.hp=0;step(s);}
   else s=restore(serialize(s));
  }
  assert.equal(s.zone,'frontier');
  assert.equal(s.temporal.insight,0);
  assert.equal(s.rpg.flags[echo.ECHO_TRIAL.flag],undefined);
  chamber(s);
  assert.equal(nearestInteraction(s)?.type,'echo-trial');
 }
});

test('the delivered game exposes the exact keyboard lens, live objective, and immediate frontier checkpoint',async()=>{
 const noop=()=>{};
 const canvasContext=new Proxy({},{get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop:noop}):noop});
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
  getContext(type){return type==='2d'?canvasContext:null;}
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  prepend(child){child.parentElement=this;this.children.unshift(child);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);}
  querySelector(){return null;}
  querySelectorAll(){return [];}
  setAttribute(){}
  requestPointerLock(){}
 }
 const nodes=new Map([...doc.matchAll(/\bid="([^"]+)"/g)].map(match=>[match[1],new Element()]));
 const key='crownfold-riftfront-save-v1',quick='crownfold-riftfront-quick-save-v1';
 const saved=new Map([[key,serialize(prepare())],[quick,'separate synthetic sentinel']]);
 const localStorage={getItem:id=>saved.get(id)??null,setItem:(id,value)=>saved.set(id,value)};
 const document=Object.assign(new Target(),{localStorage,hidden:false,body:new Element(),
  getElementById:id=>{assert(nodes.has(id),id);return nodes.get(id);},querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>new Element()});
 const window=Object.assign(new Target(),{localStorage,matchMedia:()=>({matches:false}),confirm:()=>true,innerWidth:960,innerHeight:540});
 let nextFrame;
 Object.assign(globalThis,{document,window,localStorage,devicePixelRatio:1,requestAnimationFrame:fn=>{nextFrame=fn;}});
 await withModules(()=>load('game'));
 nodes.get('continue-game').onclick();
 const s=window.__riftfront.state,press=()=>{window.emit('keydown',{code:'KeyE'});window.emit('keyup',{code:'KeyE'});};
 assert(window.__riftfront.renderer?.software,'actual fallback renderer initialized with synthetic canvas');
 let stamp=performance.now();
 const refresh=()=>{nextFrame(stamp+=200);assert.equal(nodes.get('error').textContent,'');};
 chamber(s,'glass',press);
 refresh();
 assert.match(nodes.get('interaction-title').textContent,/OPTIONAL TRIAL/);
 assert.notEqual(nodes.get('directive-label').textContent,'OPTIONAL TRIAL','do not take over the HUD before acceptance');
 firstEcho(s,press);
 refresh();
 assert.equal(nodes.get('objective-name').textContent,'ANSWER THE SECOND ECHO');
 assert.equal(nodes.get('marker-title').textContent,'FOURTH ECHO LENS');
 secondEcho(s,press);
 refresh();
 assert.equal(nodes.get('marker-title').textContent,'EXTRACT THE FOURTH ECHO');
 assert.match(nodes.get('objective-description').textContent,/8 Chronicle Insight and 35 Flux/);
 assert.equal(JSON.parse(saved.get(key)).temporal.insight,0,'live trial does not increment the stored world');
 at(s,exit);press();
 assert.equal(JSON.parse(saved.get(key)).temporal.insight,8,'actual interact exit saved to the world slot');
 assert.equal(saved.get(quick),'separate synthetic sentinel');
 assert.equal(window.__riftfront.state.zone,'frontier');
 if(offline)assert.equal(window.__riftfront.tactics.backend,'rust-wasm');
});
