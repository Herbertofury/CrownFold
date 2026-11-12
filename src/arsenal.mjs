// Presentation-only weapon inventory. Campaign state stays in the simulation.
import {WEAPONS,reloadDuration,clamp} from './sim.mjs';
export const WEAPON_ROLES=Object.freeze({
 rifle:{role:'FIELD ASSAULT',description:'Balanced automatic fire for fighting on the move.'},
 scatter:{role:'CLOSE BREACH',description:'Eight pellets per shot. Close the distance before firing.'},
 rail:{role:'LONG-RANGE PRECISION',description:'High single-shot damage and a strong weak-point bonus.'},
 smg:{role:'RAPID SUPPRESSION',description:'A large magazine and fast fire. Best at shorter ranges.'},
 cryo:{role:'CROWD CONTROL',description:'Freezes surviving individual hostiles. Battalions take direct damage.'},
 launcher:{role:'EXPLOSIVE ASSAULT',description:'Impact blast damages nearby targets. Can breach battlefield cover.'}
});
export function weaponCard(player,id){
 const w=WEAPONS[id],role=WEAPON_ROLES[id];if(!Object.hasOwn(WEAPONS,id))return null;
 const ammo=Math.max(0,player.ammo[id]||0),reserve=Math.max(0,player.reserve[id]||0);
 return {id,name:w.name,...role,ammo,reserve,equipped:player.weapon===id,
  damage:w.shots>1?`${w.damage} × ${w.shots} pellets`:`${w.damage} direct`,
  range:`${w.range}m`,reload:`${reloadDuration(id).toFixed(1)}s`,
  status:ammo>0?'READY':reserve>0?'RELOAD NEEDED':'OUT OF AMMO'};
}
export function reloadProgress(player){return player.reload>0?clamp(1-player.reload/reloadDuration(player.weapon),0,1):1;}
