# Development History, Technical Architecture & Roadmap

## One continuous project

The project is simply **CrownFold**, with six successive development milestones. The old names represent prototypes, not new product names:

| Milestone | Added | Preservation |
| --- | --- | --- |
| **v0.1 — Original CrownFold board game** | Chess-like rotating 3D board, simultaneous tactics, supply networks, Fold/Echo, six piece classes | `legacy/CROWNFOLD-ORIGINAL.html` |
| **v0.2 — Third-person survival warfront** | Third-person combat, procedurally rendered frontier, survival, squad commands, builds, 36-minute six-stage operations | Integrated into main game |
| **v0.3 — Living Frontier RPG** | 18 perks, six spells, loot, 13 quests, three dungeons, 7 original NPCs, safecracking, crime, companions, bounties, crafting | Integrated into main game |
| **v0.4 — Great Entanglement** | Five eras, Advanced Rifts, five RTS campaigns, battalion economy and production, three timewells, era affinity, 9 new NPCs, Chronicle upgrades and timeline persistence | Integrated |
| **v0.5 — Lost Futures** | Five freely chosen commander heritages, ten equally viable historical/future sciences, three equipped slots, four cross-era fusion doctrines, thirteen battalions, four stances and four field powers | Integrated |
| **v0.6 — The Living War** | Three timed repeatable battlefield crises, enemy commander doctrines and supply budgets, military role counters, troop morale/regroup, two destructible siege anchors and command HUD feedback | This release |

## Actual architecture (running code)

The vertical slice uses **dependency-free JavaScript modules**, deterministic fixed-step-ish simulation updates, procedural 3D generated through WebGL2 with a software fallback, a CSS/DOM HUD, browser-local save storage, and an offline bundler that embeds all source modules into a standalone HTML file. It does not yet use Unreal, Godot or Unity. `src/temporal.mjs` owns era rules, `src/war.mjs` owns economic war simulation, `src/sim.mjs` connects shooter and world state, `src/rpg.mjs` owns quest and player records, `src/render.mjs` draws the world, and `src/game.mjs` owns browser input and HUD.

Run `npm test`, `npm run check`, and `npm run build` on Node.js 22+. `tests/chronicle_browser.py` exercises actual travel into a new era, dialogue, Fold, war production, win and return in Chromium/Playwright. `tests/rpg_browser.py` exercises previous v0.3 RPG interaction flows.

### Verified scope at v0.6

144 automated simulation tests passed. The 21-check Chronicle browser run, 23-check Lost Futures browser run, and 11-check War Director browser run passed; the previous 29-check RPG integration remains separately maintained. The new tests compress time or teleport the character to reach integration states, so they do not prove real 30-minute human session quality. Screenshots are recorded as evidence. A complete 36-minute human playthrough, performance on all GPUs, online multiplayer and balance at extreme army sizes have not been validated.

## Measurable AAA acceptance gates (targets, NOT results)

1. **Combat feel:** benchmark aiming, hit reactions, traversal, animation interruption and camera against in-house reference scenarios; 60-fps responsiveness target with no multi-frame input buffering on target hardware.
2. **RTS at scale:** at least 1,000 visible soldiers with independently legible formation behavior, deterministic fixed-tick server combat, layered pathfinding and command latency under 100 ms in local play. Current prototype aggregates at most 120 soldiers into battalion objects, not 1,000 actors.
3. **Dense worlds:** each era has authored towns, indoor spaces, bespoke quests, faction schedules, hand-composed encounters and persistence. Purely procedural empty surface does **not** pass.
4. **Operations:** five 25–45-minute authored campaign arcs with meaningful branching objectives, enemy counterplay, replay variance and complete extraction loops. Current timer is 36 minutes; actual simple scripted campaigns can finish much sooner, so this gate is explicitly **failed**.
5. **Graphics & performance:** native target 1440p/60 FPS with 1% lows at least 45 FPS on an agreed benchmark GPU; automated profiling of streaming, traversal, combat peak, Fold and 1,000-soldier scenes. No real-GPU results yet.
6. **Co-op:** authoritative 4-player session with synchronized world/Fold state, joining mid-campaign, latency compensation, reconnect and save migration, verified under artificial latency/loss. No co-op shipped.
7. **Shippability:** accessibility (remapping, subtitles, color-blind modes), localization, crash-free 30-minute sessions, long-save integrity and UI/controller usability verified by people, not just automated assertions.

**Delivery stage:** browser pre-alpha. These gates are a transparent definition of production readiness, not an assertion of AAA quality.

## Native AAA production target — architectural proposal, not shipped

A future native production is most naturally prototyped in **Unreal Engine 5.8** (version should be reverified before adoption), with World Partition for streaming, PCG for distribution, Nanite for geometry, Lumen for lighting subject to perf budget, gameplay ability architecture for Fold/Echo and combat, Mass Entity or an equivalent data-oriented representation for large soldier counts, async navmesh updates for battlefield rotation, authoritative server simulation and replication, and functional data-driven world-state/save migrations. These are *candidates*, not claims that the systems have been implemented in Unreal or benchmarked here.

### Engineering priorities

1. **Vertical-slice feel:** third-person locomotion, hit reactions, responsive aiming, coherent sound, readable silhouettes, reliable squad control.
2. **RTS deterministic simulation:** spatial partitioning, hierarchical pathfinding, batched combat, capped network interest, fixed timestep, replay determinism and golden-seed scenario tests.
3. **Mutable terrain:** preserve correct collision and navmesh when battlefield tiles move; stable floating origin and multiplayer sync across tile boundaries.
4. **Living worlds:** use region-based streaming and **authored density targets** rather than filling vast empty terrain. Cross-era NPC schedules and persistence should be modeled cheaply by distance and importance.
5. **Campaign design:** hand-authored 30–40-minute objective graphs, fun extraction cadence, escalating enemy strategy, faction progress and options for solo/co-op.
6. **Visual and audio art:** era-specific assets, coherent cross-era silhouettes, contextual animations and orchestration, validated for PC hardware budgets.
7. **Editor-friendly authoring:** data assets and validators for units, quests, biomes, portals, factions, structures and eras. Unit tests for invalid chronology constraints and balancing.

## How to contribute without wiki sprawl

Keep eight canonical pages maximum until content justifies new categories. Changes to mechanics go to their existing thematic page. Individual NPCs, quests and battalions live in tables/sections until large. Maintain **implemented vs proposed** labels prominently. Every production optimization should have a benchmark and reproducible test attached before claiming it is the latest or best.

The repository path `wiki/*.md` is a **mirror**, not GitHub's separate Wiki repository. Sync to the GitHub Wiki manually or through authorized git tooling when available; do not mistake a repository file for a live Wiki page.
