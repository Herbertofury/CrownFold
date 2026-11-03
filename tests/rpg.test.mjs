import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,spawnEnemy,stepGame,castAbility,dodge,sleepAtCamp,setWeapon,WEAPONS,terrainHeight,enterDungeon,leaveDungeon,interact,nearestInteraction,worldGates,enterOperation,finishOperation,addBuilding,serialize,restore,shoot} from '../src/sim.mjs';
import {NPCS,LANDMARKS,LOCKBOXES,DUNGEONS,QUESTS,QUEST_BY_ID,PERKS,ABILITIES,RECIPES,FACTIONS,makeRPG,buyPerk,perkRank,rpgStat,grantXP,rpgEvent,takeQuest,turnInQuest,openChest,generateGear,equipGear,salvageGear,craft,markDiscovered,fastTravel,dialogueOptions,dialogueChoice,buyGood,recruitCompanion,startBounty,claimBounty,generateBounty,attemptLock,attemptPickpocket,payFine} from '../src/rpg.mjs';
const clean=()=>{const s=createGame(987654);s.spawnTimer=1e9;return s;};
const march=(s,n=10)=>{for(let i=0;i<n;i++)stepGame(s,{},.1);};
test('expanded RPG catalog has eighteen perks, six active arts, three dungeons, lockboxes and thirteen original quests',()=>{
 assert.equal(Object.keys(PERKS).length,18);assert.equal(Object.keys(ABILITIES).length,6);assert.equal(DUNGEONS.length,3);assert.ok(QUESTS.length>=13);assert.equal(LANDMARKS.length,8);assert.equal(Object.keys(FACTIONS).length,3);assert.equal(LOCKBOXES.length,3);});
