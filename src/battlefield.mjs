// Live adapter: Rust compiled to Wasm is the default tactical runtime.
// The reference implementation keeps offline play possible without WebAssembly.
import * as reference from './battlefield-js.mjs';
import {tactics} from './rust-tactics.mjs';
export {COVER_ARCHETYPES,makeBattlefieldCover} from './battlefield-js.mjs';
const MAX_COVERS=1024;
const stats={segment:0,occlusion:0,position:0,path:0,fallback:0};
export function tacticalRuntime(){return {backend:tactics.backend,reason:tactics.reason,calls:{...stats}};}
function coversReady(covers=[]){
  if(!tactics.api||covers.length>MAX_COVERS)return false;
  tactics.api.cf_reset_covers();
  for(const c of covers)if(!tactics.api.cf_add_cover(c.x,c.z,c.radius,c.hp))return false;
  return true;
}
export function segmentCircle(a,b,c,r=0){
  if(!tactics.api){stats.fallback++;return reference.segmentCircle(a,b,c,r);}
  stats.segment++;const t=tactics.api.cf_segment_circle(a.x,a.z,b.x,b.z,c.x,c.z,r);return t<0?null:t;
}
export function firstCoverBetween(a,b,covers,extra=0){
  if(!coversReady(covers||[])){stats.fallback++;return reference.firstCoverBetween(a,b,covers,extra);}
  stats.occlusion++;const index=tactics.api.cf_first_cover(a.x,a.z,b.x,b.z,extra);return index<0?null:covers[index];
}
export function positionBlocked(x,z,covers,padding=2){
  if(!coversReady(covers||[])){stats.fallback++;return reference.positionBlocked(x,z,covers,padding);}
  stats.position++;return Boolean(tactics.api.cf_position_blocked(x,z,padding));
}
export function warPath(start,destination,covers,limit=2100){
  if(!Number.isFinite(limit)||limit<0||limit>10000||!coversReady(covers||[])){stats.fallback++;return reference.warPath(start,destination,covers,limit);}
  stats.path++;const count=tactics.api.cf_war_path(start.x,start.z,destination.x,destination.z,Math.ceil(limit)),points=[];
  for(let i=0;i<count;i++)points.push({x:tactics.api.cf_waypoint_x(i),z:tactics.api.cf_waypoint_z(i)});
  return points;
}
