# Eleven Bells: authored siege choices

## What changed

The first War Rift, **The Siege of Eleven Bells**, now has a finite set of authored optional orders. The Bell Regent holds the Crownless March through routes, payroll and civilian captivity. These choices are attached to the existing four-act siege rather than a repeating random crisis loop.

| Order | Available from | Completion | Consequence this siege |
| --- | --- | --- | --- |
| Recover the Survey Ledger | Foothold | Occupy the western cache uncontested | +125 supplies, +4 Insight, 25% faster allied well capture |
| Silence Ash Foundry | Anchors | Destroy the eastern signal furnace | +155 supplies, +2 Insight, permanent 35% reduction in enemy supply income, plus the existing temporary reinforcement slowdown |
| Bring the Bellkeepers Home | Throne | Accompany the convoy back to your keep | +125 supplies, +2 Insight, extraction takes 24 seconds instead of 36 |

The ledger multiplier stacks with commander capture bonuses. Foundry sabotage does not erase the enemy's existing supplies, change troop strength or stop already spawned units. The Bellkeeper rescue does not bypass signaling, proximity, contesting enemies or the need to defend extraction. All three are optional; the main four-act victory conditions still apply.

Orders are offered one at a time. A current order can continue across an act transition. **Leave This Sortie / No Reward** marks it skipped, awards nothing and opens the next order when its act is unlocked. Timeouts or a destroyed convoy count as failures and retain the existing enemy-supply penalty. Destroying the throne closes all unresolved orders as missed without charging a failure penalty. No order can pay out twice in the same siege. Starting a new siege resets its temporary benefits.

## Playing it

1. Open the generated `dist/CROWNFOLD-RIFTFRONT.html` in a desktop browser and choose **Quick War**. It uses the existing separate quick-session save slot.
2. Press **Tab** and open **Eleven Bells / Optional Field Orders** for the brief and live outcomes. The first dispatch arrives after 24 simulation seconds. Later unlocked dispatches use an eight-second interval after resolving or leaving the current one.
3. Follow the amber ring on the tactical map. **Track Optional Sortie** changes your world waypoint, including when you return to third person. Click **Track Main Siege Objective** to return to the main target. Tracking clears when that sortie ends.
4. Help, fight, escort or deliberately leave each order. Rescue the Bellkeepers **before** destroying the throne. Once it falls, call extraction and hold the corridor.
5. After victory, defeat or withdrawal, press **C** to read the saved field report in the Chronicle. Success, failed, skipped and missed outcomes are distinct. **Continue Quick Session** restores frontier progress and the report; it does not resume an in-progress battle.

The other four campaigns retain their generic, repeating crisis director. The original standalone board game is unchanged.

## Verification scope

- `npm run check`, `npm test`, `npm run build`, and `git diff --check` are the local checks.
- `tests/eleven_bells.test.mjs` covers stage gates, uncontested occupation, map clearance, exact economic effects, convoy movement and failure, skip behavior, duplicate-reward prevention, extraction safety, withdrawal, save round trips and generic campaign isolation.
- `tests/eleven_bells_browser.py` is a hosted Chromium integration check of real controls, tracking, readable mission text, field-report persistence, quick-session reload and generic UI isolation. It intentionally shortens battles with position, stage, damage and timer changes. It is not a human playtest.
- Browser CI uploads screenshots and a JSON result. Check the workflow on the exact branch head before claiming its UI checks passed.

## Limits and integration

This is an authored mission-content increment in the browser pre-alpha, using existing procedural art and aggregate armies. It does not prove 20–30-minute balance, high-end visual quality, target-hardware frame rates, full unassisted campaign completion, voice acting, a native Rust executable or multiplayer. Real campaign pacing and enjoyment still require repeated human playtests.

The authored siege has been reconciled with the approved Rust tactical runtime and tactical-camera renderer fixes in main. Its generated offline HTML is rebuilt from the combined source, preserving Rust/Wasm routing, the JavaScript compatibility mode, source-mode server routes, save protections and software-renderer camera focus. The siege UI harness uses offline HTML; the separate gameplay and renderer harnesses cover the served runtime and distant tactical view.
