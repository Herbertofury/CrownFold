# v0.7 — The Four Acts: playable implementation and acceptance gates

## Design intent

CrownFold should be playable as both a third-person shooter with character progression and a genuine RTS with squad production, combined arms, live orders and changing territory. Era identity is a style/strategy decision, never a chronological ladder: any commander can develop lost and future sciences and mix them.

## Implemented during this pass

1. **Beachhead.** Capture two different timewells, keep them held for 24 seconds, and earn supplies to finance a siege. Losing a well depletes accumulated hold time rather than instantly resetting it.
2. **Break the Lattice.** Physically destroy both Chronal Anchors with weapons, battalions or delayed artillery. The enemy throne has a protected minimum health until the prerequisites are completed, preventing a cheap base-rush victory.
3. **The Throne.** Storm and destroy the enemy headquarters, preserving your own commander and resources while AI chooses affordable counters and launches finite reinforcement waves.
4. **Last Corridor.** Either player or surviving battalions reach the extraction field, call the signal, and hold for 36 seconds. Enemy groups contest evacuation; limited rearguard waves consume enemy supplies. Victory rewards return to the previous open world and persist.

**Timefall Pod** summons an era-specific reserve battalion after a telegraphed delay and reserves population slots while inbound. **Epoch Lance** is a delayed wide-area bombardment, usable against anchors and enemy troops. Both use War Supplies and cooldowns.

**RTS camera** pans separately from the stationary player; WASD/arrow movement, mouse-wheel zoom, drag-box selection, Shift-click additive selection, saved groups (Ctrl+1–5), recall (Alt+1–5), right-click move orders, and a backtick-activated compact console keep battlefield space clickable. Returning to shooter mode does not cancel group orders.

## Automated tests

- `npm run check`: source/test JavaScript syntax.
- `npm test`: 165 simulation checks, including phase order, enemy expenditure, attack gating, evacuation, support budgeting, exact selection scope and persistent reward return.
- `python3 tests/war_operations_browser.py`: 23 browser checks of actual controls and stage transitions with fast-forwarded state.
- `python3 tests/war_tactical_browser.py`: 12 browser checks including camera movement without soldier movement, zoom, drag selection, right-click orders, control groups and compact view.
- Existing RPG, era, doctrine and shooter suites should remain runnable independently.

## Remaining AAA gates: do not treat as completed

- Content: rich bespoke exploration hubs; 5 different 25–45-minute authored story campaigns with player-driven branching and rewarding optional objectives; fully populated social worlds.
- Native rendering: authored realistic assets, cinematics, advanced character physics, professional animation and responsive hit reactions; real target GPU profiling.
- Army simulation: formation pathfinding around real obstacles, dynamic cover, hundreds/thousands of individually animated agents and player squads, deterministic networking under latency.
- High-quality co-op: authoritative server, 4-player synchronization and reconnect, progression migration and proper anti-cheat.
- Quality and accessibility: genuine full-length human playtests, telemetry-based pacing and balance, keyboard/controller remap, accessible HUD, localization, stable save migration, optimization and crash tests.

**Scope warning:** this is an original procedural 3D browser pre-alpha that demonstrates systems. A 36-minute maximum timer does not mean missions consistently last 30 minutes. Tests accelerate objectives rather than simulate authentic player choices. It is not a production AAA game yet.
