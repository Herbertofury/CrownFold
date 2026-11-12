"""Offline Chromium UI integration, with explicit state shortcuts for long combat.

Checks real buttons, markers, act-specific orders, debrief persistence, and generic
campaign isolation. This is not an unassisted campaign playthrough or GPU benchmark.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
checks = {}
errors = []

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1600, 'height': 1000}, device_scale_factor=1)
    page.set_default_timeout(15000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    # Verify the honest software-rendered browser path. The held renderer patch
    # is not included; no remote terrain visibility assertion is made here.
    page.add_init_script('''
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
            if (kind === 'webgl2') return null;
            return getContext.call(this, kind, ...args);
        };
    ''')
    try:
        page.goto((ROOT / 'dist/CROWNFOLD-RIFTFRONT.html').as_uri())
        page.wait_for_function('window.__riftfront?.renderer')
        page.locator('#quick-war').click()
        page.wait_for_function('window.__riftfront.active && window.__riftfront.state.war')
        page.wait_for_timeout(500)
        page.keyboard.press('Tab')
        page.wait_for_function('window.__riftfront.commander')
        page.locator('#war-siege-brief summary').click()
        checks['briefing_and_three_optional_choices'] = page.locator('#war-siege-orders li').count() == 3
        checks['deadline_explained'] = 'before destroying the throne' in page.locator('#war-siege-brief').inner_text()
        page.evaluate('window.__riftfront.state.war.expeditionNext = 0')
        page.wait_for_function('window.__riftfront.state.war.expedition?.sortieId === "ledger"')
        page.wait_for_function('document.querySelector("#war-expedition").textContent.includes("SURVEY LEDGER")')
        checks['authored_instructions_rendered'] = '25% FASTER' in page.locator('#war-expedition').inner_text()
        page.locator('#war-track-sortie').click()
        page.wait_for_function('document.querySelector("#marker-title").textContent.includes("SURVEY LEDGER")')
        checks['tracking_button_works'] = page.locator('#war-track-sortie').get_attribute('aria-pressed') == 'true'
        page.wait_for_timeout(300)
        checks['briefing_expansion_and_button_focus_survive_refresh'] = page.evaluate('''
          document.querySelector('#war-siege-brief').open && document.activeElement.id === 'war-track-sortie'
        ''')
        page.screenshot(path=str(OUT / 'eleven-bells-sortie.png'))
        page.locator('#war-siege-brief').scroll_into_view_if_needed()
        page.screenshot(path=str(OUT / 'eleven-bells-briefing.png'))
        page.keyboard.press('Tab')
        page.wait_for_function('!window.__riftfront.commander')
        page.wait_for_timeout(400)
        checks['tracked_sortie_survives_third_person_switch'] = 'OPTIONAL / RECOVER' in page.locator('#marker-title').inner_text()
        page.keyboard.press('Tab')
        page.wait_for_function('window.__riftfront.commander')
        # Occupation is shortened to its final moment; its real live update and reward run.
        page.evaluate('''() => {
            const s = window.__riftfront.state, w = s.war, e = w.expedition;
            w.enemyArmy = []; w.enemyWaveTimer = 1e9;
            s.player.x = e.x; s.player.z = e.z; e.progress = .995;
        }''')
        page.wait_for_function('window.__riftfront.state.war.bellSiege.outcomes.ledger === "success"')
        page.wait_for_function('document.querySelector("#war-track-sortie").disabled')
        checks['completion_clears_tracking'] = 'OPTIONAL' not in page.locator('#marker-title').inner_text()
        checks['ledger_reward_live'] = page.evaluate('window.__riftfront.state.temporal.insight === 4')
        page.evaluate('''() => { const w = window.__riftfront.state.war; w.act = 'anchors'; w.expeditionNext = 0; }''')
        page.wait_for_function('window.__riftfront.state.war.expedition?.sortieId === "foundry"')
        page.wait_for_function('document.querySelector("#war-expedition").textContent.includes("ASH FOUNDRY")')
        checks['foundry_has_own_orders'] = 'ENEMY INCOME -35%' in page.locator('#war-expedition').inner_text()
        page.evaluate('window.__riftfront.state.war.expedition.hp = 0')
        page.wait_for_function('window.__riftfront.state.war.bellSiege.outcomes.foundry === "success"')
        page.wait_for_timeout(120)
        checks['foundry_effect_live'] = page.evaluate('''() => {
            const s = window.__riftfront.state, w = s.war;
            const expected = (1.75 + w.nodes.filter(n => n.owner === 'enemy').length * 2.25) * (1 + .08 * s.operation.difficulty) * .65;
            return Math.abs(w.enemyIncome - expected) < 1e-8;
        }''')
        page.evaluate('''() => { const w = window.__riftfront.state.war; w.act = 'throne'; w.expeditionNext = 0; }''')
        page.wait_for_function('window.__riftfront.state.war.expedition?.sortieId === "bellkeepers"')
        page.wait_for_function('document.querySelector("#war-expedition").textContent.includes("BELLKEEPERS")')
        # Final escort meters, rather than a complete defended journey.
        page.evaluate('''() => {
            const s = window.__riftfront.state, w = s.war, e = w.expedition;
            e.x = w.base.x; e.z = w.base.z - .2; s.player.x = e.x; s.player.z = e.z;
        }''')
        page.wait_for_function('window.__riftfront.state.war.bellSiege.outcomes.bellkeepers === "success"')
        checks['bellkeeper_reward_live'] = page.evaluate('window.__riftfront.state.war.extraction.target === 24')
        page.evaluate('''() => {
            const s = window.__riftfront.state, w = s.war;
            w.anchors.forEach(a => a.hp = 0); w.enemyBase.hp = 0;
            s.player.x = w.extraction.x; s.player.z = w.extraction.z;
        }''')
        page.wait_for_function('window.__riftfront.state.war.act === "extraction"')
        page.locator('#war-extraction-button').click()
        checks['real_extraction_button'] = page.evaluate('window.__riftfront.state.war.extraction.active')
        page.evaluate('''() => { const w = window.__riftfront.state.war; w.enemyArmy = []; w.extraction.nextWave = 1e9; w.extraction.progress = 23.8; }''')
        page.wait_for_function('window.__riftfront.state.zone === "frontier"')
        page.wait_for_function('''() => {
            const raw = localStorage.getItem('crownfold-riftfront-quick-save-v1');
            if (!raw) return false;
            return JSON.parse(raw).temporal.chronicleLog.some(t => t.startsWith('Eleven Bells extracted.'));
        }''')
        checks['win_debrief_and_save'] = page.evaluate('''() => {
            const data = JSON.parse(localStorage.getItem('crownfold-riftfront-quick-save-v1'));
            return data.temporal.wonCampaigns.includes('siege_of_bells') &&
              data.temporal.chronicleLog.some(t => t.startsWith('Eleven Bells extracted.') && (t.match(/SUCCESS/g) || []).length === 3);
        }''')
        # Resume remains a saved frontier, not a falsely claimed mid-mission checkpoint.
        page.reload()
        page.wait_for_function('window.__riftfront?.renderer')
        page.locator('#continue-quick').click()
        page.wait_for_function('window.__riftfront.active')
        page.wait_for_timeout(500)
        checks['quick_resume_restores_report_not_live_war'] = page.evaluate('''
            window.__riftfront.state.zone === 'frontier' && !window.__riftfront.state.war &&
            window.__riftfront.state.temporal.chronicleLog.some(t => t.startsWith('Eleven Bells extracted.'))
        ''')
        page.keyboard.press('c')
        page.wait_for_function('window.__riftfront.rpgMenu')
        checks['chronicle_shows_saved_report'] = 'Eleven Bells extracted.' in page.locator('#rpg-overlay').inner_text()
        page.locator('#rpg-content .rpg-summary').filter(has_text='Eleven Bells extracted.').scroll_into_view_if_needed()
        page.screenshot(path=str(OUT / 'eleven-bells-debrief.png'))
        page.keyboard.press('Escape')
        page.wait_for_function('!window.__riftfront.rpgMenu')
        page.wait_for_timeout(400)
        page.evaluate('window.__riftfront.sim.enterOperation(window.__riftfront.state, 3)')
        page.keyboard.press('Tab')
        page.wait_for_function('window.__riftfront.commander')
        page.evaluate('window.__riftfront.state.war.expeditionNext = 0')
        page.wait_for_function('window.__riftfront.state.war.expedition?.sortieId === "ledger"')
        page.locator('#war-track-sortie').click()
        page.wait_for_function('document.querySelector("#war-track-sortie").getAttribute("aria-pressed") === "true"')
        insight_before_skip = page.evaluate('window.__riftfront.state.temporal.insight')
        page.locator('#war-skip-sortie').click()
        page.wait_for_function('document.querySelector("#war-track-sortie").getAttribute("aria-pressed") === "false"')
        checks['explicit_skip_has_no_reward'] = page.evaluate('''
            window.__riftfront.state.war.bellSiege.outcomes.ledger === 'skipped' &&
            window.__riftfront.state.war.expeditionsCompleted === 0
        ''') and page.evaluate('window.__riftfront.state.temporal.insight') == insight_before_skip and 'OPTIONAL' not in page.locator('#marker-title').inner_text()
        page.evaluate('''() => {
            const {state:s, sim} = window.__riftfront; sim.finishOperation(s, false); sim.enterOperation(s, 4);
            s.war.expeditionNext = 0;
        }''')
        page.wait_for_function('!!window.__riftfront.state.war.expedition')
        page.wait_for_function('document.querySelector("#war-siege-brief").classList.contains("hidden")')
        checks['generic_campaign_preserved'] = page.evaluate('''
            !window.__riftfront.state.war.bellSiege && !window.__riftfront.state.war.expedition.sortieId
        ''') and 'RECOVER THE LIVING ARCHIVE' in page.locator('#war-expedition').inner_text()
        checks['generic_hides_siege_skip'] = not page.locator('#war-skip-sortie').is_visible()
    except Exception as error:
        errors.append(repr(error))
        page.screenshot(path=str(OUT / 'eleven-bells-failure.png'))
    finally:
        browser.close()

result = {'checks': checks, 'errors': errors,
          'scope': 'Offline Chromium / Canvas 2D UI integration with stage, position, damage, and timer shortcuts. Not a full unassisted campaign or hardware GPU test.'}
(OUT / 'eleven-bells-browser.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
assert len(checks) >= 18 and all(checks.values()) and not errors, 'Eleven Bells browser integration failed'
