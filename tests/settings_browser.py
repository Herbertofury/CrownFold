"""Real Chromium UI checks for preferences. Offline file URL, no game server dependency."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, traceback
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
checks={};errors=[]
URL=(ROOT/'dist/CROWNFOLD-RIFTFRONT.html').as_uri()
KEY='crownfold-player-settings-v1'

def ready(page):
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL,wait_until='domcontentloaded')
 page.wait_for_function('window.__riftfront && window.__riftfront.renderer',timeout=30000)

def snapshot(page):
 return page.evaluate('window.__riftfront.settings')

with sync_playwright() as pw:
 options={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--disable-webgl']}
 if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
 browser=pw.chromium.launch(**options)
 try:
  context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='no-preference')
  page=context.new_page();page.set_default_timeout(7000);ready(page)
  checks['silent_initial_defaults']=not snapshot(page)['soundEnabled'] and page.evaluate('window.__riftfront.audioStatus.state')=='not-started'
  # Reach the title settings through native Tab, not mouse or programmatic focus.
  for _ in range(40):
   page.keyboard.press('Tab')
   if page.evaluate('document.activeElement.id')=='title-settings':break
  checks['keyboard_title_entry']=page.evaluate('document.activeElement.id')=='title-settings'
  page.keyboard.press('Space');page.wait_for_function('document.querySelector("#settings-dialog").open')
  checks['named_native_modal']=page.locator('dialog[aria-labelledby="settings-title"]').is_visible()
  page.locator('#setting-sensitivity').focus();page.keyboard.press('ArrowRight')
  checks['keyboard_slider']=abs(snapshot(page)['sensitivity']-1.05)<.00001
  page.locator('#setting-invert').check()
  page.locator('#setting-volume').focus();page.keyboard.press('Home')
  for _ in range(25):page.keyboard.press('ArrowRight')
  page.locator('#setting-sound').check();page.locator('#settings-test').click()
  page.wait_for_function('window.__riftfront.audioStatus.state==="running"')
  checks['volume_reaches_audio_graph']=abs(page.evaluate('window.__riftfront.audioStatus.gain')-.25)<.00001
  page.locator('#setting-effects').check()
  checks['reduced_effects_apply']=page.evaluate('''()=>{document.body.classList.add('damaged');return getComputedStyle(document.querySelector('#damage-flash')).display==='none'&&getComputedStyle(document.querySelector('.scanlines')).display==='none'&&getComputedStyle(document.querySelector('.livepip')).animationName==='none'}''')
  page.evaluate("document.body.classList.remove('damaged')")
  trapped=True
  for _ in range(18):
   page.keyboard.press('Tab');trapped=trapped and page.evaluate("document.querySelector('#settings-dialog').contains(document.activeElement)")
  checks['native_focus_trap']=trapped
  page.screenshot(path=str(OUT/'player-settings-desktop.png'))
  page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("#settings-dialog").open')
  checks['escape_restores_title_focus']=page.evaluate('document.activeElement.id')=='title-settings' and not page.evaluate('window.__riftfront.active')
  expected=snapshot(page);page.reload();page.wait_for_function('window.__riftfront')
  checks['reload_persists_preferences']=snapshot(page)==expected
  checks['reload_waits_for_audio_gesture']=page.evaluate('window.__riftfront.audioStatus.state')=='not-started'
  # A real play button starts sound only after an explicit gesture.
  page.locator('#new-game').click();page.wait_for_function('window.__riftfront.active')
  page.evaluate('document.exitPointerLock()');page.wait_for_timeout(100)
  page.locator('#pause-button').click();page.wait_for_function('window.__riftfront.paused')
  page.locator('#resume').focus();page.keyboard.press('Tab');page.keyboard.press('Tab')
  checks['keyboard_pause_entry']=page.evaluate('document.activeElement.id')=='pause-settings'
  page.keyboard.press('Space');page.wait_for_function('document.querySelector("#settings-dialog").open')
  before=page.evaluate('({time:window.__riftfront.state.time,hp:window.__riftfront.state.player.hp,weapon:window.__riftfront.state.player.weapon})')
  page.keyboard.press('w');page.keyboard.press('Tab');page.keyboard.press('3');page.wait_for_timeout(300)
  after=page.evaluate('({time:window.__riftfront.state.time,hp:window.__riftfront.state.player.hp,weapon:window.__riftfront.state.player.weapon})')
  checks['settings_keep_game_paused']=before==after
  page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("#settings-dialog").open')
  checks['escape_does_not_resume_combat']=page.evaluate('window.__riftfront.paused && document.activeElement.id==="pause-settings"')
  page.locator('#resume').click();page.evaluate('document.exitPointerLock()');page.wait_for_timeout(100)
  # Synthetic relative motion exercises the actual input handler without OS pointer acceleration.
  before=page.evaluate('({yaw:window.__riftfront.state.player.yaw,pitch:window.__riftfront.state.player.pitch})')
  page.evaluate("window.dispatchEvent(new MouseEvent('mousemove',{movementX:10,movementY:10,buttons:2}))")
  page.wait_for_timeout(150)
  after=page.evaluate('({yaw:window.__riftfront.state.player.yaw,pitch:window.__riftfront.state.player.pitch})')
  checks['configured_aim_reaches_player']=abs(after['yaw']-before['yaw']-.024*1.05)<.00001 and abs(after['pitch']-before['pitch']-.021*1.05)<.00001
  page.locator('#pause-button').click();page.locator('#pause-settings').click()
  page.locator('#setting-sound').uncheck()
  checks['muting_silences_existing_audio']=page.evaluate('window.__riftfront.audioStatus.gain')==0
  page.locator('#setting-sound').check();page.locator('#setting-volume').focus();page.keyboard.press('Home')
  checks['zero_volume_is_silent']=page.evaluate('window.__riftfront.audioStatus.gain')==0
  saves=page.evaluate("[localStorage.getItem('crownfold-riftfront-save-v1'),localStorage.getItem('crownfold-riftfront-quick-save-v1')]")
  page.locator('#settings-reset').click()
  checks['reset_restores_defaults']=snapshot(page)=={'sensitivity':1,'invertY':False,'volume':1,'soundEnabled':False,'reduceEffects':False}
  checks['reset_preserves_both_campaigns']=saves==page.evaluate("[localStorage.getItem('crownfold-riftfront-save-v1'),localStorage.getItem('crownfold-riftfront-quick-save-v1')]")
  page.locator('#settings-close').click();page.locator('#back-menu').click()
  page.locator('#sound-button').click()
  checks['toolbar_uses_same_preference']=snapshot(page)['soundEnabled'] and page.locator('#sound-button').get_attribute('aria-pressed')=='true'
  page.set_viewport_size({'width':520,'height':640});page.locator('#title-settings').click()
  page.locator('#settings-close').scroll_into_view_if_needed()
  box=page.locator('#settings-close').bounding_box()
  checks['short_screen_close_reachable']=box['y']>=0 and box['y']+box['height']<=640
  page.screenshot(path=str(OUT/'player-settings-small-screen.png'))
  context.close()
  # Corrupt storage and system defaults do not crash initialization.
  context=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
  page=context.new_page();page.add_init_script(f"localStorage.setItem('{KEY}','{{broken')");ready(page)
  checks['malformed_storage_uses_system_default']=snapshot(page)['reduceEffects'] and snapshot(page)['sensitivity']==1
  page.locator('#title-settings').click();page.locator('#setting-effects').uncheck();page.locator('#settings-close').click()
  # Remove the init script by using another page in the same context.
  page.close();page=context.new_page();ready(page)
  checks['explicit_motion_preference_wins']=not snapshot(page)['reduceEffects']
  context.close()
  # Throw from storage access just as private/restricted contexts can.
  context=browser.new_context(viewport={'width':1280,'height':900})
  page=context.new_page();page.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}})");ready(page)
  page.locator('#title-settings').click();page.locator('#setting-invert').check()
  checks['blocked_storage_keeps_settings_functional']=snapshot(page)['invertY'] and 'storage is unavailable' in page.locator('#settings-status').inner_text()
  page.locator('#settings-close').click();page.locator('#new-game').click();page.wait_for_function('window.__riftfront.active')
  checks['blocked_storage_still_plays']=page.evaluate('window.__riftfront.active')
  context.close()
  context=browser.new_context(viewport={'width':1280,'height':900})
  page=context.new_page();page.add_init_script("window.AudioContext=window.webkitAudioContext=class {constructor(){throw new Error('audio unavailable')}}");ready(page)
  page.locator('#title-settings').click();page.locator('#setting-sound').check();page.locator('#settings-test').click()
  checks['unavailable_audio_is_explained']='Audio is unavailable' in page.locator('#settings-status').inner_text()
  page.locator('#setting-sound').uncheck();page.locator('#setting-sound').check();page.locator('#settings-close').click();page.locator('#new-game').click()
  page.wait_for_function('window.__riftfront.active')
  checks['audio_failure_does_not_block_play']=page.evaluate('window.__riftfront.active && window.__riftfront.audioStatus.state==="not-started"')
  context.close()
 except Exception as exc:errors.append(repr(exc)+'\n'+traceback.format_exc(limit=8))
 finally:browser.close()
result={'checks':checks,'errors':errors,'scope':'Offline browser UI and Web Audio gain graph; no hardware listening or full campaign acceptance.'}
(OUT/'player-settings-browser.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
assert len(checks)==26 and all(checks.values()) and not errors,'Player settings browser regression'
