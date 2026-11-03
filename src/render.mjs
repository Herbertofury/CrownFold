import {terrainHeight, biomeAt, propsInChunk, worldGates, CONTRACTS, ENEMIES, STRUCTURES, clamp, dist, hash, TAU} from './sim.mjs';
import {LANDMARKS,LOCKBOXES,NPCS,DUNGEON_BY_ID} from './rpg.mjs';
import {ERAS,eraSites,availableRifts,facetAt} from './temporal.mjs';
import {BATTALIONS,WAR_BUILDINGS} from './war.mjs';
// No third-party runtime required: purpose-built WebGL2 instancing + procedural terrain.
const v={sub:(a,b)=>a.map((x,i)=>x-b[i]),dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{const n=Math.hypot(...a)||1;return a.map(t=>t/n);}};
const mul=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;};
const perspective=(fovy,aspect,near,far)=>{const f=1/Math.tan(fovy/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);};
const lookAt=(eye,target)=>{const z=v.norm(v.sub(eye,target)),x=v.norm(v.cross([0,1,0],z)),y=v.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-v.dot(x,eye),-v.dot(y,eye),-v.dot(z,eye),1]);};
const inverse=(m)=>{const a=Array.from({length:4},(_,r)=>[...Array.from({length:4},(_,c)=>m[c*4+r]),...Array.from({length:4},(_,c)=>+(r===c))]);for(let i=0;i<4;i++){let best=i;for(let j=i+1;j<4;j++)if(Math.abs(a[j][i])>Math.abs(a[best][i]))best=j;[a[i],a[best]]=[a[best],a[i]];const d=a[i][i];if(Math.abs(d)<1e-10)return null;for(let k=0;k<8;k++)a[i][k]/=d;for(let j=0;j<4;j++)if(j!==i){const t=a[j][i];for(let k=0;k<8;k++)a[j][k]-=t*a[i][k];}}return new Float32Array(Array.from({length:16},(_,i)=>a[i%4][4+Math.floor(i/4)]));};
const trans=(m,p)=>{const o=[0,0,0,0];for(let i=0;i<4;i++)for(let j=0;j<4;j++)o[i]+=m[j*4+i]*p[j];return o;};
const model=(x,y,z,sx,sy,sz,ry=0,rz=0)=>{const cy=Math.cos(ry),si=Math.sin(ry),cz=Math.cos(rz),sn=Math.sin(rz);return [cy*cz*sx,sn*sx,-si*cz*sx,0,-cy*sn*sy,cz*sy,si*sn*sy,0,si*sz,0,cy*sz,0,x,y,z,1];};
const build=()=>{const d=[],tri=(a,b,c,normal)=>{const n=normal||v.norm(v.cross(v.sub(b,a),v.sub(c,a)));for(const p of [a,b,c])d.push(...p,...n);};return {d,tri};};
function cube(){const b=build(),faces=[[[1,0,0],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]], [[-1,0,0],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5]],[[0,1,0],[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5]],[[0,-1,0],[-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5]],[[0,0,1],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5],[-.5,-.5,.5]],[[0,0,-1],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5],[.5,-.5,-.5]]];for(const [n,a,c,d,e] of faces){b.tri(a,c,d,n);b.tri(a,d,e,n);}return b.d;}
function cone(top=.03,sides=9){const b=build();for(let i=0;i<sides;i++){const a=i*TAU/sides,c=(i+1)*TAU/sides,p=[Math.cos(a)*.5,-.5,Math.sin(a)*.5],q=[Math.cos(c)*.5,-.5,Math.sin(c)*.5],r=[Math.cos(c)*top,.5,Math.sin(c)*top],t=[Math.cos(a)*top,.5,Math.sin(a)*top];b.tri(p,t,r);b.tri(p,r,q);b.tri([0,-.5,0],q,p,[0,-1,0]);if(top)b.tri([0,.5,0],t,r,[0,1,0]);}return b.d;}
function gem(){const b=build(),eq=[[.5,0,0],[0,0,.5],[-.5,0,0],[0,0,-.5]];for(let i=0;i<4;i++){b.tri([0,.65,0],eq[i],eq[(i+1)%4]);b.tri([0,-.55,0],eq[(i+1)%4],eq[i]);}return b.d;}
function sphere(sides=10,rings=7){const b=build();for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const f=(a,c)=>[Math.cos(c)*Math.cos(a)*.5,Math.sin(c)*.5,Math.cos(c)*Math.sin(a)*.5],a=j*TAU/sides,c=(j+1)*TAU/sides,p=-Math.PI/2+i*Math.PI/rings,q=-Math.PI/2+(i+1)*Math.PI/rings; b.tri(f(a,p),f(c,p),f(c,q));b.tri(f(a,p),f(c,q),f(a,q));}return b.d;}
function ring(){const b=build(),segs=16;for(let i=0;i<segs;i++){let a=i*TAU/segs,c=(i+1)*TAU/segs;for(let j=0;j<4;j++){let t=j*TAU/4,u=(j+1)*TAU/4;const p=(x,y)=>[(.5+Math.cos(y)*.10)*Math.cos(x),Math.sin(y)*.10,(.5+Math.cos(y)*.10)*Math.sin(x)];b.tri(p(a,t),p(a,u),p(c,u));b.tri(p(a,t),p(c,u),p(c,t));}}return b.d;}
const VERT=`#version 300 es
precision highp float;layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;layout(location=2) in mat4 aModel;layout(location=6) in vec4 aColor;uniform mat4 uVP;out vec3 vN;out vec3 vW;out vec4 vC;void main(){vec4 w=aModel*vec4(aPos,1.);vW=w.xyz;vN=normalize(mat3(aModel)*aNormal);vC=aColor;gl_Position=uVP*w;}`;
const TERRVERT=`#version 300 es
precision highp float;layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;layout(location=2) in vec3 aColor;uniform mat4 uVP;out vec3 vN;out vec3 vW;out vec4 vC;void main(){vW=aPos;vN=aNormal;vC=vec4(aColor,0.);gl_Position=uVP*vec4(aPos,1.);}`;
const FRAG=`#version 300 es
precision highp float;in vec3 vN;in vec3 vW;in vec4 vC;uniform vec3 uEye;uniform vec3 uFog;uniform vec3 uSun;uniform float uTime;uniform float uVis;out vec4 frag;void main(){
 vec3 n=normalize(vN),light=normalize(uSun),view=normalize(uEye-vW),halfway=normalize(light+view);
 float lam=max(dot(n,light),0.),ambient=.27+max(n.y,0.)*.10,fill=max(dot(n,vec3(-.52,.25,-.73)),0.)*.20;
 float spec=pow(max(dot(n,halfway),0.),32.)*.23;float edge=pow(1.-max(dot(n,view),0.),3.2)*.16;
 vec3 color=vC.rgb*(ambient+lam*.74+fill)+vec3(.85,.92,1.)*spec+vC.rgb*edge;
 color+=vC.rgb*vC.a*(.8+.15*sin(uTime*4.+vW.x*.2));
 float distanceFromEye=length(uEye-vW);float fog=smoothstep(uVis*.48,uVis,distanceFromEye);
 color=mix(color,uFog,fog);color=color/(color+vec3(.38));color=pow(color,vec3(1./1.45));frag=vec4(color,1.);
}`;
const palette={ink:[.04,.09,.12],dark:[.09,.16,.19],metal:[.27,.38,.42],steel:[.54,.67,.72],sand:[.39,.35,.30],wood:[.27,.28,.25],leaf:[.12,.40,.30],mint:[.17,.91,.76],amber:[1,.67,.27],red:[1,.24,.31],purple:[.6,.35,1],white:[.86,.94,.92],ash:[.23,.22,.27],water:[.1,.4,.51]};
const mixColor=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
function terrainColor(x,z,y,seed,zone,era='medieval',phaseEra=null){const b=biomeAt(x,z,seed,zone),variation=(hash(Math.floor(x/5),Math.floor(z/5),seed)-.5)*.095;let c;
  if(zone==='dungeon')c=[.17,.17,.26];else if(zone==='operation')c=mixColor([.21,.25,.3],[.33,.2,.23],clamp(Math.sin(x*.006+z*.013)*.5+.5,0,1));
  else if(b==='bloom')c=[.16,.37,.31];else if(b==='marsh')c=[.16,.30,.33];else if(b==='wastes')c=[.31,.30,.27];else c=[.20,.29,.28];
  if(zone!=='dungeon'){const eraColors=ERAS[phaseEra||era]?.terrain||ERAS.medieval.terrain;c=mixColor(c,eraColors,phaseEra?.70:.42);}
  if(y>8)c=mixColor(c,[.43,.43,.44],clamp((y-8)/12,0,.65));return c.map(n=>clamp(n+variation,.02,.9));}
