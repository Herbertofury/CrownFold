import {frontierGuidance,guidanceQuest,markerPlacement} from './navigation.mjs';
import {objectiveRuntime} from './war-objectives.mjs';
import {tacticalRuntime} from './battlefield.mjs';
import {createGame,restore,serialize,stepGame,WEAPONS,STRUCTURES,CONTRACTS,clamp,fmtTime,dist,terrainHeight,biomeAt,worldGates,nearestInteraction,interact,enterOperation,finishOperation,addBuilding,recruit,issueOrder,fold,echo,grenade,orbital,resupply,reload,setWeapon,useConsumable,castAbility,dodge,sleepAtCamp} from './sim.mjs';
import {NPCS,NPC_BY_ID,LANDMARKS,DUNGEON_BY_ID,FACTIONS,PERKS,ABILITIES,QUESTS,QUEST_BY_ID,RECIPES,GOODS,RARITIES,perkRank,rpgStat,buyPerk,equipGear,salvageGear,craft,fastTravel,dialogueOptions,dialogueChoice,buyGood,startBounty,claimBounty,generateBounty,LOCKBOXES,attemptLock} from './rpg.mjs';
import {WorldRenderer} from './render.mjs';
import {ERAS,ERA_ORDER,CHRONICLE,availableRifts,eraSites,spendInsight} from './temporal.mjs';
import {COMMANDER_HERITAGES,LOST_TECH,MAX_WEAVE_SLOTS,WAR_POWERS,WEAVE_SYNERGIES,setCommanderHeritage,researchLostTech,lostTechCost,equipLostTech,equippedTech,activeWeaves} from './lineage.mjs';
import {BATTALIONS,WAR_BUILDINGS,WAR_CAMPAIGNS,WAR_STANCES,WAR_SUPPORT,trainBattalion,constructWarBuilding,warSummary,selectWarBattalion,selectWarBattalions,setWarControlGroup,recallWarControlGroup,setWarStance,warCastPower,callWarSupport,signalWarExtraction,canSignalWarExtraction,warObjective,skipWarSortie} from './war.mjs';
import {selectEpoch} from './sim.mjs';
import {DEFAULT_SETTINGS,loadSettings,saveSettings,normalizeSettings,aimDelta,masterVolume} from './settings.mjs';
import {weaponCard,reloadProgress} from './arsenal.mjs';
const $=id=>document.getElementById(id),canvas=$('world');
const runtime=tacticalRuntime();
$('tactics-runtime').textContent=runtime.backend==='rust-wasm'?'RUST TACTICS · WASM':'JS TACTICS · COMPATIBILITY MODE';
$('tactics-runtime').title=runtime.reason||'Formation routes, cover collision and siege objective transitions run in Rust compiled to WebAssembly.';
const settingsDefaults={...DEFAULT_SETTINGS,reduceEffects:window.matchMedia('(prefers-reduced-motion: reduce)').matches};
let settingsStorage=null;try{settingsStorage=window.localStorage;}catch{}
let settings=loadSettings(settingsStorage,settingsDefaults);
const settingsDialog=$('settings-dialog'),arsenalDialog=$('arsenal-dialog');
let arsenalChoice=null;
const SAVE_KEY='crownfold-riftfront-save-v1',QUICK_SAVE_KEY='crownfold-riftfront-quick-save-v1';
let currentSaveKey=SAVE_KEY;
const safeSave=()=>{try{localStorage.setItem(currentSaveKey,serialize(s));return true;}catch{return false;}};
const safeLoad=(key=SAVE_KEY)=>{try{return restore(localStorage.getItem(key));}catch{return null;}};
const hasSave=key=>{try{return localStorage.getItem(key)!==null;}catch{return false;}};
let s=createGame(),renderer,active=false,paused=false,commander=false,commanderCompact=false,buildMenu=false,help=false,mapExpanded=false,rpgMenu=false,dialogue=false,lockMenu=false,lockId=null,rpgTab='inventory',selectedPlace='home',dialogueReply='',trading=false,order='move',quality='high',last=performance.now(),bank=0,lastUi=0,lastMini=0,lastNotice=0,lastAutoSave=0,healthBefore=s.player.hp,zoneBefore='frontier',eraBefore='medieval',shotBefore=0;
const keys=new Set(),input={x:0,z:0,sprint:false,jump:false,aim:false,fire:false,commander:false,yaw:0,pitch:-.075};
const noteEls=[];let commanderDrag=null,trackedWarSortie=null;
const selectBox=document.getElementById('command-select-box');
try{renderer=new WorldRenderer(canvas,quality);}catch(e){$('error').textContent=`3D renderer unavailable: ${e.message}`;$('error').classList.remove('hidden');}
let audio=null,masterGain=null;let weakBefore=0;
function tone(freq=220,seconds=.1,kind='triangle',volume=.12,end=freq*.6){if(!audio)return;try{const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;o.type=kind;o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),now+seconds);g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.0001,now+seconds);o.connect(g);g.connect(masterGain);o.start(now);o.stop(now+seconds+.01);}catch{}}
function sound(name){if(name==='shoot')tone(s.player.weapon==='rail'?150:350,.09,'sawtooth',.04,45);if(name==='hit')tone(790,.10,'square',.025,360);if(name==='fold'){tone(145,.65,'sine',.15,800);tone(420,.37,'triangle',.07,120);}if(name==='echo')tone(1000,.55,'sine',.1,130);if(name==='notification')tone(430,.22,'sine',.045,620);if(name==='explosion')tone(80,.48,'sawtooth',.15,28);if(name==='build')tone(180,.2,'triangle',.08,390);}
function updateContinue(){for(const [id,key,label] of [['continue-game',SAVE_KEY,'CONTINUE OPEN WORLD'],['continue-quick',QUICK_SAVE_KEY,'CONTINUE QUICK SESSION']]){const saved=safeLoad(key),button=$(id);button.disabled=!saved;button.textContent=saved?.war?'RESUME '+(key===SAVE_KEY?'WORLD':'QUICK')+' WAR / '+saved.operation.name:label;}}
updateContinue();
const canCapturePointer=()=>!arsenalDialog.open&&!commander&&!paused&&!buildMenu&&!help&&!rpgMenu&&!dialogue&&!lockMenu&&active;
function pointer(){if(canCapturePointer()&&document.pointerLockElement!==canvas){try{
 // Pointer-lock requests resolve asynchronously. Rejections after Escape are normal.
 const request=canvas.requestPointerLock();request?.catch(()=>{});
}catch{}}}
function exitPointer(){if(document.pointerLockElement===canvas)document.exitPointerLock();}
// A pending request may finish after a menu opens; do not let it capture menu clicks.
document.addEventListener('pointerlockchange',()=>{if(!canCapturePointer())exitPointer();});
function setVisibility(id,show){$(id).classList.toggle('hidden',!show);}
function start(kind='new'){
 const quick=['drop','war','continue-quick'].includes(kind),key=quick?QUICK_SAVE_KEY:SAVE_KEY;
 if(['new','drop','war'].includes(kind)&&hasSave(key)&&!window.confirm(`Start a new ${quick?'quick session':'open world'}? This replaces its existing saved progress, including any active War Rift checkpoint.`))return;
 const loaded=kind==='continue'||kind==='continue-quick'?safeLoad(key):null;if((kind==='continue'||kind==='continue-quick')&&!loaded){updateContinue();return;}
 trackedWarSortie=null;currentSaveKey=key;s=loaded||createGame((0xC0F01D + Math.floor(Math.random()*200000))|0);
 if(kind==='drop')enterOperation(s,0);if(kind==='war')enterOperation(s,3);
 active=true;paused=false;commander=false;commanderCompact=false;buildMenu=false;help=false;rpgMenu=false;dialogue=false;lockMenu=false;mapExpanded=false;document.body.classList.remove('commanding','command-compact','map-expanded');keys.clear();input.fire=false;
 setVisibility('menu',false);setVisibility('hud',true);setVisibility('commander-panel',false);setVisibility('build-panel',false);setVisibility('pause-overlay',false);setVisibility('help-overlay',false);setVisibility('rpg-overlay',false);setVisibility('dialogue-overlay',false);setVisibility('lock-overlay',false);
 input.yaw=s.player.yaw;input.pitch=s.player.pitch;lastNotice=s.lastEvent;lastAutoSave=performance.now();bank=0;zoneBefore=s.zone;eraBefore=s.era;healthBefore=s.player.hp;shotBefore=s.player.shots;weakBefore=s.player.weakHits||0;
 if(kind==='new')s.messages.push({id:++s.lastEvent,text:'WELCOME TO THE UNBROKEN FRONTIER. HEAD FOR A RIFT GATE.',type:'command',at:0});
 syncAudio(true);pointer();refresh(true);if(s.checkpointWarning)toast('WAR CHECKPOINT UNAVAILABLE · FRONTIER PROGRESS RECOVERED','warning');
}
$('rpg-button').onclick=()=>toggleRpg('inventory');$('close-rpg').onclick=()=>toggleRpg(null);$('dialogue-leave').onclick=()=>closeDialogue();for(const b of document.querySelectorAll('[data-rpg-tab]'))b.onclick=()=>toggleRpg(b.dataset.rpgTab);
$('new-game').onclick=()=>start('new');$('continue-game').onclick=()=>start('continue');$('continue-quick').onclick=()=>start('continue-quick');$('quick-operation').onclick=()=>start('drop');$('quick-war').onclick=()=>start('war');$('fold-target').onclick=()=>{selectEpoch(s);refresh(true);};
$('pause-button').onclick=()=>togglePause();$('resume').onclick=()=>togglePause(false);$('back-menu').onclick=()=>backToMenu();
$('abort-operation').onclick=()=>{if(s.zone==='operation'){finishOperation(s,false);const saved=safeSave();toast(saved?'OPERATION ABORTED · PARTIAL SALVAGE SAVED':'OPERATION ENDED · SAVE FAILED · KEEP GAME OPEN','warning');togglePause(false);}};
$('save-button').onclick=()=>{const saved=safeSave();toast(saved?(s.war?'WAR CHECKPOINT SAVED':'FRONTIER PROGRESS SAVED'):'SAVE FAILED · PREVIOUS SAVE KEPT',saved?'success':'warning');};
$('quality-button').onclick=()=>{quality=quality==='high'?'standard':'high';renderer?.dispose();renderer=new WorldRenderer(canvas,quality);$('quality-button').textContent=`QUALITY: ${quality.toUpperCase()}`;toast('RENDERER QUALITY UPDATED');};
function syncAudio(userGesture=false){
 if(userGesture&&settings.soundEnabled&&!audio){try{audio=new(window.AudioContext||window.webkitAudioContext)();masterGain=audio.createGain();masterGain.connect(audio.destination);}catch{audio=null;masterGain=null;toast('SOUND NOT AVAILABLE','warning');}}
 if(masterGain){masterGain.gain.cancelScheduledValues(0);masterGain.gain.value=masterVolume(settings);if(userGesture&&settings.soundEnabled)audio.resume().catch(()=>toast('SOUND NOT AVAILABLE','warning'));}
 $('sound-button').textContent=settings.soundEnabled?'♫ SOUND ON':'♫ SOUND OFF';$('sound-button').setAttribute('aria-pressed',String(settings.soundEnabled));
}
function refreshSettings(){
 $('setting-sensitivity').value=settings.sensitivity;$('sensitivity-value').textContent=settings.sensitivity.toFixed(2)+'×';
 $('setting-volume').value=Math.round(settings.volume*100);$('volume-value').textContent=Math.round(settings.volume*100)+'%';
 $('setting-invert').checked=settings.invertY;$('setting-sound').checked=settings.soundEnabled;$('setting-effects').checked=settings.reduceEffects;
 document.body.classList.toggle('reduced-hud-effects',settings.reduceEffects);
}
function changeSettings(patch,userGesture=true){
 settings=normalizeSettings({...settings,...patch},settingsDefaults);refreshSettings();syncAudio(userGesture);
 $('settings-status').textContent=saveSettings(settingsStorage,settings)?'Saved on this browser. Campaign saves are unchanged.':'Settings work for this session, but browser storage is unavailable.';
}
function openSettings(){
 // Entry points are the title and pause menu. Closing never resumes combat.
 if(active&&!paused||settingsDialog.open)return;
 keys.clear();input.fire=false;input.aim=false;document.body.classList.remove('aiming');exitPointer();refreshSettings();settingsDialog.showModal();
}
$('title-settings').onclick=openSettings;$('pause-settings').onclick=openSettings;
$('settings-close').onclick=()=>settingsDialog.close();
settingsDialog.addEventListener('close',()=>{keys.clear();input.fire=false;});
settingsDialog.addEventListener('keydown',e=>{
 if(e.key!=='Tab')return;
 const controls=[...settingsDialog.querySelectorAll('input,button')].filter(el=>!el.disabled),first=controls[0],last=controls.at(-1);
 if(e.shiftKey&&(document.activeElement===first||!controls.includes(document.activeElement))){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
$('setting-sensitivity').oninput=e=>changeSettings({sensitivity:Number(e.target.value)});
$('setting-volume').oninput=e=>changeSettings({volume:Number(e.target.value)/100});
$('setting-invert').onchange=e=>changeSettings({invertY:e.target.checked});
$('setting-sound').onchange=e=>changeSettings({soundEnabled:e.target.checked});
$('setting-effects').onchange=e=>changeSettings({reduceEffects:e.target.checked});
$('settings-reset').onclick=()=>changeSettings(settingsDefaults);
$('settings-test').onclick=()=>{syncAudio(true);if(settings.soundEnabled&&settings.volume>0)tone(350,.22,'sine',.09,660);$('settings-status').textContent=!settings.soundEnabled||settings.volume===0?'Sound is muted. Enable sound and raise the volume to hear the test.':audio?'Playing a short tone at your chosen volume.':'Audio is unavailable in this browser.';};
$('sound-button').onclick=()=>changeSettings({soundEnabled:!settings.soundEnabled});
refreshSettings();syncAudio();
// Arsenal is a deliberately paused, inspect-before-equipping selection screen.
function openArsenal(){
 if(!active||paused||commander||buildMenu||help||mapExpanded||rpgMenu||dialogue||lockMenu||arsenalDialog.open)return;
 keys.clear();input.fire=false;input.aim=false;input.x=0;input.z=0;bank=0;document.body.classList.remove('aiming');exitPointer();
 arsenalChoice=s.player.weapon;const grid=$('arsenal-grid');grid.textContent='';
 for(const [index,id] of Object.keys(WEAPONS).entries()){
  const info=weaponCard(s.player,id),b=uiElement('button','arsenal-card');b.type='button';b.dataset.weapon=id;
  b.append(uiElement('span','arsenal-role',`${index+1} / ${info.role}`),uiElement('strong','',info.name),uiElement('p','',info.description));
  const stats=uiElement('span','arsenal-stats');stats.append(uiElement('span','',`${info.damage} DMG`),uiElement('span','',`${info.range} RANGE`),uiElement('span','',`${info.reload} RELOAD`));b.append(stats);
  b.append(uiElement('span','arsenal-ammo',`${info.ammo} / ${info.reserve} ROUNDS`),uiElement('span',`arsenal-state${info.status==='OUT OF AMMO'?' empty':''}`,info.equipped?'EQUIPPED · '+info.status:info.status));
  b.onclick=()=>chooseArsenal(id);grid.append(b);
 }
 chooseArsenal(arsenalChoice);arsenalDialog.showModal();grid.querySelector('[aria-pressed="true"]').focus();
}
function chooseArsenal(id){
 if(!Object.hasOwn(WEAPONS,id))return;arsenalChoice=id;
 for(const b of $('arsenal-grid').children)b.setAttribute('aria-pressed',String(b.dataset.weapon===id));
 const info=weaponCard(s.player,id);$('arsenal-selection').textContent=`${info.name} · ${info.status}${s.player.reload>0&&id!==s.player.weapon?' · Switching cancels the current reload.':''}`;
 $('arsenal-equip').textContent=id===s.player.weapon?'KEEP WEAPON / RETURN':'EQUIP / RETURN';
}
function closeArsenal(equip=false){
 if(!arsenalDialog.open)return;
 if(equip&&setWeapon(s,arsenalChoice))sound('notification');
 arsenalDialog.close();finishArsenalClose();
}
$('arsenal-button').onclick=openArsenal;$('arsenal-cancel').onclick=()=>closeArsenal();$('arsenal-equip').onclick=()=>closeArsenal(true);
arsenalDialog.addEventListener('cancel',e=>{e.preventDefault();closeArsenal();});
function finishArsenalClose(){keys.clear();input.fire=false;input.aim=false;bank=0;arsenalChoice=null;refresh(true);$('arsenal-button').focus({preventScroll:true});pointer();}
// Native close events are queued. An older close must not reset a newly opened selector.
arsenalDialog.addEventListener('close',()=>{if(!arsenalDialog.open&&arsenalChoice!==null)finishArsenalClose();});
arsenalDialog.addEventListener('keydown',e=>{
 if(!arsenalDialog.open)return;
 // A closing key must not bubble back into the global opener.
 e.stopPropagation();
 const cards=[...$('arsenal-grid').children],controls=[...arsenalDialog.querySelectorAll('button')];
 if(e.code==='Backquote'){e.preventDefault();if(!e.repeat)closeArsenal();return;}
 if(/^Digit[1-6]$/.test(e.code)){e.preventDefault();const card=cards[Number(e.code.slice(-1))-1];chooseArsenal(card.dataset.weapon);card.focus();return;}
 if(e.key.startsWith('Arrow')){e.preventDefault();const columns=getComputedStyle($('arsenal-grid')).gridTemplateColumns.split(' ').length,i=cards.findIndex(b=>b.dataset.weapon===arsenalChoice),delta=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:e.key==='ArrowUp'?-columns:columns;const card=cards[(i+delta+cards.length)%cards.length];chooseArsenal(card.dataset.weapon);card.focus();return;}
 if(e.key==='Enter'&&cards.includes(document.activeElement)){e.preventDefault();if(!e.repeat)closeArsenal(true);return;}
 if(e.key==='Tab'){const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
$('help-button').onclick=()=>toggleHelp();$('help-close').onclick=()=>toggleHelp(false);
$('expand-map').onclick=()=>{mapExpanded=!mapExpanded;document.body.classList.toggle('map-expanded',mapExpanded);if(mapExpanded){exitPointer();}else{pointer();}};
$('close-build').onclick=()=>toggleBuild(false);$('recruit-button').onclick=()=>{if(recruit(s)){sound('build');toggleBuild(false);}else toast('NOT ENOUGH SCRAP OR SQUAD CAP REACHED','warning');};
function backToMenu(){if(!safeSave()&&!window.confirm('Saving failed. Return to title without saving current progress? Your previous save will remain.'))return;active=false;paused=false;commander=false;commanderCompact=false;document.body.classList.remove('commanding','command-compact');keys.clear();input.fire=false;exitPointer();setVisibility('menu',true);setVisibility('hud',false);setVisibility('pause-overlay',false);setVisibility('commander-panel',false);setVisibility('build-panel',false);setVisibility('help-overlay',false);setVisibility('rpg-overlay',false);setVisibility('dialogue-overlay',false);setVisibility('lock-overlay',false);rpgMenu=false;dialogue=false;lockMenu=false;updateContinue();}
function togglePause(value=!paused){if(!active)return;if(value){rpgMenu=false;dialogue=false;lockMenu=false;setVisibility('rpg-overlay',false);setVisibility('dialogue-overlay',false);setVisibility('lock-overlay',false);}paused=value;setVisibility('pause-overlay',paused);if(paused){exitPointer();if(!safeSave())toast('SAVE FAILED · PREVIOUS SAVE KEPT','warning');}else pointer();}
function toggleHelp(value=!help){if(value){rpgMenu=false;dialogue=false;lockMenu=false;setVisibility('rpg-overlay',false);setVisibility('dialogue-overlay',false);setVisibility('lock-overlay',false);}help=value;setVisibility('help-overlay',help);if(help)exitPointer();else pointer();}
function toggleBuild(value=!buildMenu){if(!active||rpgMenu||dialogue||lockMenu)return;buildMenu=value;setVisibility('build-panel',buildMenu);if(value){exitPointer();refreshBuild();}else pointer();}
function setCommanderCompact(yes){commanderCompact=!!yes;document.body.classList.toggle('command-compact',commander&&commanderCompact);$('commander-compact').textContent=commanderCompact?'EXPAND COMMAND CONSOLE  [ ` ]':'CLEAR MAP FOR ORDERS  [ ` ]';}
$('war-skip-sortie').onclick=()=>{if(skipWarSortie(s))refresh(true);};
$('war-track-sortie').onclick=()=>{trackedWarSortie=s.war?.expedition&&trackedWarSortie!==s.war.expedition?s.war.expedition:null;refresh(true);};
$('commander-compact').onclick=()=>setCommanderCompact(!commanderCompact);
function toggleCommander(){if(!active||paused||buildMenu||help||rpgMenu||dialogue||lockMenu)return;commander=!commander;input.commander=commander;document.body.classList.toggle('commanding',commander);setCommanderCompact(commanderCompact);setVisibility('commander-panel',commander);setVisibility('war-controls',commander&&!!s.war);input.fire=false;if(commander){renderer.tactical.x=s.player.x;renderer.tactical.z=s.player.z;renderer.terrainOrigin='';renderer.propsKey='';exitPointer();refreshWarCommands();selectOrder('move');}else pointer();}
function toast(text,type='info'){let container=$('notifications'),item=document.createElement('div');item.className='note '+type;item.textContent=text;container.prepend(item);noteEls.push({item,at:performance.now()});while(container.childElementCount>4)container.lastElementChild.remove();}
function selectOrder(mode){order=mode;document.querySelectorAll('[data-order]').forEach(b=>b.classList.toggle('selected',b.dataset.order===mode));}
for(const b of document.querySelectorAll('[data-order]'))b.addEventListener('click',()=>selectOrder(b.dataset.order));
$('follow-button').onclick=()=>{issueOrder(s,'follow',s.player.x,s.player.z);sound('notification');};
$('war-extraction-button').onclick=()=>{if(signalWarExtraction(s)){sound('notification');refreshWarCommands();}else toast('REACH THE EVAC BEACON WITH YOUR SOLDIER OR BATTALIONS','warning');};
function refreshWarCommands(){
 const w=s.war;setVisibility('war-controls',!!w&&commander);if(!w)return;
 const stats=warSummary(w),heritage=COMMANDER_HERITAGES[s.temporal.lineage.commanderEra];
 const objective=stats.objective,actLabel=$('war-act');actLabel.textContent='';actLabel.append(uiElement('strong','',objective.name),uiElement('span','',objective.description),uiElement('small','',`${objective.detail} · ${Math.round(100*objective.progress/Math.max(1,objective.target))}% COMPLETE`));
 const extractionPanel=$('war-extraction-action');setVisibility('war-extraction-action',stats.act==='extraction');if(stats.act==='extraction'){$('war-extraction-button').disabled=!canSignalWarExtraction(s);$('war-extraction-button').textContent=stats.extractionActive?'SIGNAL ACTIVE / DEFEND THE BEACON':'CALL EXTRACTION · TROOPS OR PLAYER MUST REACH BEACON';}
 $('war-stats').textContent=`${stats.supplies} SUPPLIES (+${stats.income}/s) · ${stats.population}/${stats.popCap} POP · ${stats.held}/3 WELLS · ${stats.anchorsRemaining}/2 ENEMY ANCHORS · ${stats.coverRemaining} COVER SITES · HQ ${stats.baseHp} / ENEMY ${stats.enemyBaseHp} · RIFT SURGE ${stats.stormIn}s`;
 $('war-heritage').textContent=`${heritage.name} · ${heritage.trait} · ${s.temporal.lineage.equipped.length} SCIENCES EQUIPPED · ${activeWeaves(s).length} CROSS-ERA FUSIONS`;
 $('war-log').textContent=w.events.at(-1)||'Capture timewells and assault the opposing throne.';
 const orders=$('war-siege-orders');setVisibility('war-siege-brief',!!stats.bellSiege);
 if(stats.bellSiege){const signature=JSON.stringify(stats.bellSiege);if(orders.dataset.signature!==signature){orders.dataset.signature=signature;orders.textContent='';for(const q of stats.bellSiege){const item=uiElement('li','',`${q.name} / ${q.status.toUpperCase()}`);item.append(uiElement('small','',`FROM ${q.act.toUpperCase()} · ${q.reward}`));orders.append(item);}}}
 if(trackedWarSortie!==w.expedition)trackedWarSortie=null;
 setVisibility('war-skip-sortie',!!w.bellSiege);$('war-skip-sortie').disabled=!w.expedition?.sortieId;
 const track=$('war-track-sortie');track.disabled=!w.expedition;track.textContent=trackedWarSortie?'TRACK MAIN SIEGE OBJECTIVE':'TRACK OPTIONAL SORTIE';track.setAttribute('aria-pressed',String(!!trackedWarSortie));
 const mission=$('war-expedition');
 if(stats.expedition){const e=stats.expedition,spec=e;mission.classList.add('active');mission.textContent='';
  mission.append(uiElement('strong','',`${spec.name} · ${e.seconds}s`),uiElement('span','',spec.description),uiElement('small','',`${Math.round(dist(s.player,w.expedition))}m · ${e.progress}% COMPLETE · ${spec.reward} · ${stats.crisesResolved} RESOLVED / ${stats.crisesLost} LOST`));
 }else{mission.classList.remove('active');mission.textContent=`ENEMY STRATEGY: ${stats.enemyDoctrine} · ${stats.bellSiege?'FIELD ORDERS ABOVE / SORTIES UNLOCK AS THE SIEGE ADVANCES':`NEXT CRISIS ${Math.ceil(w.expeditionNext)}s`} · ${stats.crisesResolved} RESOLVED / ${stats.crisesLost} LOST`;}
 const roster=$('war-select'),key=[w.army.map(g=>g.id).join(','),...(w.selectedBattalionIds||[])].join('|');
 if(roster.dataset.signature!==key){roster.dataset.signature=key;roster.textContent='';
  const all=uiElement('button',w.selectedBattalionIds?.length?'':'active','ALL BATTALIONS · GROUP ORDER');all.dataset.battalion='all';all.onclick=()=>{selectWarBattalion(s,null);refreshWarCommands();};roster.append(all);
  for(const g of w.army){const b=uiElement('button',w.selectedBattalionIds?.includes(g.id)?'active':'');b.dataset.battalion=String(g.id);b.onclick=(e)=>{if(e.shiftKey)selectWarBattalions(s,[g.id],true);else selectWarBattalion(s,g.id);refreshWarCommands();};roster.append(b);}
 }
 for(const b of [...roster.children].slice(1)){const g=w.army.find(g=>g.id===Number(b.dataset.battalion));if(g)b.textContent=`#${g.id} ${BATTALIONS[g.type].name} · ${g.count} TROOPS · ${g.stance.toUpperCase()} · ${Math.round(g.morale)} MORALE${g.retreating?' · ROUTED':''}`;}
 const stances=$('war-stances');if(stances.childElementCount!==Object.keys(WAR_STANCES).length){stances.textContent='';for(const [id,stance]of Object.entries(WAR_STANCES)){
  const b=uiElement('button','',stance.name);b.dataset.stance=id;b.title=stance.description;b.onclick=()=>{if(setWarStance(s,id))sound('notification');refreshWarCommands();};stances.append(b);
 }}
 const selected=w.selectedBattalionIds?.length?w.army.filter(g=>w.selectedBattalionIds.includes(g.id)):w.army;
 for(const b of stances.children)b.classList.toggle('active',selected.length>0&&selected.every(g=>g.stance===b.dataset.stance));
 const abilities=$('war-power-grid');if(abilities.childElementCount!==Object.keys(WAR_POWERS).length){abilities.textContent='';for(const [id,power]of Object.entries(WAR_POWERS)){
  const b=uiElement('button','',power.name);b.dataset.warPower=id;b.title=power.description;b.onclick=()=>{if(warCastPower(s,id)){sound('fold');refreshWarCommands();}else toast('POWER NEEDS RESEARCHED & EQUIPPED TECH, SUPPLIES, A TARGET, AND A READY COOLDOWN','warning');};abilities.append(b);
 }}
 for(const b of abilities.children){const id=b.dataset.warPower,power=WAR_POWERS[id],cool=w.powerCooldowns[id]||0,unlocked=equippedTech(s,power.unlock);
  b.textContent=`${power.name} · ${power.cost}S`;const label=uiElement('small','',!unlocked?'LOCKED · Y TO RESEARCH':cool>0?`${Math.ceil(cool)}s COOLDOWN`: 'READY · CLICK TO DEPLOY');b.append(label);b.disabled=!unlocked||cool>0||w.supplies<power.cost;}
 const supports=$('war-support');if(supports.childElementCount!==Object.keys(WAR_SUPPORT).length){supports.textContent='';for(const [id,spec]of Object.entries(WAR_SUPPORT)){const b=uiElement('button','',spec.name);b.dataset.support=id;b.title=spec.description;b.onclick=()=>{if(callWarSupport(s,id)){sound('fold');refreshWarCommands();}else toast('SUPPORT BLOCKED / SUPPLIES, POPULATION OR COOLDOWN','warning');};supports.append(b);}}
 for(const b of supports.children){const id=b.dataset.support,spec=WAR_SUPPORT[id],cool=stats.supportCooldowns[id]||0,reserved=stats.supportDrops.find(d=>d.id===id);b.textContent=`${spec.name} · ${spec.cost}S`;b.append(uiElement('small','',reserved?`INBOUND ${reserved.seconds}s`:cool>0?`${Math.ceil(cool)}s RECHARGE`:id==='timefall_pod'?'REINFORCE SELECTED POSITION':'STRIKE SELECTED POSITION'));b.disabled=w.supplies<spec.cost||cool>0||(id==='timefall_pod'&&stats.population+13>stats.popCap);}
 const units=$('war-units');if(units.childElementCount!==Object.keys(BATTALIONS).length){units.textContent='';for(const [id,u]of Object.entries(BATTALIONS)){
  const b=uiElement('button','war-build');b.dataset.train=id;b.title=u.description;b.onclick=()=>{if(trainBattalion(s,id)){sound('build');refreshWarCommands();}else toast('MISSING SUPPLIES, PRODUCTION BUILDING OR POPULATION CAP','warning');};units.append(b);
 }}
 for(const b of units.children){const u=BATTALIONS[b.dataset.train];b.textContent=`${u.name} · ${u.cost}S · ${u.count} TROOPS`;b.disabled=w.supplies<u.cost||!w.buildings.some(q=>q.kind===u.building)||stats.population+u.count>stats.popCap;}
 const buildings=$('war-buildings');if(buildings.childElementCount!==Object.keys(WAR_BUILDINGS).length){buildings.textContent='';for(const [id,u]of Object.entries(WAR_BUILDINGS)){
  const b=uiElement('button','war-build');b.dataset.warBuild=id;b.title=u.description;b.onclick=()=>{if(constructWarBuilding(s,id)){sound('build');refreshWarCommands();}else toast('CANNOT BUILD / SUPPLIES OR STRUCTURE LIMIT','warning');};buildings.append(b);
 }}
 for(const b of buildings.children){const u=WAR_BUILDINGS[b.dataset.warBuild];b.textContent=`BUILD ${u.name} · ${u.cost}S`;b.disabled=w.supplies<u.cost||w.buildings.length>=15;}
}
function refreshBuild(){const target=$('build-list');target.textContent='';for(const [kind,spec] of Object.entries(STRUCTURES)){
  const b=document.createElement('button');b.className='build-item';const costs=Object.keys(s.inventory).filter(k=>spec[k]).map(k=>`${spec[k]} ${k.toUpperCase()}`).join(' · ');
  const strong=document.createElement('strong');strong.textContent=spec.label;const desc=document.createElement('span');desc.textContent=spec.description;const footer=document.createElement('b');footer.textContent=costs;b.append(strong,desc,footer);
  const afford=Object.keys(s.inventory).every(k=>!spec[k]||s.inventory[k]>=Math.ceil(spec[k]*rpgStat(s,'discount')));b.disabled=!afford;
  b.onclick=()=>{const p=s.player;const x=p.x+Math.sin(p.yaw)*-0+Math.sin(p.yaw)*6,z=p.z-Math.cos(p.yaw)*6;
    if(addBuilding(s,kind,x,z)){sound('build');toggleBuild(false);}else toast('NOT ENOUGH MATERIALS / DEPLOYMENT TOO FAR','warning');};target.append(b);
 }}
// RPG screens and conversations. DOM is constructed with textContent: no dynamic HTML or scripts.
const uiElement=(tag,className='',text='')=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node;};
const uiAction=(text,fn,disabled=false)=>{const b=uiElement('button','rpg-action',text);b.disabled=!!disabled;b.onclick=fn;return b;};
const uiCard=(title,subtitle,description,rarity=-1)=>{const box=uiElement('div',`rpg-card${rarity>=0?` rarity-${rarity}`:''}`);box.append(uiElement('strong','',title),uiElement('span','rpg-meta',subtitle),uiElement('p','',description));return box;};
const uiSection=(label)=>uiElement('div','rpg-section-title',label);
const uiGrid=()=>uiElement('div','rpg-grid');
const uiActions=()=>uiElement('div','rpg-actions');
const addEmpty=(node,text)=>node.append(uiElement('p','rpg-summary',text));
function toggleRpg(tab='inventory'){
 if(!active||paused||help||buildMenu||dialogue)return;
 if(!tab || (rpgMenu&&rpgTab===tab)){rpgMenu=false;setVisibility('rpg-overlay',false);pointer();return;}
 rpgMenu=true;rpgTab=tab;commander=false;input.commander=false;setVisibility('commander-panel',false);document.body.classList.remove('commanding','command-compact');exitPointer();setVisibility('rpg-overlay',true);renderRpg();
}
function renderRpg(){if(!rpgMenu)return;const pane=$('rpg-content');pane.textContent='';const current=rpgTab,p=s.player,r=s.rpg;
 $('rpg-title').textContent=({inventory:'THE ARMORY',perks:'PERK CONSTELLATION',journal:'QUEST JOURNAL',craft:'THE FORGE',atlas:'THE LIVING ATLAS',timeline:'THE CHRONICLE OF EVERYTHING',bounties:'RADIANT BOUNTIES',homestead:'HOMESTEAD',factions:'BANNERS & ALLIES',weave:'LOST FUTURES',codex:'LOST HISTORIES'})[current]||'YOUR LEGEND';
 $('rpg-subtitle').textContent=`LEVEL ${p.level} · ${p.xp}/${p.level*110} XP · ${r.perkPoints} UNSPENT PERK POINTS · ${s.stats.missions} OPERATIONS WON`;
 $('rpg-currency').textContent=`◈ ${r.coins} CROWNS`;$('rpg-level').textContent=`${s.temporal.visited.length}/5 ERAS · ${s.temporal.insight} INSIGHT`;
 for(const b of document.querySelectorAll('[data-rpg-tab]'))b.classList.toggle('selected',b.dataset.rpgTab===current);
 if(current==='weave'){
  const t=s.temporal,ld=t.lineage;
  pane.append(uiSection('YOUR CHOSEN HERITAGE // A BANNER, NOT A POWER TIER'));
  addEmpty(pane,`Your character currently explores ${ERAS[s.era].name}. Commander heritage sets your preferred doctrine and visual identity, not your birth century, available units or historical superiority. Change it freely while outside a rift.`);
  const heritages=uiGrid();for(const [id,heritage]of Object.entries(COMMANDER_HERITAGES)){
   const card=uiCard(heritage.name,`${heritage.age} · ${heritage.trait}${ld.commanderEra===id?' · SELECTED':''}`,heritage.description);if(ld.commanderEra===id)card.classList.add('active');
   const actions=uiActions();actions.append(uiAction(ld.commanderEra===id?'YOUR COMMAND STYLE':'MAKE THIS MY HERITAGE',()=>{if(setCommanderHeritage(s,id)){sound('notification');renderRpg();}else toast('SELECT A HERITAGE WHILE IN THE OPEN WORLD','warning');},s.zone!=='frontier'||ld.commanderEra===id));card.append(actions);heritages.append(card);
  }pane.append(heritages);
  pane.append(uiSection(`THE DOCTRINE WEAVE // ${ld.equipped.length}/${MAX_WEAVE_SLOTS} TECHNIQUES EQUIPPED · ${t.insight} CHRONICLE INSIGHT`));
  addEmpty(pane,'Every timeline invented advanced sciences; some were lost rather than surpassed. Discover sites in any era to earn Insight, research whichever disciplines you enjoy, and equip any three together. Research is permanent; a loadout is freely editable outside missions.');
  const ribbon=uiElement('div','weave-ribbon');for(const id of ld.equipped)ribbon.append(uiElement('span','active',`${ERAS[LOST_TECH[id].era].year} · ${LOST_TECH[id].name}`));if(!ld.equipped.length)ribbon.append(uiElement('span','','EMPTY WEAVE · SELECT AN UNLOCKED TECHNOLOGY'));pane.append(ribbon);
  const grid=uiGrid();for(const [id,tech]of Object.entries(LOST_TECH)){
   const owned=ld.researched.includes(id),equipped=ld.equipped.includes(id),card=uiCard(tech.name,`${ERAS[tech.era].period} · ${tech.rarity}`,`${tech.story} ${tech.effect}`);card.classList.add('lost-tech-card');if(equipped)card.classList.add('equipped');
   card.append(uiElement('span','rpg-tag',owned?(equipped?'EQUIPPED':'RESEARCHED'):`${lostTechCost(s,id)} INSIGHT · RESEARCHABLE`));
   const actions=uiActions();if(!owned)actions.append(uiAction(`DISCOVER LOST SCIENCE · ${lostTechCost(s,id)} INSIGHT`,()=>{if(researchLostTech(s,id)){sound('notification');renderRpg();}else toast('NOT ENOUGH CHRONICLE INSIGHT','warning');},t.insight<lostTechCost(s,id)||s.zone!=='frontier'));
   else actions.append(uiAction(equipped?'REMOVE FROM WEAVE':`EQUIP · ${ld.equipped.length}/${MAX_WEAVE_SLOTS} SLOTS`,()=>{if(equipLostTech(s,id)){sound('notification');renderRpg();}else toast('WEAVE FULL / REMOVE A TECHNOLOGY FIRST OR LEAVE THE RIFT','warning');},(!equipped&&ld.equipped.length>=MAX_WEAVE_SLOTS)||s.zone!=='frontier'));
   card.append(actions);grid.append(card);
  }pane.append(grid);
  pane.append(uiSection('UNIQUE CROSS-ERA FUSIONS // TWO TECHNOLOGIES MAKE A THIRD IDEA'));const fusions=uiGrid();for(const fusion of WEAVE_SYNERGIES){const on=activeWeaves(s).some(x=>x.id===fusion.id),card=uiCard(fusion.name,on?'ACTIVE DOCTRINE FUSION':'EQUIP BOTH COMPONENTS',`${fusion.summary} ${fusion.effect}`);if(on)card.classList.add('active');card.append(uiElement('span','rpg-tag',`${LOST_TECH[fusion.a].name} + ${LOST_TECH[fusion.b].name}`));fusions.append(card);}pane.append(fusions);
 }else if(current==='timeline'){const timeline=s.temporal,era=ERAS[s.era];pane.append(uiSection('THE GREAT ENTANGLEMENT // THERE WAS NO END OF THE WORLD'));pane.append(uiCard(CHRONICLE.title,CHRONICLE.date,`${CHRONICLE.incident} ${CHRONICLE.law} ${CHRONICLE.principle}`));pane.append(uiSection(`YOU ARE IN ${era.name} // ${era.period} · ERA SURVEYS GIVE CHRONICLE INSIGHT`));const worlds=uiGrid();for(const id of ERA_ORDER){const data=ERAS[id],visited=timeline.visited.includes(id),cleared=WAR_CAMPAIGNS.some(c=>c.era===id&&timeline.wonCampaigns.includes(c.id)),card=uiCard(data.name,`${data.period} · ${visited?'VISITED':'UNCHARTED'} · ${data.doctrine} DOCTRINE`,`${data.blurb} The local power is ${data.faction}. ${cleared?'CAMPAIGN WON.':''}`);const actions=uiActions();actions.append(uiElement('span','rpg-tag',id===s.era?'CURRENT OPEN WORLD':visited?'USE AN ADVANCED RIFT TO RETURN':'FIND ITS ADVANCED RIFT NEAR YOUR CAMP'));card.append(actions);worlds.append(card);}pane.append(worlds);pane.append(uiSection(`CHRONICLE INSIGHT: ${timeline.insight} // PERMANENT CROSS-ERA DOCTRINE UPGRADES`));const upgrades=uiGrid();for(const [id,title,desc]of [['ancestor','AGELESS WARCRAFT','Every battalion, regardless of origin, gains +5% battle damage per rank.'],['engineer','UNIVERSAL LOGISTICS','Every era benefits: war income +7% and production completes 4% sooner per rank.'],['oracle','CHRONAL REASON','Every equipped war power cools 5% faster per rank, regardless of origin.']]){const rank=timeline.skill[id],cost=5+rank*5,card=uiCard(title,`RANK ${rank}/3 · ${cost} INSIGHT`,desc),buttons=uiActions();buttons.append(uiAction(rank>=3?'MAX RANK':`RESEARCH · ${cost} INSIGHT`,()=>{spendInsight(s,id);renderRpg();},rank>=3||timeline.insight<cost));card.append(buttons);upgrades.append(card);}pane.append(upgrades);pane.append(uiSection('CHRONICLE ENTRIES / THE WORLD REMEMBERS'));for(const entry of timeline.chronicleLog.slice(-9).reverse())pane.append(uiElement('p','rpg-summary',entry));
 }else if(current==='bounties'){
  pane.append(uiSection('THE RADIANT BOARD // ENDLESS CONTRACTS WITH SCALING REWARDS'));const b=r.bounty||generateBounty(s);const grid=uiGrid(),card=uiCard(b.name,`${b.status.toUpperCase()} · ${FACTIONS[b.faction].name}`,`Objective: ${b.goal.type.toUpperCase()} ${b.goal.target==='any'?'':b.goal.target.toUpperCase()} ×${b.goal.count}. Rewards: ${b.coins} crowns · ${b.xp} XP · faction standing.`);card.append(uiElement('span','rpg-tag',`${b.progress}/${b.goal.count} PROGRESS`));const actions=uiActions();if(b.status==='offered')actions.append(uiAction('ACCEPT BOUNTY',()=>{startBounty(s);renderRpg();}));if(b.status==='ready')actions.append(uiAction('CLAIM AND DRAW NEXT CONTRACT',()=>{if(claimBounty(s)){sound('notification');renderRpg();}else toast('RETURN TO THE NOTICE BOARD AT HOME','warning');}));if(b.status==='active')actions.append(uiElement('span','rpg-tag','IN PROGRESS · RETURN ON COMPLETION'));card.append(actions);grid.append(card);pane.append(grid);
 }else if(current==='homestead'){
  pane.append(uiSection('YOUR HOMESTEAD // BUILD SOMETHING THAT OUTLIVES YOU'));const buildings=s.buildings.filter(b=>b.zone==='frontier'),count={};for(const b of buildings)count[b.kind]=(count[b.kind]||0)+1;const grid=uiGrid();grid.append(uiCard('WARDEN HEARTH',`${buildings.length} STRUCTURES · ${s.squad.length} SOLDIERS`,Object.entries(count).map(([name,n])=>`${n} ${name.toUpperCase()}`).join(' · ')||'The settlement is waiting for its first defenses.'));const rest=uiCard('REST / WAIT','1–12 HOURS','Recover health, shields and stamina while the world clock moves forward. You must be at the home camp or near a shelter, out of combat.');const actions=uiActions();for(const h of [4,8,12])actions.append(uiAction(`SLEEP ${h}H`,()=>{if(sleepAtCamp(s,h)){renderRpg();sound('notification');}else toast('REST REQUIRES A SAFE CAMP OR NEARBY SHELTER','warning');}));rest.append(actions);grid.append(rest);pane.append(grid);
 }else if(current==='inventory'){
  pane.append(uiSection('YOUR EQUIPPED RELICS // GEAR MODIFIES REAL COMBAT STATS'));const equipped=uiGrid();for(const slot of ['armor','relic','mod']){const item=r.gear.find(g=>g.id===r.equipped[slot]);const card=uiCard(item?.name||`EMPTY ${slot.toUpperCase()} SLOT`,slot.toUpperCase(),item?Object.entries(item.stats).map(([k,v])=>`+${v} ${k}`).join('  ·  '):'Acquire gear from ruins, victory rewards and crafting.');equipped.append(card);}pane.append(equipped);
  pane.append(uiSection('TRAVEL PACK // GEAR AND SPOILS'));const summary=uiElement('div','rpg-compact');for(const [key,val]of Object.entries({SCRAP:s.inventory.scrap,ORE:s.inventory.ore,FIBER:s.inventory.fiber,FLUX:s.inventory.flux,MEDKITS:s.inventory.medkit,RATIONS:s.inventory.ration,WATER:s.inventory.water,GRENADES:p.grenades})){summary.append(uiElement('span','rpg-tag',`${key} ${Math.floor(val)}`));}pane.append(summary);
  const grid=uiGrid();for(const item of r.gear){const isEquipped=r.equipped[item.slot]===item.id;const card=uiCard(item.name,`${RARITIES[item.rarity].name} · LEVEL ${item.level} · ${item.slot.toUpperCase()}`,Object.entries(item.stats).map(([k,v])=>`+${v} ${k.toUpperCase()}`).join('  ·  '),item.rarity);const actions=uiActions();actions.append(uiAction(isEquipped?'EQUIPPED':'EQUIP',()=>{equipGear(s,item.id);renderRpg();},isEquipped));actions.append(uiAction('SALVAGE',()=>{salvageGear(s,item.id);renderRpg();},isEquipped));card.append(actions);grid.append(card);}if(!r.gear.length)addEmpty(pane,'Your journey begins with an empty pack. Explore the glowing wilderness landmarks, clear a dungeon, or forge a weapon mod.');pane.append(grid);
 }else if(current==='perks'){
  pane.append(uiSection(`UNSPENT POINTS: ${r.perkPoints} // LEVEL UP THROUGH BATTLES, DISCOVERY AND QUESTS`));for(const tree of ['WARFARE','SURVIVAL','MASTERY','COMMAND','ARCANA']){pane.append(uiSection(tree));const grid=uiGrid();for(const [id,perk]of Object.entries(PERKS)){if(perk.tree!==tree)continue;const rank=perkRank(s,id);const card=uiCard(perk.name,`RANK ${rank}/${perk.max}`,perk.description);const actions=uiActions();actions.append(uiAction(rank===perk.max?'MASTERED':`SPEND 1 POINT · RANK ${rank+1}`,()=>{buyPerk(s,id);renderRpg();},r.perkPoints<=0||rank>=perk.max));card.append(actions);grid.append(card);}pane.append(grid);}
 }else if(current==='journal'){
  pane.append(uiSection('OPEN THREADS // MEET THEIR GIVERS TO START OR TURN IN MISSIONS'));let grid=uiGrid();for(const q of QUESTS){const state=r.quests[q.id],locked=q.prerequisite&&r.quests[q.prerequisite]?.status!=='done',status=state?.status|| (locked?'LOCKED':'OFFERED');const npc=NPC_BY_ID[q.giver];const card=uiCard(q.name,`${status.toUpperCase()} · ${npc.name}`,q.description);if(r.tracked===q.id&&['active','ready'].includes(state?.status))card.classList.add('active');if(state){const progress=uiElement('div','rpg-quest-progress'),fill=uiElement('div');fill.style.width=`${100*(state.progress/q.goal.count)}%`;progress.append(fill);card.append(progress,uiElement('span','rpg-meta',`${state.progress}/${q.goal.count} ${q.goal.type.toUpperCase()} ${q.goal.target==='any'?'':q.goal.target}`));}
   const actions=uiActions();if(status==='active'||status==='ready')actions.append(uiAction(r.tracked===q.id?'TRACKING':'TRACK QUEST',()=>{r.tracked=q.id;renderRpg();},r.tracked===q.id));if(status==='ready')actions.append(uiElement('span','rpg-tag',`RETURN TO ${npc.name}`));if(status==='OFFERED')actions.append(uiElement('span','rpg-tag',`TALK TO ${npc.name}`));if(status==='done')actions.append(uiElement('span','rpg-tag','COMPLETED ✓'));card.append(actions);grid.append(card);}pane.append(grid);
 }else if(current==='craft'){
  pane.append(uiSection('FIELD FABRICATION // YOUR CHOICES SHAPE YOUR LOADOUT'));addEmpty(pane,'Harvest, scavenge and make useful equipment. Artificer perks reduce the material costs of all recipes. Gear outputs have a rarity roll and are persistent.');const grid=uiGrid();for(const [id,recipe]of Object.entries(RECIPES)){const cost=Object.entries(recipe.cost).map(([k,n])=>`${Math.ceil(n*rpgStat(s,'discount'))} ${k.toUpperCase()}`).join(' · ');const afford=Object.entries(recipe.cost).every(([k,n])=>(s.inventory[k]||0)>=Math.ceil(n*rpgStat(s,'discount')));const card=uiCard(recipe.name,`REQUIRES ${cost}`,recipe.description);const actions=uiActions();actions.append(uiAction('CRAFT RECIPE',()=>{craft(s,id);sound('build');renderRpg();},!afford));card.append(actions);grid.append(card);}pane.append(grid);
 }else if(current==='atlas'){
  pane.append(uiSection('DISCOVER THE WILDERNESS // KNOWN LOCATIONS ENABLE SAFE CARAVAN TRAVEL'));const map=uiElement('div','atlas-map');const w=map.appendChild(uiElement('span','atlas-key','THE FRONTIER · NORTH ↑ · SELECT A WAYPOINT'));const pin=(label,x,z,known,id)=>{const b=uiElement('button',`atlas-pin${known?'':' locked'}`,label);b.style.left=`${5+(x+140)/300*90}%`;b.style.top=`${5+(z+120)/265*90}%`;b.onclick=()=>{if(id){selectedPlace=id;renderRpg();}};map.append(b);};const atlasSites=s.era==='medieval'?LANDMARKS:eraSites(s.era);for(const l of atlasSites){const known=s.era==='medieval'?r.discovered.includes(l.id):s.temporal.worldCaches.includes(l.id);pin(known?l.name:'? UNCHARTED',l.x,l.z,known,l.id);}if(s.zone==='frontier')pin('YOU',p.x,p.z,true,null);pane.append(map);
  const grid=uiGrid();for(const loc of atlasSites){const known=s.era==='medieval'?r.discovered.includes(loc.id):s.temporal.worldCaches.includes(loc.id),chosen=selectedPlace===loc.id;const card=uiCard(known?loc.name:'UNKNOWN LOCATION',known?`${loc.kind.toUpperCase()} · ${Math.round(Math.hypot(loc.x-p.x,loc.z-p.z))}M AWAY`:'UNCHARTED',known?loc.description:'Explore the wilderness to discover this landmark.');if(chosen)card.classList.add('active');const actions=uiActions();if(known)actions.append(uiAction('CARAVAN FAST TRAVEL',()=>{if((s.era==='medieval'?fastTravel(s,loc.id):caravanEra(s,loc.id))){toggleRpg(null);sound('echo');}else toast('FAST TRAVEL BLOCKED / DANGER, SUPPLIES OR UNEXPLORED SITE','warning');},s.zone!=='frontier'));card.append(actions);grid.append(card);}pane.append(grid);
 }else if(current==='factions'){
  pane.append(uiSection(`YOUR ALLEGIANCE // ${r.allegiance?FACTIONS[r.allegiance].name:'UNSWORN'}`));pane.append(uiCard('LAW OF THE FRONTIER',`WANTED FINE ${r.crime.bounty} CROWNS · CAUGHT ${r.crime.caught} TIMES`,`Stolen ${r.crime.stolen} crowns. Sneaking can open pockets, but detection harms reputation. Pay the Marshal to settle your record. ${r.worldEnding?'The frontier now follows '+FACTIONS[r.worldEnding].name+'.':'Three rival futures wait beneath the vaults.'}`));addEmpty(pane,'Talk to faction leaders to swear an oath. Your standing changes through missions, dungeons, favors, and commitments.');const grid=uiGrid();for(const [id,faction]of Object.entries(FACTIONS)){const rep=r.factions[id],standing=rep>=60?'EXALTED':rep>=20?'ALLIED':rep<=-30?'HOSTILE':'NEUTRAL';grid.append(uiCard(faction.name,`${standing} · STANDING ${rep}`,faction.motto));}pane.append(grid);pane.append(uiSection('COMPANIONS // LOYALTY, NOT JUST FIREPOWER'));const companions=uiGrid();for(const npc of NPCS.filter(n=>n.companion)){const joined=r.companions.includes(npc.id),card=uiCard(npc.name,`${npc.role.toUpperCase()} · ${joined?'RECRUITED':'AVAILABLE IN WORLD'}`,npc.line);if(joined)card.append(uiElement('span','rpg-tag',`AFFINITY ${r.affinity[npc.id]||0}`));companions.append(card);}pane.append(companions);
 }else if(current==='codex'){
  pane.append(uiSection('THE UNWRITTEN WORLD // CROWNFOLD LORE'));const grid=uiGrid();for(const [title,tag,body]of [
   ['THE GREAT ENTANGLEMENT','HISTORY',CHRONICLE.incident],
   ['THE FOLD','ARCANE GEOMETRY','Rift-weavers learned to rotate pieces of the world. Soldiers learned to treat the ground like a chess piece.'],
   ['THE ECHO','CHRONAL MEMORY','Not quite time travel. A Fold remembers where you stood and briefly allows you to return to that version of yourself.'],
   ['THE THREE VAULTS','DUNGEONS','The Mirror Maw, Cathedral of Roots, and Drowned Archive each hold a key to an impossible future.'],
   ['THE WARDENS','FACTION','Disciplined survivors who believe safety is worth the cost of order.'],
   ['THE FREEFOLK','FACTION','Scavenger caravans who believe the frontier should never be owned.'],
   ['THE ARCHIVE','FACTION','Relic hunters trying to decode the memories trapped inside fractures.'],
   ['SAFECRACKING','FIELD GUIDE','Find glowing metal safes in the frontier. Press E to tune their dial. Each wrong guess costs one lockpick; heat hints help locate the sweet spot. Forge more picks in Crafting.'],
   ['THIEVERY & JUSTICE','FIELD GUIDE','Hold Ctrl to crouch when speaking to someone. You may try to pick a pocket once per person; detection generates a fine that Marshal Rhys can clear.'],
   ['SURVIVAL & CRAFT','FIELD GUIDE','H medkit · J rations · K water · E harvest · B build · I inventory · P perks · L quests · O world map.'],
   ['ACTIVE ARTS','FIELD GUIDE','4 Blink · 5 Gravity Nova · 6 Stasis Bloom · 7 Ghost Veil · 8 Wisp Swarm · 9 War Chant · X dodge · Q Fold · Z Echo.'],
   ['DUNGEON CRAWLING','FIELD GUIDE','Enter a dungeon portal. Clear foes guarding its two memory relays, activate both with E, defeat the guardian, loot the cache, return through a portal.']])grid.append(uiCard(title,tag,body));pane.append(grid);
 }
}
function openLock(id){const lock=LOCKBOXES.find(l=>l.id===id);if(!lock||s.zone!=='frontier'||!active)return;lockMenu=true;lockId=id;commander=false;input.commander=false;document.body.classList.remove('commanding');setVisibility('commander-panel',false);exitPointer();setVisibility('lock-overlay',true);$('lock-title').textContent=lock.name;$('lock-description').textContent=`CLASS ${lock.difficulty} CIPHER // ${lock.desc}`;$('lock-dial').value='50';$('lock-result').textContent='Tune the slider between 0 and 99; turn the key. Your lockpick breaks on each attempt. The dial reports HOT/WARM/COLD and HIGHER/LOWER.';updateLockLabel();}
function updateLockLabel(){$('lock-value').textContent=$('lock-dial').value;$('lock-picks').textContent=`${s.inventory.lockpicks||0} LOCKPICKS LEFT`;}
function closeLock(){lockMenu=false;lockId=null;setVisibility('lock-overlay',false);pointer();}
$('lock-dial').oninput=updateLockLabel;$('lock-close').onclick=closeLock;
$('lock-open').onclick=()=>{if(!lockMenu)return;const result=attemptLock(s,lockId,Number($('lock-dial').value));$('lock-result').textContent=result.text;updateLockLabel();if(result.opened){sound('notification');toast(result.text,'success');closeLock();safeSave();}else sound('hit');};
function openDialogue(id){if(!active||s.zone!=='frontier'||!NPC_BY_ID[id])return;dialogue=true;rpgMenu=false;commander=false;setVisibility('rpg-overlay',false);setVisibility('commander-panel',false);document.body.classList.remove('commanding','command-compact');input.commander=false;exitPointer();dialogueReply='';trading=false;s.rpg.dialogue=id;setVisibility('dialogue-overlay',true);renderDialogue();}
function closeDialogue(){dialogue=false;s.rpg.dialogue=null;setVisibility('dialogue-overlay',false);pointer();}
function renderDialogue(){if(!dialogue)return;const npc=NPC_BY_ID[s.rpg.dialogue];if(!npc){closeDialogue();return;}$('dialogue-name').textContent=npc.name;$('dialogue-role').textContent=`${npc.role.toUpperCase()} // ${FACTIONS[npc.faction].name}`;$('dialogue-line').textContent=dialogueReply||npc.line;$('dialogue-symbol').textContent=npc.faction==='archive'?'◇':npc.faction==='wardens'?'⌘':'✦';const choices=$('dialogue-choices');choices.textContent='';if(trading){for(const [id,g] of Object.entries(GOODS)){const price=Math.ceil(g.price*rpgStat(s,'prices')),b=uiElement('button','',`${g.name} / ${price} CROWNS`);b.disabled=s.rpg.coins<price;b.onclick=()=>{if(buyGood(s,id)){dialogueReply=`The ${g.name.toLowerCase()} is yours. Spend wisely.`;renderDialogue();}else toast('NOT ENOUGH CROWNS','warning');};choices.append(b);}choices.append(uiAction('← BACK TO TALKING',()=>{trading=false;dialogueReply='';renderDialogue();}));return;}
 for(const option of dialogueOptions(s,npc.id)){const b=uiElement('button','',option.text);b.onclick=()=>{const response=dialogueChoice(s,npc.id,option.id);if(response.leave){closeDialogue();return;}dialogueReply=response.text;if(response.trade)trading=true;if(response.ok){sound('notification');}else sound('hit');renderDialogue();};choices.append(b);}
}
function refreshAbilities(){const strip=$('ability-strip');if(!active)return;const now=Object.keys(ABILITIES).map(id=>[id,ABILITIES[id],s.rpg.abilityCooldowns[id]||0]);if(strip.childElementCount!==now.length){strip.textContent='';for(const [id,ability] of now){const b=uiElement('button','ability-slot');b.dataset.ability=id;const k=uiElement('kbd','',ability.key),label=uiElement('b','',ability.name.split(' ').at(-1)),status=uiElement('span');b.append(k,label,status);b.title=ability.description;b.onclick=()=>{if(castAbility(s,id))sound('fold');else toast('ART UNAVAILABLE / FLUX OR COOLDOWN','warning');refreshAbilities();};strip.append(b);}}
 for(const [id,a,cool] of now){const b=strip.querySelector(`[data-ability="${id}"]`);if(!b)continue;const cost=Math.ceil(a.flux*rpgStat(s,'fluxCosts'));b.disabled=cool>0||s.inventory.flux<cost;b.classList.toggle('ready',!b.disabled);b.lastElementChild.textContent=cool>0?`${Math.ceil(cool)}s`:cost+' FLUX';}}

function keyFor(ev){return ev.code||ev.key;}
window.addEventListener('keydown',e=>{
 if(settingsDialog.open||arsenalDialog.open||!active)return;
 const key=keyFor(e);
 if(paused){if(key==='Escape'&&!e.repeat)togglePause(false);return;}
 if(['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyB','KeyM'].includes(key))e.preventDefault();
 keys.add(key);if(e.repeat)return;
 if(key==='Escape'){if(lockMenu)closeLock();else if(dialogue)closeDialogue();else if(rpgMenu)toggleRpg(null);else if(help)toggleHelp(false);else if(buildMenu)toggleBuild(false);else if(commander)toggleCommander();else if(mapExpanded){mapExpanded=false;document.body.classList.remove('map-expanded');pointer();}else togglePause();return;}
 if(paused||help||buildMenu||dialogue||lockMenu)return;
 if(['KeyI','KeyP','KeyL','KeyO','KeyU','KeyY'].includes(key)){toggleRpg(({KeyI:'inventory',KeyP:'perks',KeyL:'journal',KeyO:'atlas',KeyU:'homestead',KeyY:'weave'})[key]);return;}
 if(rpgMenu)return;
 if(key==='KeyT'){selectEpoch(s);sound('fold');refresh(true);return;}if(key==='KeyC'){toggleRpg('timeline');return;}
 if(key==='KeyX'){if(dodge(s))sound('echo');else toast('DODGE REQUIRES STAMINA / READY COOLDOWN','warning');return;}
 if(/^Digit[4-9]$/.test(key)&&!commander){const id=Object.keys(ABILITIES).find(id=>ABILITIES[id].key===key.slice(-1));if(castAbility(s,id))sound('fold');else toast('ART UNAVAILABLE / FLUX OR COOLDOWN','warning');return;}
 if(key==='Backquote'&&!commander){openArsenal();return;}
 if(key==='Tab'){toggleCommander();return;}if(key==='Backquote'&&commander){setCommanderCompact(!commanderCompact);return;}
 if(commander&&s.war&&/^Digit[1-5]$/.test(key)&&(e.ctrlKey||e.altKey)){const n=Number(key.slice(-1)),ok=e.ctrlKey?setWarControlGroup(s,n):recallWarControlGroup(s,n);if(ok){toast(e.ctrlKey?`GROUP ${n} STORED`:`GROUP ${n} SELECTED`,'command');refreshWarCommands();}else toast('CONTROL GROUP EMPTY','warning');return;}
 if(key==='KeyB'){toggleBuild();return;}
 if(key==='KeyM'){mapExpanded=!mapExpanded;document.body.classList.toggle('map-expanded',mapExpanded);if(mapExpanded)exitPointer();else pointer();return;}
 if(key==='KeyE'){const before=s.zone,oldEra=s.era;if(interact(s)){sound('notification');if(s.rpg.dialogue)openDialogue(s.rpg.dialogue);else if(s.rpg.boardOpen){s.rpg.boardOpen=false;toggleRpg('bounties');}else if(s.rpg.lockUI){const id=s.rpg.lockUI;s.rpg.lockUI=null;openLock(id);}if(before!==s.zone||oldEra!==s.era){zoneBefore=s.zone;eraBefore=s.era;renderer.terrainOrigin='';renderer.propsKey='';safeSave();}}return;}
 if(key==='KeyQ'){if(fold(s))sound('fold');else toast('FOLD UNAVAILABLE / 35 FLUX OR COOLDOWN','warning');return;}
 if(key==='KeyZ'){if(echo(s))sound('echo');else toast('ECHO UNAVAILABLE / NEED MEMORY & 28 FLUX','warning');return;}
 if(key==='KeyG'){if(grenade(s))tone(700,.12,'triangle',.075,200);return;}
 if(key==='KeyF'){if(orbital(s))sound('explosion');else toast('SKYBREAKER NEEDS 45 FLUX / READY COOLDOWN','warning');return;}
 if(key==='KeyV'){if(resupply(s))sound('build');else toast('SKYHOOK NEEDS 18 SCRAP / READY COOLDOWN','warning');return;}
 if(key==='KeyR'){reload(s);return;}
 if(key==='KeyH'){if(useConsumable(s,'medkit'))sound('notification');return;}
 if(key==='KeyJ'){useConsumable(s,'ration');return;}
 if(key==='KeyK'){useConsumable(s,'water');return;}
 if(key==='KeyN'){if(recruit(s))sound('build');else toast('RECRUITMENT REQUIRES 22 SCRAP / 8 UNIT LIMIT','warning');return;}
 if(key==='Digit1'){if(commander)selectOrder('move');else setWeapon(s,'rifle');return;}
 if(key==='Digit2'){if(commander)selectOrder('assault');else setWeapon(s,'scatter');return;}
 if(key==='Digit3'){if(commander)selectOrder('defend');else setWeapon(s,'rail');return;}
 if(key==='Digit4'&&commander){issueOrder(s,'follow',s.player.x,s.player.z);return;}
});
window.addEventListener('keyup',e=>{keys.delete(keyFor(e));});
window.addEventListener('blur',()=>{keys.clear();input.fire=false;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{if(arsenalDialog.open||!active||paused||help||buildMenu||rpgMenu||dialogue||lockMenu)return;
  if(commander){
   if(e.button===2){const rect=canvas.getBoundingClientRect(),p=renderer.screenToGround(e.clientX-rect.left,e.clientY-rect.top,s);if(p){issueOrder(s,'move',p.x,p.z);sound('notification');}return;}
   if(e.button===0){commanderDrag={startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,shift:e.shiftKey};return;}
   return;
  }
  if(e.button===0){input.fire=true;pointer();}if(e.button===2){input.aim=true;document.body.classList.add('aiming');pointer();}
});
canvas.addEventListener('pointermove',e=>{if(!commander||!commanderDrag||!active)return;
 commanderDrag.x=e.clientX;commanderDrag.y=e.clientY;const d=commanderDrag;
 const dragged=Math.hypot(d.x-d.startX,d.y-d.startY)>9;
 selectBox.classList.toggle('hidden',!dragged);
 if(dragged){selectBox.style.left=Math.min(d.startX,d.x)+'px';selectBox.style.top=Math.min(d.startY,d.y)+'px';selectBox.style.width=Math.abs(d.x-d.startX)+'px';selectBox.style.height=Math.abs(d.y-d.startY)+'px';}
});
canvas.addEventListener('pointerup',e=>{if(!commander||!commanderDrag||e.button!==0)return;
 const d=commanderDrag;commanderDrag=null;selectBox.classList.add('hidden');const rect=canvas.getBoundingClientRect();
 const ground=(x,y)=>renderer.screenToGround(x-rect.left,y-rect.top,s);
 if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>9){
  const a=ground(d.startX,d.startY),b=ground(e.clientX,e.clientY);
  if(a&&b){const minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),minZ=Math.min(a.z,b.z),maxZ=Math.max(a.z,b.z);
   const ids=s.war?.army.filter(g=>g.count>0&&g.x>=minX&&g.x<=maxX&&g.z>=minZ&&g.z<=maxZ).map(g=>g.id)||[];
   if(ids.length){selectWarBattalions(s,ids,d.shift);refreshWarCommands();sound('notification');}else toast('NO FRIENDLY BATTALIONS IN SELECTION','warning');}
  return;
 }
 const p=ground(e.clientX,e.clientY);if(!p)return;
 const selected=s.war?.army.filter(g=>g.count>0).map(g=>({g,d:Math.hypot(g.x-p.x,g.z-p.z)})).filter(q=>q.d<8).sort((a,b)=>a.d-b.d)[0];
 if(selected){selectWarBattalions(s,[selected.g.id],d.shift);refreshWarCommands();sound('notification');}
 else{issueOrder(s,order,p.x,p.z);sound('notification');}
});
canvas.addEventListener('pointerup',e=>{if(e.button===0)input.fire=false;if(e.button===2){input.aim=false;document.body.classList.remove('aiming');}});
window.addEventListener('pointerup',()=>{input.fire=false;});
window.addEventListener('mousemove',e=>{
 if(arsenalDialog.open||!active||paused||commander||help||buildMenu||rpgMenu||dialogue||lockMenu)return;
 if(document.pointerLockElement===canvas||e.buttons&2){const delta=aimDelta(e.movementX,e.movementY,settings);input.yaw+=delta.yaw;input.pitch=clamp(input.pitch+delta.pitch,-.92,.53);}
});
canvas.addEventListener('wheel',e=>{if(arsenalDialog.open)return;if(commander){e.preventDefault();renderer.tactical.zoom=clamp(renderer.tactical.zoom+(e.deltaY>0?10:-10),45,132);return;}if(active&&!paused&&!rpgMenu&&!dialogue&&!lockMenu&&!help&&!buildMenu){e.preventDefault();const all=Object.keys(WEAPONS),idx=all.indexOf(s.player.weapon);setWeapon(s,all[(idx+(e.deltaY>0?1:all.length-1))%all.length]);sound('notification');}},{passive:false});
function updateInput(){input.x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);input.z=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);input.jump=keys.has('Space');input.sprint=keys.has('ShiftLeft')||keys.has('ShiftRight');input.crouch=keys.has('ControlLeft')||keys.has('ControlRight');input.commander=commander; if(active)s.player.pitch=input.pitch;}
function markerBounds(){
 const w=window.innerWidth,h=window.innerHeight,half=Math.min(240,w*.56)/2+16;
 const visibleRect=selector=>{const element=document.querySelector(selector);return element?.getClientRects().length?element.getBoundingClientRect():null;};
 const leftPanel=visibleRect('.left-panel'),rightPanel=visibleRect('.right-panel'),header=visibleRect('.topbar');
 let left=leftPanel?leftPanel.right+half:half,right=rightPanel?rightPanel.left-half:w-half;
 if(right-left<80){left=half;right=w-half;}
 const top=Math.min(h*.3,(header?.bottom||70)+55);
 let bottom=h-65;for(const selector of ['#ability-strip','.bottom-hud']){const rect=visibleRect(selector);if(rect)bottom=Math.min(bottom,rect.top-55);}
 bottom=Math.max(top+40,bottom);
 return {left,right,top,bottom:Math.min(h-45,bottom)};
}
function refresh(force=false){if(!renderer||!active)return;
 const p=s.player,op=s.operation,o=op?.objectives[op.stage],warGoal=s.war?warObjective(s.war):null,frontier=frontierGuidance(s);
 const set=(id,v)=>{const el=$(id);if(el&&el.textContent!==String(v))el.textContent=String(v);};const progress=(id,v)=>{$(id).style.width=`${clamp(v,0,1)*100}%`;};
 set('level',`LEVEL ${String(p.level).padStart(2,'0')} · ${s.rpg.perkPoints} PERKS`);set('hp-text',`${Math.ceil(p.hp)} / ${p.maxHp}`);progress('hp-bar',p.hp/p.maxHp);
 set('shield-text',`${Math.ceil(p.shield)} / ${p.maxShield}`);progress('shield-bar',p.shield/p.maxShield);set('stamina-text',Math.ceil(p.stamina));progress('stamina-bar',p.stamina/100);
 set('hunger',`${Math.ceil(p.hunger)}%`);progress('hunger-bar',p.hunger/100);set('thirst',`${Math.ceil(p.thirst)}%`);progress('thirst-bar',p.thirst/100);
 for(const name of ['scrap','ore','fiber','flux'])set(name,Math.floor(s.inventory[name]));set('medkits',s.inventory.medkit);set('rations',s.inventory.ration);set('water-count',s.inventory.water);
 set('zone-label',op?`${ERAS[s.era].name} / ${op.kind==='war'?'ERA WAR':'OPERATION'}`:s.dungeon?`${s.dungeon.name.toUpperCase()} / DUNGEON`:`${ERAS[s.era].name} / FREE ROAM`);set('player-era',ERAS[s.era].period);set('fold-target-name',ERAS[s.temporal.selectedEra].name);set('world-clock',`DAY ${String(Math.floor(s.time/2400)+1).padStart(3,'0')} · ${String(Math.floor(s.dayTime/3600)).padStart(2,'0')}:${String(Math.floor(s.dayTime%3600/60)).padStart(2,'0')}`);
 if(op&&o){set('directive-label','OPERATION DIRECTIVE');set('objective-phase',op.kind==='war'?`ACT ${['foothold','anchors','throne','extraction'].indexOf(s.war.act)+1}/4 · ${CONTRACTS[op.contract].region.toUpperCase()}`:`PHASE ${String(op.stage+1).padStart(2,'0')} / 06 · ${CONTRACTS[op.contract].region.toUpperCase()}`);set('objective-name',warGoal?warGoal.name:o.name);set('objective-description',warGoal?`${warGoal.description}${s.war.expedition?' / OPTIONAL SIDE CRISIS: '+warSummary(s.war).expedition.name:''}`:o.description);
  set('objective-distance',warGoal?`${warGoal.detail} · ${Math.round(dist(p,warGoal))}M` :`${Math.round(dist(p,o))} M TO TARGET · ${Math.round(o.progress)}/${o.target}`);set('mission-time',fmtTime(op.timeLeft));progress('objective-progress-bar',warGoal?warGoal.progress/Math.max(1,warGoal.target):o.progress/o.target);
 }else if(s.dungeon){const d=s.dungeon,stage=d.bossDead?(d.looted?'COMPLETE':'CLAIM THE RELIC'):d.sigils.every(Boolean)?'SLAY THE GUARDIAN':'ACTIVATE THE TWO RELAYS';set('directive-label','DUNGEON QUEST');set('objective-phase',`DEEP VAULT / ${DUNGEON_BY_ID[d.id].name}`);set('objective-name',stage);set('objective-description',DUNGEON_BY_ID[d.id].subtitle);set('objective-distance',`${d.sigils.filter(Boolean).length}/2 RELAYS · ${d.bossDead?'BOSS DOWN':'GUARDIAN SEALED'}`);set('mission-time','NO TIME LIMIT');progress('objective-progress-bar',(d.sigils.filter(Boolean).length+(d.bossDead?1:0)+(d.looted?1:0))/4);
 }else{const quest=guidanceQuest(s),qState=quest&&s.rpg.quests[quest.id];set('directive-label',`${ERAS[s.era].period} / SURVIVAL`);set('objective-phase',quest?(qState.status==='ready'?'RETURN TO · ':'ACTIVE QUEST · ')+NPC_BY_ID[quest.giver].name:'00 // FRONTIER · NO TIME LIMIT');set('objective-name',quest?quest.name:s.rpg.bounty?.status==='active'?s.rpg.bounty.name:'HISTORY BELONGS TO THE BOLD');set('objective-description',quest?`${quest.description} ${frontier?.hint||''}`:s.rpg.bounty?.status==='active'?'Radiant bounty: '+s.rpg.bounty.goal.type+' '+s.rpg.bounty.goal.target+' ×'+s.rpg.bounty.goal.count:(frontier?.hint||'Speak to settlers, enter ancient vaults, forge equipment, discover landmarks and command your troops. Press L for quests.'));set('objective-distance',quest?(qState.status==='ready'?'READY TO CLAIM REWARD':`${qState.progress}/${quest.goal.count} ${quest.goal.type.toUpperCase()}`):s.rpg.bounty?.status==='active'?`${s.rpg.bounty.progress}/${s.rpg.bounty.goal.count} BOUNTY`:`${s.rpg.discovered.length}/${LANDMARKS.length} PLACES FOUND`);set('mission-time',quest?(qState.status==='ready'?'QUEST READY':'QUEST TRACKED'):s.rpg.bounty?.status==='active'?'BOUNTY ACTIVE':'FREE ROAM');progress('objective-progress-bar',quest?qState.progress/quest.goal.count:0);}
 const w=WEAPONS[p.weapon];set('weapon-name',w.name);set('weapon-type',({rifle:'ASSAULT RIFLE',scatter:'BREACH SHOTGUN',rail:'ARC MARKSMAN',smg:'AUTOMATIC SMG',cryo:'CRYO CASTER',launcher:'HEAVY LAUNCHER'})[p.weapon]);set('ammo',p.ammo[p.weapon]);set('reserve',p.reserve[p.weapon]);set('reload-status',p.reload>0?`RELOADING · ${p.reload.toFixed(1)}s`:p.ammo[p.weapon]===0?(p.reserve[p.weapon]>0?'EMPTY · R TO RELOAD':'OUT OF AMMO · SWITCH WEAPON'):p.ammo[p.weapon]<=Math.ceil(w.mag*.2)?'LOW AMMO · R TO RELOAD':'1–3 CORE · WHEEL ALL SIX');
 setVisibility('reload-meter',p.reload>0);$('reload-meter').value=reloadProgress(p);$('reload-meter').setAttribute('aria-valuetext',p.reload>0?`${p.reload.toFixed(1)} seconds remaining`:'Reload complete');$('ammo').classList.toggle('ammo-low',p.ammo[p.weapon]<=Math.ceil(w.mag*.2));$('arsenal-button').disabled=commander;refreshAbilities();set('grenade-count',`×${p.grenades.toString().padStart(2,'0')}`);
 set('orbital-status',p.orbitalCooldown>0?`${Math.ceil(p.orbitalCooldown)}s COOLDOWN`:'45 FLUX');set('resupply-status',p.resupplyCooldown>0?`${Math.ceil(p.resupplyCooldown)}s COOLDOWN`:'18 SCRAP');setVisibility('abort-operation',s.zone==='operation');
 set('fold-status',p.foldCooldown>0?`${Math.ceil(p.foldCooldown)}s COOLDOWN`:'35 FLUX');set('echo-status',p.echoCooldown>0?`${Math.ceil(p.echoCooldown)}s COOLDOWN`:'28 FLUX');
 const indicators=$('ammo-indicators');if(force||indicators.childElementCount!==w.mag){indicators.textContent='';for(let i=0;i<w.mag;i++){const a=document.createElement('i');indicators.append(a);}}for(let i=0;i<indicators.childElementCount;i++)indicators.children[i].classList.toggle('empty',i>=p.ammo[p.weapon]);
 set('squad-total',s.war?`${s.war.army.reduce((n,b)=>n+b.count,0)} ARMY + ${s.squad.length} GUARD`:`${String(s.squad.length).padStart(2,'0')} TROOPS`);if(s.war)refreshWarCommands();const squad=$('squad-list');squad.textContent='';for(const u of s.squad.slice(0,8)){
  const el=document.createElement('div');el.className='squad-row';const icon=document.createElement('div');icon.className='squad-avatar';icon.textContent=u.role==='MEDIC'?'✚':u.role==='HEAVY'?'⬢':'◈';const content=document.createElement('div');content.className='squad-text';const b=document.createElement('strong');b.textContent=`${u.role} / ${String(u.id).padStart(2,'0')}`;const label=document.createElement('span');label.textContent=u.order.toUpperCase();content.append(b,label);const bar=document.createElement('div');bar.className='squad-health';const fill=document.createElement('div');fill.style.width=`${100*clamp(u.hp/u.maxHp,0,1)}%`;bar.append(fill);el.append(icon,content,bar);squad.append(el);
 }
 const near=nearestInteraction(s);setVisibility('interaction',!!near&&!commander);if(near)set('interaction-title',near.label);
 const sortieGoal=trackedWarSortie&&trackedWarSortie===s.war?.expedition?trackedWarSortie:null;
 const goal=sortieGoal||warGoal||(op?o:s.dungeon?(s.dungeon.looted?{x:-12,z:6}:!s.dungeon.sigils[0]?{x:-11,z:-43}:!s.dungeon.sigils[1]?{x:12,z:-83}:s.dungeon.bossDead?{x:7,z:-137}:{x:0,z:-129}):frontier?.goal);
 setVisibility('objective-marker',!!goal);
 if(goal){const y=terrainHeight(goal.x,goal.z,s.seed,s.zone)+10,project=renderer.project([goal.x,y,goal.z]);const marker=$('objective-marker'),placement=markerPlacement(p,goal,project,window.innerWidth,window.innerHeight,markerBounds());
  set('marker-title',sortieGoal?`OPTIONAL / ${warSummary(s.war).expedition.name}`:warGoal?warGoal.name:op?'OPERATION TARGET':s.dungeon?'VAULT OBJECTIVE':goal.title);
  set('marker-icon',placement.icon);set('marker-distance',`${Math.round(dist(p,goal))}m${placement.direction?' · '+placement.direction:''}`);
  marker.classList.toggle('offscreen',placement.offscreen);marker.style.left=`${placement.x}px`;marker.style.top=`${placement.y}px`;
 }
 set('coord-label',`${Math.round(p.x)} / ${Math.round(p.z)}`);set('map-label',op?op.kind==='war'?'TIME WAR · RTS':`WARFRONT · ${op.stage+1}/6`:s.dungeon?'DUNGEON · DEPTH 01':`${ERAS[s.era].name} · OPEN`);
 set('compass', ['N','NE','E','SE','S','SW','W','NW'][Math.round(((p.yaw%(Math.PI*2)+Math.PI*2)%(Math.PI*2))/(Math.PI/4))%8]+'   ·   CROWNFOLD   ·   '+(op?'RIFT WARFRONT':s.dungeon?'LOST DUNGEON':'WILD FRONTIER'));
 if(rpgMenu||dialogue||lockMenu)return;if(p.hp<healthBefore-2){document.body.classList.add('damaged');setTimeout(()=>document.body.classList.remove('damaged'),150);}healthBefore=p.hp;
 if(p.shots>shotBefore){$('crosshair').classList.add('fire');setTimeout(()=>$('crosshair').classList.remove('fire'),80);sound('shoot');shotBefore=p.shots;}
 if((p.weakHits||0)>weakBefore){$('crosshair').classList.add('precision');setTimeout(()=>$('crosshair').classList.remove('precision'),240);tone(1020,.11,'triangle',.07,520);weakBefore=p.weakHits;}
 for(const m of s.messages)if(m.id>lastNotice){toast(m.text,m.type);if(m.type==='success'||m.type==='command')sound('notification');lastNotice=m.id;}
 if(zoneBefore!==s.zone){if(s.zone==='frontier'){const saved=safeSave();toast(saved?'EXTRACTED TO SURVIVAL / PROGRESS SAVED':'EXTRACTED · SAVE FAILED · KEEP GAME OPEN',saved?'success':'warning');}zoneBefore=s.zone;}
}
function drawMinimap(){const c=$('minimap'),ctx=c.getContext('2d'),p=s.player,w=c.width,h=c.height,range=110,px=x=>w/2+(x-p.x)*w/(range*2),py=z=>h/2+(z-p.z)*h/(range*2);
  ctx.fillStyle='#0a2028';ctx.fillRect(0,0,w,h);
  for(let zi=0;zi<26;zi++)for(let xi=0;xi<26;xi++){const x=p.x-range+(xi+.5)*range*2/26,z=p.z-range+(zi+.5)*range*2/26,b=biomeAt(x,z,s.seed,s.zone),y=terrainHeight(x,z,s.seed,s.zone),a=clamp((y+10)/35,0,1);ctx.fillStyle=s.zone==='operation'?`rgb(${Math.round(25+a*25)},${Math.round(32+a*9)},${Math.round(46+a*12)})`:b==='wastes'?`rgb(${Math.round(56+a*22)},${Math.round(57+a*22)},${Math.round(48+a*20)})`:b==='marsh'?'#1e4047':b==='bloom'?'#1a5344':'#213e43';ctx.fillRect(xi*w/26,zi*h/26,w/26+1,h/26+1);}
  ctx.strokeStyle='#7adab220';ctx.lineWidth=1;for(let i=0;i<=10;i++){const n=i*w/10;ctx.beginPath();ctx.moveTo(n,0);ctx.lineTo(n,h);ctx.moveTo(0,n);ctx.lineTo(w,n);ctx.stroke();}
  const mark=(x,z,color,r=4,shape='dot')=>{if(Math.abs(x-p.x)>range||Math.abs(z-p.z)>range)return;ctx.fillStyle=color;ctx.strokeStyle=color;ctx.beginPath();if(shape==='ring'){ctx.arc(px(x),py(z),r,0,Math.PI*2);ctx.lineWidth=2;ctx.stroke();}else if(shape==='square'){ctx.fillRect(px(x)-r,py(z)-r,r*2,r*2);}else{ctx.arc(px(x),py(z),r,0,Math.PI*2);ctx.fill();}};
  if(s.zone==='frontier'){for(const lock of (s.era==='medieval'?LOCKBOXES:[]))if(!s.rpg.opened.includes('lock:'+lock.id))mark(lock.x,lock.z,'#f5ad65',4,'square');mark(3,14,'#f2cb85',5,'square');for(const gate of worldGates(s))mark(gate.x,gate.z,'#ae8bf5',5,'ring');for(const gate of availableRifts(s.era))mark(gate.x,gate.z,ERAS[gate.era].accent,6,'ring');for(const l of (s.era==='medieval'?LANDMARKS:[]))if(s.rpg.discovered.includes(l.id))mark(l.x,l.z,l.kind==='dungeon'?'#cf9cff':l.kind==='cache'?'#efc278':'#98e7cc',l.kind==='dungeon'?6:4,'ring');for(const npc of (s.era==='medieval'?NPCS:[]))if(!s.rpg.companions.includes(npc.id))mark(npc.x,npc.z,'#e8efe5',2);}if(s.dungeon){for(const [i,point]of [{x:-11,z:-43},{x:12,z:-83}].entries())mark(point.x,point.z,s.dungeon.sigils[i]?'#69ffcb':'#e4aaff',5,'ring');mark(0,-129,'#ff8a92',7,'ring');mark(-12,6,'#f0cb8c',5,'ring');mark(7,-137,'#eac485',5,'square');}
  if(s.operation){for(const o of [s.operation.objectives[s.operation.stage]])mark(o.x,o.z,'#ffd18b',6,'ring');for(const n of s.operation.pylons)mark(n.x,n.z,n.active?'#8cffe2':'#d4bb76',4,'square');}
  if(s.war){for(const b of s.war.army)mark(b.x,b.z,'#4af6c2',4,'square');for(const b of s.war.enemyArmy)mark(b.x,b.z,'#f77883',4,'square');for(const node of s.war.nodes)mark(node.x,node.z,node.owner==='ally'?'#55e5bf':'#ffcd87',6,'ring');for(const shield of s.war.anchors)if(shield.hp>0)mark(shield.x,shield.z,'#de80f3',6,'square');mark(s.war.base.x,s.war.base.z,'#55e5bf',8,'square');mark(s.war.enemyBase.x,s.war.enemyBase.z,'#f77883',8,'square');if(s.war.expedition)mark(s.war.expedition.x,s.war.expedition.z,'#ffdb88',8,'ring');if(s.war.act==='extraction')mark(s.war.extraction.x,s.war.extraction.z,'#ffd28a',9,'ring');for(const drop of s.war.supportDrops)mark(drop.x,drop.z,drop.id==='epoch_lance'?'#fc8b94':'#9affcc',7,'ring');}for(const b of s.buildings)if(b.zone===s.zone&&(s.zone!=='frontier'||(b.era||'medieval')===s.era))mark(b.x,b.z,'#a5ddc2',4,'square');for(const enemy of s.enemies)if(enemy.hp>0)mark(enemy.x,enemy.z,'#f77883',enemy.kind==='titan'?7:3);for(const u of s.squad)mark(u.x,u.z,'#5fecdc',4);
  const guide=frontierGuidance(s)?.goal;if(guide)mark(guide.x,guide.z,'#ffe5a2',9,'ring');
  mark(p.x,p.z,'#fff8e0',6);
  ctx.save();ctx.translate(w/2,h/2);ctx.rotate(p.yaw);ctx.fillStyle='#f2e8d7';ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(-4,-2);ctx.lineTo(4,-2);ctx.closePath();ctx.fill();ctx.restore();
  ctx.strokeStyle='#9fb8a0';ctx.strokeRect(.5,.5,w-1,h-1);
}
function frame(now){const dt=Math.min(.06,(now-last)/1000||.016);last=now;
 if(active&&!arsenalDialog.open&&commander&&!paused&&!rpgMenu&&!help&&!dialogue&&!lockMenu&&!buildMenu){
  const view=renderer.tactical,pan=(keys.has('ShiftLeft')?100:65)*dt;
  view.x=clamp(view.x+((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0))*pan,-175,175);
  view.z=clamp(view.z+((keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0))*pan,-212,85);
 }

 if(renderer){if(active&&!arsenalDialog.open&&!paused&&!buildMenu&&!help&&!mapExpanded&&!rpgMenu&&!dialogue&&!lockMenu){updateInput();bank+=dt;let loops=0;while(bank>=1/30&&loops++<4){stepGame(s,input,1/30);bank-=1/30;}if(loops>=4)bank=0;}
   try{renderer.drawScene(s,{commander:active&&commander,move:input.x||input.z});}catch(err){console.error(err);$('error').textContent=`RENDER ERROR: ${err.message}`;$('error').classList.remove('hidden');}
 }
 if(active&&now-lastUi>140){lastUi=now;refresh();}
 if(active&&now-lastMini>350){lastMini=now;drawMinimap();}
 if(active&&(s.zone==='frontier'||s.war)&&now-lastAutoSave>30000){if(!safeSave())toast('AUTOSAVE FAILED · PREVIOUS SAVE KEPT','warning');lastAutoSave=now;}
 for(const item of [...noteEls])if(now-item.at>4600){item.item.remove();noteEls.splice(noteEls.indexOf(item),1);}
 requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&(s.zone==='frontier'||s.war))safeSave();});
window.addEventListener('beforeunload',()=>{if(active&&(s.zone==='frontier'||s.war))safeSave();});
// Test/dev inspector: read-only game objects and deterministic module methods, no account data.
Object.defineProperty(window,'__riftfront',{get:()=>({tactics:tacticalRuntime(),objectives:objectiveRuntime(),state:s,renderer,active,paused,commander,rpgMenu,dialogue,settings:{...settings},audioStatus:{state:audio?.state??'not-started',gain:masterGain?.gain.value??0},sim:{stepGame,enterOperation,finishOperation,issueOrder,fold,echo,addBuilding,castAbility,dodge,serialize,restore},ui:{toggleRpg,openDialogue,renderRpg},guidance:frontierGuidance(s)})});
requestAnimationFrame(frame);
