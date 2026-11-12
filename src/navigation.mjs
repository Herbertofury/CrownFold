// Read-only player guidance. Never changes quests, inventory, saves or simulation.
import {QUESTS,QUEST_BY_ID,NPC_BY_ID,LANDMARKS} from './rpg.mjs';
import {availableRifts,ERAS} from './temporal.mjs';
import {propsInChunk,worldGates,dist} from './sim.mjs';
const live=status=>status==='active'||status==='ready';
const nearest=(s,items)=>items.reduce((best,item)=>!best||dist(s.player,item)<dist(s.player,best)?item:best,null);
const target=(point,title)=>point?{x:point.x,z:point.z,title}:null;
export function guidanceQuest(s){
 const chosen=QUEST_BY_ID[s.rpg.tracked];
 return chosen&&live(s.rpg.quests[chosen.id]?.status)?chosen:QUESTS.find(q=>s.rpg.quests[q.id]?.status==='ready')||QUESTS.find(q=>s.rpg.quests[q.id]?.status==='active')||null;
}
export function frontierGuidance(s){
 if(s.zone!=='frontier')return null;
 const quest=guidanceQuest(s),state=quest&&s.rpg.quests[quest.id];
 if(!quest){
  if(s.era==='medieval'&&Object.keys(s.rpg.quests).length===0)return {quest:null,goal:target(NPC_BY_ID.mira,'MEET MIRA VALE'),hint:'Talk to Mira with E to begin your first quest.'};
  const gate=nearest(s,[...availableRifts(s.era),...worldGates(s)]);
  return {quest:null,goal:target(gate,gate?.type==='advanced'?`ADVANCED / ${ERAS[gate.era].name}`:'WAR RIFT'),hint:''};
 }
 const result=(goal,hint)=>({quest,goal,hint});
 // Frontier quest locations belong to the Crownless March, not the same coordinates in another era.
 if(s.era!=='medieval')return result(target(availableRifts(s.era).find(r=>r.era==='medieval'),'RETURN / CROWNLESS MARCH'),'Return through the medieval rift for this quest.');
 if(state.status==='ready')return result(target(NPC_BY_ID[quest.giver],`RETURN TO ${NPC_BY_ID[quest.giver].name}`),'Quest ready. Talk to its giver with E to claim your reward.');
 const {type,target:kind}=quest.goal;let point=null,hint='';
 if(type==='harvest'){
  const candidates=[],used=new Set(s.harvested),cx=Math.floor(s.player.x/32),cz=Math.floor(s.player.z/32);
  for(let z=cz-2;z<=cz+2;z++)for(let x=cx-2;x<=cx+2;x++)for(const prop of propsInChunk(x,z,s.seed,s.zone))if(prop.resource===kind&&!used.has(prop.id))candidates.push(prop);
  point=nearest(s,candidates);hint=point?`Harvest ${kind.toUpperCase()} with E when within reach.`:`Explore farther to find unharvested ${kind.toUpperCase()}.`;
 }else if(type==='kill'){
  point=nearest(s,s.enemies.filter(e=>e.hp>0&&(kind==='any'||e.kind===kind)));hint=point?'Defeat the marked enemy.':'Explore the frontier until matching enemies are nearby.';
 }else if(type==='discover'){
  point=nearest(s,LANDMARKS.filter(l=>!s.rpg.discovered.includes(l.id)&&(kind==='any'||l.id===kind)));hint=point?'Approach the marked landmark to discover it.':'Explore the frontier for undiscovered landmarks.';
 }else if(type==='dungeon'){
  point=nearest(s,LANDMARKS.filter(l=>l.kind==='dungeon'&&!s.rpg.dungeonCleared.includes(l.id)&&(kind==='any'?!state.unique?.includes(l.id):l.id===kind)));hint=point?'Enter the marked vault, defeat its guardian and claim the relic.':'No uncleared vault remains for this quest. Previously cleared vaults do not count again.';
 }else if(type==='chest'){
  point=nearest(s,LANDMARKS.filter(l=>l.kind==='cache'&&!s.rpg.opened.includes(`world:${l.id}`)));hint=point?'Open the marked cache with E.':'Seek unopened dungeon relic caches.';
 }else if(type==='operation'){
  point=nearest(s,worldGates(s));hint='Enter a War Rift and survive extraction.';
 }else if(type==='build')hint='Press B and construct frontier defenses or support buildings.';
 else if(type==='craft')hint='Press I, choose Craft, and make recipes with your supplies.';
 return result(target(point,type==='harvest'?`HARVEST ${kind.toUpperCase()}`:type==='kill'?`HUNT ${kind.toUpperCase()}`:point?.name||quest.name),hint);
}
export function markerPlacement(player,goal,project,width,height,bounds=null){
 const marginX=Math.min(140,width*.28),marginY=Math.min(145,height*.28);
 const left=bounds?.left??marginX,right=bounds?.right??width-marginX,top=bounds?.top??marginY,bottom=bounds?.bottom??height-marginY;
 const cx=(left+right)/2,cy=(top+bottom)/2,rx=Math.max(1,(right-left)/2),ry=Math.max(1,(bottom-top)/2);
 if(project&&Number.isFinite(project.x)&&Number.isFinite(project.y)&&project.x>=left&&project.x<=right&&project.y>=top&&project.y<=bottom)return{x:project.x,y:project.y,icon:'◆',direction:'',offscreen:false};
 let dx,dy,direction;
 if(project&&Number.isFinite(project.x)&&Number.isFinite(project.y)){
  dx=project.x-cx;dy=project.y-cy;
  direction=Math.abs(dx/rx)>Math.abs(dy/ry)?dx<0?'LEFT':'RIGHT':dy<0?'ABOVE':'BELOW';
 }else{
  const angle=Math.atan2(goal.x-player.x,-(goal.z-player.z))-player.yaw;
  dx=Math.sin(angle);dy=-Math.cos(angle);
  direction=dy>0&&Math.abs(dx)<.18?'BEHIND':dx<0?'TURN LEFT':'TURN RIGHT';
 }
 const scale=1/Math.max(Math.abs(dx)/rx,Math.abs(dy)/ry,1e-9);
 const icons=['↑','↗','→','↘','↓','↙','←','↖'],sector=((Math.round(Math.atan2(dx,-dy)/(Math.PI/4))%8)+8)%8;
 return{x:cx+dx*scale,y:cy+dy*scale,icon:icons[sector],direction,offscreen:true};
}