function compile(g,source,type){const s=g.createShader(type);g.shaderSource(s,source);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s;}
function link(g,vert,frag){const p=g.createProgram(),a=compile(g,vert,g.VERTEX_SHADER),b=compile(g,frag,g.FRAGMENT_SHADER);g.attachShader(p,a);g.attachShader(p,b);g.linkProgram(p);g.deleteShader(a);g.deleteShader(b);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));return p;}
export class WorldRenderer {
 constructor(canvas,quality='high'){
  this.canvas=canvas;this.quality=quality;this.gl=canvas.getContext('webgl2',{antialias:true,alpha:true,powerPreference:'high-performance',preserveDrawingBuffer:true});this.ctx=null;this.software=!this.gl;this.camera={yaw:0,pitch:-.075};this.vp=null;this.ivp=null;this.eye=[0,0,0];this.target=[0,0,0];this.radius=quality==='high'?160:135;this.tactical={x:0,z:0,zoom:78};this.focus=null;this.terrainOrigin=null;this.propsKey='';this.worldProps=[];this.meshes={};this.clock=0;
  if(this.software){this.ctx=canvas.getContext('2d',{alpha:false});for(const [name,vertices] of Object.entries({cube:cube(),cone:cone(),cylinder:cone(.5,10),gem:gem(),sphere:sphere(7,5),ring:ring()}))this.meshes[name]={vertices,instancesData:[]};}else this.initGL();
  this.resize=()=>this.size();window.addEventListener('resize',this.resize);this.size();
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.software=true;this.gl=null;this.ctx=canvas.getContext('2d');});
 }
 size(){const r=this.canvas.getBoundingClientRect(),d=this.quality==='high'?Math.min(devicePixelRatio||1,1.65):Math.min(devicePixelRatio||1,1.05);this.canvas.width=Math.max(1,Math.floor(r.width*d));this.canvas.height=Math.max(1,Math.floor(r.height*d));this.w=r.width;this.h=r.height;}
 initGL(){const g=this.gl;this.program=link(g,VERT,FRAG);this.terrainProgram=link(g,TERRVERT,FRAG);
  for(const [name,vertices] of Object.entries({cube:cube(),cone:cone(),cylinder:cone(.5,12),gem:gem(),sphere:sphere(),ring:ring()})){
   const vao=g.createVertexArray();g.bindVertexArray(vao);const vertex=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,vertex);g.bufferData(g.ARRAY_BUFFER,new Float32Array(vertices),g.STATIC_DRAW);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,3,g.FLOAT,false,24,0);g.enableVertexAttribArray(1);g.vertexAttribPointer(1,3,g.FLOAT,false,24,12);
   const instances=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,instances);for(let i=0;i<4;i++){g.enableVertexAttribArray(2+i);g.vertexAttribPointer(2+i,4,g.FLOAT,false,80,i*16);g.vertexAttribDivisor(2+i,1);}g.enableVertexAttribArray(6);g.vertexAttribPointer(6,4,g.FLOAT,false,80,64);g.vertexAttribDivisor(6,1);this.meshes[name]={vao,vertex,instances,count:vertices.length/6,vertices,instancesData:[]};
  }
  this.terrainVAO=g.createVertexArray();g.bindVertexArray(this.terrainVAO);this.terrainVBO=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,this.terrainVBO);for(let i=0;i<3;i++){g.enableVertexAttribArray(i);g.vertexAttribPointer(i,3,g.FLOAT,false,36,i*12);}this.terrainCount=0;
  g.bindVertexArray(null);g.enable(g.DEPTH_TEST);g.disable(g.CULL_FACE);
 }
 add(kind,x,y,z,sx,sy,sz,color=palette.steel,ry=0,rz=0,glow=0){const m=this.meshes[kind];if(m)m.instancesData.push(...model(x,y,z,sx,sy,sz,ry,rz),...color,glow);}
 beam(a,b,r,color,glow=0){const direction=v.sub(b,a),len=Math.hypot(...direction);if(len<.001)return;const y=v.norm(direction),x=v.norm(v.cross(Math.abs(y[1])>.95?[0,0,1]:[0,1,0],y)),z=v.cross(x,y);this.meshes.cylinder.instancesData.push(x[0]*r,x[1]*r,x[2]*r,0,y[0]*len,y[1]*len,y[2]*len,0,z[0]*r,z[1]*r,z[2]*r,0,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,1,...color,glow);}
 rebuildTerrain(s){const g=this.gl,unit=this.quality==='high'?3.8:5.5,N=this.quality==='high'?86:56,ox=Math.floor((this.focus||s.player).x/16)*16,oz=Math.floor((this.focus||s.player).z/16)*16;const key=`${ox}:${oz}:${s.zone}:${s.seed}:${s.era}:${s.temporal?.foldRevision||0}:${this.quality}`;if(this.terrainOrigin===key)return;this.terrainOrigin=key;const a=[];
  const normal=(x,z)=>v.norm([terrainHeight(x-1,z,s.seed,s.zone)-terrainHeight(x+1,z,s.seed,s.zone),2,terrainHeight(x,z-1,s.seed,s.zone)-terrainHeight(x,z+1,s.seed,s.zone)]);
  const centerX=ox-N*unit/2,centerZ=oz-N*unit/2;
  for(let iz=0;iz<N;iz++)for(let ix=0;ix<N;ix++){
   const x=centerX+ix*unit,z=centerZ+iz*unit,p=[[x,z],[x+unit,z],[x+unit,z+unit],[x,z+unit]];
   for(const k of [0,1,2,0,2,3]){const [px,pz]=p[k],y=terrainHeight(px,pz,s.seed,s.zone),n=normal(px,pz),c=terrainColor(px,pz,y,s.seed,s.zone,s.era,facetAt(s,px,pz)?.era);a.push(px,y,pz,...n,...c);}
  }
  if(g){g.bindVertexArray(this.terrainVAO);g.bindBuffer(g.ARRAY_BUFFER,this.terrainVBO);g.bufferData(g.ARRAY_BUFFER,new Float32Array(a),g.DYNAMIC_DRAW);this.terrainCount=a.length/9;}else this.softTerrain={centerX,centerZ,N,unit};
 }
 rebuildProps(s){const view=this.focus||s.player,cx=Math.floor(view.x/32),cz=Math.floor(view.z/32),key=`${cx}:${cz}:${s.zone}:${s.seed}:${this.quality}:${s.harvested.length}`;if(key===this.propsKey)return;this.propsKey=key;const radius=this.quality==='high'?5:4,harvested=new Set(s.harvested),props=[];
  for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++)for(const p of propsInChunk(cx+dx,cz+dz,s.seed,s.zone))if(!harvested.has(p.id)&&dist(view,p)<this.radius)props.push(p);
  this.worldProps=props;
 }
 prop(p,t){const {x,y,z,scale:k,type}=p,phase=hash(Math.floor(x),Math.floor(z),12);if(type==='tree'||type==='deadwood'){
   const dead=type==='deadwood',b=dead?palette.ash:palette.wood,c=dead?[.38,.35,.37]:palette.leaf;
   this.add('cylinder',x,y+2*k,z,.55*k,4*k,.55*k,b);
   if(!dead){this.add('cone',x,y+4.0*k,z,2.9*k,3.5*k,2.9*k,c);this.add('cone',x,y+5.5*k,z,2.1*k,3.1*k,2.1*k,mixColor(c,palette.mint,.12));}else for(let i=0;i<3;i++){let a=i*2.2+phase*TAU;this.beam([x,y+2.5*k,z],[x+Math.sin(a)*2.4*k,y+3.5*k,z+Math.cos(a)*1.5*k],.18*k,b);}
  }else if(type==='rock'){this.add('gem',x,y+.9*k,z,2.7*k,2.2*k,2.3*k,palette.metal,phase*TAU);this.add('gem',x+1.0*k,y+.25*k,z-.6*k,1.3*k,1*k,1.3*k,palette.ash);}
  else if(type==='crystal'){this.add('gem',x,y+1.6*k,z,1.1*k,3.3*k,1.1*k,palette.purple,0,phase*.25,.7);this.add('gem',x+1*k,y+.85*k,z+.3*k,.75*k,1.75*k,.75*k,palette.mint,.2,-.3,.4);}
  else if(type==='flower'){this.add('gem',x,y+.8*k,z,.45*k,1.3*k,.45*k,palette.mint,phase);this.add('sphere',x,y+1.5*k,z,.8*k,.35*k,.8*k,palette.amber);}
  else if(type==='mushroom'){this.add('cylinder',x,y+.5*k,z,.25*k,1*k,.25*k,palette.white);this.add('sphere',x,y+1.1*k,z,1.9*k,.7*k,1.9*k,palette.purple);}
  else if(type==='pylon'){this.add('cylinder',x,y+1.5*k,z,.95*k,3*k,.95*k,palette.ash);this.add('gem',x,y+3.7*k,z,1.2*k,2.6*k,1.2*k,palette.purple,phase*TAU,0,.7);}
 }
 humanoid(x,y,z,color=palette.mint,scale=1,angle=0,role='soldier',t=0){const bob=Math.sin(t*8+x)*.075*scale,metal=palette.dark,glow=role==='enemy'?palette.red:palette.mint;
  this.add('cylinder',x,y+.3*scale,z,.63*scale,.5*scale,.53*scale,metal,angle);
  this.add('cube',x,y+1.32*scale+bob,z,.84*scale,1.0*scale,.62*scale,color,angle);
  this.add('sphere',x,y+2.15*scale+bob,z,.56*scale,.59*scale,.54*scale,metal);
  this.add('cube',x,y+2.15*scale+bob,z-.31*scale,.43*scale,.17*scale,.12*scale,glow,angle,0,.8);
  for(const k of [-1,1]){this.add('cube',x+k*.31*scale,y+.58*scale,z,.28*scale,.95*scale,.32*scale,metal,angle);
    this.add('cube',x+k*.57*scale,y+1.28*scale,z,.33*scale,.85*scale,.31*scale,color,angle);}
  this.add('cube',x+.3*scale,y+1.48*scale,z-.52*scale,.27*scale,.22*scale,1.24*scale,metal,angle);this.add('cylinder',x+.3*scale,y+1.5*scale,z-1.18*scale,.11*scale,.5*scale,.11*scale,palette.steel,angle,Math.PI/2);
 }
 enemy(e,s){const def=ENEMIES[e.kind],y=terrainHeight(e.x,e.z,s.seed,s.zone),x=e.x,z=e.z,dx=s.player.x-x,dz=s.player.z-z,a=Math.atan2(dx,-dz),glow=def.color;
  if(e.kind==='factory'){this.add('cylinder',x,y+2.8,z,6.5,5.8,6.5,palette.ash);this.add('cylinder',x,y+6.5,z,4.5,2.1,4.5,palette.red,0,0,.6);for(let i=0;i<6;i++){const r=i*TAU/6;this.add('cylinder',x+Math.sin(r)*3.3,y+3.2,z+Math.cos(r)*3.3,.9,6.3,.9,palette.metal);}this.add('gem',x,y+9,z,2.3,2.9,2.3,palette.red,0,0,1);}
  else if(e.kind==='titan'){this.add('cube',x,y+5.5,z,6.2,5.5,4.8,palette.ash,a);this.add('gem',x,y+6.3,z-2.6,2,2.3,1.2,palette.red,a,0,.8);this.add('cube',x,y+10,z,3.1,2.1,3.1,palette.metal);for(const k of [-1,1]){this.add('cube',x+k*2.4,y+2.3,z,1.4,4.4,1.6,palette.metal,a);this.add('cube',x+k*4.4,y+6,z,2.1,4.5,2.3,palette.ash,a);this.add('cylinder',x+k*4.3,y+6.2,z-1.6,1.15,3.0,1.15,palette.red,a,Math.PI/2,.4);}this.add('ring',x,y+11.4,z,5,1.2,5,palette.amber,s.time*.4,0,.5);}
  else if(e.kind==='specter'){this.add('cone',x,y+1.6,z,1.7,3.2,1.7,[.34,.55,.82],a,0,.4);this.add('gem',x,y+2.4,z-.45,.8,1,.4,palette.mint,0,0,.9);this.add('ring',x,y+.15,z,2.2,.14,2.2,palette.purple,s.time,0,.8);}
  else if(e.kind==='corruptor'){this.add('cylinder',x,y+1.6,z,1.4,3.0,1.5,palette.ash);this.add('gem',x,y+3.3,z,1.8,2.1,1.7,palette.mint,s.time*.4,0,.7);for(const a of [-1,1])this.add('cone',x+a*1.3,y+2.8,z,1.1,3.9,1.1,palette.purple,0,a*.2);}
  else if(e.kind==='oracle'){this.add('gem',x,y+3.3,z,4.3,6.2,3.6,palette.purple,s.time*.18,0,.6);for(let i=0;i<6;i++){const a=i*TAU/6+s.time*.36;this.add('gem',x+Math.sin(a)*3.6,y+3.3+Math.sin(s.time*3+i)*.3,z+Math.cos(a)*3.6,.9,1.3,.9,palette.amber,a,0,.8);}}
  else if(e.kind==='crawler'){this.add('gem',x,y+.8,z,1.5,1.45,1.7,glow,a);this.add('sphere',x,y+1.5,z-.55,.85,.7,.9,palette.ash);for(const k of [-1,1]){this.add('cone',x+k*.7,y+.34,z-.5,.4,1.3,.5,glow,0,k*.5);}this.add('gem',x,y+1.7,z-1,.26,.24,.24,palette.amber,0,0,.7);}
  else if(e.kind==='warden'){this.humanoid(x,y,z,palette.purple,1.65,a,'enemy',s.time);this.add('cylinder',x,y+3.3,z,2.2,.4,2.2,palette.ash,0,0,.4);}
  else if(e.kind==='artillery'){this.add('cube',x,y+1.1,z,2.4,2.2,2.4,palette.ash,a);this.add('cylinder',x,y+3.0,z,1.4,2.5,1.4,palette.red,a,.7);this.add('gem',x,y+4.35,z,.6,1.1,.6,glow);}
  else this.humanoid(x,y,z,palette.ash,1,a,'enemy',s.time);
  if(e.hp<e.maxHp)this.healthMarker(x,y+(e.kind==='titan'?14:e.kind==='factory'?11:e.kind==='warden'?4.1:3),z,e.hp/e.maxHp,glow);
 }
 healthMarker(x,y,z,fraction,color){this.add('cube',x,y,z,2.3,.13,.13,palette.ink);this.add('cube',x-(1-fraction)*1.1,y+.015,z-.01,Math.max(.01,2.1*fraction),.15,.16,color,0,0,.5);}
 building(b){const y=terrainHeight(b.x,b.z,this.activeSeed,this.activeZone),x=b.x,z=b.z;
   if(b.kind==='turret'){this.add('cylinder',x,y+.5,z,2.1,1,2.1,palette.metal);this.add('cube',x,y+1.6,z,1.85,1.3,1.8,palette.steel);this.add('cylinder',x,y+2.0,z-1.35,.37,3.0,.37,palette.ink,0,Math.PI/2);this.add('gem',x,y+2.7,z,.42,.65,.42,palette.mint,0,0,.8);}
   if(b.kind==='beacon'){this.add('cylinder',x,y+1.3,z,2,2.6,2,palette.ink);this.add('ring',x,y+3.1,z,3.3,.32,3.3,palette.mint,0,0,.8);this.add('gem',x,y+4.7,z,1,2.6,1,palette.mint,0,0,.9);}
   if(b.kind==='shelter'){this.add('cube',x,y+.9,z,5,1.8,3.5,palette.metal);this.add('cube',x,y+2.1,z,5.5,.4,4.2,palette.white);this.add('ring',x,y+2.4,z,1.2,.2,1.2,palette.mint,0,0,.7);}
   if(b.kind==='greenhouse'){this.add('cylinder',x,y+.45,z,6,.8,6,palette.wood);this.add('sphere',x,y+2.1,z,6,3.4,6,[.17,.48,.39],0,0,.3);this.add('gem',x,y+3,z,.9,2.2,.9,palette.mint,0,0,.65);}
   if(b.kind==='refinery'){this.add('cube',x,y+1.8,z,5,3.5,5,palette.ash);this.add('cylinder',x-2,y+4,z,1.3,4,1.3,palette.metal);this.add('cylinder',x+2,y+4,z,1.3,4,1.3,palette.metal);this.add('gem',x,y+3,z,1.4,.8,1.6,palette.amber,0,0,.8);}
   if(b.kind==='bastion'){this.add('cylinder',x,y+1,z,7,2,7,palette.metal);for(let i=0;i<4;i++){const a=i*TAU/4;this.add('cube',x+Math.sin(a)*3,y+3.3,z+Math.cos(a)*3,1.2,4,1.2,palette.steel,a);}this.add('sphere',x,y+4.9,z,3,3,3,palette.mint,0,0,.6);}
   if(b.kind==='barricade'){this.add('cube',x,y+1.25,z,5.2,2.5,.9,palette.steel);this.add('cube',x,y+2.65,z,4.6,.28,1.2,palette.ink);}
 }
 monument(x,z,kind,s,scale=1){const y=terrainHeight(x,z,s.seed,s.zone),t=s.time;
   if(kind==='gate'){this.add('cylinder',x,y+.8,z,9,1.6,9,palette.ash);for(const k of [-1,1])this.add('cube',x+k*4.2,y+6.2,z,1.8,11.8,2.2,palette.metal);this.add('cube',x,y+12,z,10,1.7,2.4,palette.ash);this.add('ring',x,y+5.8,z,7.3,1.1,7.3,palette.purple,t*.28,Math.PI/2,.85);this.add('gem',x,y+5.6,z,.8,6,.8,palette.mint,t*.2,0,.6);}
   else if(kind==='signal'){this.add('cylinder',x,y+1.0,z,7,2,7,palette.metal);for(const k of [-1,1])this.add('cube',x+k*3.2,y+6,z,1,10,1,palette.ash);this.add('ring',x,y+8,z,5.1,.7,5.1,palette.mint,t*.5,Math.PI/2,.7);this.add('gem',x,y+9.2,z,1.1,3.5,1.1,palette.amber,t*.23,0,.65);}
   else if(kind==='drill'){this.add('cylinder',x,y+1,z,10,2,10,palette.ash);this.add('cylinder',x,y+5,z,4.2,9,4.2,palette.metal);this.add('gem',x,y+10,z,3.4,8,3.4,palette.purple,0,0,.8);this.add('ring',x,y+6,z,9,.7,9,palette.mint,t*.3,0,.7);}
   else if(kind==='pylon'){this.add('cylinder',x,y+1,z,4,2,4,palette.ash);this.add('cylinder',x,y+5,z,1.2,8,1.2,palette.metal);this.add('gem',x,y+10,z,2.1,4,2.1,palette.mint,t*.28,0,.8);}
   else if(kind==='extract'){this.add('ring',x,y+.4,z,12,.45,12,palette.amber,t*.4,0,.8);for(let i=0;i<8;i++){const a=i*TAU/8;this.add('cube',x+Math.sin(a)*6,y+.32,z+Math.cos(a)*6,.7,.25,2.6,palette.amber,a,.0,.7);}this.add('gem',x,y+3.6,z,.9,6,.9,palette.mint,t*.3,0,.8);}
 }
 drawDungeon(s){const d=s.dungeon;if(!d)return;const y=-5,phase=s.time,theme=d.id==='glass'?palette.purple:d.id==='roots'?palette.mint:palette.water;
  // Thirty-something physical walls form three rooms and gated hallways. The movement solver respects the cross-gates.
  this.add('cube',0,y-.9,-72,43,1.6,166,palette.ash);
  this.add('cube',-20,y+3.0,-72,2.1,6.0,167,palette.metal);this.add('cube',20,y+3.0,-72,2.1,6.0,167,palette.metal);
  this.add('cube',0,y+3.0,10,42,6,2,palette.metal);this.add('cube',0,y+3.0,-154,42,6,2,palette.metal);
  for(const z of [-20,-65,-107]){for(const side of [-1,1])this.add('cube',side*13.6,y+3,z,13,6.2,2.1,palette.metal);this.add('cube',0,y+6,z,14,.8,2.5,palette.ash);for(const side of [-1,1])this.add('cylinder',side*7,y+3,z,1.3,6.6,1.3,theme,0,0,.26);}
  for(let i=0;i<12;i++){const z=2-i*13.4;for(const side of [-1,1]){this.add('cylinder',side*16.5,y+3.4,z,1.9,6.7,1.9,palette.ash);this.add('gem',side*16.5,y+6.6,z,.72,1.5,.72,theme,phase*.3,0,.75);}}
  for(const [i,point]of [{x:-11,z:-43},{x:12,z:-83}].entries()){
    const active=d.sigils[i];this.add('cylinder',point.x,y+.5,point.z,3.6,.9,3.6,palette.ash);this.add('ring',point.x,y+.9,point.z,4.9,.4,4.9,active?palette.mint:theme,phase*.65,0,.8);this.add('gem',point.x,y+3.3,point.z,2.4,5.5,2.4,active?palette.mint:theme,phase*.3,0,.85);
  }
  this.add('cylinder',0,y+.5,-129,10.5,.9,10.5,palette.ash);this.add('ring',0,y+.65,-129,12,.4,12,theme,phase*.5,0,.8);
  this.add('cube',7,y+.8,-137,3,1.8,2.7,palette.ash);this.add('gem',7,y+2,-137,2.2,2.6,2.2,d.bossDead?palette.amber:palette.purple,phase*.4,0,.85);
  for(const portal of [{x:-12,z:6},{x:0,z:-147}]){const x=portal.x,z=portal.z;this.add('ring',x,y+.15,z,5,.45,5,palette.amber,phase*.4,0,.7);this.add('gem',x,y+2.6,z,.5,4,.5,palette.mint,phase*.25,0,.8);}
 }
 landmark(place,s){const y=terrainHeight(place.x,place.z,s.seed,s.zone),x=place.x,z=place.z,t=s.time;
  if(place.kind==='dungeon'){this.add('cylinder',x,y+.4,z,11,.8,11,palette.ash);for(const side of [-1,1])this.add('cube',x+side*5,y+4,z,1.6,8,2.1,palette.metal);this.add('cube',x,y+8,z,11,1.1,2.2,palette.ash);this.add('ring',x,y+3.9,z,6,1.2,6,place.id==='roots'?palette.mint:place.id==='archive'?palette.water:palette.purple,t*.24,Math.PI/2,.7);this.add('gem',x,y+4,z,.8,5.6,.8,palette.amber,t*.3,0,.8);}
  else if(place.kind==='cache'){this.add('cylinder',x,y+.5,z,8,.7,8,palette.ash);this.add('cube',x,y+2.0,z,7,3.5,6,palette.metal);this.add('gem',x,y+4,z,2,2,2,palette.amber,t*.22,0,.8);this.add('ring',x,y+.4,z,10,.24,10,palette.purple,0,0,.5);}
  else if(place.id==='freehold'){for(let k=0;k<6;k++){const a=k*TAU/6;this.add('cylinder',x+Math.sin(a)*10,y+1.2,z+Math.cos(a)*10,4,2.4,4,palette.wood);this.add('cone',x+Math.sin(a)*10,y+4,z+Math.cos(a)*10,5.5,3.8,5.5,palette.ash);}this.add('gem',x,y+5,z,1,5,1,palette.mint,t*.4,0,.8);}
 }
 drawWarfront(s,ui){const w=s.war,p=this.focus||s.player,clock=s.time;const base=(b,ally)=>{if(dist(b,p)>this.radius)return;const y=terrainHeight(b.x,b.z,s.seed,s.zone),c=ally?palette.mint:palette.red;this.add('cylinder',b.x,y+.35,b.z,18,1.0,18,palette.ash);for(const [dx,dz]of [[-8,-8],[-8,8],[8,-8],[8,8]]){this.add('cube',b.x+dx,y+5,b.z+dz,3.5,10,3.5,palette.metal);this.add('cone',b.x+dx,y+11,b.z+dz,4.5,3.5,4.5,c);}this.add('cube',b.x,y+3,b.z,13,6,13,palette.ash);this.add('gem',b.x,y+9,b.z,3,8,3,c,clock*.25,0,.65);this.healthMarker(b.x,y+14,b.z,b.hp/b.maxHp,c);};base(w.base,true);base(w.enemyBase,false);
 for(const a of w.anchors)if(a.hp>0&&dist(a,p)<this.radius){const y=terrainHeight(a.x,a.z,s.seed,s.zone);this.add('cylinder',a.x,y+5,a.z,6.8,10,6.8,palette.ash);for(const dx of [-5,5])this.add('cube',a.x+dx,y+8,a.z,2.2,10,2.2,palette.metal);this.add('ring',a.x,y+13,a.z,8,.45,8,palette.purple,s.time*.24,Math.PI/2,.75);this.add('gem',a.x,y+14,a.z,3,6,3,palette.purple,s.time*.4,0,.95);this.healthMarker(a.x,y+20,a.z,a.hp/a.maxHp,palette.red);}
 // Destructible cross-era field cover, with visibly different materials.
 for(const cover of w.cover||[])if(cover.hp>0&&dist(cover,p)<this.radius){
  const y=terrainHeight(cover.x,cover.z,s.seed,s.zone),c=cover.kind==='resonance'?palette.amber:cover.kind==='clockwork'?palette.wood:cover.kind==='biomatter'?palette.mint:palette.purple;
  const h=cover.kind==='clockwork'?6.2:4.9,r=cover.radius;
  for(const side of [-1,1])this.add('cube',cover.x+side*r*.35,y+h*.52,cover.z,r*.54,h,r*.82,cover.kind==='biomatter'?palette.ash:palette.metal);
  this.add('cube',cover.x,y+h+.15,cover.z,r*1.65,.58,r*.9,c,0,0,.75);
  for(const side of [-1,1])this.add('gem',cover.x+side*r*.6,y+h+1.4,cover.z,1.3,2.8,1.3,c,clock*.3,0,.72);
  if(cover.hp<cover.maxHp)this.healthMarker(cover.x,y+h+4,cover.z,cover.hp/cover.maxHp,c);
 }
 if(w.act==='extraction'&&dist(w.extraction,p)<this.radius){this.monument(w.extraction.x,w.extraction.z,'extract',s);if(w.extraction.active){const y=terrainHeight(w.extraction.x,w.extraction.z,s.seed,s.zone);this.add('gem',w.extraction.x,y+12,w.extraction.z,2.5,12,2.5,palette.mint,s.time*.7,0,.9);}}
 for(const drop of w.supportDrops)if(dist(drop,p)<this.radius){const y=terrainHeight(drop.x,drop.z,s.seed,s.zone),c=drop.id==='epoch_lance'?palette.red:palette.mint;this.add('ring',drop.x,y+.5,drop.z,14,.65,14,c,s.time*.6,0,.8);this.add('gem',drop.x,y+5+Math.sin(s.time*5),drop.z,2.2,6,2.2,c,s.time,0,.9);}
 for(const n of w.nodes)if(dist(n,p)<this.radius){const y=terrainHeight(n.x,n.z,s.seed,s.zone),c=n.owner==='ally'?palette.mint:n.owner==='enemy'?palette.red:palette.amber;this.add('ring',n.x,y+.4,n.z,11,.5,11,c,clock*.16,0,.7);this.add('gem',n.x,y+4,n.z,2,7,2,c,clock*.3,0,.85);}
 for(const b of w.buildings)if(dist(b,p)<this.radius){const y=terrainHeight(b.x,b.z,s.seed,s.zone),c=b.kind==='foundry'?palette.amber:palette.steel;if(b.kind==='barracks'){this.add('cube',b.x,y+2.6,b.z,10,5.2,8,palette.wood);this.add('cone',b.x,y+6,b.z,11,4,9,c);this.add('gem',b.x,y+8,b.z,1,2,1,palette.mint);}else if(b.kind==='foundry'){this.add('cube',b.x,y+2.3,b.z,10,4.6,10,palette.ash);for(const i of [-1,1])this.add('cylinder',b.x+i*3,y+5,b.z,1.8,8,1.8,c);this.add('ring',b.x,y+7,b.z,7,.4,7,palette.mint,clock*.35,0,.7);}else{this.add('cylinder',b.x,y+5,b.z,4.5,10,4.5,palette.steel);this.add('cone',b.x,y+11,b.z,6,4,6,palette.amber);}}
 // Optional frontline crises are actual objects in the battlefield, not only objectives in a menu.
 const e=w.expedition;if(e&&dist(e,p)<this.radius){const y=terrainHeight(e.x,e.z,s.seed,s.zone);
  this.add('ring',e.x,y+.25,e.z,11,.27,11,palette.amber,clock*.35,0,.82);
  if(e.type==='spire'){
   this.add('cylinder',e.x,y+5,e.z,3.1,10,3.1,palette.metal);
   this.add('gem',e.x,y+12+Math.sin(clock*2)*.7,e.z,2.9,5,2.9,palette.red,clock*.6,0,.95);
   this.add('ring',e.x,y+12,e.z,5,.5,5,palette.purple,clock*.6,Math.PI/2,.8);
   this.healthMarker(e.x,y+18,e.z,e.hp/e.maxHp,palette.red);
  }else if(e.type==='salvage'){
   for(const [dx,dz]of [[-3,-3],[3,3],[-3,3],[3,-3]])this.add('cylinder',e.x+dx,y+.9,e.z+dz,.9,2,.9,palette.metal);
   this.add('cube',e.x,y+2.0,e.z,6,3.4,5.5,palette.ash);
   this.add('gem',e.x,y+5+Math.sin(clock*3)*.5,e.z,2.6,3.3,2.6,palette.amber,clock*.4,0,.92);
  }else if(e.type==='escort'){
   this.add('cube',e.x,y+1.3,e.z,8,2.6,4,palette.wood);
   this.add('cube',e.x,y+3,e.z,5,1.3,3,palette.ash);
   for(const dx of [-3,3])for(const dz of [-2.2,2.2])this.add('cylinder',e.x+dx,y+.7,e.z+dz,1.5,1.8,1.5,palette.metal,Math.PI/2,0,0);
   this.add('gem',e.x,y+5,e.z,1.5,3,1.5,palette.mint,clock*.35,0,.7);
   this.healthMarker(e.x,y+7,e.z,e.hp/e.maxHp,palette.mint);
  }
 }
 for(const unit of [...w.army,...w.enemyArmy]){if(unit.count<=0||dist(unit,p)>this.radius-8)continue;const spec=BATTALIONS[unit.type],c=unit.side==='ally'?ERAS[spec.era].terrain:palette.red,visible=Math.min(unit.count,this.software?5:Math.min(14,unit.count));for(let i=0;i<visible;i++){const dx=((i%4)-1.5)*1.9,dz=(Math.floor(i/4)-1)*2.0,x=unit.x+dx,z=unit.z+dz,y=terrainHeight(x,z,s.seed,s.zone),angle=unit.side==='ally'?Math.PI:0;this.humanoid(x,y,z,c,spec.era==='steam'?1.12:.90,angle,unit.side==='ally'?'friendly':'enemy',clock);if(unit.type==='riders'||unit.type==='cannons'){this.add('cube',x,y+.48,z,2.1,.8,2.2,palette.wood);}}if(ui.commander){const y=terrainHeight(unit.x,unit.z,s.seed,s.zone);this.add('ring',unit.x,y+.12,unit.z,6,.2,6,unit.side==='ally'?palette.mint:palette.red,0,0,.6);}}
 }
 drawScene(s,ui={}){this.clock=s.time;this.activeSeed=s.seed;this.activeZone=s.zone;this.focus=ui.commander?this.tactical:s.player;this.rebuildTerrain(s);this.rebuildProps(s);for(const m of Object.values(this.meshes))m.instancesData=[];
  const pawn=s.player,p=this.focus,y=terrainHeight(p.x,p.z,s.seed,s.zone),yaw=pawn.yaw,pitch=pawn.pitch,f=[Math.sin(yaw),0,-Math.cos(yaw)],right=[Math.cos(yaw),0,Math.sin(yaw)];
  if(ui.commander){const zoom=this.tactical.zoom,scale=zoom/78;this.eye=[p.x+30*scale,y+zoom,p.z+37*scale];this.target=[p.x,y,p.z-9*scale];}else{this.eye=[p.x-f[0]*6+right[0]*1.55,p.y+3.2+Math.max(0,-pitch)*2.4,p.z-f[2]*6+right[2]*1.55];this.target=[p.x+f[0]*16,p.y+2.1+Math.sin(pitch)*19,p.z+f[2]*16];}
  this.vp=mul(perspective(ui.commander?.88:.94,this.w/Math.max(1,this.h),.13,340),lookAt(this.eye,this.target));this.ivp=inverse(this.vp);
  const dark=palette.ash;
  // A living world: deterministic vegetation and geology, bounded by the camera's streaming radius.
  for(const prop of this.worldProps)if(dist(prop,p)<this.radius-12)this.prop(prop,s.time);
  // The command outpost remains a fixed home in the endless survival frontier.
  if(s.zone==='frontier'){
    this.add('cylinder',0,terrainHeight(0,0,s.seed,s.zone)-.35,0,19,1.1,19,palette.ash);
    this.monument(0,0,'extract',s);
    for(const gate of worldGates(s))if(dist(gate,p)<this.radius-16)this.monument(gate.x,gate.z,'gate',s);
    for(const gate of availableRifts(s.era))if(dist(gate,p)<this.radius-16){const gy=terrainHeight(gate.x,gate.z,s.seed,s.zone),c=ERAS[gate.era].terrain;this.add('ring',gate.x,gy+4,gate.z,7,1.2,7,c,s.time*.3,Math.PI/2,.85);this.add('cylinder',gate.x-4,gy+3,gate.z,1,7,1,palette.ash);this.add('cylinder',gate.x+4,gy+3,gate.z,1,7,1,palette.ash);this.add('gem',gate.x,gy+4.4,gate.z,1.8,4.9,1.8,c,s.time*.44,0,.92);}
    for(let i=0;i<5;i++){const a=i*TAU/5+.2,x=Math.sin(a)*17,z=Math.cos(a)*17;this.add('cube',x,terrainHeight(x,z,s.seed,s.zone)+1,z,2.5,2,3.2,palette.metal,a);}
    if(s.era==='medieval')for(const place of LANDMARKS)if(place.id!=='home'&&dist(place,p)<this.radius-8)this.landmark(place,s);
    for(const place of eraSites(s.era))if(dist(place,p)<this.radius-8){const gy=terrainHeight(place.x,place.z,s.seed,s.zone),c=ERAS[s.era].terrain;this.add('cylinder',place.x,gy+.6,place.z,9,1.2,9,palette.ash);for(let k=0;k<5;k++){const a=k*TAU/5;this.add('cylinder',place.x+Math.sin(a)*5,gy+2.8,place.z+Math.cos(a)*5,1.1,5.1,1.1,c);}this.add('ring',place.x,gy+5.5,place.z,7,.4,7,c,s.time*.35,0,.4);if(!s.temporal.worldCaches.includes(place.id))this.add('gem',place.x,gy+6.4,place.z,2.2,3,2.2,palette.amber,s.time*.4,0,.8);}
    const by=terrainHeight(3,14,s.seed,s.zone);this.add('cube',3,by+1.8,14,6,3.6,.5,palette.wood);this.add('cube',3,by+3.9,14,7,.9,1.2,palette.metal);this.add('gem',3,by+4.9,14,.7,1.0,.7,palette.amber,0,0,.7);
    for(const lock of (s.era==='medieval'?LOCKBOXES:[]))if(!s.rpg.opened.includes('lock:'+lock.id)&&dist(lock,p)<this.radius-8){const y=terrainHeight(lock.x,lock.z,s.seed,s.zone),x=lock.x,z=lock.z;this.add('cube',x,y+.75,z,2.8,1.5,1.8,palette.metal);this.add('cube',x,y+1.55,z,3,.35,2,palette.ash);this.add('ring',x,y+1,z-1.1,.85,.19,.85,palette.amber,0,Math.PI/2,.7);this.add('gem',x,y+2.7+Math.sin(s.time*2)*.17,z,.47,.76,.47,palette.amber,0,0,.9);}
    for(const npc of NPCS.filter(n=>(n.era||'medieval')===s.era))if(!s.rpg.companions.includes(npc.id)&&dist(npc,p)<this.radius-8){const y=terrainHeight(npc.x,npc.z,s.seed,s.zone);const color=npc.faction==='wardens'?palette.steel:npc.faction==='archive'?palette.purple:palette.amber;this.humanoid(npc.x,y,npc.z,color,1.07,0,'friendly',s.time);this.add('ring',npc.x,y+.15,npc.z,2.7,.12,2.7,color,0,0,.7);this.add('gem',npc.x,y+4.1+Math.sin(s.time*2+npc.x)*.2,npc.z,.45,.8,.45,palette.white,0,0,.8);}
  }else if(s.zone==='dungeon'){this.drawDungeon(s);
  }else if(s.operation){const op=s.operation,o=op.objectives[op.stage];
    for(let i=0;i<op.objectives.length;i++){const site=op.objectives[i];if(i===op.stage&&dist(site,p)<this.radius-20){this.monument(site.x,site.z,site.type==='factories'||site.type==='boss'?'signal':site.type,s);}
      if(i===op.stage&&site.type==='pylons')for(const node of op.pylons)this.monument(node.x,node.z,'pylon',s);
    }
    // Fold-grid facets are only visible during operations. They rotate their units, not the terrain heightmesh.
    if(ui.commander){for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
      const x=Math.round(p.x/24)*24+dx*24,z=Math.round(p.z/24)*24+dz*24;
      this.add('cube',x,terrainHeight(x,z,s.seed,s.zone)+.08,z,22,.045,22,dx===0&&dz===0?palette.mint:palette.metal,0,0,dx===0&&dz===0?.25:.04);
    }}
  }
  // A chronofold changes both world coloration and the material appearance of this space-time tile.
  for(const facet of s.temporal?.facets||[])if(facet.origin===s.era&&facet.zone===s.zone&&dist(facet,p)<this.radius){const fy=terrainHeight(facet.x,facet.z,s.seed,s.zone),c=ERAS[facet.era].terrain;this.add('ring',facet.x,fy+.22,facet.z,29,.22,29,c,facet.turn*Math.PI/2,0,.55);for(const k of [-1,1])this.add('gem',facet.x+k*8,fy+1.5,facet.z+k*8,1,3,1,c,s.time*.2,0,.6);}
  if(s.war)this.drawWarfront(s,ui);
  for(const b of s.buildings)if(b.hp>0&&b.zone===s.zone&&(s.zone!=='frontier'||(b.era||'medieval')===s.era)&&dist(b,p)<this.radius)this.building(b);
  for(const u of s.squad)if(u.hp>0&&dist(u,p)<this.radius){const baseY=terrainHeight(u.x,u.z,s.seed,s.zone);this.humanoid(u.x,baseY,u.z,u.role==='MEDIC'?palette.white:palette.mint,u.role==='HEAVY'?1.13:.94,yaw,'friendly',s.time);if(ui.commander||u.hp/u.maxHp<.5)this.healthMarker(u.x,baseY+3,u.z,u.hp/u.maxHp,palette.mint);if(ui.commander){this.add('ring',u.x,baseY+.15,u.z,2.6,.12,2.6,palette.mint,0,0,.4);if(u.order!=='follow')this.beam([u.x,baseY+.4,u.z],[u.tx,terrainHeight(u.tx,u.tz,s.seed,s.zone)+.2,u.tz],.06,palette.mint,.4);}}
  for(const e of s.enemies)if(e.hp>0&&dist(e,p)<this.radius-4)this.enemy(e,s);for(const d of s.drones||[]){const dy=terrainHeight(d.x,d.z,s.seed,s.zone);this.add('sphere',d.x,dy+3+Math.sin(s.time*5+d.id)*.4,d.z,1.25,1.25,1.25,palette.mint,0,0,.9);this.add('ring',d.x,dy+3,d.z,2.4,.18,2.4,palette.purple,s.time,Math.PI/2,.65);}
  const pawnY=terrainHeight(pawn.x,pawn.z,s.seed,s.zone),py=Math.max(pawn.y,pawnY),bob=(Math.abs(p.sprint)||Math.abs(ui.move||0)>0)?Math.sin(s.time*10)*.07:0;
  if(!ui.commander){this.humanoid(pawn.x,py+bob,pawn.z,palette.steel,pawn.crouch?.86:1.12,yaw,'player',s.time);
    this.add('cube',pawn.x,py+1.3+bob,pawn.z+.38,1.1,1.65,.26,palette.mint,yaw,0,.45);
    this.add('gem',pawn.x,py+2.25+bob,pawn.z-.37,.33,.24,.2,palette.mint,yaw,0,.8);
  }else{this.add('ring',pawn.x,pawnY+.21,pawn.z,3.3,.17,3.3,palette.amber,s.time*.1,0,.5);this.humanoid(pawn.x,pawnY,pawn.z,palette.steel,1.12,yaw,'player',s.time);}
  for(const shot of s.projectiles)this.add('sphere',shot.x,shot.y,shot.z,.5,.5,.5,palette.amber,0,0,1);
  // These circles are gameplay telegraphs: move or dodge before the bolt arrives.
  for(const shot of s.hostileShots||[])if(dist(shot,p)<this.radius){const y=terrainHeight(shot.tx,shot.tz,s.seed,s.zone),pulse=.5+Math.sin(s.time*14)*.25;
    this.add('ring',shot.tx,y+.17,shot.tz,shot.radius*2,.23,shot.radius*2,palette.red,0,0,pulse+.2);
    this.add('gem',shot.tx,y+.9,shot.tz,.4,1,.4,palette.amber,s.time*2,0,.65);
  }
  for(const loot of s.pickups)if(dist(loot,p)<this.radius){const ly=terrainHeight(loot.x,loot.z,s.seed,s.zone);this.add('gem',loot.x,ly+1+Math.sin(s.time*4+loot.id)*.25,loot.z,.85,1.25,.85,loot.kind==='relic'?palette.purple:palette.amber,s.time*1.7,0,.75);this.add('ring',loot.x,ly+.2,loot.z,1.9,.2,1.9,palette.amber,0,0,.5);}
  for(const ef of s.effects){const age=s.time-ef.at,life=1-clamp(age/1.4,0,1),h=terrainHeight(ef.x,ef.z,s.seed,s.zone);if(ef.type==='tracer'||ef.type==='allytracer'||ef.type==='enemytracer'){
      const c=ef.type==='enemytracer'?palette.red:ef.type==='allytracer'?palette.mint:palette.amber;
      this.beam([ef.x,ef.fromY,ef.z],[ef.toX,ef.toY,ef.toZ],(.09+life*.035),c,1);
    }else if(ef.type==='explosion'){this.add('sphere',ef.x,h+2,ef.z,12*(1-life)+1,4.2*(1-life)+1,12*(1-life)+1,palette.amber,0,0,life*.95);this.add('ring',ef.x,h+.4,ef.z,ef.radius*(1-life)*2,.27,ef.radius*(1-life)*2,palette.red,0,0,life*.9);}
    else if(ef.type==='stasis'){this.add('ring',ef.x,h+.4,ef.z,ef.radius*2.0*(1-life*.4),.8,ef.radius*2.0*(1-life*.4),palette.purple,0,0,life*.85);}else if(['fold','echo','deploy','death','harvest'].includes(ef.type))this.add('ring',ef.x,h+.25+(1-life)*1.2,ef.z,(ef.type==='fold'?17:3)*(1.7-life),.2,(ef.type==='fold'?17:3)*(1.7-life),ef.type==='fold'?palette.purple:palette.mint,0,0,life*.85);
    else if(ef.type==='hit')this.add('gem',ef.x,h+1.3+(1-life),ef.z,life*.4,life*.8,life*.4,palette.amber,0,0,life);
    else if(ef.type==='weakpoint'){this.add('ring',ef.x,h+2.1+(1-life)*1.4,ef.z,1.8*(1-life*.15),.25,1.8*(1-life*.15),palette.amber,0,Math.PI/2,life);this.add('gem',ef.x,h+2.4,ef.z,.5,1.2,.5,palette.amber,0,0,life);}
  }
  if(this.software)this.drawSoftware(s,ui);else this.drawGL(s);
 }
 uniforms(g,program,s){g.useProgram(program);g.uniformMatrix4fv(g.getUniformLocation(program,'uVP'),false,this.vp);g.uniform3fv(g.getUniformLocation(program,'uEye'),this.eye);const daylight=Math.sin(s.dayTime/86400*TAU-Math.PI/2)*.5+.5;const fog=s.zone==='dungeon'?[.08,.085,.17]:s.zone==='operation'?[.115,.13,.17]:mixColor(ERAS[s.era]?.terrain||[.17,.19,.24],[.26,.36,.39],daylight);g.uniform3fv(g.getUniformLocation(program,'uFog'),fog);g.uniform3fv(g.getUniformLocation(program,'uSun'),[.55,1.1,-.35]);g.uniform1f(g.getUniformLocation(program,'uTime'),s.time);g.uniform1f(g.getUniformLocation(program,'uVis'),this.radius);}
 drawGL(s){const g=this.gl;g.viewport(0,0,this.canvas.width,this.canvas.height);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
  this.uniforms(g,this.terrainProgram,s);g.bindVertexArray(this.terrainVAO);g.drawArrays(g.TRIANGLES,0,this.terrainCount);
  this.uniforms(g,this.program,s);for(const mesh of Object.values(this.meshes)){const a=mesh.instancesData;if(!a.length)continue;g.bindVertexArray(mesh.vao);g.bindBuffer(g.ARRAY_BUFFER,mesh.instances);g.bufferData(g.ARRAY_BUFFER,new Float32Array(a),g.DYNAMIC_DRAW);g.drawArraysInstanced(g.TRIANGLES,0,mesh.count,a.length/20);}g.bindVertexArray(null);
 }
 project(pos){if(!this.vp)return null;const q=trans(this.vp,[...pos,1]);if(q[3]<=.01)return null;return {x:(q[0]/q[3]+1)*this.w/2,y:(1-q[1]/q[3])*this.h/2,depth:q[3]};}
 screenToGround(x,y,s){if(!this.ivp)return null;const a=trans(this.ivp,[x/this.w*2-1,1-y/this.h*2,-1,1]),b=trans(this.ivp,[x/this.w*2-1,1-y/this.h*2,1,1]);if(a[3]===0||b[3]===0)return null;const from=a.map(q=>q/a[3]),to=b.map(q=>q/b[3]);const ray=to.map((n,i)=>n-from[i]);if(ray[1]>=-.0001)return null;let t=(0-from[1])/ray[1];for(let i=0;i<5;i++){const px=from[0]+ray[0]*t,pz=from[2]+ray[2]*t,yy=terrainHeight(px,pz,s.seed,s.zone);t=(yy-from[1])/ray[1];}if(t<0)return null;return {x:from[0]+ray[0]*t,z:from[2]+ray[2]*t};}
 drawSoftware(s,ui){ // Compatibility: painter-rendered low-poly 3D triangles and terrain at lower density.
  const ctx=this.ctx,w=this.w,h=this.h;if(!ctx||!w||!h)return;const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#07121e');sky.addColorStop(.58,s.zone==='dungeon'?'#16162e':s.zone==='operation'?'#4e2638':ERAS[s.era]?.accent||'#355566');sky.addColorStop(1,'#14272b');ctx.fillStyle=sky;ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
  ctx.save();ctx.scale(this.canvas.width/w,this.canvas.height/h);
  const triangles=[], light=v.norm([.5,1,-.4]);
  const addTriangle=(ps,color,depth)=>{if(ps.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.depth<.7||Math.abs(p.x)>w*2.5||Math.abs(p.y)>h*2.5))return;triangles.push({ps,color,depth});};
  const cell=13,extent=91,p=s.player;
  for(let iz=-extent;iz<extent;iz+=cell)for(let ix=-extent;ix<extent;ix+=cell){const x=Math.floor(p.x/cell)*cell+ix,z=Math.floor(p.z/cell)*cell+iz;
   const samples=[[x,z],[x+cell,z],[x+cell,z+cell],[x,z+cell]].map(([xx,zz])=>this.project([xx,terrainHeight(xx,zz,s.seed,s.zone),zz]));
   const c=terrainColor(x,z,terrainHeight(x,z,s.seed,s.zone),s.seed,s.zone,s.era,facetAt(s,x,z)?.era).map(k=>Math.round((k+.15)*180));
   if(samples.every(q=>q))for(const ids of [[0,1,2],[0,2,3]])addTriangle(ids.map(i=>samples[i]),`rgb(${c.join(',')})`,samples.reduce((t,q)=>t+q.depth,0)/4);
  }
  const meshLimit=ui.commander?1800:2100;let added=0;
  for(const mesh of Object.values(this.meshes)){for(let i=0;i<mesh.instancesData.length;i+=20){if(added>meshLimit)break;const m=mesh.instancesData.slice(i,i+16),col=mesh.instancesData.slice(i+16,i+19),glow=mesh.instancesData[i+19],center=[m[12],m[13],m[14]];if(Math.hypot(center[0]-p.x,center[2]-p.z)>75)continue;const mvp=mul(this.vp,m),vertices=mesh.vertices;
    for(let j=0;j<vertices.length;j+=18){const q=[],points=[];for(let k=0;k<3;k++){const n=j+k*6,screen=trans(mvp,[vertices[n],vertices[n+1],vertices[n+2],1]);if(screen[3]<=.2){q.length=0;break;}q.push({x:(screen[0]/screen[3]+1)*w/2,y:(1-screen[1]/screen[3])*h/2,depth:screen[3]});}if(q.length!==3)continue;
       const n=[vertices[j+3],vertices[j+4],vertices[j+5]],illum=clamp(.36+v.dot(n,light)*.42+glow*.24,.1,1.3),rgb=col.map(k=>Math.round(clamp((k*illum)**.7*255,0,255)));addTriangle(q,`rgb(${rgb.join(',')})`,q.reduce((sum,k)=>sum+k.depth,0)/3);added++;if(added>meshLimit)break;
    }
  }}
  triangles.sort((a,b)=>b.depth-a.depth);for(const t of triangles){const ps=t.ps;ctx.fillStyle=t.color;ctx.beginPath();ctx.moveTo(ps[0].x,ps[0].y);ctx.lineTo(ps[1].x,ps[1].y);ctx.lineTo(ps[2].x,ps[2].y);ctx.closePath();ctx.fill();}ctx.restore();
 }
 dispose(){window.removeEventListener('resize',this.resize);if(!this.gl)return;const g=this.gl;for(const m of Object.values(this.meshes)){g.deleteVertexArray(m.vao);g.deleteBuffer(m.vertex);g.deleteBuffer(m.instances);}g.deleteVertexArray(this.terrainVAO);g.deleteBuffer(this.terrainVBO);g.deleteProgram(this.program);g.deleteProgram(this.terrainProgram);}
}
