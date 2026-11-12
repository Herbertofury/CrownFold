"""Actual offline game handlers; synthetic blur/visibility events, not OS tab switching."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
checks={};errors=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--disable-webgl'])
 try:
  page=browser.new_page(viewport={'width':1440,'height':1000})
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto((ROOT/'dist/CROWNFOLD-RIFTFRONT.html').as_uri())
  page.wait_for_function('window.__riftfront && window.__riftfront.renderer')
  page.evaluate("window.dispatchEvent(new Event('blur'))")
  checks['title_untouched']=page.evaluate('!window.__riftfront.active&&!window.__riftfront.paused')
  page.locator('#new-game').click()
  page.wait_for_function('window.__riftfront.active')
  # Exercise the actual handlers when release lands on the HUD, not the canvas.
  page.evaluate("document.getElementById('world').requestPointerLock=()=>Promise.resolve();document.getElementById('world').dispatchEvent(new PointerEvent('pointerdown',{button:2,bubbles:true}))")
  checks['right_press_aims']=page.evaluate("document.body.classList.contains('aiming')")
  page.evaluate("document.body.dispatchEvent(new PointerEvent('pointerup',{button:2,bubbles:true}))")
  checks['hud_release_clears_aim']=page.evaluate("!document.body.classList.contains('aiming')")
  page.evaluate("document.getElementById('world').dispatchEvent(new PointerEvent('pointerdown',{button:2,bubbles:true}));document.body.dispatchEvent(new PointerEvent('pointercancel',{button:-1,bubbles:true}))")
  checks['cancel_clears_aim']=page.evaluate("!document.body.classList.contains('aiming')")
  page.keyboard.down('w')
  page.evaluate("window.dispatchEvent(new Event('blur'))")
  page.wait_for_function('window.__riftfront.paused')
  before=page.evaluate('({time:window.__riftfront.state.time,hp:window.__riftfront.state.player.hp})')
  page.wait_for_timeout(300)
  checks['blur_pauses_combat']=before==page.evaluate('({time:window.__riftfront.state.time,hp:window.__riftfront.state.player.hp})')
  checks['pause_visible']=page.locator('#pause-overlay').is_visible()
  checks['checkpoint_written']=page.evaluate("!!localStorage.getItem('crownfold-riftfront-save-v1')")
  page.evaluate("window.dispatchEvent(new Event('focus'))")
  checks['return_requires_resume']=page.evaluate('window.__riftfront.paused')
  page.locator('#resume').click()
  page.wait_for_function('!window.__riftfront.paused')
  before=page.evaluate('({x:window.__riftfront.state.player.x,z:window.__riftfront.state.player.z})')
  page.wait_for_timeout(200)
  checks['held_movement_cleared']=before==page.evaluate('({x:window.__riftfront.state.player.x,z:window.__riftfront.state.player.z})')
  page.keyboard.up('w')
  page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
  checks['hidden_pauses']=page.evaluate('window.__riftfront.paused')
  page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))")
  checks['visible_does_not_resume']=page.evaluate('window.__riftfront.paused')
  page.screenshot(path=str(OUT/'focus-pause.png'))
  checks['no_page_errors']=not errors
 finally:
  (OUT/'focus-pause.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
  browser.close()
assert checks and all(checks.values()),checks
print(json.dumps(checks,indent=2))