test('RPG state is distinct for every new world',()=>{const a=clean(),b=clean();a.rpg.coins=0;a.rpg.discovered.push('glass');assert.equal(b.rpg.coins,120);assert.deepEqual(b.rpg.discovered,['home']);});
test('a perk point is spent once and perks have a rank cap',()=>{const s=clean();assert.equal(buyPerk(s,'sharpshooter'),true);assert.equal(perkRank(s,'sharpshooter'),1);assert.equal(rpgStat(s,'damage'),1.09);assert.equal(buyPerk(s,'sharpshooter'),true);assert.equal(buyPerk(s,'sharpshooter'),false);assert.equal(s.rpg.perkPoints,0);});
test('health perks immediately raise maximum health',()=>{const s=clean(),max=s.player.maxHp;buyPerk(s,'armored');assert.equal(s.player.maxHp,max+20);assert.equal(s.player.hp,max+20);assert.ok(rpgStat(s,'armor')>.04);});
test('leveling may award multiple perk points without losing XP',()=>{const s=clean();s.player.hp=40;grantXP(s,1000);assert.ok(s.player.level>3);assert.ok(s.rpg.perkPoints>4);assert.ok(s.player.xp<s.player.level*110);assert.ok(s.player.hp>40);});
test('equipment generates distinct gear, equips actual stats and salvages unequipped loot',()=>{const s=clean(),a=generateGear(s,'armor',2,31),b=generateGear(s,'armor',3,32);assert.notEqual(a.id,b.id);assert.ok(equipGear(s,a.id));assert.equal(s.rpg.equipped.armor,a.id);assert.ok(s.player.maxHp>140);assert.equal(salvageGear(s,a.id),false);const old=s.inventory.scrap;assert.ok(salvageGear(s,b.id));assert.ok(s.inventory.scrap>old);});
test('crafting checks material costs before any deduction',()=>{const s=clean();s.inventory.fiber=0;const old=s.inventory.ore;assert.equal(craft(s,'meds'),false);assert.equal(s.inventory.ore,old);s.inventory.fiber=200;assert.equal(craft(s,'meds'),true);assert.equal(s.inventory.medkit,6);});
test('gear craft generates persistent equipment and event counts',()=>{const s=clean();s.inventory.scrap=1000;s.inventory.ore=1000;s.inventory.flux=1000;takeQuest(s,'winter_stores');craft(s,'armor');craft(s,'relic');craft(s,'mod');assert.equal(s.rpg.gear.length,3);assert.equal(s.rpg.quests.winter_stores.status,'ready');});
test('quest cannot complete without accepting it, and turn-in rewards coins and XP',()=>{const s=clean();rpgEvent(s,'kill','raider',4);assert.equal(s.rpg.quests.iron_oath,undefined);assert.ok(takeQuest(s,'iron_oath'));rpgEvent(s,'kill','raider',3);assert.equal(s.rpg.quests.iron_oath.progress,3);assert.equal(turnInQuest(s,'iron_oath'),false);rpgEvent(s,'kill','raider');const before=s.rpg.coins;assert.equal(s.rpg.quests.iron_oath.status,'ready');assert.ok(turnInQuest(s,'iron_oath'));assert.ok(s.rpg.coins>before);assert.equal(s.rpg.quests.iron_oath.status,'done');});
test('sequential main quest is locked until its prerequisite finished',()=>{const s=clean();assert.equal(takeQuest(s,'the_three_echoes'),false);assert.ok(takeQuest(s,'the_glass_key'));rpgEvent(s,'dungeon','glass');assert.ok(turnInQuest(s,'the_glass_key'));assert.ok(takeQuest(s,'the_three_echoes'));});
test('unique dungeon quest progress ignores repeat clears',()=>{const s=clean();s.rpg.quests.the_glass_key={status:'done',progress:1};takeQuest(s,'the_three_echoes');rpgEvent(s,'dungeon','glass');rpgEvent(s,'dungeon','glass');assert.equal(s.rpg.quests.the_three_echoes.progress,1);rpgEvent(s,'dungeon','roots');rpgEvent(s,'dungeon','archive');assert.equal(s.rpg.quests.the_three_echoes.status,'ready');});
test('discovering locations grants xp once and unlocks safe fast travel',()=>{const s=clean(),xp=s.player.xp;assert.ok(markDiscovered(s,'freehold'));assert.ok(s.player.xp>xp);assert.equal(markDiscovered(s,'freehold'),false);assert.ok(fastTravel(s,'freehold'));assert.ok(Math.hypot(s.player.x-40,s.player.z-32)<7);});
test('fast travel blocked when enemies threaten the player and while in an operation',()=>{const s=clean();markDiscovered(s,'glass');spawnEnemy(s,'raider',3,0);assert.equal(fastTravel(s,'glass'),false);s.enemies=[];enterOperation(s,0);assert.equal(fastTravel(s,'glass'),false);});
test('world caches grant one unique loot roll only',()=>{const s=clean();assert.ok(openChest(s,'world:watch',89));assert.equal(openChest(s,'world:watch',89),false);assert.equal(s.rpg.gear.length,1);assert.equal(s.rpg.opened.length,1);});
test('six arcane abilities consume flux and enforce cooldowns',()=>{for(const ability of Object.keys(ABILITIES)){const s=clean();s.inventory.flux=500;const amount=s.inventory.flux;assert.ok(castAbility(s,ability));assert.ok(s.inventory.flux<amount);assert.equal(castAbility(s,ability),false);assert.ok(s.rpg.abilityCooldowns[ability]>0);}});
test('blink moves forward but not past the dungeon boundary',()=>{const s=clean();const z=s.player.z;assert.ok(castAbility(s,'blink'));assert.ok(s.player.z<z-12);enterDungeon(s,'glass');s.player.x=17;s.player.yaw=Math.PI/2;s.rpg.abilityCooldowns.blink=0;assert.ok(castAbility(s,'blink'));assert.ok(s.player.x<=18);});
test('gravity nova damages clustered enemies and stasis prevents their actions',()=>{const s=clean(),e=spawnEnemy(s,'warden',4,-3);const hp=e.hp;castAbility(s,'nova');assert.ok(e.hp<hp);s.rpg.abilityCooldowns.stasis=0;assert.ok(castAbility(s,'stasis'));assert.ok(e.frozen>0);const x=e.x,z=e.z;march(s,15);assert.equal(e.x,x);assert.equal(e.z,z);});
test('cloak breaks on gunfire and summoned drones attack nearby threats',()=>{const s=clean();assert.ok(castAbility(s,'cloak'));assert.ok(s.rpg.status.cloak>0);shoot(s,{yaw:0,pitch:-.06});assert.equal(s.rpg.status.cloak,0);assert.ok(castAbility(s,'drone'));assert.equal(s.drones.length,3);const e=spawnEnemy(s,'titan',0,-12);e.aggro=false;const hp=e.hp;march(s,30);assert.ok(e.hp<hp);});
test('rally heals soldiers and is time limited',()=>{const s=clean();s.squad[0].hp=42;assert.ok(castAbility(s,'rally'));assert.ok(s.squad[0].hp>42);assert.ok(s.rpg.status.rally>0);});
test('dodge costs stamina and cannot be spammed',()=>{const s=clean();const stamina=s.player.stamina;assert.ok(dodge(s));assert.equal(s.player.stamina,stamina-28);assert.equal(dodge(s),false);});
test('talking to an NPC offers quest acceptance, lore, and character choices',()=>{const s=clean(),npc=NPCS.find(n=>n.id==='mira');s.player.x=npc.x;s.player.z=npc.z;const options=dialogueOptions(s,'mira');assert.ok(options.some(o=>o.id==='accept:first_light'));const choice=dialogueChoice(s,'mira','accept:first_light');assert.ok(choice.ok);assert.equal(s.rpg.quests.first_light.status,'active');});
test('NPC companions join squad with a unique identity and cost',()=>{const s=clean(),npc=NPCS.find(n=>n.id==='tamsin');s.player.x=npc.x;s.player.z=npc.z;const before=s.rpg.coins;assert.ok(recruitCompanion(s,'tamsin'));assert.ok(s.squad.some(u=>u.npcId==='tamsin'));assert.equal(s.rpg.coins,before-75);assert.equal(recruitCompanion(s,'tamsin'),false);});
test('faction oath grants standing once and persists',()=>{const s=clean(),npc=NPCS.find(n=>n.id==='rhys');s.player.x=npc.x;s.player.z=npc.z;const choice=dialogueChoice(s,'rhys','pledge');assert.ok(choice.ok);assert.equal(s.rpg.allegiance,'wardens');const before=s.rpg.factions.wardens;assert.equal(dialogueChoice(s,'rhys','pledge').ok,false);assert.equal(s.rpg.factions.wardens,before);});
test('merchant honors price and inventory',()=>{const s=clean(),before=s.rpg.coins;assert.ok(buyGood(s,'medkit'));assert.ok(s.rpg.coins<before);assert.equal(s.inventory.medkit,5);s.rpg.coins=0;assert.equal(buyGood(s,'medkit'),false);});
test('dungeon is an actual separate zone with guardian rooms, two sigils, and escape',()=>{const s=clean();s.player.x=-43;s.player.z=-54;assert.ok(enterDungeon(s,'glass'));assert.equal(s.zone,'dungeon');assert.equal(s.dungeon.sigils.length,2);assert.ok(s.enemies.length>5);assert.ok(leaveDungeon(s,false));assert.equal(s.zone,'frontier');assert.equal(s.rpg.dungeonCleared.length,0);});
test('dungeon sigils require clearing nearby enemies and unlock its guardian',()=>{const s=clean();enterDungeon(s,'glass');s.player.x=-11;s.player.z=-43;let target=nearestInteraction(s);assert.equal(target.type,'sigil');assert.equal(interact(s),false);for(const e of s.enemies)e.hp=0;assert.ok(interact(s));assert.equal(s.dungeon.sigils[0],true);s.player.x=12;s.player.z=-83;assert.ok(interact(s));assert.equal(s.dungeon.sigils[1],true);assert.ok(s.dungeon.bossId);assert.ok(s.enemies.some(e=>e.id===s.dungeon.bossId));});
test('dungeon treasure cannot be opened until the guardian dies',()=>{const s=clean();enterDungeon(s,'glass');s.player.x=7;s.player.z=-137;assert.equal(nearestInteraction(s).type,'dungeon-treasure');assert.equal(interact(s),false);s.dungeon.bossDead=true;assert.ok(interact(s));assert.equal(s.dungeon.looted,true);assert.ok(s.rpg.opened.includes('dungeon:glass'));assert.ok(leaveDungeon(s,true));assert.deepEqual(s.rpg.dungeonCleared,['glass']);});
test('clearing a dungeon progresses its quest and rewards fame',()=>{const s=clean();takeQuest(s,'the_glass_key');enterDungeon(s,'glass');s.dungeon.looted=true;assert.ok(leaveDungeon(s,true));assert.equal(s.rpg.quests.the_glass_key.status,'ready');assert.ok(s.rpg.factions.archive>0);});
test('dungeon boundaries keep motion inside the authored hall',()=>{const s=clean();enterDungeon(s,'roots');s.player.x=17;s.player.z=-18;s.player.yaw=Math.PI/2;for(let i=0;i<100;i++)stepGame(s,{x:1,yaw:Math.PI/2},.1);assert.ok(s.player.x<=18.01);});
test('new settlement buildings produce resources and respond to crafting perks',()=>{const s=clean();s.inventory.scrap=999;s.inventory.ore=999;addBuilding(s,'greenhouse',2,0);addBuilding(s,'refinery',4,0);const before=s.inventory.ration,oldScrap=s.inventory.scrap;march(s,100);assert.ok(s.inventory.ration>before);assert.ok(s.inventory.scrap>oldScrap);});
test('RPG saves survive reload including gear, perks, quests, companions, factions, discoveries and choices',()=>{const s=clean();buyPerk(s,'armored');takeQuest(s,'iron_oath');rpgEvent(s,'kill','raider',2);s.rpg.allegiance='archive';s.rpg.factions.archive=34;s.rpg.coins=246;markDiscovered(s,'freehold');openChest(s,'world:watch',22);equipGear(s,s.rpg.gear[0].id);const replica=restore(serialize(s));assert.equal(replica.rpg.allegiance,'archive');assert.equal(replica.rpg.factions.archive,34);assert.equal(replica.rpg.coins,s.rpg.coins);assert.equal(replica.rpg.quests.iron_oath.progress,2);assert.equal(perkRank(replica,'armored'),1);assert.equal(replica.rpg.gear.length,1);assert.ok(replica.rpg.equipped[replica.rpg.gear[0].slot]);assert.ok(replica.player.maxHp>140);});
test('loading an original v0.2 save without RPG fields restores default RPG state',()=>{const s=clean(),save=JSON.parse(serialize(s));delete save.rpg;const restored=restore(save);assert.ok(restored);assert.ok(restored.rpg.coins>0);assert.deepEqual(restored.rpg.discovered,['home']);});
test('saving from inside a dungeon returns to its overworld entrance, not a locked room',()=>{const s=clean();s.player.x=93;s.player.z=54;enterDungeon(s,'roots');s.player.z=-134;const load=restore(serialize(s));assert.equal(load.zone,'frontier');assert.equal(load.player.x,93);assert.equal(load.player.z,54);});

