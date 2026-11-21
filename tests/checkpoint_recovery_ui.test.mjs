import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {createGame,enterOperation,serialize} from '../src/sim.mjs';

const offline=process.env.CROWNFOLD_OFFLINE_HTML;
const html=readFileSync(offline||new URL('../index.html',import.meta.url),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
const imports=offline?JSON.parse(html.match(/<script type="importmap">(.*?)<\/script>/s)[1]).imports:null;
const world='crownfold-riftfront-save-v1',quick='crownfold-riftfront-quick-save-v1';
const noop=()=>{};
let sequence=0;
class Target{
 constructor(){this.listeners=new Map();}
 addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}
 emit(type){for(const fn of this.listeners.get(type)||[])fn({type,preventDefault:noop});}
}
class Element extends Target{
 constructor(){super();this.classes=new Set();this.classList={add:(...v)=>v.forEach(x=>this.classes.add(x)),remove:(...v)=>v.forEach(x=>this.classes.delete(x)),contains:x=>this.classes.has(x),toggle:(v,on=!this.classes.has(v))=>on?this.classes.add(v):this.classes.delete(v)};this.style={};this.width=100;this.height=100;this.messages=[];}
 append(){}
 appendChild(){}
 prepend(node){this.messages.unshift(node.textContent);}
 remove(){}
 setAttribute(){}
 querySelectorAll(){return [];}
 getContext(kind){return kind==='2d'?new Proxy({},{get:(_,key)=>key==='measureText'?()=>({width:0}):noop}):null;}
 requestPointerLock(){}
}
const fixture=({damaged=false,seed=418,scrap=367}={})=>{
 const save=createGame(seed);save.inventory.scrap=scrap;save.player.x=55;save.player.z=21;enterOperation(save,3);
 const record=JSON.parse(serialize(save));
 if(damaged)record.warCheckpoint.checksum='invalid';
 return JSON.stringify(record);
};
async function launch(storage){
 const nodes=new Map(ids.map(id=>[id,new Element()])),attempts=[],prompts=[],raf=[];
 let accept=false,failWrite=false;
 const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>{attempts.push(k);if(failWrite)throw Error('quota');storage.set(k,v);}};
 const document=Object.assign(new Target(),{hidden:false,body:new Element(),getElementById:id=>{assert(nodes.has(id),id);return nodes.get(id);},querySelectorAll:()=>[],createElement:()=>new Element()});
 const window=Object.assign(new Target(),{localStorage,matchMedia:()=>({matches:false}),confirm:value=>{prompts.push(value);return accept;}});
 Object.assign(globalThis,{document,window,localStorage,requestAnimationFrame:frame=>raf.push(frame)});
 const n=++sequence;
 if(!offline)await import(new URL('../src/game.mjs',import.meta.url).href+'?recovery-ui='+n);
 else{
  const hooks=registerHooks({resolve(spec,context,next){
   return Object.hasOwn(imports,spec)?{url:imports[spec]+'#recovery-ui-'+n,format:'module',shortCircuit:true}:next(spec,context);
  }});
  try{await import('riftfront-game');}finally{hooks.deregister();}
 }
 assert.equal(window.__riftfront.tactics.backend,'rust-wasm');
 return {nodes,window,document,attempts,prompts,click:id=>nodes.get(id).onclick(),allow:value=>{accept=value;},fail:value=>{failWrite=value;},
  advance:()=>raf.shift()(performance.now()+31_000),notices:()=>nodes.get('notifications').messages.join('\n')};
}

test('recovering a world opens the frontier without mutating its stored bytes through autosave, pause, hidden, or unload',async()=>{
 const damaged=fixture({damaged:true}),other=fixture({seed:21}),storage=new Map([[world,damaged],[quick,other]]);
 const f=await launch(storage);
 f.click('continue-game');
 assert.equal(f.window.__riftfront.state.zone,'frontier');
 assert.equal(f.window.__riftfront.state.inventory.scrap,367);
 assert.equal(f.window.__riftfront.state.stats.missions,0);
 f.advance();assert.equal(storage.get(world),damaged,'30s autosave keeps original checkpoint');
 f.click('pause-button');assert.equal(storage.get(world),damaged,'pausing makes no write');
 f.document.hidden=true;f.document.emit('visibilitychange');f.window.emit('blur');f.window.emit('beforeunload');
 assert.equal(storage.get(world),damaged,'tab interruption keeps original checkpoint');
 assert.equal(storage.get(quick),other);
 assert.deepEqual(f.attempts,[]);
 assert.match(f.nodes.get('pause-description').textContent,/not saved automatically/i);
});

