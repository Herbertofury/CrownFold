from playwright.sync_api import sync_playwright
import json, pathlib, traceback
ROOT=pathlib.Path(__file__).resolve().parents[1]
DIR=ROOT/'test-results';DIR.mkdir(exist_ok=True)
results={'errors':[],'checks':{}}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'])
 page=browser.new_page(viewport={'width':1600,'height':900},device_scale_factor=1)
 page.set_default_timeout(4500)
 page.on('pageerror',lambda err:results['errors'].append('PAGEERROR: '+str(err)))
 page.on('console',lambda msg:results['errors'].append('CONSOLE: '+msg.text) if msg.type=='error' else None)
 try:
  page.set_content((ROOT/'dist/CROWNFOLD-RIFTFRONT.html').read_text(),wait_until='domcontentloaded')
  page.wait_for_function('window.__riftfront && !!window.__riftfront.renderer',timeout=30000)
  page.locator('#new-game').click();page.wait_for_timeout(450)
  page.evaluate('window.__riftfront.state.spawnTimer=1e9;window.__riftfront.state.enemies=[]')
  # Keyboard opened character journal and perk progression
  page.keyboard.press('KeyP');page.wait_for_timeout(150)
  results['checks']['perks_open']=page.locator('#rpg-overlay').is_visible()
  results['checks']['perks_18']=page.locator('#rpg-content .rpg-card').count()==18
  page.screenshot(path=str(DIR/'rpg-perks.png'))
  page.locator('.rpg-card').filter(has_text='DEADEYE').get_by_role('button').click()
  results['checks']['perk_purchased']=page.evaluate("window.__riftfront.state.rpg.perks.sharpshooter===1 && window.__riftfront.state.rpg.perkPoints===1")
  page.locator('[data-rpg-tab="journal"]').click();page.wait_for_timeout(100)
  results['checks']['quest_journal']=page.locator('.rpg-card').count()>=13
  page.screenshot(path=str(DIR/'rpg-quests.png'))
  page.locator('[data-rpg-tab="craft"]').click()
  results['checks']['crafting_recipes']=page.locator('.rpg-card').count()>=10
  page.locator('.rpg-card').filter(has_text='FIELD MEDKIT').get_by_role('button').click()
  results['checks']['craft_produced']=page.evaluate('window.__riftfront.state.inventory.medkit===6')
  page.locator('[data-rpg-tab="atlas"]').click();page.wait_for_timeout(100)
  results['checks']['atlas_landmarks']=page.locator('.atlas-pin').count()>=8
  page.screenshot(path=str(DIR/'rpg-atlas.png'))
  page.locator('[data-rpg-tab="bounties"]').click();page.wait_for_timeout(80)
  results['checks']['bounty_offered']=page.locator('#rpg-content').get_by_role('button',name='ACCEPT BOUNTY').is_visible()
  page.locator('#rpg-content').get_by_role('button',name='ACCEPT BOUNTY').click()
  results['checks']['bounty_accepted']=page.evaluate("window.__riftfront.state.rpg.bounty.status==='active'")
  page.screenshot(path=str(DIR/'rpg-bounties.png'))
  page.locator('[data-rpg-tab="homestead"]').click();page.wait_for_timeout(80)
  results['checks']['homestead_open']=page.locator('#rpg-content').get_by_role('button',name='SLEEP 4H').is_visible()
  page.evaluate('window.__riftfront.state.enemies=[]')
  before=page.evaluate('window.__riftfront.state.dayTime')
  page.locator('#rpg-content').get_by_role('button',name='SLEEP 4H').click()
  results['checks']['camp_rest']=page.evaluate('window.__riftfront.state.dayTime')!=before
  page.screenshot(path=str(DIR/'rpg-homestead.png'))
  page.keyboard.press('Escape');page.wait_for_timeout(100)
  results['checks']['esc_closed_rpg']=not page.locator('#rpg-overlay').is_visible()
  # NPC interaction opens real conversation choices and accepts a quest.
  page.evaluate("const s=window.__riftfront.state;s.player.x=-10;s.player.z=-5;s.player.y=0;s.enemies=[];s.spawnTimer=1e9")
  page.wait_for_timeout(250);page.keyboard.press('KeyE');page.wait_for_timeout(120)
  results['checks']['npc_dialogue']=page.locator('#dialogue-overlay').is_visible()
  results['checks']['npc_name']=page.locator('#dialogue-name').text_content()=='MIRA VALE'
  page.screenshot(path=str(DIR/'rpg-dialogue.png'))
  page.get_by_role('button',name='Take quest: THE FIRST LIGHT').click()
  results['checks']['quest_accepted']=page.evaluate("window.__riftfront.state.rpg.quests.first_light?.status==='active'")
  page.locator('#dialogue-leave').click()
  # Crouched NPC interactions expose risk/reward thievery, without repeated farming.
  page.evaluate("const s=window.__riftfront.state;s.player.x=-10;s.player.z=-5;s.player.crouch=true;s.enemies=[]")
  page.keyboard.press('KeyE');page.wait_for_timeout(100)
  results['checks']['sneak_dialogue']=page.get_by_role('button',name='[SNEAK] Try to pick their pocket.').is_visible()
  page.get_by_role('button',name='[SNEAK] Try to pick their pocket.').click()
  results['checks']['theft_event']=page.evaluate("window.__riftfront.state.rpg.flags['stole:mira']===true")
  page.locator('#dialogue-leave').click();
  # Actual lock dial: use on-screen HOT/WARM and HIGHER/LOWER clues to crack it.
  page.evaluate("const s=window.__riftfront.state;s.player.x=22;s.player.z=24;s.player.crouch=false;s.inventory.lockpicks=15;s.enemies=[]")
  page.keyboard.press('KeyE');page.wait_for_timeout(100)
  results['checks']['safe_dialogue']=page.locator('#lock-overlay').is_visible()
  page.screenshot(path=str(DIR/'rpg-lock.png'))
  low,high=0,99
  for attempt in range(9):
   if not page.locator('#lock-overlay').is_visible():break
   mid=(low+high)//2
   page.locator('#lock-dial').fill(str(mid))
   page.locator('#lock-open').click()
   msg=page.locator('#lock-result').text_content()
   if 'HIGHER' in msg:low=mid+1
   elif 'LOWER' in msg:high=mid-1
  results['checks']['safe_cracked']=page.evaluate("window.__riftfront.state.rpg.opened.includes('lock:hearth')")
  results['checks']['safe_loot']=page.evaluate("window.__riftfront.state.rpg.gear.length>0")
  # A cache opens as a physical exploration interaction, and its item can be equipped.
  page.evaluate("const s=window.__riftfront.state;s.player.x=89;s.player.z=-21;s.enemies=[];s.spawnTimer=1e9")
  page.keyboard.press('KeyE');page.wait_for_timeout(80)
  results['checks']['cache_gear']=page.evaluate("window.__riftfront.state.rpg.gear.length>0")
  page.keyboard.press('KeyI');page.wait_for_timeout(150)
  results['checks']['gear_menu']=page.locator('#rpg-content .rpg-card').count()>=4
  page.screenshot(path=str(DIR/'rpg-inventory.png'))
  page.keyboard.press('Escape')
  # Enter a vault from the overworld; the dungeon has physical chambers and enemies.
  page.evaluate("const s=window.__riftfront.state;s.player.x=-43;s.player.z=-54;s.enemies=[];s.spawnTimer=1e9")
  page.keyboard.press('KeyE');page.wait_for_timeout(450)
  results['checks']['dungeon_entered']=page.evaluate("window.__riftfront.state.zone==='dungeon'")
  results['checks']['dungeon_enemies']=page.evaluate("window.__riftfront.state.enemies.length>=10")
  page.screenshot(path=str(DIR/'rpg-dungeon.png'))
  # Close-range puzzles via actual input with guards programmatically defeated.
  page.evaluate("const s=window.__riftfront.state;s.player.x=-11;s.player.z=-43;for(const e of s.enemies)e.hp=0")
  page.keyboard.press('KeyE');page.wait_for_timeout(80)
  results['checks']['dungeon_sigil1']=page.evaluate('window.__riftfront.state.dungeon.sigils[0]')
  page.evaluate('const s=window.__riftfront.state;s.player.x=12;s.player.z=-83')
  page.keyboard.press('KeyE');page.wait_for_timeout(90)
  results['checks']['boss_unlocked']=page.evaluate("window.__riftfront.state.dungeon?.bossId>0")
  page.evaluate("const s=window.__riftfront.state;s.dungeon.bossDead=true;s.player.x=7;s.player.z=-137")
  page.keyboard.press('KeyE');page.wait_for_timeout(100)
  results['checks']['dungeon_looted']=page.evaluate('window.__riftfront.state.dungeon.looted')
  page.evaluate("const s=window.__riftfront.state;s.player.x=0;s.player.z=-147")
  page.keyboard.press('KeyE');page.wait_for_timeout(120)
  results['checks']['dungeon_completed']=page.evaluate("window.__riftfront.state.zone==='frontier' && window.__riftfront.state.rpg.dungeonCleared.includes('glass')")
  # Original RTS operation remains accessible after the RPG mode.
  page.evaluate('window.__riftfront.sim.enterOperation(window.__riftfront.state,0)')
  page.wait_for_timeout(250)
  results['checks']['original_operation']=page.evaluate("window.__riftfront.state.zone==='operation' && window.__riftfront.state.operation.objectives.length===6")
 except Exception as exc:
  results['errors'].append('TEST_EXCEPTION: '+str(exc))
  results['errors'].append(traceback.format_exc(limit=3))
 finally:
  browser.close()
DIR.joinpath('rpg-smoke.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2));assert all(results['checks'].values()),'Some browser checks failed'
assert not results['errors'],'Browser runtime error'
