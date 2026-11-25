# Repository instructions

Read `.agents/foundry/AGENTS-adapter.md` for the pinned shared engineering core.
Keep this file and nested instructions project-owned: setup, commands, constraints and acceptance belong here.

## CrownFold-local contract

- Read README.md and docs/TECH_STACK_2026.md first. This is an experimental browser vertical slice with an incremental Rust/Wasm tactics kernel, not a finished native/AAA game. Preserve the separate playable legacy mode.
- Node.js 22+; use package.json scripts as the command source: `npm test`, `npm run build`, `npm run benchmark`, `npm run check:rust`. The Rust toolchain is pinned in rust-toolchain.toml. Headless battle-step timings are not rendered FPS or native acceptance.
- Preserve independent open-world and quick-war saves, settings and legacy modes. Optional integrations or capabilities must not force unrelated game systems to depend on them. Test cancellation, reload, corrupted checkpoints, failed writes and no-duplicate-reward paths when affected.
- Source gameplay lives in src/ and rust/; rebuild the offline dist artifact through the documented build, never hand-edit it as the sole fix. Rust fallback behavior must remain explicit and tested.
- Keep creative/game-specific decisions and runtime evidence in this repository. Repository wiki source is not proof of live Wiki publication. Never publish personal saves, credentials or unlicensed assets.

## Mandatory pre-release optimization gate

Before finalizing every release, follow the owner-mandated [Athena zero-loss pre-release optimization standard](https://github.com/Herbertofury/Athena/blob/main/guidance/PRE_RELEASE_OPTIMIZATION.md). Evaluate shrink-anything, fast-anything and rust-anything using reviewed pinned tools in isolated worktrees; run applicable passes, compare equivalent complete workloads, keep only independently verified improvements, restore rejected changes, and record per-tool evidence or explicit inapplicability/blockers. Never weaken tests, delete required content, force a Rust rewrite or regress functionality, quality, portability, compatibility, security or protected performance metrics. Data/documentation-only releases and existing native Rust paths require honest applicability decisions, not artificial ports. Existing local and pinned governance requirements remain intact.

## Mandatory CLI-first / non-interruptive execution

For every task, follow the owner-mandated [Athena CLI-first execution standard](https://github.com/Herbertofury/Athena/blob/main/guidance/CLI_FIRST_EXECUTION.md). Prefer fast official CLI/headless commands, supported APIs/SDKs/connectors and tested local automation. If a required application has no usable structured interface, discover or build a reviewed [CLI-Anything](https://github.com/HKUDS/CLI-Anything) harness over the real supported backend (or a native command surface for first-party code). Use isolated browser/renderer/test sessions for necessary UI proof. Never take over the user's active desktop, mouse, keyboard, focus or browser profile without explicit authorization for unavoidable foreground interaction. Preserve real runtime acceptance, data, permissions, feature parity and portable mode. Record reusable command coverage and unresolved gaps; no fake CLI parity or unnecessary release delay.

## Cross-project Game Systems Exchange

For technology cards, research/loadout synergies, progression, encounters, saves or any future roguelike/card-game mode, consult [Athena's Game Systems Exchange](https://github.com/Herbertofury/Athena/blob/main/docs/GAME-SYSTEMS-EXCHANGE.md), [Athena #364](https://github.com/Herbertofury/Athena/issues/364), and [the shared gameplay capability registry](https://github.com/Herbertofury/Athena/blob/main/guidance/registry/shared-capabilities.json). Compare JetSetCraft and Modhunter implementations before adding duplicate generic systems.

CrownFold remains its own strategy/RPG experience. Its technology/research cards and synergy recipes are loadout mechanics, not a full deckbuilder; its Fold/Echo, war simulation, persistent frontier and mission progression remain host-specific. Share card metadata, typed effect/synergy contracts, deterministic fixtures and migration patterns where compatible. Contribute exact source commits, tests, evidence and limitations to Athena after material improvements; do not claim a reusable engine until two compatible real hosts accept it.

## Athena Engine Foundry — shared game-engine source of truth

Before creating or materially changing card-game rules, deckbuilding, roguelite runs, survivor combat, encounter/reward systems, mascot actors, open-world simulation, vehicles, missions, save progression or game runtime/rendering, consult [Athena Engine Foundry](https://github.com/Herbertofury/Athena/blob/main/docs/ENGINE-FOUNDRY.md), its [package catalog](https://github.com/Herbertofury/Athena/blob/main/engines/catalog.json), and [M5 issue #365](https://github.com/Herbertofury/Athena/issues/365). Reuse or improve the strongest verified compatible engine; contribute generic improvements and fixtures back to Athena. Keep this repository's unique content, UI, balance, assets, saves and host adapters local. Do not create a parallel engine or independently edit an immutable Athena intake snapshot. Consumers must pin an exact local package/source digest, pass their own full acceptance and retain rollback; no application runtime may depend on an online Athena service. A source candidate or prototype is not a verified engine release.
