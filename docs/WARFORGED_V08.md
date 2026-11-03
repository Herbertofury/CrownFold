# CrownFold v0.8 — Warforged Combat & Navigation

**Build classification:** playable experimental browser pre-alpha, not AAA-quality production. **Date:** 2026-11-03.

## Why this iteration exists

v0.7 made five War Rift campaigns multi-act operations, but units could walk straight through battlefield props and most ranged hostiles inflicted instant, impossible-to-dodge hits. v0.8 improves the actual ground-and-command feedback loop. Historical eras remain aesthetic and strategic identities, not technology tiers.

## What shipped and how to play it

| System | Implementation | Counterplay |
| --- | --- | --- |
| Destructible battlefield cover | Seven deterministic physical cover sites per War Rift, with four period-inspired designs and visible damage states | Ranged infantry and player bullets hit the cover before targets; attackers can destroy it, flank around it or use artillery |
| RTS terrain routing | Bounded A* on a 7m navigation grid, diagonal corner-cut prevention, direct-path shortcuts and path caching | Troops detour around intact cover; damaging the cover invalidates cached routes; commanders can pick flanking destinations |
| Shooter positional combat | The third-person player's movement is blocked by intact cover and can use it as protection | Cover changes line of fire, rather than acting only as decoration |
| Reactable enemy fire | Ranged enemies telegraph an aimed landing zone before firing; time-to-impact and danger radius vary by type | Move, sprint or dodge to avoid a pending attack instead of suffering unavoidable hits |
| Precision reward | The player can hit a vulnerable head region with real ray aiming, dealing increased damage and causing a short enemy stagger | Aim and timing matter for heavy targets; body shots remain viable |
| Visible feedback | Procedural cover models, health indicators, attack-target rings, weak-point hit feedback and crosshair styling | Players can read what blocked them and when a projectile is about to land |

No proprietary assets or source code from Helldivers 2, Kingmakers, Fallout or Skyrim were used. These systems are original prototype implementations.

## Regression and testing

- `npm test`: **176/176 deterministic simulation tests pass**, including 11 new Warforged tests.
- `python3 tests/battlefield_browser.py`: **8/8 real Chromium checks pass**, verifying cover, projectile warnings, shooting destruction and browser-runtime health.
- Previously existing simulation tests preserve mission phases, Fold/Echo, role counterplay, survival, inventory and RPG systems.
- Historical Chromium suites test the original shooter, 29 RPG interactions, cross-era travel, lost-science choices, war director, four-act war missions and separate tactical camera. These automated tests include shortcuts/forced state to reach deep scenes; they **are not proof of human-tested 30–40-minute mission pacing**.
- `npm run benchmark`: deterministic setup with **80 aggregate battalions in each of five War Rift scenarios**, running 450 simulation steps at a 30 Hz logical timestep. Results are **headless Node.js CPU simulation time** only; no physical GPU, rendering, networking, thousands of individual AI soldiers or frame-pacing claim. Rerun on target machines and include device details in findings.

## Engineering limitations and honest remaining production work

- The formation navigation grid is an approximate 2D plane; it is not a full 3D navmesh, does not handle elevation constraints, physically moving terrain, bridges, vehicles, formations fitting through narrow corridors, or network-authoritative path consistency.
- Cover is seven destruction-enabled circular footprints per warfront, not voxel destruction, deformation or detailed physics-driven building collapse.
- Enemy fire is a simple readable targeting-and-impact model, not full ballistic projectile simulation, animation-driven aim or polished combat AI.
- The shooter has no professional animation set, hit-stop/motion matching/impact VFX pipeline, spatial audio mix or motion-captured locomotion. Browser screenshots use a software fallback, not benchmarked hardware WebGL2.
- War Rift missions have a 36-minute upper limit but no verified sample of satisfying 30–40-minute unassisted human playthroughs. Dense authored open worlds, co-op, vehicles, production-grade saves, localization and accessibility remain absent.

## Acceptance gates for the next tranche

1. Run **human** full-length missions, capture deaths/retries/decision points, and rebalance for pacing and clarity rather than an arbitrary timer.
2. Ship a vertical-slice combat-feel lab: weapon recoil and reload animation, contextual audio, hit-stop, physical tracers, melee reactions, camera collision, controller bindings and user options; track 1% lows and input latency on target PCs.
3. Build a hierarchical navmesh and squad formation controller with large-scale lane costs, dynamic terrain rebuilds and deterministic replay in a networked setting.
4. Validate physical GPU rendering at representative battle density on real hardware, with a fixed device and resolution performance budget.
5. Prototype server-authoritative 2–4-player co-op (player and command modes), replay reconciliation, drop-in/reconnect and 30-minute stability.
6. Author at least one complete, distinctive 30–40-minute multi-route War Rift with dialogue, memorable boss/mechanics, destruction and meaningful branching results.

Do not describe CrownFold as AAA-ready until these and broader content/quality gates are actually met.
