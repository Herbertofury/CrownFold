# CROWNFOLD

**History is a battlefield. The world did not end; its centuries became neighbors.**

CrownFold is an original open-world third-person survival RPG with live RTS command, cross-era armies, and time-space terrain manipulation. You begin in **1278, The Crownless March**, and can cross **Advanced Rifts** into separate persistent procedural worlds in 12,400 BCE, 1889, 2086, and 8420. **War Rifts** open real-time army campaigns with a 36-minute limit and commanders who can keep fighting in third person. The original rotating 3D board game is preserved as a separate playable legacy mode.

> **Current release: v0.8 experimental browser vertical slice with Rust/Wasm tactics. Not a finished AAA production or a Skyrim-scale handcrafted world.** The longer-term game vision is deliberately larger than the implemented prototype.

## Play without installation

1. Download/open [`dist/CROWNFOLD-RIFTFRONT.html`](dist/CROWNFOLD-RIFTFRONT.html) in a desktop browser; it embeds all scripts and styles and plays offline.
2. **Enter the Open World** to start in the Crownless March. **Quick War** begins the first RTS war campaign, while **Classic 36 Min Rift Operation** starts the earlier six-stage shooter mission. Quick sessions have a separate save from the open world. An active War Rift shows **Resume Quick War** or **Resume World War** and returns to its latest checkpoint. Starting a new session asks before replacing its existing save. Classic shooter missions and dungeons still return to the frontier after reload.
3. For modular source, use Node.js 22+: `npm start` and visit `http://127.0.0.1:3040` (the server prints the address). `npm test` runs the deterministic simulation tests; `npm run build` recreates the offline HTML. `npm run benchmark` measures headless CPU battle-step costs (not actual game FPS).
4. Open [`legacy/CROWNFOLD-ORIGINAL.html`](legacy/CROWNFOLD-ORIGINAL.html) for the original rotating 3D board-game experiment.

## Rust gameplay foundation

War Rift formation routes, cover occlusion and the four siege objective transitions now run in a dependency-free Rust library compiled to WebAssembly. The same crate builds natively; the current renderer, UI, RPG, combat and checkpoint storage remain JavaScript. This is an incremental Rust migration, not a complete native port or an AAA-quality claim.

The offline build embeds the Rust module and requires no installation. Its footer reports **RUST TACTICS · WASM**, or an explicit JavaScript compatibility mode if WebAssembly is unavailable. `npm run build:rust` regenerates the kernel with the pinned Rust toolchain; `npm run check:rust` verifies it matches source. See [the Rust-first architecture and next playable milestone](docs/TECH_STACK_2026.md).

## Controls

| Key / action | Function |
| --- | --- |
| WASD, mouse, left mouse | Move, aim, shoot in third person |
| Shift / Ctrl / X | Sprint / sneak / dodge |
| E | Interact with NPCs, Ancient Relics, Advanced Rifts, War Rifts, dungeons, and loot |
| TAB | Enter live RTS command without pausing the battlefield; the player remains in place while the tactical camera pans |
| RTS camera: WASD / mouse wheel / drag | Pan and zoom the map independently; box-select allied battalions and right-click terrain to move them |
| Shift-click / Ctrl+1–5 / Alt+1–5 | Add formations, save five control groups, recall groups |
| ` (backtick) | Open the paused six-weapon arsenal in soldier view; toggle compact console in RTS view |
| War command panel | Train 13 cross-era battalions, select formation stances, summon Timefall reserves or strike with Epoch Lance, and build field structures |
| T then Q | Pick destination era, then Chronofold a 24-meter tile (rotate contents and imbue its era) |
| Z / F / G / V | Echo rewind / orbital strike / grenade / resupply |
| 4–9 | Six active arcane powers |
| I / P / L / O / C / U | Inventory / perks / quests / map / Chronicle / homestead |
| B / N / H / J / K | Build menu / recruit / heal / rations / water |
| ESC | Pause / close an RPG panel / exit dialogue |

## Field supplies

Open **I / Inventory** for medkit, ration and water cards showing stock, exact capped recovery and a Use button. Full meters and empty stock disable use; H / J / K remain the quick shortcuts and explain why an item cannot be used. Supplies never disappear at full health, hunger or thirst. Field Surgeon perks affect the medkit preview and actual healing equally.

## No-waste field crafting

The Forge shows exact missing materials after Artificer discounts. Grenade recipes require room for all three grenades (12 carried maximum); blocked batches spend nothing and do not advance crafting quests. Use grenades until you have nine or fewer before forging another batch.

## Resume a War Rift

Pause, choose **Save Progress Now**, or return to the title to checkpoint a running siege. Autosave runs every 30 seconds and when the tab is hidden. The matching Continue button becomes **Resume World War** or **Resume Quick War**. Time does not elapse while the game is closed.

Checkpoints retain formations, individual casualties, movement orders, control groups, production queues, pending supports, cover damage, supplies, active optional sorties, extraction progress, player ammunition and cooldowns, Fold fields, and your original return location/era. Rust validates the objective state and chooses the next siege act/outcome. Loading itself grants no rewards.

The existing frontier save format remains readable. If its optional war checkpoint is damaged or unsupported, the game restores frontier progress and shows a warning. A failed storage write leaves the previous save untouched and warns you to keep the game open. Returning to the title after a failed write requires choosing to leave without saving. Browser storage is local, can be cleared by the browser, and is not cloud sync or an external backup. Classic shooter missions and dungeons do not yet resume mid-mission.

## Player comfort settings

Open **Settings** on the title screen or **Player Settings** from the pause menu. Adjust mouse sensitivity (0.25–3×), invert vertical aim, and choose a master volume or mute. **Reduce HUD flashes and motion** removes the red damage overlay, scanlines and interface animation; world combat effects remain visible. Its initial value follows your system reduced-motion preference.

Changes apply immediately and persist on this browser, separately from both campaign saves. Resetting settings never resets progress. If browser storage is blocked, settings still work for the session and the panel explains that they could not be saved. Sound starts only after a player gesture. Native keyboard controls work on the title, pause menu and settings dialog; Escape or Done returns to the opening menu without resuming combat.

This is an initial comfort pass, not complete accessibility support, key rebinding or controller support. Browser audio gain is testable, but listening on actual speakers/headphones remains a human check.

## Complete the three-vault quest

Lyra's **Glass Key → Three Echoes → faction ending** chain credits vaults you already cleared. Accepting a dungeon quest late no longer requires an impossible repeat first-clear. Existing saves with stuck dungeon quests are repaired when loaded. Credit updates never grant rewards: return to Lyra and claim each quest once through dialogue. Your chosen ending and claimed rewards remain saved.

## Exploration quest recovery

Sable credits landmarks you found before taking her quests. Finding the Ghost Convoy early no longer blocks its turn-in; Beyond the Last Map counts distinct discovered places, excluding your pre-known home camp. Older stuck saves repair on load without paying rewards automatically. Return to Sable to claim each reward once.

## Quest wayfinding

New frontier players are guided to Mira Vale for their first quest. Press **L** to track an active or ready quest. Its marker leads to remaining harvest resources, living enemies, unopened caches, undiscovered landmarks or the required vault. Finished quests keep pointing to their giver until you claim the reward. In another era, the guide points to the return rift instead of reusing medieval coordinates.

Build and craft tasks show the relevant controls, and searches with no local target explain what to find instead of pointing at an unrelated gate. Offscreen arrows show where to turn, including targets behind you; the minimap highlights the current destination. These markers are guidance, not obstacle-aware travel routes. War and dungeon objectives keep their existing priority. Tracking uses existing saves without a format change.

## Field arsenal

Press **` (backtick)** in soldier view or click **Arsenal** beside the weapon name. All six weapons show their role, direct damage, range, reload time and available ammunition. Choose with the mouse, **1–6** or arrow keys, then **Enter** or **Equip** to return. Escape or Cancel returns without changing weapons. Opening the arsenal pauses combat and the mission clock; it never replaces either save. The RTS backtick shortcut remains the compact console.

