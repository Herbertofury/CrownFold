> **Status, 2026-11-03:** The browser prototype is a dependency-free JavaScript/WebGL2 game, with software rendering fallback. Unreal Engine 5.8 is an evaluated **future native production candidate**, not the current implementation. Reverify engine/tool versions, third-party terms, compatibility and benchmarks before adopting them.

# Modern production architecture — verified November 3, 2026

**Recommendation for eventual high-end native development:** **Unreal Engine 5.8.4** (Oct 20, 2026 stability hotfix) for the full open-world TPS/RTS/survival game. The playable prototype supplied in this repository is deliberately **not** built in Unreal; it is standalone JavaScript + WebGL2 with a software fallback. The browser approach supports immediate offline play and fast gameplay iteration, while the native stack below is a *proposed migration target*, not an implemented engine port.

Official sources:
- Epic: [UE 5.8 is now available](https://www.unrealengine.com/news/unreal-engine-5-8-is-now-available) (Jun 23, 2026).
- Epic: [UE 5.8 release announcement](https://forums.unrealengine.com/t/unreal-engine-5-8-released/2729274) (Jun 17, 2026).
- Epic: [UE 5.8.4 hotfix](https://forums.unrealengine.com/t/5-8-4-hotfix-released/2842775) (Oct 20, 2026).
- Epic: [Latest feature release documentation](https://dev.epicgames.com/documentation/unreal-engine/whats-new?lang=en-US).

## Recommended systems, with readiness gates

| Subsystem | Suggested implementation | Reason / readiness in UE 5.8 |
| --- | --- | --- |
| Core engine | UE 5.8.4 C++ plus Blueprint/data assets | Native tooling, high-quality animation, ecosystem and advanced renderer. Lock target version before production. |
| Open-world streaming | World Partition / Data Layers / HLOD / One File Per Actor | Content streaming and teams authoring a large persistent world. |
| Procedural wilderness | PCG framework + validated procedural recipes; cooked/streamed HLODs | Controlled reproducibility, editability, variation and performance. |
| Experimental world tech | Mesh Terrain, procedural vegetation editor, Fast Geometry Streaming | Treat as R&D toggles and fallback to proven landscapes/mesh pipelines: Epic describes some of these as experimental in 5.8. |
| Geometry/lighting | Nanite, Lumen, Virtual Shadow Maps, MegaLights | Strong cinematic baseline. **MegaLights is production-ready in UE 5.8**; profile on actual target GPU. Lumen Lite is beta and requires visual-validation gate. |
| TPS locomotion/combat | C++ character architecture, Enhanced Input, Motion Matching/animation blueprint, IK retargeting | Responsive locomotion, weapon traces, impacts and animation systems; put controllable latency ahead of fidelity. |
| Combat abilities | Gameplay Ability System (GAS) + Gameplay Tags + cue prediction | Fold/Echo/artillery/medical systems with replicable rules, cooldowns, feedback and constraints. |
| Squad and large RTS layer | MassEntity for crowds if profiled beneficial, StateTree/AI Perception, Navigation System, hierarchical command goals | Keep tactical agents detailed near the player, simulate distant threats cheaply. Measure vs conventional Actor AI before opting into Mass. |
| Physics/destruction | Chaos, selective fracture / geometry collections | Physics interactions with strict CPU/network budgets; Fold must update navigation/recast and ownership coherently. |
| Audio | MetaSounds, spatialization, authored music/sfx, accessibility subtitles | Player and battlefield readability. Procedural browser beeps are temporary only. |
| Networking | Iris replication (production-ready in 5.8), dedicated server, server-authoritative commands | A future co-op architecture; **none of it is present in the playable release**. |
| Tooling | Unreal Insights + automated profiling; Perforce for heavy binary content, Git for code; build pipeline | Frame-time, streaming and content-build monitoring, source control scale. |
| Content production | Blender 5.x LTS or Maya, Houdini/PCG, Substance or equivalent, internally authored photogrammetry when licensed | Art quality comes from asset/animation/level teams, not an engine-version label. |
| Testing | native automated functional tests, playtest telemetry with consent, sim replay determinism, multiplayer soak/perf | Prevent tactical desyncs and content regressions. |

## Code boundaries to preserve in the port

`src/sim.mjs` is the **behavioral reference** for world seeds, inventory, shooting, squads, Fold/Echo costs, objective stages, save data and progression. Port the semantics into an engine-independent native gameplay library with rigorous determinism tests. Do **not** attempt a naive line-by-line reimplementation of the JavaScript WebGL renderer in Unreal.

Use separate Unreal modules/services:

```text
RiftfrontCore       authoritative world simulation, state, world seeds, deterministic commands
RiftfrontSurvival   needs, crafting, inventory, persistence, camps and outposts
RiftfrontCombat     TPS movement, weapons, cues, damage, cover, ability system
RiftfrontTactics    squads, formation behavior, command layers, economic simulation
RiftfrontWorld      PCG biomes, World Partition, Data Layers, navigation and streaming
RiftfrontRifts      mission director, objectives, instanced dungeons and extraction
RiftfrontUI         third-person HUD, RTS tactical view, accessibility
RiftfrontNet        dedicated server and Iris validation (future)
```

**Fold implementation:** Keep the battlefield cell's logical ownership coordinates independent of the visual terrain stream. Represent moving battlefield sub-regions as addressable transforms with clear collision/nav updates. Only rotate topological terrain when that system passes perf and replication test gates; the browser prototype merely rotates battle entities.

**Echo implementation:** Record compact, server-authoritative snapshots of the operative and choose a safe valid rewind state; explicitly disallow rewind exploits (inventory duplication, boss rollback, free traversal into unloaded sectors). In single-player current Echo only restores player position/health/shield.

**Persistence:** Versioned schema with deterministic world seeds + sparse deltas (harvested, built, liberated, faction activity), migration tests, idempotent rewards, atomic checkpoint save. Do not serialize the whole physical world every save.

## Performance and production gates (targets, not achieved results)

- **Performance target:** target 60 fps on defined mainstream PC tier (16.7 ms total), with defined 30-fps fallbacks for minimum GPU. Budget CPU and GPU separately; benchmark scenes with several thousand environment objects and hundreds of strategic agents, not just empty wilderness.
- **Streaming:** 99th-percentile stalls, traversal speed and memory budgets; prove no noticeable blocking on foot, vehicles and warp transition. Profile with real assets and realistic NPC/FX density.
- **Combat:** sustained AI/director performance under boss/industrial combat, responsive input on lower frames, controlled hit latency and deterministic Fold/Echo replication.
- **Open-world:** the weather, harvesting, camps, enemy attacks and reward progression must remain meaningful after 10+ hours rather than simply infinite procedural filler.
- **Operations:** a *playtested* 25–45-minute experience with objective variants, pacing director and fail-forward extraction. Current prototype merely provides a 36-minute limit.
- **Qualify experimental features individually:** new 2026 technology should be adopted when it improves real scenes in profiling, not because it is newest. Lock version and benchmark before production.

## Current prototype tech (what can actually run)

- Standard ES modules, original procedural simulation + low-poly GPU renderer using **WebGL2 instancing**, shader-based lighting/fog, generated terrain, optional 2D Canvas fallback.
- Node.js 22+ only needed to develop/serve/build/test, **not to play** the offline HTML. No npm runtime dependencies, no external CDN assets.
- Browser-local single-player save data; no credentials or telemetry; test coverage in `docs/QA.md`.
- Limitations: no UE5 compiled project, no modern skeletal animation, incomplete physics/collision system, no co-op or multiplayer networking, no serious streaming benchmark and no AAA production-ready art/audio content.
