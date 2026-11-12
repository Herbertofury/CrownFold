"""Served + self-contained Rust runtime smoke. Real rendering, not a performance claim."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
with sync_playwright() as pw:
    options = {'headless': True, 'args': ['--no-sandbox', '--enable-unsafe-swiftshader']}
    if os.environ.get('CHROMIUM_PATH'):
        options['executable_path'] = os.environ['CHROMIUM_PATH']
    browser = pw.chromium.launch(**options)
    for label, url in [('served', 'http://127.0.0.1:3040/'), ('offline', (ROOT / 'dist/CROWNFOLD-RIFTFRONT.html').as_uri())]:
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        page.wait_for_function("window.__riftfront?.tactics.backend === 'rust-wasm'")
        assert 'RUST TACTICS' in page.locator('#tactics-runtime').inner_text()
        page.locator('#quick-war').click()
        page.wait_for_function('window.__riftfront.state.war && window.__riftfront.tactics.calls.path > 0')
        page.keyboard.press('Tab')
        page.wait_for_function('window.__riftfront.commander')
        page.screenshot(path=str(OUT / f'rust-{label}-tactics.png'))
        page.keyboard.press('Tab')
        page.keyboard.press('Escape')
        page.locator('#back-menu').click()
        assert page.locator('#continue-quick').is_enabled()
        assert not errors, errors
        page.close()
    page = browser.new_page()
    page.add_init_script('globalThis.WebAssembly = undefined')
    page.goto('http://127.0.0.1:3040/')
    page.wait_for_function("window.__riftfront?.tactics.backend === 'javascript'")
    page.locator('#quick-war').click()
    page.wait_for_function('window.__riftfront.state.war && window.__riftfront.tactics.calls.fallback > 0')
    assert 'COMPATIBILITY MODE' in page.locator('#tactics-runtime').inner_text()
    browser.close()
print('PASS: served/offline Rust tactics, command view, quick save, and JS fallback')
