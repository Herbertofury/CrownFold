import test from 'node:test';
import assert from 'node:assert/strict';
import {WorldRenderer} from '../src/render.mjs';
import {createGame,enterOperation} from '../src/sim.mjs';

function canvasHarness(){
 const fills=[];
 const ctx={
  createLinearGradient:()=>({addColorStop(){}}),fillRect(){},save(){},scale(){},restore(){},
  beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){fills.push(this.fillStyle);}
 };
 const canvas={width:800,height:600,getContext:kind=>kind==='2d'?ctx:null,
  getBoundingClientRect:()=>({width:800,height:600}),addEventListener(){}};
 return {canvas,ctx,fills};
}
function softwareRenderer(){
 const harness=canvasHarness();
 const renderer=Object.assign(Object.create(WorldRenderer.prototype),harness,{
  w:800,h:600,focus:null,meshes:{},project:()=>null
 });
 return {...harness,renderer};
}
function terrainSamples(renderer,state){
 const samples=[];
 renderer.project=point=>{samples.push(point);return null;};
 renderer.drawSoftware(state,{commander:true});
 return samples;
}
function assertTerrainCentered(samples,focus){
 assert.equal(samples.length,14*14*4,'the fallback terrain budget remains bounded');
 for(const [axis,key] of [[0,'x'],[2,'z']]){
  const coords=samples.map(p=>p[axis]),center=Math.floor(focus[key]/13)*13;
  assert.equal(Math.min(...coords),center-91,`${key} terrain minimum follows the view`);
  assert.equal(Math.max(...coords),center+91,`${key} terrain maximum follows the view`);
 }
}

test('software terrain follows a tactical focus far from the stationary player',()=>{
 const {renderer}=softwareRenderer(),state=createGame(),player={...state.player};
 for(const focus of [{x:260,z:-390},{x:-325,z:208}]){
  renderer.focus=focus;
  assertTerrainCentered(terrainSamples(renderer,state),focus);
 }
 assert.deepEqual(state.player,player,'panning must not move the player');
});

test('software terrain falls back to the player when no focus is set',()=>{
 const {renderer}=softwareRenderer(),state=createGame();state.player.x=-117;state.player.z=65;
 assertTerrainCentered(terrainSamples(renderer,state),state.player);
});

function triangleInstance(x,z,color){
 return [1,0,0,0,0,1,0,0,0,0,1,0,x,0,z,1,...color,0];
}
test('software mesh culling uses the camera focus and retains the 75m limit',()=>{
 const state=createGame();state.player.x=0;state.player.z=0;
 const positions=[{x:260,z:-390},{x:-325,z:208},null];
 for(const focus of positions){
  const {renderer,fills}=softwareRenderer(),view=focus||state.player;
  renderer.focus=focus;
  // A simple projection keeps every test instance on screen, isolating distance culling.
  renderer.vp=new Float32Array([.01,0,0,0,0,.01,0,0,0,0,.01,0,0,0,0,10]);
  renderer.meshes={marker:{
   vertices:[-1,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0,1,0],
   instancesData:[
    ...triangleInstance(view.x,view.z,[1,0,0]),
    ...triangleInstance(view.x+75,view.z,[0,1,0]),
    ...triangleInstance(view.x,view.z-75.01,[0,0,1]),
    ...triangleInstance(focus?state.player.x:300,focus?state.player.z:300,[1,1,1])
   ]
  }};
  renderer.drawSoftware(state,{commander:Boolean(focus)});
  assert.equal(fills.length,2,'only markers within 75m of the active view are painted');
  assert.match(fills[0],/^rgb\([1-9]\d*,0,0\)$/,'the marker at the camera focus is painted');
  assert.match(fills[1],/^rgb\(0,[1-9]\d*,0\)$/,'a marker exactly 75m away is painted');
 }
});

test('full software scene follows repeated commander and third-person transitions',t=>{
 const windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
 const ratioDescriptor=Object.getOwnPropertyDescriptor(globalThis,'devicePixelRatio');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{addEventListener(){},removeEventListener(){}}});
 Object.defineProperty(globalThis,'devicePixelRatio',{configurable:true,value:1});
 t.after(()=>{
  for(const [name,descriptor] of [['window',windowDescriptor],['devicePixelRatio',ratioDescriptor]]){
   if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
  }
 });
 const {canvas,fills}=canvasHarness(),renderer=new WorldRenderer(canvas,'low'),state=createGame();
 enterOperation(state,3);
 const player={...state.player},project=renderer.project.bind(renderer);
 let samples=[];
 renderer.project=point=>{samples.push(point);return project(point);};
 for(const [commander,x,z] of [[true,260,-390],[false,260,-390],[true,-325,208],[false,-325,208]]){
  renderer.tactical.x=x;renderer.tactical.z=z;samples=[];fills.length=0;
  renderer.drawScene(state,{commander});
  assert.equal(renderer.focus,commander?renderer.tactical:state.player);
  assertTerrainCentered(samples,renderer.focus);
  assert.ok(fills.length>0,'the real software projection paints geometry');
  assert.deepEqual(state.player,player,'camera transitions leave the player unchanged');
 }
 renderer.dispose();
});
