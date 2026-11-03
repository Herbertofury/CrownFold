# CROWNFOLD

**History is a battlefield. The world did not end; its centuries became neighbors.**

CrownFold is an original open-world third-person survival RPG with live RTS command, cross-era armies, and time-space terrain manipulation. You begin in **1278, The Crownless March**, and can cross **Advanced Rifts** into separate persistent procedural worlds in 12,400 BCE, 1889, 2086, and 8420. **War Rifts** open real-time army campaigns with a 36-minute limit and commanders who can keep fighting in third person. The original rotating 3D board game is preserved as a separate playable legacy mode.

> **Current release: v0.8 experimental browser vertical slice. Not a finished AAA production or a Skyrim-scale handcrafted world.** The longer-term game vision is deliberately larger than the implemented prototype.

## Play without installation

1. Download/open [`dist/CROWNFOLD-RIFTFRONT.html`](dist/CROWNFOLD-RIFTFRONT.html) in a desktop browser; it embeds all scripts and styles and plays offline.
2. **Enter the Open World** to start in the Crownless March. **Quick War** begins the first RTS war campaign, while **Classic 36 Min Rift Operation** starts the earlier six-stage shooter mission.
3. For modular source, use Node.js 22+: `npm start` and visit `http://localhost:3000` (the server prints the address). `npm test` runs the deterministic simulation tests; `npm run build` recreates the offline HTML. `npm run benchmark` measures headless CPU battle-step costs (not actual game FPS).
4. Open [`legacy/CROWNFOLD-ORIGINAL.html`](legacy/CROWNFOLD-ORIGINAL.html) for the original rotating 3D board-game experiment.

## Controls

