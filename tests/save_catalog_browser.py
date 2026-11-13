"""Synthetic damaged-save recovery through actual Continue/Save UI, not a campaign playtest."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
KEY='crownfold-riftfront-save-v1'
checks={};errors=[]
with sync_playwright() as pw:
 options={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--disable-webgl']}
 if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
 browser=pw.chromium.launch(**options)
 try:
  for mode,url in [('served',os.environ.get('CROWNFOLD_URL','http://127.0.0.1:3040/')),('offline',(ROOT/'dist/CROWNFOLD-RIFTFRONT.html').as_uri())]:
   context=browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();page.set_default_timeout(10000)
   page.on('pageerror',lambda error:errors.append(str(error)))
   page.goto(url);page.wait_for_function('window.__riftfront?.renderer')
   page.locator('#new-game').click();page.wait_for_function('window.__riftfront.active');page.evaluate('document.exitPointerLock()');page.locator('#pause-button').click()
   # Deliberate corrupted identifiers, retaining known valid campaign inventory.
   page.evaluate('''key=>{const api=window.__riftfront,save=JSON.parse(api.sim.serialize(api.state));
    save.inventory.scrap=731;save.player.weapon='constructor';save.rpg.quests.constructor={status:'active',progress:1};
    save.rpg.tracked='toString';save.rpg.allegiance='__proto__';save.rpg.worldEnding='valueOf';
    save.buildings.push({kind:'constructor',x:0,z:0,hp:10});localStorage.setItem(key,JSON.stringify(save));}''',KEY)
   page.reload();page.wait_for_function('window.__riftfront?.renderer');expect(page.locator('#continue-game')).to_be_enabled()
   page.locator('#continue-game').click();page.wait_for_function('window.__riftfront.active');page.evaluate('document.exitPointerLock()');page.locator('#pause-button').click()
   state=page.evaluate('''()=>{const s=window.__riftfront.state;return {weapon:s.player.weapon,scrap:s.inventory.scrap,quests:Object.keys(s.rpg.quests),badBuilding:s.buildings.some(b=>b.kind==='constructor'),tracked:s.rpg.tracked,hp:s.player.hp}}''')
   assert state['weapon']=='rifle' and state['scrap']==731 and state['quests']==[] and not state['badBuilding'] and state['tracked'] is None and state['hp']>0,state
   checks[mode+'_continued_recovered_save']=True
   page.locator('#save-button').click();saved=page.evaluate('key=>JSON.parse(localStorage.getItem(key))',KEY)
   assert saved['player']['weapon']=='rifle' and saved['inventory']['scrap']==731
   checks[mode+'_saved_recovered_state']=True;context.close()
  assert not errors,errors
 finally:
  (OUT/'save-catalog-browser.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
  browser.close()
print(json.dumps(checks))
