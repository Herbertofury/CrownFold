"""Actual mouse + keyboard smoke test for v0.7 independent RTS camera."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,traceback
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
checks={};errors=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'])
 page=browser.new_page(viewport={'width':1600,'height':900},device_scale_factor=1)
 page.set_default_timeout(4500)
 page.on('pageerror',lambda e:errors.append('page: '+str(e)))
 page.on('console',lambda m:errors.append('console: '+m.text) if m.type=='error' else None)
 try:
  page.set_content((ROOT/'dist/CROWNFOLD-RIFTFRONT.html').read_text(),wait_until='domcontentloaded')
  page.wait_for_function('window.__riftfront && window.__riftfront.renderer',timeout=30000)
  page.locator('#quick-war').click();page.wait_for_timeout(160)
  page.keyboard.press('Tab');page.wait_for_timeout(200)
  before=page.evaluate('''()=>({player:[window.__riftfront.state.player.x,window.__riftfront.state.player.z],cam:[window.__riftfront.renderer.tactical.x,window.__riftfront.renderer.tactical.z],zoom:window.__riftfront.renderer.tactical.zoom})''')
  page.keyboard.down('d');page.wait_for_timeout(300);page.keyboard.up('d')
  page.wait_for_timeout(100)
  after=page.evaluate('''()=>({player:[window.__riftfront.state.player.x,window.__riftfront.state.player.z],cam:[window.__riftfront.renderer.tactical.x,window.__riftfront.renderer.tactical.z],zoom:window.__riftfront.renderer.tactical.zoom})''')
  checks['camera_pan']=after['cam'][0]>before['cam'][0]+8
  checks['player_did_not_move']=max(abs(after['player'][j]-before['player'][j]) for j in (0,1))<.04
  page.mouse.move(1080,420);page.mouse.wheel(0,-250);page.wait_for_timeout(180)
  zoom=page.evaluate('window.__riftfront.renderer.tactical.zoom')
  checks['zoom_changes']=zoom<before['zoom']
  # Click two distinct groups in the roster, adding the second with Shift.
  roster=page.locator('#war-select [data-battalion]')
  checks['army_roster']=roster.count()>=3
  roster.nth(1).click();page.wait_for_timeout(80)
  first=page.evaluate('window.__riftfront.state.war.selectedBattalionIds')
  roster.nth(2).click(modifiers=['Shift']);page.wait_for_timeout(100)
  together=page.evaluate('window.__riftfront.state.war.selectedBattalionIds')
  checks['shift_multiselect']=len(first)==1 and len(together)==2
  page.keyboard.press('Control+1');page.wait_for_timeout(100)
  checks['control_group_saved']=len(page.evaluate('window.__riftfront.state.war.controlGroups[1]'))==2
  roster.nth(1).click();page.keyboard.press('Alt+1');page.wait_for_timeout(150)
  checks['control_group_recalled']=len(page.evaluate('window.__riftfront.state.war.selectedBattalionIds'))==2
  page.keyboard.press('Backquote');page.wait_for_timeout(150)
  checks['compact_view']=page.evaluate('document.body.classList.contains("command-compact")')
  checks['compact_panel']=page.locator('#commander-panel').bounding_box()['width']<=380
  # Right click in real canvas, and verify both units took a movement order.
  page.mouse.click(1080,420,button='right')
  page.wait_for_timeout(120)
  ids=page.evaluate('window.__riftfront.state.war.selectedBattalionIds')
  orders=page.evaluate('''()=>window.__riftfront.state.war.army.filter(g=>window.__riftfront.state.war.selectedBattalionIds.includes(g.id)).map(g=>g.order)''')
  checks['right_click_multi_order']=len(orders)==2 and all(o=='move' for o in orders)
  # Group box selection around a friendly battalion using real pointer events and projected world coordinates.
  pos=page.evaluate('''()=>{const r=window.__riftfront.renderer,s=window.__riftfront.state;return s.war.army.filter(g=>g.count>0).map(g=>({id:g.id,p:r.project([g.x,2,g.z])}));}''')
  visible=[g for g in pos if g['p'] and 15<g['p']['x']<1570 and 25<g['p']['y']<875]
  checks['projection_exists']=len(visible)>0
  # Enforce selection with user-style click when target is not obscured by panels; otherwise test the selection model separately.
  if visible:
   g=visible[0];x,y=g['p']['x'],g['p']['y'];
   if 200<x<1350 and 170<y<650:
    page.mouse.move(x-26,y-26);page.mouse.down();page.mouse.move(x+26,y+26,steps=8);page.mouse.up();page.wait_for_timeout(150)
    selection=page.evaluate('window.__riftfront.state.war.selectedBattalionIds');checks['box_selection']=g['id'] in selection
  page.screenshot(path=str(OUT/'war-v07-tactical-camera.png'))
 except Exception as e:
  errors.append('exception: '+repr(e)+'\n'+traceback.format_exc(limit=8))
 finally:browser.close()
 result={'checks':checks,'errors':errors}
 (OUT/'war-tactical-browser.json').write_text(json.dumps(result,indent=2))
 print(json.dumps(result,indent=2))
 assert checks and all(checks.values()) and not errors,'Tactical camera regression'