test('six weapon arsenal and craftable ammo support all weapons',()=>{
 const s=clean();assert.deepEqual(Object.keys(WEAPONS).sort(),['cryo','launcher','rail','rifle','scatter','smg'].sort());
 for(const [id,w] of Object.entries(WEAPONS)){assert.ok(s.player.ammo[id]>0);assert.equal(setWeapon(s,id),true);assert.equal(s.player.weapon,id);assert.ok(s.player.ammo[id]<=w.mag);}
 s.player.reserve.smg=0;s.player.reserve.launcher=0;s.inventory.scrap=200;s.inventory.ore=200;
 assert.ok(craft(s,'ammo'));assert.ok(s.player.reserve.smg>0);assert.ok(s.player.reserve.launcher>0);
});
test('cryo weapon freezes target struck by direct fire',()=>{
 const s=clean();s.enemies=[];s.player.x=0;s.player.z=0;s.player.y=0;s.player.yaw=0;
 const e=spawnEnemy(s,'warden',0,-10);setWeapon(s,'cryo');const oy=(terrainHeight(0,0,s.seed,s.zone))+1.7,ey=terrainHeight(0,-10,s.seed,s.zone)+1.15;shoot(s,{yaw:0,pitch:Math.atan2(ey-oy,10)});assert.ok(e.frozen>0,'cryo impact should slow enemies');
});
test('repeatable bounty contracts require acceptance, progress, proximity and turn-in',()=>{
 const s=clean(),b=s.rpg.bounty;assert.ok(b);assert.equal(b.status,'offered');
 b.goal={type:'harvest',target:'ore',count:5};assert.equal(startBounty(s),true);assert.equal(startBounty(s),false);rpgEvent(s,'harvest','fiber',99);assert.equal(b.progress,0);
 rpgEvent(s,'harvest','ore',5);assert.equal(b.status,'ready');assert.equal(claimBounty(s),false);
 s.player.x=3;s.player.z=14;const coins=s.rpg.coins;assert.ok(claimBounty(s));assert.ok(s.rpg.coins>coins);assert.equal(s.rpg.bountySerial,1);assert.equal(s.rpg.bounty.status,'offered');
});
test('bounty progression and reward state persist through save and restore',()=>{
 const s=clean();s.rpg.bounty.goal={type:'craft',target:'any',count:3};startBounty(s);rpgEvent(s,'craft','meds',2);
 const copy=restore(serialize(s));assert.equal(copy.rpg.bounty.status,'active');assert.equal(copy.rpg.bounty.progress,2);
 rpgEvent(copy,'craft','picks',1);assert.equal(copy.rpg.bounty.status,'ready');
});
test('safe rest advances day and recovers player but fails in combat or far from shelter',()=>{
 const s=clean();s.enemies=[];s.player.hp=38;s.player.shield=0;s.player.stamina=0;const clock=s.dayTime;
 assert.equal(sleepAtCamp(s,4),true);assert.ok(s.dayTime>clock);assert.ok(s.player.hp>38);assert.equal(s.player.shield,s.player.maxShield);
 s.player.x=74;s.player.z=0;assert.equal(sleepAtCamp(s,5),false);
 s.player.x=0;s.enemies=[];spawnEnemy(s,'raider',4,1);assert.equal(sleepAtCamp(s,5),false);
});
test('crouch moves slower than sprint and survives save reload',()=>{
 const s=clean();s.enemies=[];const start=s.player.z;
 stepGame(s,{z:1,crouch:true},.1);const crouchMovement=Math.abs(s.player.z-start);assert.ok(s.player.crouch);assert.ok(crouchMovement>0);
 const moved=s.player.z;stepGame(s,{z:1,sprint:true},.1);assert.ok(Math.abs(s.player.z-moved)>crouchMovement);
 const copy=restore(serialize(s));assert.equal(copy.player.crouch,false);
});
test('lockpicking requires proximity, consumes picks, rewards loot and cannot repeat',()=>{
 const s=clean(),lock=LOCKBOXES[0];s.player.x=lock.x;s.player.z=lock.z;s.inventory.lockpicks=200;
 const before=s.rpg.gear.length;let opened=false;
 for(let i=0;i<=99;i++){const result=attemptLock(s,lock.id,i);if(result.opened){opened=true;break;}}
 assert.ok(opened);assert.equal(s.rpg.gear.length,before+1);assert.ok(s.rpg.opened.includes('lock:'+lock.id));assert.equal(attemptLock(s,lock.id,50).ok,false);
});
test('lockpick precision perk widens tolerance and new picks can be crafted',()=>{
 const s=clean();s.inventory.lockpicks=0;s.inventory.scrap=100;s.inventory.ore=100;
 assert.ok(craft(s,'picks'));assert.equal(s.inventory.lockpicks,4);
 s.rpg.perkPoints=2;assert.ok(buyPerk(s,'locksmith'));assert.ok(buyPerk(s,'locksmith'));
 const lock=LOCKBOXES[1];s.player.x=lock.x;s.player.z=lock.z;
 assert.equal(attemptLock(s,lock.id,-12).ok,false);
});
test('pickpocketing requires crouch, creates a lasting result and never repeats per NPC',()=>{
 const s=clean();s.player.x=-10;s.player.z=-5;assert.equal(attemptPickpocket(s,'mira').ok,false);
 s.player.crouch=true;const event=attemptPickpocket(s,'mira');assert.ok(event.caught||event.stolen);assert.equal(s.rpg.flags['stole:mira'],true);
 assert.equal(attemptPickpocket(s,'mira').ok,false);assert.ok(s.rpg.crime.bounty>=0);const saved=restore(serialize(s));assert.equal(saved.rpg.flags['stole:mira'],true);
});
test('warden marshal clears criminal fines for crowns and quest dialogues cannot be spoofed',()=>{
 const s=clean();s.rpg.coins=500;s.rpg.crime.bounty=150;s.player.x=9;s.player.z=-7;
 assert.equal(payFine(s),true);assert.equal(s.rpg.crime.bounty,0);assert.equal(s.rpg.coins,350);assert.equal(payFine(s),false);
 assert.equal(dialogueChoice(s,'rhys','accept:the_glass_key').ok,false);
});
test('final story choice is restricted to a completed main quest and has world consequences',()=>{
 const s=clean();s.player.x=-9;s.player.z=9;
 assert.equal(dialogueChoice(s,'lyra','shape:archive').ok,false);
 s.rpg.quests.the_three_echoes={status:'done',progress:3};
 assert.ok(dialogueOptions(s,'lyra').some(x=>x.id==='shape:archive'));
 assert.equal(dialogueChoice(s,'lyra','shape:archive').ok,true);assert.equal(s.rpg.worldEnding,'archive');
 assert.equal(dialogueChoice(s,'lyra','shape:wardens').ok,false);const restored=restore(serialize(s));assert.equal(restored.rpg.worldEnding,'archive');
});
