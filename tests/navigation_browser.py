"""Wayfinding UI acceptance: real controls, deterministic location/state fixtures.
Runs both served modules and the self-contained offline game; not unassisted pacing QA.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json, os, time, traceback
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
checks={};errors=[]
def wait(page,expression):
 end=time.monotonic()+12
 while time.monotonic()<end:
  if page.evaluate(expression):return
  page.wait_for_timeout(80)
 raise AssertionError('Timed out: '+expression)
def free_mouse(page):
 page.evaluate('document.exitPointerLock()');page.wait_for_timeout(100)
def near_goal(page):
 page.evaluate('''()=>{const g=window.__riftfront;Object.assign(g.state.player,{x:g.guidance.goal.x,z:g.guidance.goal.z,invulnerable:1000});g.state.enemies=[]}''')
 page.wait_for_timeout(180)
with sync_playwright() as pw:
 options={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--disable-webgl']}
 if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
 browser=pw.chromium.launch(**options)
 try:
  for mode,url in [('offline',(ROOT/'dist/CROWNFOLD-RIFTFRONT.html').as_uri()),('served','http://127.0.0.1:3040/')]:
   context=browser.new_context(viewport={'width':1440,'height':1000})
   page=context.new_page();page.set_default_timeout(12000);page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(url,wait_until='domcontentloaded');wait(page,'!!window.__riftfront?.renderer')
   page.locator('#new-game').click();wait(page,'window.__riftfront.active');free_mouse(page)
   expect(page.locator('#marker-title')).to_have_text('MEET MIRA VALE');checks[mode+'_first_steps']=True
   near_goal(page);page.keyboard.press('e');expect(page.locator('#dialogue-name')).to_have_text('MIRA VALE')
   page.get_by_role('button',name='Take quest: THE FIRST LIGHT',exact=True).click();page.locator('#dialogue-leave').click();free_mouse(page)
   expect(page.locator('#marker-title')).to_have_text('HARVEST FIBER');checks[mode+'_accept_routes_to_resource']=True
   before=page.evaluate('window.__riftfront.guidance.goal')
   for _ in range(6):
    if page.evaluate('window.__riftfront.state.rpg.quests.first_light.status')=='ready':break
    near_goal(page);page.keyboard.press('e');page.wait_for_timeout(200)
   wait(page,"window.__riftfront.state.rpg.quests.first_light.status==='ready'")
   expect(page.locator('#marker-title')).to_have_text('RETURN TO MIRA VALE');expect(page.locator('#objective-distance')).to_have_text('READY TO CLAIM REWARD');checks[mode+'_harvest_to_turnin_loop']=True
   # Ready quest remains selectable alongside an active quest in the journal.
   page.evaluate("window.__riftfront.state.rpg.quests.field_engineer={status:'active',progress:0};window.__riftfront.state.rpg.tracked='field_engineer'")
   page.keyboard.press('l');expect(page.locator('#rpg-overlay')).to_be_visible()
   card=page.locator('.rpg-card').filter(has=page.get_by_text('THE FIRST LIGHT',exact=True))
   card.get_by_role('button',name='TRACK QUEST',exact=True).click();page.locator('#close-rpg').click();free_mouse(page)
   expect(page.locator('#marker-title')).to_have_text('RETURN TO MIRA VALE');checks[mode+'_ready_quest_trackable']=True
   page.locator('#pause-button').click();page.locator('#save-button').click();page.reload();wait(page,'!!window.__riftfront')
   page.locator('#continue-game').click();free_mouse(page);expect(page.locator('#marker-title')).to_have_text('RETURN TO MIRA VALE');checks[mode+'_saved_tracking_restored']=True
   near_goal(page);page.keyboard.press('e');page.get_by_role('button',name='Turn in: THE FIRST LIGHT',exact=True).click();page.locator('#dialogue-leave').click();free_mouse(page)
   wait(page,"window.__riftfront.state.rpg.quests.first_light.status==='done'")
   expect(page.locator('#objective-description')).to_contain_text('Press B');expect(page.locator('#objective-marker')).to_be_hidden();checks[mode+'_craft_build_no_fake_target']=True
   # A selected vault quest in another era leads to the actual medieval rift.
   page.evaluate("window.__riftfront.state.rpg.quests.the_glass_key={status:'active',progress:0};window.__riftfront.state.rpg.tracked='the_glass_key';window.__riftfront.state.era='neon'")
   expect(page.locator('#marker-title')).to_have_text('RETURN / CROWNLESS MARCH');checks[mode+'_wrong_era_routes_home']=True
   page.evaluate("window.__riftfront.state.era='medieval';window.__riftfront.state.player.x=-43;window.__riftfront.state.player.z=-74")
   expect(page.locator('#marker-title')).to_have_text('THE MIRROR MAW')
   # Aim north while the vault lies due south, including the real mouse input.
   page.evaluate("window.dispatchEvent(new MouseEvent('mousemove',{movementX:-window.__riftfront.state.player.yaw/.0024,movementY:0,buttons:2}))")
   expect(page.locator('#marker-distance')).to_contain_text('BEHIND');expect(page.locator('#marker-icon')).to_have_text('↓');checks[mode+'_behind_camera_arrow']=True
   page.screenshot(path=str(OUT/f'wayfinding-{mode}-desktop.png'))
   page.set_viewport_size({'width':520,'height':640});page.wait_for_timeout(250)
   box=page.locator('#objective-marker').bounding_box();checks[mode+'_small_screen_marker_fits']=box['x']>=0 and box['y']>=0 and box['x']+box['width']<=520 and box['y']+box['height']<=640
   page.screenshot(path=str(OUT/f'wayfinding-{mode}-small.png'))
   page.set_viewport_size({'width':1440,'height':1000})
   page.evaluate('window.__riftfront.sim.enterOperation(window.__riftfront.state,3)')
   expect(page.locator('#marker-title')).not_to_have_text('THE MIRROR MAW');wait(page,'window.__riftfront.state.zone==="operation"')
   checks[mode+'_war_objective_preserved']=page.evaluate('window.__riftfront.guidance===null')
   context.close()
 except Exception as exc:errors.append(repr(exc)+'\n'+traceback.format_exc(limit=8))
 finally:browser.close()
result={'checks':checks,'errors':errors,'scope':'Served and offline controls with deterministic position fixtures; no pacing, art or AAA completion claim.'}
(OUT/'navigation-browser.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
assert len(checks)==20 and all(checks.values()) and not errors,'Wayfinding browser regression'
