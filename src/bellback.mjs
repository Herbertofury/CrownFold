// One independent moving discovery per Crownless March seed. V1 anchors are fixed
// so traversing or reopening the same world never rolls a different encounter.
const PERIOD=182, AMPLITUDE=76, PER_BAND=24, BANDS=3, STEP_RADIUS=2.4, HARNESS_RADIUS=.98;
export const BELLBACK_REWARD=Object.freeze({ore:28,flux:45,xp:180});
const within=(a,b,limit)=>(a.x-b.x)**2+(a.z-b.z)**2<limit*limit;
const routes=Array.from({length:PER_BAND*BANDS},(_,index)=>{
 const a=index*Math.PI*2/PER_BAND,r=138+Math.floor(index/PER_BAND)*110+(index%3)*24;
 return {x:Math.cos(a)*r,z:Math.sin(a)*r,ux:-Math.sin(a),uz:Math.cos(a),angle:Math.atan2(-Math.sin(a),-Math.cos(a))};
});
export function bellbackEndpoints(index){
 const r=routes[index];
 return [-1,1].map(d=>({x:r.x+d*r.ux*AMPLITUDE,z:r.z+d*r.uz*AMPLITUDE}));
}
function identity(seed,index){return `bellback:1:${seed>>>0}:${index}`;}
export function createBellback(seed,biome,hash){
 let chosen=-1,rank=Infinity;
 for(let band=0;band<BANDS&&chosen<0;band++){
  for(let i=band*PER_BAND;i<(band+1)*PER_BAND;i++){
   const [a,b]=bellbackEndpoints(i),score=hash(i,731,seed);
   if(score>=rank||biome(a.x,a.z,seed)===biome(b.x,b.z,seed))continue;
   chosen=i;rank=score;
  }
 }
 return chosen<0?null:{v:1,id:identity(seed,chosen),route:chosen,seen:false,claimed:false};
}
export function restoreBellback(raw,seed,biome){
 if(!raw||raw.v!==1||!Number.isInteger(raw.route)||raw.route<0||raw.route>=routes.length||
   raw.id!==identity(seed,raw.route)||typeof raw.seen!=='boolean'||typeof raw.claimed!=='boolean')return null;
 const [a,b]=bellbackEndpoints(raw.route);
 if(biome(a.x,a.z,seed)===biome(b.x,b.z,seed))return null;
 return {v:1,id:raw.id,route:raw.route,seen:raw.seen||raw.claimed,claimed:raw.claimed};
}
export function bellbackPosition(state,seed,time){
 const r=routes[state.route],phase=(time/PERIOD+(seed>>>0)%127/127)*Math.PI*2;
 const along=Math.sin(phase)*AMPLITUDE,side=Math.sin(phase*2)*5;
 return {x:r.x+r.ux*along+r.uz*side,z:r.z+r.uz*along-r.ux*side,angle:r.angle};
}
// Called inside the existing simulation tick, not from a separate timer.
// Terrain probes and platform motion run only inside the local encounter radius.
export function updateBellback(s,terrain){
 const old=s.bellbackPose,m=s.bellback,p=s.player;
 if(!m||s.zone!=='frontier'||s.era!=='medieval'||!within(p,routes[m.route],245)){
  s.bellbackPose=null;s.bellbackRide=null;s.bellbackBoarded=false;return false;
 }
 const pos=bellbackPosition(m,s.temporal.baseSeed,s.time);
 if(!within(p,pos,162)){
  s.bellbackPose=null;s.bellbackRide=null;s.bellbackBoarded=false;return false;
 }
 const deck={x:pos.x+Math.cos(pos.angle)*5.2,z:pos.z+Math.sin(pos.angle)*5.2};
 const y=terrain(deck.x,deck.z,s.seed,'frontier');
 const next=s.bellbackPose={...pos,y:terrain(pos.x,pos.z,s.seed,'frontier'),
  deck:{...deck,step:y+.68,harness:y+1.62}};
 if(old&&s.bellbackRide&&within(p,old.deck,s.bellbackRide==='harness'?HARNESS_RADIUS:STEP_RADIUS)){
  const leg=s.bellbackRide;
  p.x+=next.deck.x-old.deck.x;p.z+=next.deck.z-old.deck.z;p.y+=next.deck[leg]-old.deck[leg];
 }else if(s.bellbackRide){s.bellbackRide=null;s.bellbackBoarded=false;}
 if(!m.seen&&within(p,pos,52)){m.seen=true;return true;}
 return false;
}
export function bellbackFloor(s,ground){
 const d=s.bellbackPose?.deck,leg=s.bellbackRide;
 if(!d||!within(s.player,d,leg==='harness'?HARNESS_RADIUS:STEP_RADIUS)){
  s.bellbackRide=null;
  if(!d||!within(s.player,d,STEP_RADIUS+.55))s.bellbackBoarded=false;
 }else if(leg&&d[leg]>ground)return d[leg];
 else s.bellbackRide=null;
 return ground;
}
export function landOnBellback(s,heightBefore,ground){
 const p=s.player,d=s.bellbackPose?.deck;
 if(!d||p.vy>0)return;
 for(const leg of ['harness','step']){
  const radius=leg==='harness'?HARNESS_RADIUS:STEP_RADIUS;
  if((leg==='harness'&&!s.bellbackBoarded)||!within(p,d,radius)||d[leg]<=ground)continue;
  if(s.bellbackRide!==leg&&(heightBefore<d[leg]-.03||p.y>d[leg]))continue;
  p.y=d[leg];p.vy=0;s.bellbackRide=leg;s.bellbackBoarded=true;return;
 }
 if(!s.bellbackRide&&p.y<=ground)s.bellbackBoarded=false;
}
export function bellbackCanClaim(s){
 return s.zone==='frontier'&&s.era==='medieval'&&s.player.hp>0&&s.bellback?.seen===true&&!s.bellback.claimed&&
  s.bellbackRide==='harness'&&s.bellbackPose&&within(s.player,s.bellbackPose.deck,HARNESS_RADIUS)&&
  Math.abs(s.player.y-s.bellbackPose.deck.harness)<.11;
}
export function bellbackTrailHint(s){
 const track=s.bellback&&!s.bellback.claimed&&routes[s.bellback.route];
 return track?`Follow the Bellback tracks near ${Math.round(track.x)} / ${Math.round(track.z)}. Watch for the golden platform, jump up, then jump inward to the harness. It won't stop for you.`:null;
}
export function bellbackPrompt(s){
 const d=s.bellbackPose?.deck;
 if(s.zone!=='frontier'||s.era!=='medieval'||!d||!s.bellback?.seen||s.bellback.claimed||!within(s.player,d,10))return null;
 return s.bellbackBoarded
  ?'BELLBACK / JUMP INWARD TO THE RAISED HARNESS'
  :'BELLBACK / JUMP ONTO THE LOW GOLD PLATFORM';
}
