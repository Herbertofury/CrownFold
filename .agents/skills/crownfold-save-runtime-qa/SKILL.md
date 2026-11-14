---
name: crownfold-save-runtime-qa
description: Implement and verify CrownFold game-state, War Rift checkpoint and Rust/Wasm integration changes while preserving independent modes, old saves and actual rendered-game evidence.
---

# CrownFold save and runtime QA

Read AGENTS.md, README.md, package.json and docs/TECH_STACK_2026.md. CrownFold is an experimental browser vertical slice with an incremental Rust tactics kernel, not a completed native/AAA game.

## Locate feature and state ownership

Separate the JavaScript game/render/UI/checkpoint responsibilities from Rust formation routes, cover occlusion and siege objective transitions. Check rust/ and the actual bridge before moving code. The legacy board game, open world and quick-session modes must remain separately playable; optional wars, settings or renderer fallback must not become hidden requirements for unrelated progression.

Quick and world sessions have separate saves. Preserve their mode/catalog identity and original return location/era. Reading a checkpoint must not grant rewards, repeat quest claims or advance closed-time simulation.

## Exercise the save boundary

Start from representative existing saves and a new session. Test a running War Rift across explicit save, return to title, hidden tab, reload and restart. Verify formations/casualties, orders/control groups, production/support queues, cover damage, supplies, optional sorties, extraction, ammunition/cooldowns and Fold state survive the actual writer/reader path.

Inject unsupported/damaged optional war state and blocked/failed storage. Frontier progress and prior valid bytes must survive; the UI should warn rather than claim a successful save. Leaving after failed persistence must preserve the explicit unsaved-progress choice. New-session replacement must not silently erase the separate campaign. Settings reset must not reset either save.

Quest credit and rewards are separate: repairing late-accepted/stuck quest credit must not duplicate claims. Check exact inventory/resource changes, including blocked full-capacity crafting/consumables spending nothing.

## Use the maintained test layers

Run npm run verify for source checks, deterministic tests and offline HTML regeneration. For tactics changes also use npm run test:rust and check:rust; build:rust is for intentional kernel regeneration with the repository's pinned toolchain.

Use the relevant tests/war_checkpoints.test.mjs, save_catalog_identity.test.mjs, save_gear_stats.test.mjs, settings.test.mjs and rust_tactics.test.mjs. Then follow current .github/workflows setup for affected browser scripts such as tests/war_checkpoints_browser.py, save_catalog_browser.py, settings_browser.py and rust_runtime_browser.py. Inspect each script's prerequisites; do not invent a generic browser test command.

Test the actual dist/CROWNFOLD-RIFTFRONT.html when offline delivery is affected, not only modular development source. Verify the loaded footer/kernel identity and explicit JavaScript compatibility mode when Wasm is unavailable. A generated screenshot alone does not prove controls, restart or durable saves.

## Performance and closeout

npm run benchmark measures headless battle-step CPU cost, not rendered FPS. Compare equivalent simulation/unit counts and outcomes, then measure affected real-browser input/render behavior. Never claim a speedup by dropping units, simulation state or effects without an explicitly accepted tradeoff.

Keep failed save/runtime evidence and exact source/kernel/output identity. Report unit checks, Rust/Wasm parity, browser interactions, remote CI and delivered artifact acceptance separately. Actual audio listening, physical controls and broader accessibility remain distinct from automated checks.
