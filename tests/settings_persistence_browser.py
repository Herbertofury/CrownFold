"""Bounded fresh-document and persistent-profile file:// preference checks.
No retry masks a failure: every fresh context must preserve the UI choice.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, traceback, tempfile
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
URL=(ROOT/'dist/CROWNFOLD-RIFTFRONT.html').as_uri()
KEY='crownfold-player-settings-v1'
rows=[];restarts=[];errors=[];version=None

def ready(page):
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL,wait_until='domcontentloaded')
 page.wait_for_function('window.__riftfront && window.__riftfront.renderer',timeout=30000)

def snapshot(page):
 return page.evaluate(f"({{stored:localStorage.getItem('{KEY}'),runtime:window.__riftfront.settings}})")

with sync_playwright() as pw:
 options={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--disable-webgl']}
 if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
 browser=pw.chromium.launch(**options);version=browser.version
 try:
  for iteration in range(12):
   context=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
   try:
    page=context.new_page();page.add_init_script(f"localStorage.setItem('{KEY}','{{broken')");ready(page)
    initial=snapshot(page)
    page.locator('#title-settings').click();page.locator('#setting-effects').uncheck();page.locator('#settings-close').click()
    before=snapshot(page)
    previous=page;page=context.new_page();ready(page);previous.close()
    after=snapshot(page)
    passed=(initial['runtime']['reduceEffects'] is True and before['runtime']['reduceEffects'] is False
      and json.loads(before['stored'])['reduceEffects'] is False and after['stored']==before['stored']
      and after['runtime']['reduceEffects'] is False)
    rows.append({'iteration':iteration,'initial':initial,'before_close':before,'after_reopen':after,'passed':passed})
   finally:context.close()
 except Exception as exc:errors.append(repr(exc)+'\n'+traceback.format_exc(limit=8))
 finally:browser.close()
 # Unlike new_context(), a user profile must retain file-origin storage after
 # every page and browser process exits. Test the real persistence boundary.
 try:
  for iteration in range(4):
   with tempfile.TemporaryDirectory(prefix='crownfold-settings-profile-') as profile:
    context=pw.chromium.launch_persistent_context(profile,**options,viewport={'width':1280,'height':900},reduced_motion='reduce')
    try:
     page=context.pages[0];ready(page)
     page.locator('#title-settings').click();page.locator('#setting-effects').uncheck();page.locator('#settings-close').click()
     before=snapshot(page)
    finally:context.close()
    context=pw.chromium.launch_persistent_context(profile,**options,viewport={'width':1280,'height':900},reduced_motion='reduce')
    try:
     page=context.pages[0];ready(page);after=snapshot(page)
     restarts.append({'iteration':iteration,'before_exit':before,'after_restart':after,'passed':after['stored']==before['stored'] and after['runtime']['reduceEffects'] is False})
    finally:context.close()
 except Exception as exc:errors.append(repr(exc)+'\n'+traceback.format_exc(limit=8))
result={'browser_version':version,'fresh_document_trials':rows,'persistent_profile_restarts':restarts,'errors':errors,'scope':'Offline file-origin synthetic preferences only; no campaign or personal data.'}
(OUT/'settings-persistence-stress.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
assert len(rows)==12 and len(restarts)==4 and all(row['passed'] for row in rows+restarts) and not errors,'Settings persistence stress regression'
