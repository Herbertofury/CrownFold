import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,serialize,restore} from '../src/sim.mjs';
import {takeQuest,markDiscovered,dialogueChoice,NPC_BY_ID,LANDMARKS} from '../src/rpg.mjs';
import {frontierGuidance} from '../src/navigation.mjs';
const rewards=s=>JSON.stringify({coins:s.rpg.coins,xp:s.player.xp,level:s.player.level,inventory:s.inventory,factions:s.rpg.factions});
const meet=s=>Object.assign(s.player,NPC_BY_ID.sable);
test('Ghost Convoy discovered before acceptance remains completable through Sable dialogue once',()=>{
 let s=createGame(7331);assert.ok(markDiscovered(s,'wreck'));const before=rewards(s);meet(s);
 assert.ok(dialogueChoice(s,'sable','accept:lost_ledger').ok);
 assert.equal(s.rpg.quests.lost_ledger.status,'ready');assert.equal(rewards(s),before);
 assert.match(frontierGuidance(s).goal.title,/RETURN TO SABLE/);
 assert.equal(markDiscovered(s,'wreck'),false);
 assert.ok(dialogueChoice(s,'sable','turnin:lost_ledger').ok);const paid=rewards(s);
 s=restore(serialize(s));meet(s);assert.equal(dialogueChoice(s,'sable','turnin:lost_ledger').ok,false);assert.equal(rewards(s),paid);
});
test('exploration credits prior discoveries but not pre-known home, across reload and future discovery',()=>{
 let s=createGame(7331);takeQuest(s,'scout_the_wild');assert.equal(s.rpg.quests.scout_the_wild.progress,0);
 s=createGame(7331);markDiscovered(s,'freehold');markDiscovered(s,'watch');const before=rewards(s);
 takeQuest(s,'scout_the_wild');assert.equal(s.rpg.quests.scout_the_wild.progress,2);assert.equal(rewards(s),before);
 s=restore(serialize(s));assert.equal(s.rpg.quests.scout_the_wild.progress,2);
 markDiscovered(s,'bloom');assert.equal(s.rpg.quests.scout_the_wild.status,'ready');
});
test('legacy stuck exploration save repairs without granting rewards or accepting unstarted quests',()=>{
 let s=createGame(7331);for(const p of LANDMARKS)markDiscovered(s,p.id);
 s.rpg.quests.lost_ledger={status:'active',progress:0};s.rpg.quests.scout_the_wild={status:'active',progress:1};
 const before=rewards(s);for(let i=0;i<3;i++)s=restore(serialize(s));
 assert.equal(s.rpg.quests.lost_ledger.status,'ready');assert.equal(s.rpg.quests.scout_the_wild.progress,3);
 assert.equal(rewards(s),before);assert.equal(s.rpg.quests.iron_oath,undefined);
});
test('unknown, duplicate and home discoveries cannot manufacture credit; paid quests stay done',()=>{
 const s=createGame(7331);s.rpg.discovered=['home','wreck','wreck','missing','__proto__'];
 s.rpg.quests.scout_the_wild={status:'active',progress:0};s.rpg.quests.lost_ledger={status:'done',progress:1};
 const loaded=restore(serialize(s));assert.equal(loaded.rpg.quests.scout_the_wild.progress,1);
 assert.equal(loaded.rpg.quests.scout_the_wild.status,'active');assert.equal(loaded.rpg.quests.lost_ledger.status,'done');
});
