"""Play the actual offline arsenal UI. No accounts, network, or external services."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, traceback
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
checks={};errors=[]
URL=os.environ.get('CROWNFOLD_URL',(ROOT/'dist/CROWNFOLD-RIFTFRONT.html').as_uri())

def open_arsenal(page):
 page.evaluate('document.exitPointerLock()')
 page.keyboard.press('Backquote')
 page.wait_for_function('document.querySelector("#arsenal-dialog").open')

def state(page):
 return page.evaluate('({time:window.__riftfront.state.time,weapon:window.__riftfront.state.player.weapon,ammo:{...window.__riftfront.state.player.ammo},hp:window.__riftfront.state.player.hp,x:window.__riftfront.state.player.x,z:window.__riftfront.state.player.z,shots:window.__riftfront.state.player.shots,flux:window.__riftfront.state.inventory.flux})')

with sync_playwright() as pw:
 options={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--disable-webgl']}
 if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
 browser=pw.chromium.launch(**options)
 try:
  page=browser.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(7000)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(URL,wait_until='domcontentloaded');page.wait_for_function('window.__riftfront && window.__riftfront.renderer')
  checks['rust_runtime_preserved']=page.evaluate('window.__riftfront.tactics.backend')=='rust-wasm'
  page.locator('#new-game').click();page.wait_for_function('window.__riftfront.active');open_arsenal(page)
  checks['all_six_roles_visible']=page.locator('.arsenal-card').count()==6 and page.locator('[data-weapon="cryo"]').is_visible()
  checks['opens_on_equipped_weapon']=page.evaluate('document.activeElement.dataset.weapon')=='rifle'
  before=state(page);page.keyboard.press('w');page.keyboard.press('4');page.keyboard.press('g');page.wait_for_timeout(250)
  checks['inspection_freezes_combat_and_inputs']=state(page)==before
  checks['number_selects_without_equipping']=page.evaluate('document.querySelector(".arsenal-card[aria-pressed=true]").dataset.weapon')=='smg' and state(page)['weapon']=='rifle'
  page.screenshot(path=str(OUT/'arsenal-desktop.png'))
  page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("#arsenal-dialog").open')
  checks['escape_cancel_keeps_weapon']=state(page)['weapon']=='rifle'
  open_arsenal(page);page.keyboard.press('6');page.keyboard.press('Enter');page.wait_for_function('window.__riftfront.state.player.weapon==="launcher"')
  checks['keyboard_equips_launcher']=not page.locator('#arsenal-dialog').is_visible()
  open_arsenal(page);page.locator('[data-weapon="cryo"]').click()
  checks['click_previews_without_committing']=state(page)['weapon']=='launcher'
  page.locator('#arsenal-cancel').click();checks['button_cancel_keeps_weapon']=state(page)['weapon']=='launcher'
  open_arsenal(page);page.locator('[data-weapon="cryo"]').click();page.locator('#arsenal-equip').click()
  checks['mouse_equips_cryo']=state(page)['weapon']=='cryo'
  # A real fire input changes ammo; then real reload input drives the HUD meter.
  page.evaluate('document.exitPointerLock()');page.mouse.move(710,490);page.mouse.down();page.wait_for_timeout(100);page.mouse.up()
  page.keyboard.press('r');page.wait_for_function('window.__riftfront.state.player.reload>0')
  checks['reload_hud_visible']=page.locator('#reload-meter').is_visible() and 'RELOADING' in page.locator('#reload-status').inner_text()
  open_arsenal(page);remaining=page.evaluate('window.__riftfront.state.player.reload');page.wait_for_timeout(200)
  checks['arsenal_freezes_reload']=page.evaluate('window.__riftfront.state.player.reload')==remaining
  page.keyboard.press('Enter');page.wait_for_function('window.__riftfront.state.player.reload<=0')
  checks['keep_weapon_finishes_reload']=page.evaluate('window.__riftfront.state.player.ammo.cryo')==24
  # Save compatibility uses existing UI; arsenal has no private save format.
  page.evaluate('document.exitPointerLock()');page.locator('#pause-button').click();page.locator('#save-button').click()
  saved=page.evaluate("localStorage.getItem('crownfold-riftfront-save-v1')")
  page.locator('#resume').click();open_arsenal(page);page.keyboard.press('2');page.keyboard.press('Escape')
  checks['preview_does_not_write_save']=saved==page.evaluate("localStorage.getItem('crownfold-riftfront-save-v1')")
  page.evaluate('document.exitPointerLock()');page.locator('#pause-button').click();page.locator('#back-menu').click();page.locator('#continue-game').click()
  checks['saved_weapon_survives_continue']=state(page)['weapon']=='cryo'
  # Focus remains inside on both ends, even while trying unrelated gameplay keys.
  open_arsenal(page);page.locator('#arsenal-equip').focus();page.keyboard.press('Tab')
  checks['tab_wraps_forward']=page.evaluate('document.activeElement.dataset.weapon')=='rifle'
  page.keyboard.press('Shift+Tab');checks['tab_wraps_backward']=page.evaluate('document.activeElement.id')=='arsenal-equip'
  page.keyboard.press('Backquote');page.wait_for_function('!document.querySelector("#arsenal-dialog").open')
  # RTS retains its original backtick compact-console action.
  page.keyboard.press('Tab');page.wait_for_function('window.__riftfront.commander');page.keyboard.press('Backquote')
  checks['rts_shortcut_unchanged']=page.evaluate('document.body.classList.contains("command-compact")') and not page.locator('#arsenal-dialog').is_visible()
  page.keyboard.press('Tab');page.wait_for_function('!window.__riftfront.commander')
  # Explicitly inspect limited-ammo messaging and all short-screen cards/controls.
  page.evaluate('window.__riftfront.state.player.ammo.launcher=0;window.__riftfront.state.player.reserve.launcher=0')
  open_arsenal(page);checks['empty_weapon_explained']='OUT OF AMMO' in page.locator('[data-weapon="launcher"]').inner_text()
  page.set_viewport_size({'width':390,'height':640});page.locator('[data-weapon="launcher"]').scroll_into_view_if_needed()
  box=page.locator('[data-weapon="launcher"]').bounding_box();checks['narrow_card_fits']=box['x']>=0 and box['x']+box['width']<=390
  page.locator('#arsenal-equip').scroll_into_view_if_needed();box=page.locator('#arsenal-equip').bounding_box()
  checks['short_screen_actions_reachable']=box['y']>=0 and box['y']+box['height']<=640
  page.screenshot(path=str(OUT/'arsenal-small-screen.png'))
  page.keyboard.press('Escape');page.set_viewport_size({'width':1440,'height':1000})
  # Start actual War Rift and verify its clock also stops while reading the arsenal.
  page.evaluate('document.exitPointerLock()');page.locator('#pause-button').click();page.locator('#back-menu').click();page.locator('#quick-war').click()
  page.wait_for_function('window.__riftfront.state.war');open_arsenal(page)
  time_left=page.evaluate('window.__riftfront.state.operation.timeLeft');page.wait_for_timeout(250)
  checks['war_mission_clock_pauses']=time_left==page.evaluate('window.__riftfront.state.operation.timeLeft')
  page.keyboard.press('6');page.keyboard.press('Enter');page.wait_for_function('window.__riftfront.state.operation.timeLeft<'+str(time_left))
  checks['war_resumes_with_selected_weapon']=state(page)['weapon']=='launcher'
 except Exception as exc:errors.append(repr(exc)+'\n'+traceback.format_exc(limit=8))
 finally:browser.close()
checks['no_browser_errors']=not errors
result={'checks':checks,'passed':sum(checks.values()),'total':len(checks),'errors':errors}
(OUT/'arsenal-browser.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
if not all(checks.values()):raise SystemExit(1)
