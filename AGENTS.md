# Repository instructions

Read `.agents/foundry/AGENTS-adapter.md` for the pinned shared engineering core.
Keep this file and nested instructions project-owned: setup, commands, constraints and acceptance belong here.

## CrownFold-local contract

- Read README.md and docs/TECH_STACK_2026.md first. This is an experimental browser vertical slice with an incremental Rust/Wasm tactics kernel, not a finished native/AAA game. Preserve the separate playable legacy mode.
- Node.js 22+; use package.json scripts as the command source: `npm test`, `npm run build`, `npm run benchmark`, `npm run check:rust`. The Rust toolchain is pinned in rust-toolchain.toml. Headless battle-step timings are not rendered FPS or native acceptance.
- Preserve independent open-world and quick-war saves, settings and legacy modes. Optional integrations or capabilities must not force unrelated game systems to depend on them. Test cancellation, reload, corrupted checkpoints, failed writes and no-duplicate-reward paths when affected.
- Source gameplay lives in src/ and rust/; rebuild the offline dist artifact through the documented build, never hand-edit it as the sole fix. Rust fallback behavior must remain explicit and tested.
- Keep creative/game-specific decisions and runtime evidence in this repository. Repository wiki source is not proof of live Wiki publication. Never publish personal saves, credentials or unlicensed assets.
