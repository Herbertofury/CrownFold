"""Real save controls and reload, served/offline/fallback. Setup shortcuts put a
siege in Act II; this is not a full unassisted campaign or hardware GPU test."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
checks={};errors=[]
KEY='crownfold-riftfront-quick-save-v1'
URL=os.environ.get('CROWNFOLD_URL','http://127.0.0.1:3040/')
with sync_playwright() as pw:
 options={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--disable-webgl']}
 if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
 browser=pw.chromium.launch(**options)
 for label,url in [('served',URL),('offline',(ROOT/'dist/CROWNFOLD-RIFTFRONT.html').as_uri()),('fallback',URL)]:
  context=browser.new_context(viewport={'width':1440,'height':1000})
  if label=='fallback':context.add_init_script('globalThis.WebAssembly=undefined')
  page=context.new_page();page.set_default_timeout(10000)
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(url);page.wait_for_function('window.__riftfront?.renderer')
  checks[label+'_runtime']=page.evaluate('window.__riftfront.objectives.backend')==('javascript' if label=='fallback' else 'rust-wasm')
  page.evaluate("localStorage.setItem('crownfold-player-settings-v1',JSON.stringify({sensitivity:1.7,soundEnabled:false}))")
  page.locator('#quick-war').click();page.wait_for_function('window.__riftfront.state.war')
  page.evaluate('''()=>{const s=window.__riftfront.state,w=s.war;
   w.act='anchors';w.footholdHold=24;w.nodes[0].owner='ally';w.nodes[1].owner='ally';
   w.cover[0].hp=17;w.enemyArmy=[];w.enemyWaveTimer=1e9;
   w.bellSiege.outcomes.ledger='success';s.temporal.insight=4;
   s.rpg.abilityCooldowns.drone=31;s.player.orbitalCooldown=43;
   document.exitPointerLock();
  }''')
  page.wait_for_timeout(100);page.locator('#pause-button').click();page.wait_for_function('window.__riftfront.paused')
  page.locator('#save-button').click()
  checks[label+'_save_feedback']='WAR CHECKPOINT SAVED' in page.locator('#notifications').inner_text()
  saved=page.evaluate(f'localStorage.getItem({json.dumps(KEY)})')
  payload=json.loads(json.loads(saved)['warCheckpoint']['payload'])
  page.locator('#back-menu').click();page.wait_for_function('!window.__riftfront.active')
  checks[label+'_resume_label']='RESUME QUICK WAR' in page.locator('#continue-quick').inner_text()
  page.screenshot(path=str(OUT/f'checkpoint-{label}-title.png'))
  page.reload();page.wait_for_function('window.__riftfront?.renderer')
  page.locator('#continue-quick').click();page.wait_for_function('window.__riftfront.state.war')
  actual=page.evaluate('''()=>{const s=window.__riftfront.state,w=s.war;return {act:w.act,cover:w.cover[0].hp,
   ledger:w.bellSiege.outcomes.ledger,insight:s.temporal.insight,time:s.time,timeLeft:s.operation.timeLeft,
   drone:s.rpg.abilityCooldowns.drone,orbital:s.player.orbitalCooldown,ids:w.army.map(g=>g.id)};}''')
  checks[label+'_actual_reload']=actual['act']=='anchors' and actual['cover']==17 and actual['ledger']=='success' and actual['insight']==4
  checks[label+'_timer_and_cooldowns']=payload['time']<=actual['time']<payload['time']+2 and 0<=payload['operation']['timeLeft']-actual['timeLeft']<2 and actual['drone']>28 and actual['orbital']>40
  checks[label+'_army_identity']=actual['ids']==[g['id'] for g in payload['war']['army']]
  checks[label+'_separate_saves_and_settings']=page.evaluate("localStorage.getItem('crownfold-riftfront-save-v1')===null && JSON.parse(localStorage.getItem('crownfold-player-settings-v1')).sensitivity===1.7")
  page.evaluate('document.exitPointerLock()');page.wait_for_timeout(100);page.locator('#pause-button').click()
  page.screenshot(path=str(OUT/f'checkpoint-{label}-resumed.png'))
  page.locator('#abort-operation').click();page.wait_for_function('window.__riftfront.state.zone==="frontier"')
  checks[label+'_withdrawal_clears_checkpoint']=page.evaluate(f'JSON.parse(localStorage.getItem({json.dumps(KEY)})).warCheckpoint===null')
  page.evaluate('document.exitPointerLock()');page.wait_for_timeout(100);page.locator('#pause-button').click();page.locator('#back-menu').click()
  # The same supported frontier record recovers if just its war extension is damaged.
  broken=json.loads(saved);broken['warCheckpoint']['checksum']='broken'
  page.evaluate('([key,value])=>localStorage.setItem(key,value)',[KEY,json.dumps(broken)])
  # Close without beforeunload replacing the corruption fixture.
  page.close();page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(url);page.wait_for_function('window.__riftfront?.renderer');page.locator('#continue-quick').click()
  checks[label+'_corruption_recovery']=page.evaluate('window.__riftfront.state.zone==="frontier" && window.__riftfront.state.checkpointWarning===true')
  checks[label+'_recovery_visible']='FRONTIER PROGRESS RECOVERED' in page.locator('#notifications').inner_text()
  context.close()
 # Storage failure preserves previous data and Cancel does not leave the game.
 context=browser.new_context();page=context.new_page();page.goto(URL);page.wait_for_function('window.__riftfront?.renderer')
 page.locator('#quick-war').click();page.evaluate('document.exitPointerLock()');page.wait_for_timeout(100);page.locator('#pause-button').click()
 previous=page.evaluate(f'localStorage.getItem({json.dumps(KEY)})')
 page.evaluate("Storage.prototype.setItem=function(){throw new Error('Quota exceeded')}")
 page.locator('#save-button').click();checks['failed_save_visible']='PREVIOUS SAVE KEPT' in page.locator('#notifications').inner_text()
 page.once('dialog',lambda dialog:dialog.dismiss());page.locator('#back-menu').click()
 checks['failed_return_cancel_stays_in_game']=page.evaluate('window.__riftfront.active && window.__riftfront.paused')
 checks['failed_save_preserves_data']=page.evaluate(f'localStorage.getItem({json.dumps(KEY)})')==previous
 page.once('dialog',lambda dialog:dialog.accept());page.locator('#back-menu').click()
 checks['failed_return_can_leave_without_overwriting']=page.evaluate('!window.__riftfront.active') and page.evaluate(f'localStorage.getItem({json.dumps(KEY)})')==previous
 browser.close()
report={'checks':checks,'errors':errors,'passed':all(checks.values()) and not errors,'scope':'Chromium software rendering, fixture-assisted Act II, actual UI save/reload; not complete human campaign'}
(OUT/'war-checkpoints-browser.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));assert report['passed']
