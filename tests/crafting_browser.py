"""Exercise the real Forge UI against offline or served application assets."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, time, traceback
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
checks={};errors=[]
def wait_state(page, expression):
 end=time.monotonic()+30
 while time.monotonic()<end:
  if page.evaluate(expression): return
  page.wait_for_timeout(50)
 raise AssertionError(expression)
def forge(page):
 page.locator('[data-rpg-tab="inventory"]').click()
 page.locator('[data-rpg-tab="craft"]').click()
with sync_playwright() as pw:
 options={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--disable-webgl']}
 if os.environ.get('CHROMIUM_PATH'): options['executable_path']=os.environ['CHROMIUM_PATH']
 browser=pw.chromium.launch(**options)
 try:
  page=browser.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(7000)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(os.environ.get('CROWNFOLD_URL',(ROOT/'dist/CROWNFOLD-RIFTFRONT.html').as_uri()),wait_until='domcontentloaded')
  wait_state(page,'window.__riftfront && window.__riftfront.renderer')
  page.locator('#new-game').click();wait_state(page,'window.__riftfront.active')
  page.evaluate('document.exitPointerLock();const s=window.__riftfront.state;s.enemies=[];s.spawnTimer=1e9;s.player.grenades=11;s.inventory.scrap=100;s.inventory.ore=100')
  page.keyboard.press('KeyI');page.locator('[data-rpg-tab="craft"]').click()
  card=page.locator('.rpg-card').filter(has_text='SHARD GRENADES')
  checks['partial_batch_disabled']=card.get_by_role('button',name='NEED ROOM FOR 3 GRENADES').is_disabled()
  checks['blocked_stock_unchanged']=page.evaluate('const s=window.__riftfront.state;s.player.grenades===11 && s.inventory.scrap===100 && s.inventory.ore===100')
  page.evaluate('window.__riftfront.state.player.grenades=9');forge(page)
  card.get_by_role('button',name='CRAFT RECIPE').click()
  checks['whole_batch_delivered']=page.evaluate('const s=window.__riftfront.state;s.player.grenades===12 && s.inventory.scrap===94 && s.inventory.ore===95 && s.rpg.totalCrafted===1')
  checks['repeat_disabled']=card.get_by_role('button',name='NEED ROOM FOR 3 GRENADES').is_disabled()
  page.evaluate('const s=window.__riftfront.state;s.player.grenades=0;s.rpg.perks.craftsman=3;s.inventory.scrap=4;s.inventory.ore=4');forge(page)
  checks['discounted_shortfall_visible']=card.get_by_role('button',name='NEED 1 SCRAP',exact=True).is_disabled()
  page.screenshot(path=str(OUT/'crafting-forge.png'))
  page.keyboard.press('Escape');checks['close_works']=not page.locator('#rpg-overlay').is_visible()
 except Exception as exc:
  errors.append(repr(exc)+'\n'+traceback.format_exc(limit=8))
 finally:browser.close()
checks['no_browser_errors']=not errors
result={'checks':checks,'errors':errors};(OUT/'crafting-browser.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
if not all(checks.values()):raise SystemExit(1)
