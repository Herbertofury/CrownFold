"""v0.8 browser smoke for actual cover geometry, route previews and incoming fire telegraphs."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,traceback
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
checks={};errors=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'])
 page=browser.new_page(viewport={'width':1500,'height':900})
 page.set_default_timeout(9000)
 page.on('pageerror',lambda e:errors.append('page: '+str(e)))
 page.on('console',lambda m:errors.append('console: '+m.text) if m.type=='error' else None)
 try:
  page.set_content((ROOT/'dist/CROWNFOLD-RIFTFRONT.html').read_text(),wait_until='domcontentloaded')
  page.wait_for_function('window.__riftfront && !!window.__riftfront.renderer',timeout=30000)
  page.locator('#quick-war').click();page.wait_for_timeout(300)
  checks['war_start']=page.evaluate('window.__riftfront.state.war?.act==="foothold"')
  checks['seven_3d_cover_sites']=page.evaluate('window.__riftfront.state.war.cover.filter(c=>c.hp>0).length')==7
  page.keyboard.press('Tab');page.wait_for_timeout(200)
  checks['cover_hud']='COVER SITES' in page.locator('#war-stats').inner_text()
  page.evaluate('''()=>{let r=window.__riftfront.renderer,c=window.__riftfront.state.war.cover[0];r.tactical.x=c.x;r.tactical.z=c.z;}''')
  page.keyboard.press('Backquote');page.wait_for_timeout(350)
  checks['clear_map_mode']=page.evaluate('document.body.classList.contains("command-compact")')
  page.screenshot(path=str(OUT/'v08-tactical-cover.png'))
  coverBefore=page.evaluate('window.__riftfront.state.war.cover[0].hp')
  page.evaluate('''()=>{const s=window.__riftfront.state,c=s.war.cover[0];s.player.x=c.x;s.player.z=c.z+23;s.player.yaw=0;}''')
  page.keyboard.press('Tab');page.wait_for_timeout(150)
  # Live simulated shots use the same simulation entrypoint as the real UI.
  page.evaluate('''()=>{const s=window.__riftfront.state,c=s.war.cover[0];s.war.enemyArmy=[];s.war.enemyWaveTimer=1e8;s.player.weapon='rail';s.player.fireCooldown=0;s.player.ammo.rail=6;s.player.yaw=0;window.__riftfront.sim.stepGame(s,{fire:true,yaw:0,pitch:0},.08);}''')
  page.wait_for_timeout(100)
  checks['cover_hit_by_player_fire']=page.evaluate('window.__riftfront.state.war.cover[0].hp')<coverBefore
  # Enter a normal shooter operation from the quick-operation menu, no deterministic cheats in the render path.
  page.evaluate('window.__riftfront.sim.finishOperation(window.__riftfront.state,false)')
  page.wait_for_timeout(120)
  page.evaluate('''()=>{const s=window.__riftfront.state;window.__riftfront.sim.enterOperation(s,0);s.enemies=[];s.squad=[];s.hostileShots=[];s.spawnTimer=1e9;s.player.x=0;s.player.z=0;s.player.shield=s.player.maxShield;s.enemies.push({id:4567,kind:'artillery',era:s.era,x:0,z:-24,y:0,hp:135,maxHp:135,cooldown:0,aggro:true,dead:false,stagger:0});}''')
  page.wait_for_function('window.__riftfront.state.hostileShots.length>0',timeout=5000)
  checks['attack_warning_scheduled']=page.evaluate('window.__riftfront.state.hostileShots[0].remaining>.1')
  page.screenshot(path=str(OUT/'v08-projectile-telegraph.png'))
  before=page.evaluate('window.__riftfront.state.player.hp')
  page.evaluate('window.__riftfront.state.player.x+=16')
  page.wait_for_timeout(1850)
  checks['warned_attack_can_miss']=page.evaluate('window.__riftfront.state.player.hp')>=before
  checks['no_render_error']=page.locator('#error.hidden').count()==1
 except Exception as e:
  errors.append('exception: '+repr(e)+'\n'+traceback.format_exc(limit=6))
 finally:browser.close()
results={'checks':checks,'errors':errors};(OUT/'v08-browser.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2));assert checks and all(checks.values()) and not errors
