# Rust-first CrownFold architecture

Updated 2026-11-12. This supersedes the previous Unreal production proposal. The project direction is Rust; it does not require abandoning the existing playable game or pretending the whole engine has already been ported.

## Running today

- `rust/crownfold-tactics` is an engine-independent, dependency-free Rust library. It owns bounded formation A*, cover occlusion, blocked-position and segment-circle queries, plus versioned siege objective validation and transitions.
- `src/battlefield.mjs` calls that library compiled to WebAssembly during actual War Rift simulation. The browser renderer, UI, combat, RPG, economy and checkpoint encoding/storage remain JavaScript.
- The same crate builds and tests natively. This is a reusable native gameplay foundation, **not a native game executable**.
- The compiled 68,476-byte Wasm module is embedded in the offline HTML through a generated JS data module. Players need neither Rust nor an external download. There are no Wasm host imports or third-party Rust crates.
- If Wasm cannot initialize, the title-screen footer explicitly reports JavaScript compatibility mode. It uses the maintained reference implementation and does not discard saves.
- Cover/grid clearance now agrees at 2.3 meters. Grid edges and the connection from the actual unit position are checked before emitting a route, fixing corner-grazing and first-waypoint cover crossings.

## Build and verification

Node.js 22+ runs existing developer workflows. Editing the Rust kernel also needs the official Rust toolchain pinned in `rust-toolchain.toml` (1.99.1, wasm32-unknown-unknown, rustfmt and Clippy).

```sh
npm run test:rust
cargo fmt --manifest-path rust/Cargo.toml --check
cargo clippy --manifest-path rust/Cargo.toml --all-targets -- -D warnings
npm run build:rust
npm run check:rust
npm run build
npm run check
npm test
npm run benchmark
npm start
```

Open http://127.0.0.1:3040/ for source-mode play, or open `dist/CROWNFOLD-RIFTFRONT.html` directly. `build:rust` regenerates the checked-in Wasm data; `check:rust` rebuilds and compares its exact bytes. `build` only bundles committed runtime code, so ordinary JS development does not require a Rust installation. Commit both rebuilt artifacts after Rust edits.

The synchronous Wasm bridge has a versioned API, validates finite cover values, caps cover input at 1,024, and caps path search at 10,000 iterations. The normal game uses seven cover objects and a 2,100-iteration budget. Oversized cover lists use the JS reference rather than silently truncating collisions. It owns Rust buffers and uses no unsafe raw-pointer interface. Input is synchronized per query so destruction and Fold movement cannot leave stale cover caches.

Native tests, seeded geometry comparisons, route-clearance regressions, a live 50-second simulated war, delivered-module tests and an offline import-map check are automated. The CI workflow also runs browser checks for source-mode/offline startup, tactical command mode, quick saves and explicit fallback. Browser checks are distinct from hardware GPU testing and full human sessions.

## Current performance evidence

A local CPU-only run of the existing five-map, 80-aggregate-battalion, 450-tick harness reported Rust-backed average ticks of 0.475–0.698 ms and p95 ticks of 0.856–1.635 ms. It recorded 3,064 Rust route calls and 1,929 Rust occlusion calls with zero fallback queries. These are single-run observations on the build host, not stable performance guarantees, graphics FPS or 1,000 individually simulated soldiers.

The JS compatibility run was slightly faster in this small scene (average 0.430–0.666 ms). No Rust speedup is claimed. This milestone establishes a tested gameplay boundary and native reuse. Profile larger, representative scenes before moving more work across the ABI. Each backend is repeatable for identical inputs; bit-identical full-game replays between JS and Rust are not yet a contract.

## Next coherent playable milestone

1. **One complete authored War Rift:** make a compelling 20–30-minute Crownless March siege with reliable extraction, intentional pacing and persistent rewards. Preserve the five-era vision without spreading content production too thin.
2. **Rust gameplay authority:** migrate fixed-tick movement, projectile impacts and objective state into a native/Wasm simulation crate with command logs, deterministic replay tests, stable IDs and versioned checkpoints. Keep rendering and presentation separate.
3. **Native renderer evaluation:** compare a Rust-native engine/ECS renderer (for example Bevy/wgpu) against a small, representative battlefield. Select only after measuring controller feel, animation tooling, scene streaming, frame times and packaging. Neither a native renderer nor any particular framework is integrated yet.
4. **Production-quality combat and art:** camera collision, animation transitions, readable squads, authored environmental storytelling, spatial audio, accessibility and input rebinding. Assets and composition, not the language label, determine visual quality.
5. **Measured scale:** profile spatial queries, allocation, path reuse and distant simulation; then test hundreds of visible actors on specified target hardware. Keep aggregate strategic simulation where detailed actors add no player value.
6. **Persistence and co-op:** atomic checkpoints, migration/corruption recovery, authoritative command validation, then reconnect and network-loss testing. War Rifts now resume browser-local mid-battle checkpoints. Classic shooter operations and dungeons still do not; networked authority remains future work.

## Honest acceptance gates

The product remains a browser pre-alpha. A full native Rust executable, production assets, mature physics, streaming cities, skeletal animation, co-op, controller/accessibility coverage, target-GPU frame budgets and complete unassisted campaign playtests remain outstanding. The original board mode and current saves stay available during incremental migration. The Rust direction replaces the old Unreal recommendation; it does not convert those old architectural aspirations into delivered features.

## War Rift checkpoint slice

The objective ABI is independently versioned at 1; the original geometry ABI stays at 1. The pure Rust `objectives::step` accepts current siege state and battlefield observations, then returns at most one act transition or terminal outcome. JavaScript handles corresponding event presentation, supply rewards and rearguard spawning. This is not fixed-tick authority for all combat or a multiplayer security boundary. The explicit JavaScript compatibility backend preserves the same rules.

The existing v1 frontier JSON gains an optional `warCheckpoint` v1 envelope. Its bounded JSON payload stores the live simulation fields, and an FNV checksum detects accidental corruption (not tampering). Required shape/enum checks and Rust objective validation finish before applying anything. Unsupported/damaged checkpoints recover the separate frontier representation. One localStorage replacement commits the frontier representation and active checkpoint together; rewards clear the checkpoint in the next successful write. No reward is granted merely by loading.

`tests/war_checkpoints.test.mjs` covers all five campaigns, resumed/uninterrupted state equality, supports/training/projectiles, same-frame casualties, all siege acts, extraction settlement, return eras, Fold fields, legacy migration, malformed checkpoints and no-Wasm compatibility. `tests/war_checkpoints_browser.py` checks served/offline/fallback UI save/reload, independent slots/settings, corruption recovery and failed storage writes with fixture-assisted combat setup. It does not replace a complete human campaign or hardware GPU test.
