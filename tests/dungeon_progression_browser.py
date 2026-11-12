"""Actual quest/loot/dialogue controls with location and defeated-guardian fixtures.
Checks the finite quest chain and reward/save contract, not combat difficulty or pacing.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json, os, time, traceback
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
checks={};errors=[];KEY='crownfold-riftfront-save-v1'
def wait(page,expression):
 end=time.monotonic()+12
 while time.monotonic()<end:
  if page.evaluate(expression):return
  page.wait_for_timeout(80)
 raise AssertionError('Timed out: '+expression)
def release(page):
 page.evaluate('document.exitPointerLock()');page.wait_for_timeout(100)
def move(page,x,z):
 page.evaluate('''([x,z])=>{const s=window.__riftfront.state;Object.assign(s.player,{x,z,invulnerable:1000});s.enemies=[];s.spawnTimer=1e9}''',[x,z]);page.wait_for_timeout(150)
def lyra(page):
 move(page,-9,9);page.keyboard.press('e');expect(page.locator('#dialogue-name')).to_have_text('LYRA OF THE PALE ARCHIVE')
def leave_talk(page):
 page.locator('#dialogue-leave').click();release(page)
def clear_vault(page,id):
 x,z={'glass':(-43,-54),'roots':(93,54),'archive':(-93,54)}[id]
 move(page,x,z);page.keyboard.press('e');wait(page,"window.__riftfront.state.zone==='dungeon'")
 move(page,-11,-43);page.keyboard.press('e');wait(page,'window.__riftfront.state.dungeon.sigils[0]')
 move(page,12,-83);page.keyboard.press('e');wait(page,'window.__riftfront.state.dungeon.sigils[1]')
 # This fixture skips combat so the test measures actual progression/loot/return code.
 page.evaluate('window.__riftfront.state.dungeon.bossDead=true')
 move(page,7,-137);page.keyboard.press('e');wait(page,'window.__riftfront.state.dungeon.looted')
 move(page,0,-147);page.keyboard.press('e');wait(page,"window.__riftfront.state.zone==='frontier'")
def save_reload(page):
 release(page);page.locator('#pause-button').click();page.locator('#save-button').click();page.reload();wait(page,'!!window.__riftfront');page.locator('#continue-game').click();release(page)
def reward_snapshot(page):
 return page.evaluate('({coins:window.__riftfront.state.rpg.coins,gear:window.__riftfront.state.rpg.gear.length,xp:window.__riftfront.state.player.xp,level:window.__riftfront.state.player.level})')
with sync_playwright() as pw:
 options={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--disable-webgl']}
 if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
 browser=pw.chromium.launch(**options)
 try:
  for mode,url in [('offline',(ROOT/'dist/CROWNFOLD-RIFTFRONT.html').as_uri()),('served','http://127.0.0.1:3040/')]:
   context=browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();page.set_default_timeout(12000)
   page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url,wait_until='domcontentloaded');wait(page,'!!window.__riftfront?.renderer')
   page.locator('#new-game').click();wait(page,'window.__riftfront.active');release(page);lyra(page)
   checks[mode+'_echoes_requires_glass']=page.get_by_role('button',name='Take quest: THE THREE ECHOES',exact=True).count()==0
   page.get_by_role('button',name='Take quest: THE GLASS KEY',exact=True).click();leave_talk(page);clear_vault(page,'glass');lyra(page)
   page.get_by_role('button',name='Turn in: THE GLASS KEY',exact=True).click();before=reward_snapshot(page)
   page.get_by_role('button',name='Take quest: THE THREE ECHOES',exact=True).click()
   checks[mode+'_glass_credit_without_reward']=page.evaluate('window.__riftfront.state.rpg.quests.the_three_echoes.progress')==1 and reward_snapshot(page)==before
   leave_talk(page);clear_vault(page,'roots');save_reload(page)
   checks[mode+'_partial_reload_keeps_credit']=page.evaluate('window.__riftfront.state.rpg.quests.the_three_echoes.progress')==2
   clear_vault(page,'archive');expect(page.locator('#objective-distance')).to_have_text('READY TO CLAIM REWARD');expect(page.locator('#marker-title')).to_contain_text('RETURN TO LYRA')
   checks[mode+'_third_vault_finishes_chain']=page.evaluate("window.__riftfront.state.rpg.quests.the_three_echoes.status==='ready'")
   lyra(page);before=reward_snapshot(page);page.get_by_role('button',name='Turn in: THE THREE ECHOES',exact=True).click();after=reward_snapshot(page)
   checks[mode+'_quest_reward_paid_once']=after['coins']==before['coins']+500 and after['gear']==before['gear']+1 and page.get_by_role('button',name='Turn in: THE THREE ECHOES',exact=True).count()==0
   page.get_by_role('button',name='Shape the frontier for THE PALE ARCHIVE.',exact=True).click()
   checks[mode+'_ending_choice_unlocked']=page.evaluate('window.__riftfront.state.rpg.worldEnding')=='archive' and page.get_by_role('button',name='Shape the frontier',exact=False).count()==0
   page.screenshot(path=str(OUT/f'dungeon-ending-{mode}.png'));leave_talk(page);paid=reward_snapshot(page);save_reload(page)
   checks[mode+'_ending_and_paid_rewards_persist']=page.evaluate('window.__riftfront.state.rpg.worldEnding')=='archive' and reward_snapshot(page)==paid
   # Recreate an actual old stuck save and inspect recovery through Continue.
   page.evaluate('''key=>{const g=window.__riftfront,data=JSON.parse(g.sim.serialize(g.state));data.rpg.quests.the_three_echoes={status:'active',progress:2,unique:['roots','archive']};data.rpg.tracked='the_three_echoes';data.rpg.worldEnding=null;data.rpg.coins=12345;data.rpg.gear=[];localStorage.setItem(key,JSON.stringify(data));}''',KEY)
   # Return to a title page without beforeunload overwriting the fixture.
   legacy=page.evaluate('key=>localStorage.getItem(key)',KEY)
   page.close();page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url,wait_until='domcontentloaded');wait(page,'!!window.__riftfront')
   page.evaluate('([key,value])=>localStorage.setItem(key,value)',[KEY,legacy]);page.reload();wait(page,'!!window.__riftfront');page.locator('#continue-game').click();release(page)
   expect(page.locator('#objective-distance')).to_have_text('READY TO CLAIM REWARD')
   checks[mode+'_legacy_stuck_save_recovers']=page.evaluate('window.__riftfront.state.rpg.quests.the_three_echoes.progress')==3
   checks[mode+'_load_never_pays_rewards']=page.evaluate('window.__riftfront.state.rpg.coins')==12345 and page.evaluate('window.__riftfront.state.rpg.gear.length')==0
   lyra(page);page.get_by_role('button',name='Turn in: THE THREE ECHOES',exact=True).click();leave_talk(page);save_reload(page)
   checks[mode+'_repaired_claim_persists_once']=page.evaluate('window.__riftfront.state.rpg.coins')==12845 and page.evaluate('window.__riftfront.state.rpg.gear.length')==1 and page.evaluate("window.__riftfront.state.rpg.quests.the_three_echoes.status==='done'")
   context.close()
 except Exception as exc:errors.append(repr(exc)+'\n'+traceback.format_exc(limit=8))
 finally:browser.close()
result={'checks':checks,'errors':errors,'scope':'Quest, dungeon interaction and ending UI with defeated-guardian/location fixtures; no combat difficulty or pacing claim.'}
(OUT/'dungeon-progression-browser.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
assert len(checks)==20 and all(checks.values()) and not errors,'Dungeon progression browser regression'
