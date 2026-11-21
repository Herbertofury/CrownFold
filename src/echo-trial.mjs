// Optional post-story challenge in the existing Mirror Maw chamber.
export const ECHO_TRIAL=Object.freeze({vault:'glass',x:10,z:-127,reach:5,
 flag:'mirror-fourth-echo-sealed',insight:8,flux:35});
export const ECHO_TRIAL_RUMOR='A fourth echo answers from the Mirror Maw. Return, defeat its guardian, then listen at the lens on the east side of the chamber. You can always leave without answering.';
export const echoTrialUnlocked=s=>s.rpg.quests.the_three_echoes?.status==='done'&&
 s.rpg.dungeonCleared.includes(ECHO_TRIAL.vault)&&s.rpg.flags[ECHO_TRIAL.flag]!==true;
export const echoTrialOffered=s=>s.dungeon?.id===ECHO_TRIAL.vault&&s.dungeon.revisited&&
 s.dungeon.bossDead&&s.dungeon.sigils.every(Boolean)&&!s.dungeon.echoTrial&&echoTrialUnlocked(s);
export const echoTrialLensReady=s=>echoTrialOffered(s)||(s.dungeon?.echoTrial?.phase===1&&!s.dungeon.echoTrial.targets.length);

const lensGoal={x:ECHO_TRIAL.x,z:ECHO_TRIAL.z,title:'FOURTH ECHO LENS'};
export function echoTrialDirective(s){
 const trial=s.dungeon?.echoTrial;
 if(!trial)return null;
 if(trial.phase===1&&!trial.targets.length)return{
  title:'ANSWER THE SECOND ECHO',hint:'Return to the lens and press E to face the pincer. Either exit still lets you retreat.',goal:lensGoal,progress:1/3,
 };
 if(trial.phase===2&&!trial.targets.length){
  const portal=[s.dungeon.exit,{x:0,z:-147}].reduce((a,b)=>Math.hypot(s.player.x-a.x,s.player.z-a.z)<Math.hypot(s.player.x-b.x,s.player.z-b.z)?a:b);
  return {title:'CARRY THE FOURTH ECHO OUT',hint:'Leave alive through either exit to earn 8 Chronicle Insight and 35 Flux. Leaving the game mid-vault does not bank the reward.',
   goal:{...portal,title:'EXTRACT THE FOURTH ECHO'},progress:1};
 }
 const target=s.enemies.find(e=>trial.targets.includes(e.id)&&e.hp>0);
 return {title:trial.phase===1?'BREAK THE SENTINEL':'SURVIVE THE PINCER',
  hint:trial.phase===1?'Defeat the reflected sentinel. Either exit still lets you retreat.':`${trial.targets.length} of 2 attackers remain. Either exit still lets you retreat.`,
  goal:target?{x:target.x,z:target.z,title:trial.phase===1?'REFLECTED SENTINEL':'ECHO ATTACKER'}:lensGoal,
  progress:trial.phase===1?0:(3-trial.targets.length)/3};
}
