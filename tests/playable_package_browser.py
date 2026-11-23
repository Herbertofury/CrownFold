"""Check that both extracted HTML files can start a game without a web connection."""
import argparse
from pathlib import Path
import re
import tempfile
import zipfile
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('archive', type=Path)
archive = parser.parse_args().archive
front, classic = 'CROWNFOLD-RIFTFRONT.html', 'CROWNFOLD-ORIGINAL.html'

with tempfile.TemporaryDirectory(prefix='crownfold-playable-') as folder:
    target = Path(folder)
    with zipfile.ZipFile(archive) as bundle:
        for name in (front, classic):
            (target / name).write_bytes(bundle.read(name))
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--enable-unsafe-swiftshader'])
        for name in (front, classic):
            with browser.new_context(viewport={'width': 1440, 'height': 900}) as context:
                context.route(re.compile(r'^https?://'), lambda route: route.abort())
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto((target / name).as_uri())
                if name == front:
                    page.wait_for_function("window.__riftfront?.tactics.backend === 'rust-wasm'")
                    page.locator('#quick-war').click()
                    page.wait_for_function('window.__riftfront?.state.war && window.__riftfront.tactics.calls.path > 0')
                else:
                    page.locator('#play').click()
                    page.locator('#hud').wait_for(state='visible')
                    assert not page.locator('#error').is_visible()
                    assert page.locator('#board').is_visible()
                assert not errors, (name, errors)
                print(f'PASS: extracted {name} starts with HTTP(S) blocked')
        browser.close()
