// CrownFold v0.8 - deterministic battlefield geometry and capped tactical routing.
// No DOM, random globals, timer APIs, or engine dependencies: safe for simulation tests.
const hypot=Math.hypot;
const CELL=7;
const BOUNDS=Object.freeze({minX:-133,maxX:133,minZ:-182,maxZ:49});
export const COVER_ARCHETYPES=Object.freeze({
  resonance:{name:'RESONANCE PILLARS',description:'Pre-digital structures bend incoming ballistics.'},
  clockwork:{name:'CLOCKWORK REDOUBT',description:'Industrial fortifications packed with analogue computation.'},
  biomatter:{name:'LIVING EARTHWORKS',description:'An ancient biological shield grown from memory roots.'},
  prism:{name:'PRISM BASTION',description:'A refractive wall made from displaced light.'}
});
const SITES=Object.freeze([
  [-41,-29,7], [36,-43,9], [-17,-66,8], [24,-80,8],
  [-53,-99,9], [51,-108,8], [4,-122,7]
]);
export function makeBattlefieldCover(campaignIndex=0){return SITES.map(([x,z,radius],i)=>({
  id:`cover-${i+1}`,kind:Object.keys(COVER_ARCHETYPES)[(i+Math.max(0,campaignIndex))%4],
  x,z,radius,hp:300+radius*17,maxHp:300+radius*17
}));}
export function segmentCircle(a,b,c,r=0){
  const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
  if(len<1e-7)return hypot(a.x-c.x,a.z-c.z)<=r?0:null;
  const t=Math.max(0,Math.min(1,((c.x-a.x)*dx+(c.z-a.z)*dz)/len));
  const x=a.x+t*dx,z=a.z+t*dz;
  return (x-c.x)**2+(z-c.z)**2<=r*r?t:null;
}
export function firstCoverBetween(a,b,covers,extra=0){
  let best=null,time=Infinity;
  for(const cover of covers||[]){if(cover.hp<=0)continue;
    // Avoid a unit being trapped behind its own cover when firing from inside the footprint.
    if(hypot(a.x-cover.x,a.z-cover.z)<cover.radius*.75)continue;
    if(hypot(b.x-cover.x,b.z-cover.z)<cover.radius*.75)continue;
    const t=segmentCircle(a,b,cover,cover.radius+extra);
    if(t!==null&&t<time){time=t;best=cover;}
  }
  return best;
}
export function positionBlocked(x,z,covers,padding=2){
  if(x<BOUNDS.minX||x>BOUNDS.maxX||z<BOUNDS.minZ||z>BOUNDS.maxZ)return true;
  return (covers||[]).some(c=>c.hp>0&&hypot(x-c.x,z-c.z)<c.radius+padding);
}
const key=(x,z)=>`${x},${z}`;
const nearestFree=(x,z,covers)=>{
  const ix=Math.round(x/CELL),iz=Math.round(z/CELL);
  for(let radius=0;radius<7;radius++)for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue;
    const nx=(ix+dx)*CELL,nz=(iz+dz)*CELL;
    if(!positionBlocked(nx,nz,covers,2.3)&&!firstCoverBetween({x,z},{x:nx,z:nz},covers,2.3))return [ix+dx,iz+dz];
  }
  return [ix,iz];
};
const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
/** Returns navigation waypoints with bounded A*; returns [] if no route. */
export function warPath(start,destination,covers,limit=2100){
  if(!Number.isFinite(start.x+start.z+destination.x+destination.z))return [];
  if(!firstCoverBetween(start,destination,covers,2.3))return [{x:destination.x,z:destination.z}];
  const [sx,sz]=nearestFree(start.x,start.z,covers),[gx,gz]=nearestFree(destination.x,destination.z,covers);
  if(positionBlocked(sx*CELL,sz*CELL,covers,2.3)||positionBlocked(gx*CELL,gz*CELL,covers,2.3))return [];
  const goal=key(gx,gz),origin=key(sx,sz);
  const open=[{x:sx,z:sz,k:origin,g:0,f:hypot(gx-sx,gz-sz)}],came=new Map(),scores=new Map([[origin,0]]),closed=new Set();
  let steps=0,found=false;
  while(open.length&&++steps<limit){
    let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
    const here=open.splice(best,1)[0];if(closed.has(here.k))continue;
    if(here.k===goal){found=true;break;}closed.add(here.k);
    for(const [dx,dz]of directions){const nx=here.x+dx,nz=here.z+dz,nk=key(nx,nz);
      if(closed.has(nk)||positionBlocked(nx*CELL,nz*CELL,covers,2.3))continue;
      if(dx&&dz&&(positionBlocked((here.x+dx)*CELL,here.z*CELL,covers,2.3)||positionBlocked(here.x*CELL,(here.z+dz)*CELL,covers,2.3)))continue;
      if(firstCoverBetween({x:here.x*CELL,z:here.z*CELL},{x:nx*CELL,z:nz*CELL},covers,2.3))continue;
      const cost=here.g+(dx&&dz?Math.SQRT2:1);
      if(cost>= (scores.get(nk)??Infinity))continue;
      came.set(nk,here.k);scores.set(nk,cost);
      open.push({x:nx,z:nz,k:nk,g:cost,f:cost+hypot(gx-nx,gz-nz)});
    }
  }
  if(!found)return [];
  const raw=[],points=[];let current=goal;
  for(let n=0;current&&n<150;n++){const [x,z]=current.split(',').map(Number);raw.push({x:x*CELL,z:z*CELL});if(current===origin)break;current=came.get(current);}
  raw.reverse();let cursor=start;
  for(let i=0;i<raw.length;){let furthest=-1;
    for(let j=i;j<raw.length;j++)if(!firstCoverBetween(cursor,raw[j],covers,2.3))furthest=j;
    if(furthest<0)return [];
    points.push(raw[furthest]);cursor=raw[furthest];i=furthest+1;
  }
  if(!firstCoverBetween(cursor,destination,covers,2.3))points.push({x:destination.x,z:destination.z});
  return points;
}