| Key / action | Function |
| --- | --- |
| WASD, mouse, left mouse | Move, aim, shoot in third person |
| Shift / Ctrl / X | Sprint / sneak / dodge |
| E | Interact with NPCs, Ancient Relics, Advanced Rifts, War Rifts, dungeons, and loot |
| TAB | Enter live RTS command without pausing the battlefield; the player remains in place while the tactical camera pans |
| RTS camera: WASD / mouse wheel / drag | Pan and zoom the map independently; box-select allied battalions and right-click terrain to move them |
| Shift-click / Ctrl+1–5 / Alt+1–5 | Add formations, save five control groups, recall groups |
| ` (backtick) | Toggle compact RTS map view and expanded army-production console |
| War command panel | Train 13 cross-era battalions, select formation stances, summon Timefall reserves or strike with Epoch Lance, and build field structures |
| T then Q | Pick destination era, then Chronofold a 24-meter tile (rotate contents and imbue its era) |
| Z / F / G / V | Echo rewind / orbital strike / grenade / resupply |
| 4–9 | Six active arcane powers |
| I / P / L / O / C / U | Inventory / perks / quests / map / Chronicle / homestead |
| B / N / H / J / K | Build menu / recruit / heal / rations / water |
| ESC | Pause / close an RPG panel / exit dialogue |

## The Great Entanglement

In 2086, the public demonstration at the Meridian Exchange had a strange side effect: when the engine opened, every era discovered it had doorways to the others. There was **no warhead, no apocalypse, no global destruction**. The kingdoms were intact. So were their enemies, unborn descendants and future claimants. Money, borders, citizenship, physics and causality became negotiable. Every power wants to write the history that benefits it, including the people history forgot.

A king may rent a railgun. A mammoth hunter may destroy an oracle army using unnetworked ambushes. A mechanic from 1889 can disassemble a futuristic droid, then sell its parts to a medieval monastery. The universal resource is not time: it is **the right to make a century your territory**.

## Playable systems in v0.8

- Five distinct procedural overworld states, each with portals, landmarks, visual style, timeline log, NPC witnesses, a local RTS campaign, and persistent discovered sites.
- Live third-person shooter with six firearms, six arcane abilities, stealth, survival meters, structures, inventory, crafting, companion recruitment, dialogue, quests, bounties, rare gear, and three earlier dungeon spaces.
- **Four mandatory war acts:** establish a 24-second supplied foothold across two timewells; destroy two Chronal Anchors; breach the enemy Throne; call and defend extraction for 36 seconds. Each act has an actual state transition and HUD target.
- **Two delayed field supports:** spend finite War Supplies for a Timefall Pod reserve company or precision Epoch Lance barrage.
- **True RTS tactical view:** separate camera pan and zoom, drag-box selection, multi-group orders, five saved control groups and a compact console so the battlefield stays clickable.
- War rifts with allied and opposing citadels, three contested timewells, a growing supply economy, 13 battalion types, four selectable stances, production queues, four field buildings and an adaptive opponent commander with finite War Supplies.
- Era-neutral tactical role counters, three permanent Chronicle upgrades, five independent commander heritages, ten equippable lost technologies and four cross-era fusion combinations: ancestral cunning, industrial ingenuity and tomorrowcraft.
- **Chronofold**: choose an era and rotate a 24m battlefield facet along with nearby units/structures. The facet gains a colored era material marker and combat affinity, letting you create localized era advantages.
- Dynamic optional crisis director with three recurring objectives: secure a lost archive, destroy a hostile chronal spire or escort displaced civilians; success grants supplies and Insight, failure strengthens enemy logistics.
- Two destructible defensive Chronal Anchors protect the enemy throne. Player firearms, explosions, and commanded battalions can breach them, making the campaign a multi-stage siege.
- Commander heritages are chosen independently of world era; the calendar itself has no universal damage advantage. Combat counters depend on battalion roles, equipped sciences, and local Fold fields.
- Persistent browser-local RPG save with backwards migration from the previous v0.3 prototype. War operations do not save mid-battle; victory rewards persist.
- Original six-phase 36-minute shooter operations plus original standalone chess-inspired rotating board game.

### Warforged combat and tactical movement — new in v0.8

- **Breakable cover:** every War Rift map now has seven destructible battlefield cover positions, with historically inspired alternate aesthetics. Cover blocks both formations and ranged fire until breached.
- **Route-aware formations:** commanded battalions use capped grid A* and cached waypoints to move around intact cover instead of walking directly through it. Destruction forces route recalculation.
- **Dodgable telegraphed enemy fire:** ranged hostiles aim at an indicated area before damage lands. Movement and dodge rolls can escape it; reward-based headshots stagger enemies and deal extra damage.
- **Reproducible war stress bench:** `npm run benchmark` simulates 80 aggregate battalions on each of five maps for 450 steps. CPU-only results must not be confused with real rendering FPS or individually simulated soldiers.
- [v0.8 implementation and acceptance gates](docs/WARFORGED_V08.md).

## Not yet implemented

Real Unreal Engine production, seamless continent-scale terrain streaming, thousands of *individually simulated* RTS soldiers, historically accurate assets, unique handcrafted cities/dungeons for every era, dialogue voiceover, dynamic city life economies, vehicles, faction diplomacy simulation, co-op servers, cinematic campaigns, sophisticated siege destruction and full build placement are **design goals**, not current features. The current war layer uses aggregate battalions for responsiveness, and era overlays do not physically sculpt the terrain mesh.

## Documentation / wiki mirror

The repository includes a complete **`wiki/` Markdown mirror**, organized rather than fragmented into hundreds of little pages:

- [Home and rules](wiki/Home.md)
- [World history and factions](wiki/World-Lore.md)
- [Five eras and traversal](wiki/Eras-And-Open-Worlds.md)
- [Chronofold, counters, and player powers](wiki/Chronofold-Mechanics.md)
- [RTS campaigns, armies, objectives](wiki/RTS-Campaigns.md)
- [RPG, survival, quests, progression](wiki/RPG-And-Survival.md)
- [Production technology, milestones and QA](wiki/Development-And-Tech.md)

> GitHub has a **separate** wiki Git repository. These Markdown pages are the published repository-backed mirror and source of truth until the separate Wiki can be synchronized through a Git-capable connection. Creating `wiki/` in the main branch does **not** automatically update GitHub's Wiki tab.

## Project layout

```text
index.html, style.css          Developer mode web UI
src/temporal.mjs              Era descriptions, portal maps, Chronofold and affinity
src/lineage.mjs               Commander heritage, lost technologies and fusion doctrines
src/war.mjs                   War campaigns, battalions, economy and enemy strategy
src/battlefield.mjs           Destructible cover geometry and A* formation routing
src/sim.mjs                   Real-time movement, combat, portals, missions, save/load
src/rpg.mjs                   RPG quests, NPCs, factions, crafting and companions
src/render.mjs                Procedural WebGL2 / software 3D world renderer
src/game.mjs                  Input, menus, audio, simulation and renderer glue
legacy/CROWNFOLD-ORIGINAL.html Original tabletop experiment
scripts/build.mjs             Self-contained offline HTML builder
scripts/benchmark.mjs         5-map aggregate-formation CPU stress harness
tests/*                       Deterministic tests and browser smoke checks
wiki/*                        Curated wiki source pages
docs/*                        Extended prior design and QA notes
```

Original concept and current prototype by the CrownFold project. Source is currently `UNLICENSED`; do not assume reuse permission. Inspirations are discussed for gameplay comparisons only; no external proprietary assets, branding or levels are included.
