"""Bounded fresh-document and persistent-profile file:// preference checks.
No retry masks a failure: every fresh context must preserve the UI choice.
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import json, os, traceback, tempfile
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
URL=(ROOT/'dist/CROWNFOLD-RIFTFRONT.html').as_uri()
KEY='crownfold-player-settings-v1'
rows=[];served=[];plain=[];restarts=[];errors=[];version=None

def ready(page,url=URL):
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(url,wait_until='domcontentloaded')
 page.wait_for_function('window.__riftfront && window.__riftfront.renderer',timeout=30000)

def snapshot(page):
 return page.evaluate(f"({{stored:localStorage.getItem('{KEY}'),runtime:window.__riftfront.settings}})")

class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*args):
  pass

def same_document_trial(browser,url,iteration,mode):
 context=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
 try:
  first=context.new_page();first.add_init_script(f"localStorage.setItem('{KEY}','{{broken')");ready(first,url)
  initial=snapshot(first)
  first.locator('#title-settings').click();first.locator('#setting-effects').uncheck();first.locator('#settings-close').click()
  before=snapshot(first)
  second=context.new_page();ready(second,url)
  overlap_first=snapshot(first);overlap_second=snapshot(second)
  lifecycle={'first_url':first.url,'second_url':second.url,
   'first_visibility':first.evaluate('document.visibilityState'),
   'second_visibility':second.evaluate('document.visibilityState'),
   'first_storage_origin':first.evaluate('location.origin'),
   'second_storage_origin':second.evaluate('location.origin')}
  first.close()
  after=snapshot(second)
  passed=(initial['runtime']['reduceEffects'] is True and before['runtime']['reduceEffects'] is False
   and json.loads(before['stored'])['reduceEffects'] is False and after['stored']==before['stored']
   and after['runtime']['reduceEffects'] is False)
  return {'mode':mode,'iteration':iteration,'initial':initial,'before_close':before,
   'first_while_both_open':overlap_first,'second_while_both_open':overlap_second,
   'after_reopen':after,'lifecycle':lifecycle,'passed':passed}
 finally:context.close()

def plain_file_trial(browser,url,iteration):
 # No CrownFold code, WebGL setup, app writers, or service is present. The
 # same profile/document handoff still exercises Chromium's storage layer.
 context=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
 raw='{"sensitivity":1,"invertY":false,"volume":1,"soundEnabled":false,"reduceEffects":false}'
 storage_read=f"localStorage.getItem('{KEY}')"
 try:
  first=context.new_page()
  first.add_init_script(f"localStorage.setItem('{KEY}','{{broken')")
  first.goto(url,wait_until='domcontentloaded')
  initial=first.evaluate(storage_read)
  first.locator('#save').click()
  before=first.evaluate(storage_read)
  second=context.new_page();second.goto(url,wait_until='domcontentloaded')
  overlap_first=first.evaluate(storage_read);overlap_second=second.evaluate(storage_read)
  first.close()
  after=second.evaluate(storage_read)
  return {'mode':'plain-file-storage','iteration':iteration,'initial':initial,'before_close':before,
   'first_while_both_open':overlap_first,'second_while_both_open':overlap_second,'after_reopen':after,
   'passed':initial=='{broken' and all(value==raw for value in [before,overlap_first,overlap_second,after])}
 finally:context.close()

with sync_playwright() as pw:
 options={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--disable-webgl']}
 if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
 browser=pw.chromium.launch(**options);version=browser.version
 # Serve the exact same standalone artifact for a separate same-origin control.
 # Compare schemes, never use the control to excuse a failing offline trial.
 with ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT/'dist'))) as http:
  server=Thread(target=http.serve_forever,daemon=True);server.start()
  served_url=f'http://127.0.0.1:{http.server_port}/CROWNFOLD-RIFTFRONT.html'
  try:
   for mode,url,count,results in [('offline-file',URL,12,rows),('loopback-same-origin',served_url,4,served)]:
    for iteration in range(count):
     try:results.append(same_document_trial(browser,url,iteration,mode))
     except Exception as exc:errors.append(f'{mode} trial {iteration}: {exc!r}\n'+traceback.format_exc(limit=8))
   with tempfile.TemporaryDirectory(prefix='crownfold-plain-storage-') as folder:
    control=Path(folder)/'CROWNFOLD-PLAIN-STORAGE.html'
    control.write_text("""<!doctype html><meta charset="utf-8"><button id="save">Save preferences</button>
<script>document.getElementById('save').onclick=()=>localStorage.setItem('crownfold-player-settings-v1',
 '{"sensitivity":1,"invertY":false,"volume":1,"soundEnabled":false,"reduceEffects":false}');</script>""",encoding='utf-8')
    for iteration in range(12):
     try:plain.append(plain_file_trial(browser,control.as_uri(),iteration))
     except Exception as exc:errors.append(f'plain-file trial {iteration}: {exc!r}\n'+traceback.format_exc(limit=8))
  finally:
   browser.close()
   http.shutdown();server.join()
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
result={'browser_version':version,'fresh_document_trials':rows,'loopback_same_origin_trials':served,'plain_file_trials':plain,'persistent_profile_restarts':restarts,'errors':errors,'scope':'Standalone via file and loopback, plus script-only file control; no campaign or personal data.'}
(OUT/'settings-persistence-stress.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
assert len(rows)==12 and len(served)==4 and len(plain)==12 and len(restarts)==4 and all(row['passed'] for row in rows+served+plain+restarts) and not errors,'Settings persistence stress regression'
