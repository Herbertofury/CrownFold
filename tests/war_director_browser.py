"""Real browser regression for war crisis / tactical objective UI and continuation."""
import json, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
out=root/'test-results';out.mkdir(exist_ok=True)
checks={};errors=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'])
 page=browser.new_page(viewport={'width':1600,'height':900},device_scale_factor=1)
 page.set_default_timeout(10000)
 page.on('pageerror',lambda e: errors.append('page: '+str(e)))
 page.on('console',lambda m: errors.append('console: '+m.text) if m.type=='error' else None)
 try:
  page.set_content((root/'dist/CROWNFOLD-RIFTFRONT.html').read_text(),wait_until='domcontentloaded')
  page.wait_for_function('window.__riftfront&&window.__riftfront.renderer',timeout=30000)
  page.locator('#quick-war').click()
  page.wait_for_timeout(150)
  checks['warfront_live']=page.evaluate('window.__riftfront.state.zone==="operation"&&!!window.__riftfront.state.war')
  page.keyboard.press('Tab');page.wait_for_timeout(150)
  checks['enemy_doctrine_visible']='IRON PRESSURE' in page.locator('#war-expedition').inner_text()
  checks['commander_roster'] = page.locator('#war-select button').count()>=3
  # Time is compressed here to test the actual live game's crisis spawning, not a mock interface.
  page.evaluate('window.__riftfront.state.war.expeditionNext=.02;window.__riftfront.state.spawnTimer=1e7')
  page.wait_for_timeout(240)
  checks['mission_spawned']=page.evaluate('!!window.__riftfront.state.war.expedition')
  checks['crisis_ui_visible']=page.locator('#war-expedition').locator('strong').count()==1
  checks['crisis_description']='lost science cache' in page.locator('#war-expedition').inner_text().lower()
  checks['hud_objective']='OPTIONAL' in page.locator('#objective-description').inner_text()
  page.screenshot(path=str(out/'war-director-crisis.png'))
  # Move into the crisis and finish its final few seconds through the live 30Hz loop.
  page.evaluate('''()=>{const s=window.__riftfront.state,e=s.war.expedition;s.player.x=e.x;s.player.z=e.z;s.war.enemyArmy=[];e.progress=.995;}''')
  page.wait_for_timeout(550)
  checks['crisis_resolved']=page.evaluate('window.__riftfront.state.war.expeditionsCompleted===1')
  checks['reward_increases_insight']=page.evaluate('window.__riftfront.state.temporal.insight>=4')
  checks['next_crisis_scheduled']=page.evaluate('window.__riftfront.state.war.expeditionNext>0')
  checks['commander_preserved']=page.locator('#war-controls').is_visible()
  page.screenshot(path=str(out/'war-director-command.png'))
 except Exception as e:
  errors.append('exception: '+repr(e)+'\n'+traceback.format_exc(limit=7))
 finally: browser.close()
res={'checks':checks,'errors':errors}
(out/'war-director-browser.json').write_text(json.dumps(res,indent=2))
print(json.dumps(res,indent=2))
assert checks and all(checks.values()),'War director browser checks failed'
assert not errors,'Browser generated runtime errors'
