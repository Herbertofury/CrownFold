# Comparable games and design benchmarks

## Identity

[CrownFold](README.md) combines temporal traversal, survival/RPG play and army command. Its prototype and aggregate battalions must not be described as feature-equivalent to a finished commercial open-world game. This page supplements [development and QA](wiki/Development-And-Tech.md), not the implementation backlog's acceptance evidence.

| Reference and source | Evidence scope | Comparison question |
|---|---|---|
| [Mount & Blade II: Bannerlord](https://www.taleworlds.com/en/Games/Bannerlord/Features) | Official feature-page search excerpt: strategy/action RPG and sandbox campaign. Direct page retrieval returned 403 in this pass; full page not reviewed. | Can the player move from individual combat to understandable army orders without losing situational awareness? Study command clarity, not imitation of its scale. |
| [Quantum Break](https://www.remedygames.com/games/quantum-break) | Official description of time-amplified action and choices | Do temporal abilities visibly explain what changed, what resisted and what the player can do next? Its cinematic production is not a parity promise. |
| [The Aether](https://github.com/The-Aether-Team/The-Aether) | Official adventure-mod repository | Use as a distinct-world identity reference: does each era offer recognizable rules and traversal, rather than a color overlay? This is an exploratory comparison, not an engine recommendation. |

## Evaluation backlog

- [ ] One complete encounter: discover threat, use a temporal ability, issue a formation order, recover and save. Record task completion, mistaken orders, readable feedback and frame times.
- [ ] Era identity rubric: navigation cues, hazards, resources, enemy behavior and consequences. Mark currently visual-only differences explicitly.
- [ ] Resume and failure drill: interrupted combat, defeat, camp recovery, export/import and browser restart preserve accepted state. Compare recovery friction against the project's own last-good build.
- [ ] Scale honesty: benchmark actual aggregate formations separately from individually simulated agents. Do not claim commercial-game army parity from a geometry microbenchmark.
- [ ] Check official competitor updates for relevant command/accessibility improvements; propose original designs only after seeing a concrete user benefit.

**Priority:** complete, readable core loop and durable saves before world-size or cinematic promises. No changes to the pending equipment/refit/backup work are made by this documentation pass.

## Evidence and maintenance contract

Reviewed 2026-11-12. This is a public-source design comparison, not a hands-on benchmark, exhaustive market ranking, feature acceptance, or permission to copy code/assets. Source pages may describe newer loaders or editions than our target. Recheck exact versions, licenses and integration boundaries before implementation. Preserve approved identity and existing progress; do not replace working systems merely because a competitor exists.

During each daily review, check linked official release notes/issues and update only material changes. Record source date, observation, relevance, proposed experiment and result separately. Retain failed comparisons and the last-good evidence. Community complaints are leads, not established product defects. New speculative features remain proposals until approved. Before claiming improvement, compare the same workload and retain latency/frame-time, memory, correctness and recovery results on the actual project build.

## Review log

- 2026-11-12: initial repository-scoped comparison index; official sources reviewed at documentation level. No gameplay, performance or compatibility tests run in this pass. No implementation or native GitHub Wiki publication claimed.

## Candidate foundations, concrete reuse and shared work

| Candidate | Exact useful technique / build-on boundary | Improvement experiment |
|---|---|---|
| Existing `rust/crownfold-tactics` and offline web runtime | Preserve current native/Wasm tactical geometry, JS fallback, saves and offline packaging. This is the default foundation, not a disposable prototype. | Capture an identical battlefield/seed/save and assess correctness plus end-to-end input/frame latency before replacing any subsystem. |
| [three.js](https://github.com/mrdoob/three.js) | Candidate browser renderer infrastructure and scene/resource management, not a full game rewrite. Evaluate only against the actual current renderer. | Isolate one representative battlefield with the same formations, materials, camera and fallback requirements; compare cold load, interaction latency, memory and offline completeness. |
| [wgpu](https://github.com/gfx-rs/wgpu) | Candidate Rust graphics abstraction if a future Rust renderer solves a measured limitation. It does not by itself supply gameplay, UI or save migration. | Keep a separate renderer experiment; check device support, browser/native targets, startup cost and shader failure behavior before choosing it. |

**Licensing evidence checked:** three.js [MIT license](https://github.com/mrdoob/three.js/blob/dev/LICENSE) blob `8ada2a5f982916b0ba4b7a0aa7de347587e745d7`; wgpu [MIT option](https://github.com/gfx-rs/wgpu/blob/trunk/LICENSE.MIT) blob `709e6b7fd4d7ba60826365d30f7fdc164dc8f6cd`. Audit exact packages and example assets independently. Commercial game comparisons do not authorize copying their assets or UI.

### Shared-work proposals

- [Athena R&D](https://github.com/Herbertofury/Athena) is the destination for the rendering experiment protocol and raw comparison evidence; Engineering-Atlas is retained only as migration/provenance source. Do not recommend a framework in another project merely because this prototype likes it.
- Hover's future asset-preview work could share original camera-control/accessibility test scenarios and explicitly licensed format fixtures, not game-specific simulation or private assets.
- Keep save envelopes/version migrations project-owned. A shared interruption/rollback test format is more appropriate than a global save format forced onto unrelated applications.

- [ ] Measure the current renderer first; admit only the smallest candidate that addresses a reproduced bottleneck.
- [ ] Preserve offline and fallback acceptance throughout any experiment.

### Reuse admission gates

These are **candidate foundations and experiments**, not selected dependencies or measured improvements. Before reuse: pin the exact version/commit and loader; inspect its source and dependency tree; record code, asset, trademark and redistribution terms separately; keep required notices; verify permission where terms are restrictive or unclear. Public visibility is not a license. A current default-branch license is evidence for that snapshot, not every historical release. Prefer an upstream dependency/API or a small original adapter over a fork when it preserves compatibility. Do not copy proprietary game assets or publish private fixtures.

For every admitted experiment retain baseline and candidate artifacts, representative native workloads, correctness/feature parity, cold/warm latency, p95 frame/tick time, memory, interrupted-save/recovery evidence and rollback. Promote only after the actual target improves without losing requirements. Cross-project sharing below is an interface proposal, not permission to change another project's implementation or declare integration complete.

## Focused upstream refresh: 2026-11-13

Checked official [wgpu releases](https://github.com/gfx-rs/wgpu/releases/tag/v30.0.2) and [Three.js r187](https://github.com/mrdoob/three.js/releases/tag/r187). This is a source review, not a target benchmark or an adoption recommendation.

- **wgpu v30.0.2**, released November 12, fixes mapped-buffer use-after-free during device loss/destruction and a texture-ID leak when surface acquisition returns no texture. The prior review recorded only a date, so whether this release postdates that review is unknown. It was not recorded in this document before this pass. The tagged [MIT license](https://github.com/gfx-rs/wgpu/blob/v30.0.2/LICENSE.MIT) was checked (blob `8d02e4dbd5f15740abd348fa5d52587cac00c6ea`); dependency and asset terms still require separate review.
- **Three.js r187**, October 30, remains the latest release shown by the official page. Relevant existing fixes include BatchedMesh sorting, geometry resize draw ranges and old matrix-data leakage. These are newly recorded leads, not changes claimed to have shipped since yesterday.
- **Next bounded experiment belongs in Athena R&D**, not a CrownFold dependency replacement: on the same battlefield, exercise repeated resource resize/recreation, device loss and missing-surface recovery; retain memory growth, correct draw ranges, fallback behavior and p95 frame time against CrownFold's current implementation. No implementation, dependency, gameplay or performance acceptance is claimed here.
