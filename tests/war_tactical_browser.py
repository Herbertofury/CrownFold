"""Actual mouse + keyboard smoke test for v0.7 independent RTS camera."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,traceback
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
checks={};errors=[];events=[];box_evidence={}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH'),args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'])
 page=browser.new_page(viewport={'width':1600,'height':900},device_scale_factor=1)
 page.set_default_timeout(7000)
 page.context.tracing.start(screenshots=True,snapshots=True,sources=False)
 page.on('framenavigated',lambda frame:events.append({'main':frame==page.main_frame,'url':frame.url}))
 page.on('pageerror',lambda e:errors.append('page: '+str(e)))
 page.on('console',lambda m:errors.append('console: '+m.text) if m.type=='error' else None)
 try:
  page.route('**/*',lambda route:route.abort() if route.request.url.startswith(('http://','https://')) else route.continue_())
  page.goto((ROOT/'dist/CROWNFOLD-RIFTFRONT.html').as_uri(),wait_until='domcontentloaded')
  page.wait_for_function('window.__riftfront && window.__riftfront.renderer',timeout=30000)
  quick=page.locator('#quick-war')
  quick.click(trial=True)
  button=quick.bounding_box()
  assert button, 'Quick War button disappeared after becoming actionable'
  offline_url=page.url
  # The button toggles game state, not page navigation. Send a real pointer
  # gesture, then await the application's transition rather than a navigation.
  page.mouse.click(button['x']+button['width']/2,button['y']+button['height']/2)
  page.wait_for_function('window.__riftfront.active && !!window.__riftfront.state.war')
  assert page.url==offline_url, 'Quick War left the offline game document'
  page.keyboard.press('Tab')
  page.wait_for_function('window.__riftfront.commander && window.__riftfront.renderer.focus===window.__riftfront.renderer.tactical && !!window.__riftfront.renderer.ivp')
  before=page.evaluate('''()=>({player:[window.__riftfront.state.player.x,window.__riftfront.state.player.z],cam:[window.__riftfront.renderer.tactical.x,window.__riftfront.renderer.tactical.z],zoom:window.__riftfront.renderer.tactical.zoom})''')
  page.keyboard.down('d')
  try:
   page.wait_for_function('x=>window.__riftfront.renderer.tactical.x>x+8',arg=before['cam'][0])
  finally:
   page.keyboard.up('d')
  after=page.evaluate('''()=>({player:[window.__riftfront.state.player.x,window.__riftfront.state.player.z],cam:[window.__riftfront.renderer.tactical.x,window.__riftfront.renderer.tactical.z],zoom:window.__riftfront.renderer.tactical.zoom})''')
  checks['camera_pan']=after['cam'][0]>before['cam'][0]+8
  checks['player_did_not_move']=max(abs(after['player'][j]-before['player'][j]) for j in (0,1))<.04
  before_zoom_matrix=page.evaluate('Array.from(window.__riftfront.renderer.vp)')
  page.mouse.move(1080,420);page.mouse.wheel(0,-250)
  page.wait_for_function('z=>window.__riftfront.renderer.tactical.zoom<z',arg=before['zoom'])
  page.wait_for_function('matrix=>window.__riftfront.renderer.vp.some((v,i)=>v!==matrix[i])',
                         arg=before_zoom_matrix)
  zoom=page.evaluate('window.__riftfront.renderer.tactical.zoom')
  checks['zoom_changes']=zoom<before['zoom']
  # Click two distinct groups in the roster, adding the second with Shift.
  roster=page.locator('#war-select [data-battalion]')
  checks['army_roster']=roster.count()>=3
  roster.nth(1).click()
  first=page.evaluate('window.__riftfront.state.war.selectedBattalionIds')
  roster.nth(2).click(modifiers=['Shift'])
  together=page.evaluate('window.__riftfront.state.war.selectedBattalionIds')
  checks['shift_multiselect']=len(first)==1 and len(together)==2
  page.keyboard.press('Control+1')
  checks['control_group_saved']=len(page.evaluate('window.__riftfront.state.war.controlGroups[1]'))==2
  roster.nth(1).click();page.keyboard.press('Alt+1')
  checks['control_group_recalled']=len(page.evaluate('window.__riftfront.state.war.selectedBattalionIds'))==2
  page.keyboard.press('Backquote')
  checks['compact_view']=page.evaluate('document.body.classList.contains("command-compact")')
  checks['compact_panel']=page.locator('#commander-panel').bounding_box()['width']<=380
  # Right click in real canvas, and verify both units took a movement order.
  click_target=page.evaluate('''()=>{
   const {renderer:r,state:s}=window.__riftfront,canvas=document.querySelector('#world');
   if(document.elementFromPoint(1080,420)!==canvas)return null;
   const rect=canvas.getBoundingClientRect();
   return r.screenToGround(1080-rect.left,420-rect.top,s);
  }''')
  page.mouse.click(1080,420,button='right')
  orders=page.evaluate('''()=>window.__riftfront.state.war.army
   .filter(g=>window.__riftfront.state.war.selectedBattalionIds.includes(g.id))
   .map(g=>({order:g.order,x:g.tx,z:g.tz}))''')
  checks['right_click_multi_order']=(click_target is not None and len(orders)==2
   and all(o['order']=='move' and abs(o['x']-click_target['x'])<.5
           and abs(o['z']-click_target['z'])<.5 for o in orders))
  # A fresh Quick War has only two friendly battalions, both selected by
  # control-group recall. Use the roster to leave a real unselected target.
  page.keyboard.press('Backquote')
  roster.nth(1).click()
  page.wait_for_function('window.__riftfront.state.war.selectedBattalionIds.length===1')
  page.keyboard.press('Backquote')
  box_evidence['before']=page.evaluate('window.__riftfront.state.war.selectedBattalionIds')
  target=page.evaluate("""async()=>{
   const {terrainHeight}=await import('riftfront-sim');
   const {renderer:r,state:s}=window.__riftfront,canvas=document.querySelector('#world');
   const rect=canvas.getBoundingClientRect();
   const project=(x,z)=>r.project([x,terrainHeight(x,z,s.seed,s.zone),z]);
   const hit=p=>p&&document.elementFromPoint(p.x+rect.left,p.y+rect.top)===canvas;
   for(const g of s.war.army){
    if(g.count<=0||s.war.selectedBattalionIds.includes(g.id))continue;
    const p=project(g.x,g.z);
    if(!hit(p))continue;
    for(const margin of [4,6,9]){
     // Project opposite world corners so the input algorithm receives a box
     // whose ground X/Z bounds enclose the actual battalion, not its y=2 proxy.
     for(const sign of [1,-1]){
      const a=project(g.x-margin,g.z-sign*margin),b=project(g.x+margin,g.z+sign*margin);
      if(!hit(a)||!hit(b)||Math.hypot(a.x-b.x,a.y-b.y)<=12)continue;
      return {id:g.id,x0:a.x+rect.left,y0:a.y+rect.top,x1:b.x+rect.left,y1:b.y+rect.top};
     }
    }
   }
   return null;
  }""")
  box_evidence['target']=target
  checks['projection_exists']=target is not None
  checks['box_selection']=False
  if target:
   page.mouse.move(target['x0'],target['y0']);page.mouse.down()
   page.mouse.move(target['x1'],target['y1'],steps=8);page.mouse.up()
   selection=page.evaluate('window.__riftfront.state.war.selectedBattalionIds')
   box_evidence['after']=selection
   checks['box_selection']=target['id'] not in box_evidence['before'] and target['id'] in selection
  page.screenshot(path=str(OUT/'war-v07-tactical-camera.png'))
 except Exception as e:
  errors.append('exception: '+repr(e)+'\n'+traceback.format_exc(limit=8))
 finally:
  try:
   if errors or len(checks)!=12 or not all(checks.values()):
    page.context.tracing.stop(path=str(OUT/'war-tactical-trace.zip'))
   else:page.context.tracing.stop()
  finally:browser.close()
 result={'checks':checks,'errors':errors,'frame_navigations':events,'box_evidence':box_evidence}
 (OUT/'war-tactical-browser.json').write_text(json.dumps(result,indent=2))
 print(json.dumps(result,indent=2))
 assert len(checks)==12 and all(checks.values()) and not errors,'Tactical camera regression'
