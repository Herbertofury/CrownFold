"""CrownFold v0.4: genuine browser integration checks for 1278 -> 1889 -> RTS war."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, traceback
ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'test-results';DIR.mkdir(exist_ok=True)
checks={};errors=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'])
    page=browser.new_page(viewport={'width':1600,'height':900},device_scale_factor=1)
    page.set_default_timeout(6000)
    page.on('pageerror',lambda e:errors.append('PAGE: '+str(e)))
    page.on('console',lambda m:errors.append('CONSOLE: '+m.text) if m.type=='error' else None)
    try:
        page.set_content((ROOT/'dist/CROWNFOLD-RIFTFRONT.html').read_text(),wait_until='domcontentloaded')
        page.wait_for_function('window.__riftfront && !!window.__riftfront.renderer',timeout=30000)
        checks['brand']=page.locator('#menu').inner_text().count('CROWNFOLD')>0
        checks['five_era_intro']='FIVE ERAS' in page.locator('#menu').inner_text()
        page.screenshot(path=str(DIR/'chronicle-menu.png'))
        page.locator('#new-game').click();page.wait_for_timeout(380)
        page.evaluate('window.__riftfront.state.spawnTimer=1e9;window.__riftfront.state.enemies=[]')
        checks['starts_medieval']=page.evaluate("window.__riftfront.state.era==='medieval'")
        checks['medieval_label']='CROWNLESS MARCH' in page.locator('#zone-label').inner_text()
        page.screenshot(path=str(DIR/'chronicle-medieval.png'))
        # The Era Chronicle tab is real, interactive state, not a static label.
        page.keyboard.press('KeyC');page.wait_for_timeout(100)
        checks['chronicle_open']=page.locator('#rpg-overlay').is_visible()
        checks['five_eras_listed']=all(name in page.locator('#rpg-content').inner_text() for name in ['CROWNLESS MARCH','FIRST GARDEN','GILDED ENGINE','ELECTRIC REPUBLIC','LAST TOMORROW'])
        page.screenshot(path=str(DIR/'chronicle-eras.png'))
        page.keyboard.press('Escape');page.wait_for_timeout(90)
        # Walk through an advanced portal from 1278 to 1889.
        page.evaluate("const s=window.__riftfront.state;s.player.x=22;s.player.z=-24;s.enemies=[];s.spawnTimer=1e9")
        page.keyboard.press('KeyE');page.wait_for_timeout(400)
        checks['rift_to_1889']=page.evaluate("window.__riftfront.state.era==='steam'")
        checks['1889_label']='GILDED ENGINE' in page.locator('#zone-label').inner_text()
        page.screenshot(path=str(DIR/'chronicle-1889.png'))
        # A local person with era-specific dialogue is reachable after the jump.
        page.evaluate("const s=window.__riftfront.state;s.player.x=-7;s.player.z=11;s.enemies=[]")
        page.keyboard.press('KeyE');page.wait_for_timeout(100)
        checks['steampunk_npc']=page.locator('#dialogue-overlay').is_visible() and 'BRASSWELL' in page.locator('#dialogue-name').inner_text()
        page.screenshot(path=str(DIR/'chronicle-1889-dialogue.png'))
        page.locator('#dialogue-leave').click();page.wait_for_timeout(100)
        # Mark a facet from another era; both its era and turn are stored in simulation.
        page.evaluate('const s=window.__riftfront.state;s.player.x=0;s.player.z=0;s.inventory.flux=140;s.player.foldCooldown=0')
        page.keyboard.press('KeyT');page.wait_for_timeout(100)
        chosen=page.evaluate('window.__riftfront.state.temporal.selectedEra')
        page.keyboard.press('KeyQ');page.wait_for_timeout(130)
        checks['chronofold_stamp']=page.evaluate('window.__riftfront.state.temporal.facets.some(f=>f.origin===\'steam\'&&f.turn===1)')
        checks['chronofold_target']=page.evaluate('window.__riftfront.state.temporal.facets.at(-1).era')==chosen
        # Available era war is physically entered via its portal.
        page.evaluate("const s=window.__riftfront.state;s.player.x=50;s.player.z=-43;s.enemies=[];s.spawnTimer=1e9")
        page.keyboard.press('KeyE');page.wait_for_timeout(350)
        checks['1889_rts_war']=page.evaluate("window.__riftfront.state.zone==='operation' && window.__riftfront.state.war?.enemyEra==='neon'")
        page.screenshot(path=str(DIR/'chronicle-war.png'))
        page.keyboard.press('Tab');page.wait_for_timeout(120)
        checks['commander_view']=page.locator('#commander-panel').is_visible()
        checks['production_ui']=page.locator('[data-train="pikemen"]').is_visible() and page.locator('[data-war-build="foundry"]').is_visible()
        page.screenshot(path=str(DIR/'chronicle-war-command.png'))
        troops_before=page.evaluate('window.__riftfront.state.war.queue.length')
        page.locator('[data-train="pikemen"]').click();page.wait_for_timeout(50)
        checks['train_queued']=page.evaluate('window.__riftfront.state.war.queue.length')==troops_before+1
        page.locator('[data-war-build="foundry"]').click();page.wait_for_timeout(80)
        checks['foundry_built']=page.evaluate("window.__riftfront.state.war.buildings.some(b=>b.kind==='foundry')")
        checks['production_supplies_spent']=page.evaluate('window.__riftfront.state.war.supplies<100')
        page.keyboard.press('Tab');page.wait_for_timeout(150)
        checks['return_to_shooter']=not page.locator('#commander-panel').is_visible()
        # Win condition and returning era must be wired correctly. 
        page.evaluate('const s=window.__riftfront.state;s.war.enemyBase.hp=0')
        page.wait_for_timeout(260)
        checks['victory_returns_to_1889']=page.evaluate("window.__riftfront.state.zone==='frontier' && window.__riftfront.state.era==='steam'")
        checks['campaign_reward']=page.evaluate("window.__riftfront.state.temporal.wonCampaigns.includes('iron_parliament')")
        page.keyboard.press('KeyC');page.wait_for_timeout(120)
        checks['chronicle_remembers']=page.locator('#rpg-content').inner_text().find('CAMPAIGN WON')>=0
    except Exception as e:
        errors.append('EXCEPTION: '+repr(e)+'\n'+traceback.format_exc(limit=5))
    finally:
        browser.close()
(DIR/'chronicle-browser.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
print(json.dumps({'checks':checks,'errors':errors},indent=2))
assert checks and all(checks.values()),'Some browser checks failed'
assert not errors,'Unexpected JS/browser errors'
