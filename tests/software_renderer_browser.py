"""Real Canvas 2D regression for distant RTS terrain and objective rendering.

This isolates rendering through the game's existing debug API. It does not test
pointer capture, browser input, WebGL, or performance.
"""
import base64
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.add_init_script('''
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
            if (kind === 'webgl2') return null;
            return getContext.call(this, kind, ...args);
        };
    ''')
    try:
        page.goto((ROOT / 'dist/CROWNFOLD-RIFTFRONT.html').as_uri())
        page.wait_for_function('window.__riftfront?.renderer?.software')
        result = page.evaluate('''() => {
            const {state:s, renderer:r, sim} = window.__riftfront;
            sim.enterOperation(s, 3);
            const player = [s.player.x, s.player.z], base = s.war.enemyBase;
            const distance = Math.hypot(base.x-player[0], base.z-player[1]);
            r.tactical.x = base.x; r.tactical.z = base.z; r.tactical.zoom = 78;
            const project = r.project, samples = [];
            r.project = function(point) { samples.push(point); return project.call(this, point); };
            try { r.drawScene(s, {commander:true}); } finally { r.project = project; }
            const terrain = [0,2].map(axis => ({
                min:Math.min(...samples.map(p=>p[axis])),
                max:Math.max(...samples.map(p=>p[axis]))
            }));
            const allMeshes = r.meshes, gem = allMeshes.gem, markers = [];
            for (let i=0; i<gem.instancesData.length; i+=20) {
                const instance = gem.instancesData.slice(i,i+20);
                if (instance[12]===base.x && instance[14]===base.z) markers.push(...instance);
            }
            let changedPixels = 0;
            try {
                r.meshes = {};
                r.drawSoftware(s, {commander:true});
                const terrainOnly = r.ctx.getImageData(0,0,r.canvas.width,r.canvas.height).data;
                r.meshes = {gem:{...gem, instancesData:markers}};
                r.drawSoftware(s, {commander:true});
                const withObjective = r.ctx.getImageData(0,0,r.canvas.width,r.canvas.height).data;
                for (let i=0; i<terrainOnly.length; i+=4) {
                    if (terrainOnly[i]!==withObjective[i] || terrainOnly[i+1]!==withObjective[i+1] || terrainOnly[i+2]!==withObjective[i+2]) changedPixels++;
                }
            } finally { r.meshes = allMeshes; }
            r.drawScene(s, {commander:true});
            const png = r.canvas.toDataURL('image/png');
            const transitions = [];
            for (const commander of [false,true,false,true]) {
                r.drawScene(s, {commander});
                transitions.push(r.focus === (commander?r.tactical:s.player));
            }
            return {software:r.software, distance, base:{x:base.x,z:base.z}, terrain,
                samples:samples.length, markers:markers.length/20, changedPixels, transitions,
                stationary:player[0]===s.player.x && player[1]===s.player.z, png};
        }''')
        (OUT / 'software-tactical-objective.png').write_bytes(base64.b64decode(result.pop('png').split(',')[1]))
        result['errors'] = errors
        (OUT / 'software-renderer-browser.json').write_text(json.dumps(result, indent=2))
        print(json.dumps(result, indent=2))
        assert result['software'] and result['distance'] > 75
        assert result['samples'] == 14 * 14 * 4
        for axis, key in enumerate(['x', 'z']):
            center = result['base'][key] // 13 * 13
            assert result['terrain'][axis] == {'min': center - 91, 'max': center + 91}
        assert result['markers'] > 0 and result['changedPixels'] > 20
        assert result['stationary'] and all(result['transitions'])
        assert not errors, errors
    finally:
        browser.close()
print('PASS: real Canvas 2D distant objective pixels, terrain focus, and camera transitions')