The weapon HUD now shows a reload progress bar and remaining seconds, low ammunition and empty-magazine prompts. Equipping another weapon cancels the current reload as before; keeping the same weapon or cancelling the selector preserves it. Existing 1–3 and mouse-wheel shortcuts remain available. Damage labels show base direct damage, not guaranteed damage after armor, pellets, weak points or explosions.

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
- Persistent browser-local RPG save with backwards migration from the previous v0.3 prototype. War Rifts resume mid-battle from browser-local checkpoints; classic shooter operations still restore frontier progress. Victory rewards persist.
- Original six-phase 36-minute shooter operations plus original standalone chess-inspired rotating board game.

### Authored first siege: Eleven Bells

The first War Rift now offers three named, one-time optional sorties as its acts unlock: recover the survey ledger for faster well capture, silence Ash Foundry to cut enemy supply income, and escort the Bellkeepers home for a 24-second extraction. Track an active sortie from the command console or explicitly leave it behind. Resolve it before destroying the throne. Your Chronicle records success, failure, skipped and missed orders after return, including withdrawals.

These choices use the existing procedural battlefield and crisis mechanics. They do not establish 20–30-minute pacing, production art or a complete native port. The other four campaigns retain their repeatable crisis director. [Play instructions and exact scope](docs/ELEVEN_BELLS.md).

### Combat impact update

Player weapon pellets resolve against the nearest individual enemy, war battalion, anchor, objective or fortification. Cover blocks shots behind it, tracers end at the impact, and launcher blasts begin at that point. War targets use finite-height approximate collision volumes over local terrain; they are not detailed mesh collisions. Weapon range and aim elevation apply to these impacts.

### Warforged combat and tactical movement — new in v0.8

- **Breakable cover:** every War Rift map now has seven destructible battlefield cover positions, with historically inspired alternate aesthetics. Cover blocks both formations and ranged fire until breached.
- **Route-aware formations:** commanded battalions use capped grid A* and cached waypoints to move around intact cover instead of walking directly through it. Destruction forces route recalculation.
- **Dodgable telegraphed enemy fire:** ranged hostiles aim at an indicated area before damage lands. Movement and dodge rolls can escape it; reward-based headshots stagger enemies and deal extra damage.
- **Reproducible war stress bench:** `npm run benchmark` simulates 80 aggregate battalions on each of five maps for 450 steps. CPU-only results must not be confused with real rendering FPS or individually simulated soldiers.
- [v0.8 implementation and acceptance gates](docs/WARFORGED_V08.md).

## Not yet implemented

A full native Rust game executable, seamless continent-scale terrain streaming, thousands of *individually simulated* RTS soldiers, historically accurate assets, unique handcrafted cities/dungeons for every era, dialogue voiceover, dynamic city life economies, vehicles, faction diplomacy simulation, co-op servers, cinematic campaigns, sophisticated siege destruction and full build placement are **design goals**, not current features. The current war layer uses aggregate battalions for responsiveness, and era overlays do not physically sculpt the terrain mesh.

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
rust/crownfold-tactics        Native/Wasm Rust tactical geometry and A*
src/battlefield.mjs           Rust runtime adapter with JS compatibility fallback
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

### Background interruption safety

Switching away from the game pauses combat, clears held movement/fire input and checkpoints the active slot. Returning to the tab does not resume combat automatically; use Resume or Escape. The automated browser regression dispatches focus/visibility events to the actual offline game; operating-system tab switching is not separately qualified.
