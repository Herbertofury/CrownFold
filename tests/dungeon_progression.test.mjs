import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,enterDungeon,leaveDungeon,interact,serialize,restore} from '../src/sim.mjs';
import {takeQuest,turnInQuest,dialogueChoice,dialogueOptions,NPC_BY_ID,rpgEvent} from '../src/rpg.mjs';
import {frontierGuidance} from '../src/navigation.mjs';
const create=()=>createGame(7331);
const rewards=s=>JSON.stringify({coins:s.rpg.coins,xp:s.player.xp,level:s.player.level,perks:s.rpg.perkPoints,gear:s.rpg.gear,inventory:s.inventory,factions:s.rpg.factions});
function clear(s,id){assert.ok(enterDungeon(s,id));s.dungeon.bossDead=true;s.player.x=7;s.player.z=-137;assert.ok(interact(s));assert.ok(leaveDungeon(s,true));}
function meetLyra(s){Object.assign(s.player,{x:NPC_BY_ID.lyra.x,z:NPC_BY_ID.lyra.z});}
test('Glass Key -> Three Echoes -> faction ending is reachable through all three real vault completions',()=>{
 let s=create();meetLyra(s);assert.equal(dialogueChoice(s,'lyra','accept:the_three_echoes').ok,false);
 assert.ok(dialogueChoice(s,'lyra','accept:the_glass_key').ok);clear(s,'glass');meetLyra(s);assert.ok(dialogueChoice(s,'lyra','turnin:the_glass_key').ok);
 assert.ok(dialogueChoice(s,'lyra','accept:the_three_echoes').ok);assert.equal(s.rpg.quests.the_three_echoes.progress,1);assert.deepEqual(s.rpg.quests.the_three_echoes.unique,['glass']);
 clear(s,'roots');assert.equal(s.rpg.quests.the_three_echoes.progress,2);s=restore(serialize(s));assert.equal(s.rpg.quests.the_three_echoes.progress,2);
 clear(s,'archive');assert.equal(s.rpg.quests.the_three_echoes.status,'ready');meetLyra(s);assert.ok(dialogueChoice(s,'lyra','turnin:the_three_echoes').ok);
 assert.ok(dialogueOptions(s,'lyra').some(o=>o.id==='shape:archive'));assert.ok(dialogueChoice(s,'lyra','shape:archive').ok);assert.equal(s.rpg.worldEnding,'archive');
 const paid=rewards(s);assert.equal(dialogueChoice(s,'lyra','turnin:the_three_echoes').ok,false);assert.equal(dialogueChoice(s,'lyra','shape:wardens').ok,false);assert.equal(rewards(s),paid);
 s=restore(serialize(s));assert.equal(s.rpg.worldEnding,'archive');assert.equal(s.rpg.quests.the_three_echoes.status,'done');assert.equal(turnInQuest(s,'the_three_echoes'),false);assert.equal(rewards(s),paid);
});
test('clearing Glass before meeting its giver produces a ready quest without paying on acceptance',()=>{
 const s=create();clear(s,'glass');const before=rewards(s);assert.ok(takeQuest(s,'the_glass_key'));assert.equal(s.rpg.quests.the_glass_key.status,'ready');assert.equal(s.rpg.quests.the_glass_key.progress,1);assert.equal(rewards(s),before);assert.match(frontierGuidance(s).goal.title,/RETURN TO LYRA/);
 assert.ok(turnInQuest(s,'the_glass_key'));const paid=rewards(s);assert.equal(turnInQuest(s,'the_glass_key'),false);assert.equal(takeQuest(s,'the_glass_key'),false);assert.equal(rewards(s),paid);
});
test('all prior-clear orders permit the finite quest chain without repeating vault rewards',()=>{
 for(const order of [['glass','roots','archive'],['glass','archive','roots'],['roots','glass','archive'],['roots','archive','glass'],['archive','glass','roots'],['archive','roots','glass']]){
  const s=create();for(const id of order)clear(s,id);const before=rewards(s);takeQuest(s,'the_glass_key');assert.equal(rewards(s),before);assert.ok(turnInQuest(s,'the_glass_key'));
  const afterGlass=rewards(s);assert.ok(takeQuest(s,'the_three_echoes'));assert.equal(s.rpg.quests.the_three_echoes.status,'ready');assert.equal(s.rpg.quests.the_three_echoes.progress,3);assert.equal(rewards(s),afterGlass);
  assert.ok(turnInQuest(s,'the_three_echoes'));const afterEchoes=rewards(s);assert.equal(turnInQuest(s,'the_three_echoes'),false);assert.equal(rewards(s),afterEchoes);
 }
});
test('legacy stuck 2/3 save is repaired on load without auto-paying or replaying first-clear rewards',()=>{
 const s=create();for(const id of ['glass','roots','archive'])clear(s,id);s.rpg.quests.the_glass_key={status:'done',progress:1};s.rpg.quests.the_three_echoes={status:'active',progress:2,unique:['roots','archive']};s.rpg.tracked='the_three_echoes';const before=rewards(s);
 let loaded=restore(serialize(s));assert.equal(loaded.rpg.quests.the_three_echoes.status,'ready');assert.equal(loaded.rpg.quests.the_three_echoes.progress,3);assert.equal(rewards(loaded),before);assert.match(frontierGuidance(loaded).goal.title,/RETURN TO LYRA/);
 for(let i=0;i<3;i++)loaded=restore(serialize(loaded));assert.equal(rewards(loaded),before);assert.ok(turnInQuest(loaded,'the_three_echoes'));const paid=rewards(loaded);loaded=restore(serialize(loaded));assert.equal(turnInQuest(loaded,'the_three_echoes'),false);assert.equal(rewards(loaded),paid);
});
test('partial legacy dungeon quest repairs unique history and counts only the next distinct clear',()=>{
 const s=create();clear(s,'glass');s.rpg.quests.relic_hunter={status:'active',progress:0};let loaded=restore(serialize(s));assert.equal(loaded.rpg.quests.relic_hunter.progress,1);assert.deepEqual(loaded.rpg.quests.relic_hunter.unique,['glass']);
 const before=rewards(loaded);enterDungeon(loaded,'glass');leaveDungeon(loaded,true);assert.equal(rewards(loaded),before);assert.equal(loaded.rpg.quests.relic_hunter.progress,1);clear(loaded,'roots');assert.equal(loaded.rpg.quests.relic_hunter.status,'ready');
});
test('reconciliation preserves paid quests, unrelated progress and does not accept offered quests',()=>{
 const s=create();s.rpg.dungeonCleared=['glass','roots','archive'];s.rpg.quests.the_glass_key={status:'done',progress:1};takeQuest(s,'iron_oath');rpgEvent(s,'kill','raider',2);const before=rewards(s),loaded=restore(serialize(s));assert.equal(loaded.rpg.quests.the_glass_key.status,'done');assert.equal(loaded.rpg.quests.iron_oath.progress,2);assert.equal(loaded.rpg.quests.the_three_echoes,undefined);assert.equal(rewards(loaded),before);
});
test('unknown and repeated dungeon IDs cannot manufacture additional credit on reload',()=>{
 const s=create();s.rpg.dungeonCleared=['glass','glass','missing','toString','constructor'];s.rpg.quests.relic_hunter={status:'active',progress:0,unique:['glass','glass','__proto__']};const loaded=restore(serialize(s));assert.deepEqual(loaded.rpg.dungeonCleared,['glass']);assert.deepEqual(loaded.rpg.quests.relic_hunter.unique,['glass']);assert.equal(loaded.rpg.quests.relic_hunter.progress,1);assert.equal(loaded.rpg.quests.relic_hunter.status,'active');
});
test('legacy numeric progress is not reduced when older saves omit individual credit history',()=>{
 const s=create();s.rpg.quests.relic_hunter={status:'active',progress:1};const loaded=restore(serialize(s));assert.equal(loaded.rpg.quests.relic_hunter.progress,1);assert.equal(loaded.rpg.quests.relic_hunter.status,'active');
});
