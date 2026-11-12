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
