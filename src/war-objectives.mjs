// Versioned, stateless Rust objective authority. JSON owns storage, never a Wasm pointer.
import {tactics} from './rust-tactics.mjs';
const ACTS=['foothold','anchors','throne','extraction'];
const VICTORIES=[null,'ally','enemy'];
let calls=0;
export function objectiveRuntime(){return {backend:tactics.backend,version:1,calls};}
export function validObjectiveState(w){
 const e=w?.extraction;
 return ACTS.includes(w?.act)&&VICTORIES.includes(w?.victory)&&e&&typeof e.active==='boolean'&&
  (!e.active||w.act==='extraction')&&w.footholdTarget===24&&[24,36].includes(e.target)&&
  Number.isFinite(w.footholdHold)&&w.footholdHold>=0&&w.footholdHold<=24&&
  Number.isFinite(e.progress)&&e.progress>=0&&e.progress<=e.target;
}
export function stepObjectives(w,o,dt){
 if(!validObjectiveState(w)||!Number.isFinite(dt)||dt<0||dt>1)throw new Error('Invalid siege objective state');
 const e=w.extraction,api=tactics.api;
 if(api){
  const result=api.cf_objective_step(ACTS.indexOf(w.act),w.footholdHold,w.footholdTarget,e.progress,e.target,
   +e.active,VICTORIES.indexOf(w.victory),o.wells,o.anchors,+o.throneAlive,+o.homeAlive,+o.present,+o.contested,dt);
  if(result<0)throw new Error('Rust rejected siege objective state');
  calls++;w.act=ACTS[result&15];w.victory=VICTORIES[result>>4];
  w.footholdHold=api.cf_objective_progress(0);e.progress=api.cf_objective_progress(1);
 }else{
  // Behavioral reference only, for browsers without WebAssembly.
  const clamp=(v,limit)=>Math.max(0,Math.min(limit,v));
  if(w.victory)return;
  if(!o.homeAlive){w.victory='enemy';return;}
  if(w.act==='foothold'){
   w.footholdHold=clamp(w.footholdHold+(o.wells>=2?dt:-dt*.7),w.footholdTarget);
   if(w.footholdHold>=w.footholdTarget)w.act='anchors';
  }else if(w.act==='anchors'&&!o.anchors)w.act='throne';
  else if(w.act==='throne'&&!o.throneAlive)w.act='extraction';
  else if(w.act==='extraction'&&e.active){
   e.progress=clamp(e.progress+(!o.present?-.2:o.contested?-.6:1)*dt,e.target);
   if(e.progress>=e.target)w.victory='ally';
  }
 }
}
// Validate through the same native boundary, without advancing or granting rewards.
export function validateObjectiveCheckpoint(w){
 if(!validObjectiveState(w))return false;
 if(!tactics.api)return true;
 const e=w.extraction;
 return tactics.api.cf_objective_step(ACTS.indexOf(w.act),w.footholdHold,w.footholdTarget,e.progress,e.target,
  +e.active,VICTORIES.indexOf(w.victory),0,2,1,1,0,0,0)>=0;
}