test('only explicit confirmation saves the recovered quick slot; cancellation and title round trip preserve it exactly',async()=>{
 const damaged=fixture({damaged:true}),other=fixture({seed:22}),storage=new Map([[quick,damaged],[world,other]]);
 const f=await launch(storage);
 assert.match(f.nodes.get('continue-quick').textContent,/RECOVER QUICK FRONTIER/);
 f.click('continue-quick');f.window.__riftfront.state.inventory.scrap=389;f.click('pause-button');
 f.click('save-button');assert.equal(storage.get(quick),damaged);
 assert.match(f.prompts.at(-1),/replace.*checkpoint/i);
 f.click('back-menu');assert.equal(f.window.__riftfront.active,true,'cancel leaving');
 f.allow(true);f.click('back-menu');assert.equal(f.window.__riftfront.active,false);
 assert.equal(storage.get(quick),damaged,'leaving without saving changes no bytes');
 f.click('continue-quick');assert.equal(f.window.__riftfront.state.inventory.scrap,367,'title return did not commit');
 f.window.__riftfront.state.inventory.scrap=399;f.click('pause-button');f.click('save-button');
 assert.equal(JSON.parse(storage.get(quick)).warCheckpoint,null);
 assert.match(f.notices(),/RECOVERED PROGRESS SAVED/);
 const next=await launch(storage);next.click('continue-quick');
 assert.equal(next.window.__riftfront.state.inventory.scrap,399);
 assert.equal(next.window.__riftfront.state.checkpointWarning,undefined);
 assert.equal(next.window.__riftfront.state.stats.missions,0);
 assert.equal(storage.get(world),other);
 next.window.__riftfront.state.inventory.scrap=406;next.window.emit('beforeunload');assert.equal(JSON.parse(storage.get(quick)).inventory.scrap,406);
});

test('failed or stale explicit recovery never writes over another good checkpoint',async()=>{
 const damaged=fixture({damaged:true}),storage=new Map([[world,damaged]]),f=await launch(storage);
 f.click('continue-game');f.click('pause-button');f.allow(true);f.fail(true);f.click('save-button');
 assert.equal(storage.get(world),damaged);
 assert.match(f.notices(),/PREVIOUS SAVE KEPT/);
 assert.equal(f.nodes.get('save-button').textContent,'SAVE RECOVERED PROGRESS');
 f.fail(false);f.window.emit('beforeunload');
 assert.equal(storage.get(world),damaged,'failed confirmation does not unlock later autosave');
 const replacement=fixture({scrap:705});storage.set(world,replacement);
 f.click('save-button');assert.equal(storage.get(world),replacement,'stale recovery cannot overwrite newer bytes');
 assert.match(f.notices(),/SAVE CHANGED.*RETURN TO TITLE/);
 assert.deepEqual(f.attempts,[world],'newer checkpoint blocks even trying storage');
 const next=await launch(storage);next.click('continue-game');assert.equal(next.window.__riftfront.state.zone,'operation');
 assert.equal(next.window.__riftfront.state.inventory.scrap,705);
});

test('unsupported checkpoints stay recoverable and rejected storage can be retried without changing either slot',async()=>{
 const record=JSON.parse(fixture());record.warCheckpoint.version=99;
 const unsupported=JSON.stringify(record),other=fixture({seed:23}),storage=new Map([[quick,unsupported],[world,other]]);
 const f=await launch(storage);f.click('continue-quick');f.click('pause-button');f.allow(true);f.fail(true);
 f.window.__riftfront.state.inventory.scrap=460;f.click('save-button');
 assert.equal(storage.get(quick),unsupported);assert.equal(storage.get(world),other);
 f.advance();assert.deepEqual(f.attempts,[quick]);
 f.fail(false);f.click('save-button');assert.deepEqual(f.attempts,[quick,quick]);
 assert.equal(JSON.parse(storage.get(quick)).inventory.scrap,460);assert.equal(storage.get(world),other);
 f.window.__riftfront.state.inventory.scrap=461;f.window.emit('beforeunload');
 assert.equal(JSON.parse(storage.get(quick)).inventory.scrap,461,'successful recovery restores the normal durable save path');
});

test('healthy War Rift resumes and pausing still checkpoints that exact slot',async()=>{
 const item=fixture(),storage=new Map([[quick,item]]);
 const f=await launch(storage);f.click('continue-quick');assert.equal(f.window.__riftfront.state.zone,'operation');
 f.window.__riftfront.state.war.supplies+=61;
 f.click('pause-button');assert.deepEqual(f.attempts,[quick]);assert.notEqual(storage.get(quick),item);
 const next=await launch(storage);next.click('continue-quick');assert.equal(next.window.__riftfront.state.war.supplies,f.window.__riftfront.state.war.supplies);
 assert.deepEqual(f.prompts,[]);assert.equal(storage.has(world),false);
});
