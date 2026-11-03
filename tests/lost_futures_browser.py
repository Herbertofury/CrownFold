"""Browser end-to-end: lost sciences -> heritage -> mixed-unit RTS command -> war powers."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,traceback
ROOT=Path(__file__).resolve().parents[1];OUTPUT=ROOT/'test-results';OUTPUT.mkdir(exist_ok=True)
checks={};errors=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'])
 page=browser.new_page(viewport={'width':1600,'height':900},device_scale_factor=1)
 page.set_default_timeout(9000)
 page.on('pageerror',lambda error:errors.append('PAGE: '+str(error)))
 page.on('console',lambda msg:errors.append('CONSOLE: '+msg.text) if msg.type=='error' else None)
 try:
  page.set_content((ROOT/'dist/CROWNFOLD-RIFTFRONT.html').read_text(),wait_until='domcontentloaded')
  page.wait_for_function('window.__riftfront && !!window.__riftfront.renderer',timeout=30000)
  checks['crownfold_brand']='CROWNFOLD' in page.locator('#menu').inner_text() and 'v0.' in page.locator('.version').inner_text()
  page.locator('#new-game').click();page.wait_for_timeout(180)
  page.evaluate('window.__riftfront.state.spawnTimer=1e9;window.__riftfront.state.enemies=[]')
  page.keyboard.press('KeyY');page.wait_for_timeout(90)
  checks['weave_accessible']=page.locator('#rpg-overlay').is_visible() and 'LOST FUTURES' in page.locator('#rpg-title').inner_text()
  checks['five_heritages']=page.locator('#rpg-content').get_by_role('button',name='MAKE THIS MY HERITAGE').count()==4
  checks['ten_lost_techs']=page.locator('#rpg-content .lost-tech-card').count()==10
  checks['starter_multiera_loadout']='OATH GEOMETRY' in page.locator('.weave-ribbon').inner_text() and 'GHOST PROTOCOL' in page.locator('.weave-ribbon').inner_text()
  page.screenshot(path=str(OUTPUT/'lost-futures-weave.png'))
  # Switch identity while remaining in the medieval world.
  page.locator('.rpg-card').filter(has_text='UNWRITTEN PATHFINDER').get_by_role('button',name='MAKE THIS MY HERITAGE').click()
  checks['heritage_changed']=page.evaluate("window.__riftfront.state.temporal.lineage.commanderEra==='primeval' && window.__riftfront.state.era==='medieval'")
  # Inject only earned test Insight (not gameplay spoof): quest/survey system integration tested in Node tests.
  page.evaluate('window.__riftfront.state.temporal.insight=35')
  page.locator('[data-rpg-tab="timeline"]').click()
  page.locator('[data-rpg-tab="weave"]').click()
  page.locator('.lost-tech-card').filter(has_text='MURMURATION ENGINE').get_by_role('button',name='DISCOVER LOST SCIENCE').click()
  checks['research_persists']=page.evaluate("window.__riftfront.state.temporal.lineage.researched.includes('murmuration')")
  page.locator('.lost-tech-card').filter(has_text='MURMURATION ENGINE').get_by_role('button',name='EQUIP').click()
  checks['three_slot_loadout']=page.evaluate('window.__riftfront.state.temporal.lineage.equipped.length===3')
  checks['fourth_rejected']=page.locator('.lost-tech-card').filter(has_text='PRISM MESH').get_by_role('button',name='DISCOVER').is_disabled() is False
  page.screenshot(path=str(OUTPUT/'lost-futures-research.png'))
  # Equip future prism with historic Oath Geometry to trigger actual cross-era fusion.
  page.locator('.lost-tech-card').filter(has_text='PRISM MESH').get_by_role('button',name='DISCOVER').click()
  page.locator('.lost-tech-card').filter(has_text='MURMURATION ENGINE').get_by_role('button',name='REMOVE').click()
  page.locator('.lost-tech-card').filter(has_text='PRISM MESH').get_by_role('button',name='EQUIP').click()
  checks['historic_future_synergy']='ACTIVE DOCTRINE FUSION' in page.locator('#rpg-content').inner_text()
  page.screenshot(path=str(OUTPUT/'lost-futures-fusion.png'))
  page.keyboard.press('Escape');page.wait_for_timeout(60)
  checks['weave_closes']=not page.locator('#rpg-overlay').is_visible()
  # Start a war without losing prior progress.
  page.evaluate('window.__riftfront.sim.enterOperation(window.__riftfront.state,3)')
  page.wait_for_timeout(180);page.keyboard.press('Tab');page.wait_for_timeout(120)
  checks['commander_live']=page.locator('#war-controls').is_visible()
  checks['expanded_roster']=page.locator('[data-train]').count()==13
  checks['four_formations']=page.locator('[data-stance]').count()==4
  checks['four_field_powers']=page.locator('[data-war-power]').count()==4
  checks['correct_heritage_shown']='UNWRITTEN PATHFINDER' in page.locator('#war-heritage').inner_text()
  page.screenshot(path=str(OUTPUT/'lost-futures-war.png'))
  # Group-specific stance command via UI
  first=page.evaluate('window.__riftfront.state.war.army[0].id');second=page.evaluate('window.__riftfront.state.war.army[1].id')
  page.locator(f'[data-battalion="{first}"]').click()
  page.locator('[data-stance="skirmish"]').click()
  checks['selected_only_stance']=page.evaluate("const [a,b]=window.__riftfront.state.war.army; a.stance==='skirmish'&&b.stance==='balanced'")
  checks['selected_marker']=page.locator(f'[data-battalion="{first}"]').get_attribute('class')=='active'
  # Power activates from selected battalion anchor, cooldown and cost visible.
  page.locator('[data-war-power="oathwall"]').click()
  checks['historic_ward_used']=page.evaluate('window.__riftfront.state.war.powerCooldowns.oathwall>0')
  checks['power_shows_cooldown']=page.locator('[data-war-power="oathwall"]').is_disabled()
  checks['future_rush_stays_available_when_equipped']=page.locator('[data-war-power="flux_rush"]').is_disabled() is False
  page.screenshot(path=str(OUTPUT/'lost-futures-war-power.png'))
  page.locator('[data-battalion="all"]').click()
  page.locator('[data-stance="bulwark"]').click()
  checks['all_troops_stance']=page.evaluate("window.__riftfront.state.war.army.every(g=>g.stance==='bulwark')")
  # Advanced medieval prototypes are recruitable regardless of the chosen period.
  page.evaluate('window.__riftfront.state.war.supplies=500')
  page.locator('[data-war-build="foundry"]').click()
  page.locator('[data-train="chordwrights"]').click()
  checks['medieval_high_tech_queued']=page.evaluate("window.__riftfront.state.war.queue.some(q=>q.type==='chordwrights')")
  page.screenshot(path=str(OUTPUT/'lost-futures-mixed-army.png'))
 except Exception as e:
  errors.append('EXCEPTION: '+repr(e)+'\n'+traceback.format_exc(limit=5))
 finally: browser.close()
result={'checks':checks,'errors':errors}
(OUTPUT/'lost-futures-browser.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
assert checks and all(checks.values()),'Lost Futures browser feature failed'
assert not errors,'Lost Futures browser raised runtime errors'
