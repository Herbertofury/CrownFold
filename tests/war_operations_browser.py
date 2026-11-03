"""CrownFold v0.7 offline-browser regression for four act wars and call-ins."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, traceback

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
checks={};errors=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'])
 page=browser.new_page(viewport={'width':1600,'height':900},device_scale_factor=1)
 page.set_default_timeout(8000)
 page.on('pageerror',lambda e:errors.append('page: '+str(e)))
 page.on('console',lambda m:errors.append('console: '+m.text) if m.type=='error' else None)
 try:
  page.set_content((ROOT/'dist/CROWNFOLD-RIFTFRONT.html').read_text(),wait_until='domcontentloaded')
  page.wait_for_function('window.__riftfront && !!window.__riftfront.renderer',timeout=30000)
  page.locator('#quick-war').click();page.wait_for_timeout(250)
  checks['live_war']=page.evaluate('window.__riftfront.state.war?.act === "foothold"')
  checks['first_act_hud']='ACT 1/4' in page.locator('#objective-phase').inner_text()
  checks['first_act_name']='BEACHHEAD' in page.locator('#objective-name').inner_text()
  page.screenshot(path=str(OUT/'war-v07-foothold.png'))
  page.keyboard.press('Tab');page.wait_for_timeout(120)
  checks['command_panel']=page.locator('#war-controls').is_visible()
  checks['war_act_info']='24 seconds' in page.locator('#war-act').inner_text()
  checks['support_buttons']=page.locator('[data-support]').count()==2
  # Physically create a reinforcement pod and deliver it at the selected unit.
  page.evaluate('window.__riftfront.state.war.supplies=900')
  page.locator('#war-select [data-battalion]').nth(1).click()
  page.locator('[data-support="timefall_pod"]').click()
  checks['pod_spent_supplies']=page.evaluate('window.__riftfront.state.war.supplies < 800')
  checks['pending_drop']=page.evaluate('window.__riftfront.state.war.supportDrops.length===1')
  page.screenshot(path=str(OUT/'war-v07-support.png'))
  before=page.evaluate('window.__riftfront.state.war.army.length')
  page.evaluate('window.__riftfront.state.war.supportDrops[0].remaining=.02')
  page.wait_for_timeout(350)
  checks['physical_reinforcements']=page.evaluate('window.__riftfront.state.war.army.length')==before+1
  checks['cooldown_prevents_spam']=page.locator('[data-support="timefall_pod"]').is_disabled()
  # A called strike must be delayed and must damage the targeted structure.
  page.evaluate('''()=>{const s=window.__riftfront.state,w=s.war;w.supplies=900;w.selectedBattalionId=null;s.player.x=w.anchors[0].x;s.player.z=w.anchors[0].z+34;s.player.yaw=0;w.enemyArmy=[];w.enemyWaveTimer=1e9;}''')
  hp=page.evaluate('window.__riftfront.state.war.anchors[0].hp')
  page.locator('[data-support="epoch_lance"]').click()
  checks['lance_queued']=page.evaluate('window.__riftfront.state.war.supportDrops.some(d=>d.id==="epoch_lance")')
  page.evaluate('''()=>{const s=window.__riftfront.state,d=s.war.supportDrops.find(d=>d.id==="epoch_lance");d.x=s.war.anchors[0].x;d.z=s.war.anchors[0].z;d.remaining=.02;}''')
  page.wait_for_timeout(320)
  checks['lance_hits_anchor']=page.evaluate('window.__riftfront.state.war.anchors[0].hp')<hp
  # Walk through the actual phase state machine, compressing progress for browser coverage.
  page.evaluate('''()=>{const w=window.__riftfront.state.war;w.nodes[0].owner="ally";w.nodes[1].owner="ally";w.footholdHold=23.9;}''')
  page.wait_for_timeout(300)
  checks['second_act_hud']='ACT 2/4' in page.locator('#objective-phase').inner_text()
  checks['anchor_directive']='LATTICE' in page.locator('#war-act').inner_text()
  page.screenshot(path=str(OUT/'war-v07-anchors.png'))
  page.evaluate('window.__riftfront.state.war.anchors.forEach(a=>a.hp=0)')
  page.wait_for_timeout(200)
  checks['third_act_hud']='ACT 3/4' in page.locator('#objective-phase').inner_text()
  page.evaluate('window.__riftfront.state.war.enemyBase.hp=0')
  page.wait_for_timeout(250)
  checks['fourth_act_hud']='ACT 4/4' in page.locator('#objective-phase').inner_text()
  checks['extraction_action_visible']=page.locator('#war-extraction-action').is_visible()
  checks['extraction_disabled_far']=page.locator('#war-extraction-button').is_disabled()
  page.evaluate('''()=>{const s=window.__riftfront.state,w=s.war;s.player.x=w.extraction.x;s.player.z=w.extraction.z;w.enemyArmy=[];w.extraction.nextWave=1e9;}''')
  page.wait_for_timeout(200)
  checks['extraction_eligible']=page.locator('#war-extraction-button').is_enabled()
  page.locator('#war-extraction-button').click();page.wait_for_timeout(160)
  checks['extraction_activated']=page.evaluate('window.__riftfront.state.war.extraction.active')
  page.screenshot(path=str(OUT/'war-v07-extraction.png'))
  page.evaluate('''()=>{const w=window.__riftfront.state.war;w.enemyArmy=[];w.extraction.progress=w.extraction.target-.08;w.extraction.nextWave=1e9;}''')
  page.wait_for_timeout(400)
  checks['returns_to_free_roam']=page.evaluate('window.__riftfront.state.zone==="frontier"')
  checks['campaign_reward']=page.evaluate('window.__riftfront.state.temporal.wonCampaigns.length===1')
  checks['rpg_persists']=page.evaluate('window.__riftfront.state.rpg?.coins>100')
 except Exception as e:
  errors.append('exception: '+repr(e)+'\n'+traceback.format_exc(limit=8))
 finally:browser.close()
results={'checks':checks,'errors':errors}
(OUT/'war-operations-browser.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
assert checks and all(checks.values()),'War operations browser checks failed'
assert not errors,'Browser generated errors'
