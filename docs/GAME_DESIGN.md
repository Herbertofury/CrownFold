> **Historical design note:** This document records the earlier *Riftfront* prototype and is preserved for continuity. CrownFold v0.4 is documented in `wiki/` and the README; the product is simply named **CrownFold**.

# CROWNFOLD: RIFTFRONT — world, survival, tactics, operations

## North star

A player can remain inside a single persistent wilderness for hours, or walk through a gate into a high-stakes half-hour military incursion. They never stop being both a capable third-person operative and an active battlefield commander. **This is not a standard shooter with a map screen**: positioning, production, artillery and even the coordinates of enemy formations are deliberate tactical instruments.

The six-stage operation is **playable now** as a common template. Its 36-minute clock is a maximum extraction window, *not* a guaranteed minimum completion time. This design document distinguishes current systems from proposed development.

## Current playable systems

**The frontier:** seeded 32m resource chunks and deterministic terrain, several biome categories, lighting/time and weather, stamina/hunger/thirst, salvaging, a home camp and three Rift Gate locations, an endlessly explored overworld, persistent player inventory/structures/squad and automatic raider activity. The scene looks intentionally stylized low-poly rather than photorealistic.

**The commander:** a third-person operative with six weapons, grenades, orbital strike, ammo supply, regenerating shield and Echo recall; up to eight semi-autonomous squadmates, orders for follow/move/defend/assault; seven structure types and a simple salvage economy. The command camera works during the fight without time stop.

**Six-stage drop:** secure a spire by holding an uncontested zone; destroy two enemy factories and their summoned troops; defend a gravity drill for 90 seconds in-range; hold three pylons for 15 seconds each; kill a 1,650 HP Titan with supporting hostiles; arm the extraction signal and hold for 26 seconds. The player must travel between objectives, reload, manage supplies and fend off a spawn director. Multiple gate contracts adjust difficulty and mission framing.

**Fold:** applies a quarter-turn to entities and active objective locations within the selected 24m cell. No underlying terrain vertex rotation in the browser release. Aesthetic landmark rotation and ground topology modification would require native implementation.

**Echo:** repositions the player to a recorded snapshot and restores recorded health/shield without rewinding enemies, the world or spent resources. Echo is a **combat tactic** rather than a whole-world undo button.

## RPG v0.3 playable update

The current browser build now includes six weapons, six additional active arcane powers, eighteen rankable perks, ten crafting recipes, three authored dungeon instances, seven named NPCs, thirteen quests, three factions, affinity-driven companions, repeatable bounties, a merchant, random loot and equipment, recruit/settlement upgrades, stealth theft/fines, three lockpickable physical safes, a rest/wait system and a compact final faction choice. These are actual implemented prototype mechanics; see `docs/RPG_EXPANSION.md` and `docs/QA.md` for scope and testing. The full-scale versions of social schedules, companion story arcs, divergent endings, expansive cities and unique operation geography remain aspirational.

## What makes the full design new

1. **The war follows you home:** The world outside a mission is not a sterile lobby. On extraction, you carry resources and discoveries into a growing territory. The final product should let enemy activity react to where your operations succeeded or failed, so the world visibly reflects the war.
2. **A tactical language across scales:** Fold works for a squad assault, a base defense and a dungeon puzzle. Echo works for personal traversal, risky objective play and escaping an ambush. Neither is a one-off superpower—they are the game's core verbs.
3. **Dungeons as living fronts:** Rather than repeating a corridor level, each dungeon has staged tasks with alternate routes, enemy logistics, terrain fractures and a credible retreat plan. No two operation maps should share the same combination of geometry, faction logistics, enemy director and reward.
4. **Command from the trenches:** A soldier can take a ridge manually while ordering troops to keep supply pylons online. The player is not a disembodied cursor and does not need to step out of combat to issue orders.
5. **Consequence over grind:** A good half-hour operation should give a tangible change: a new frontier route, faction reaction, economic upgrade or usable war relic—not just a bigger number.

Those five principles describe **intended production**, not features shipped in this prototype.

## Suggested future expansions (NOT IMPLEMENTED)

### Distinct biome dungeons

- **The Sunken Signal:** floodwater, partially submerged facilities, conductivity hazards, rescueable scouts; magnetically anchored bridges that Fold can change.
- **Glassfall Incursion:** glass deserts with mirrored artillery lines, movable blast walls, adaptive factory defenses and an armored convoy that can be rerouted with Fold.
- **Thunderroot:** giant root caverns and vertical arenas, living transport vines, spores affecting visibility, a siege of ancient conduits and traversal shortcuts created using Echo.

### Survival that rewards preparation

Ranger pathfinding and scouting, huntable resources, cooking, camp upgrades, supply caravans, outpost attack/repair, blueprint discovery, crafting decisions, faction reputation, exploration rewards and optional survival difficulty. Essential needs should generate choices without forcing constant maintenance.

### Large-scale RTS command

Independent squads with formation and cover systems, production structures, vehicle support, destructible supply lines, logistics carriers, player-defined defensive zones, strategic maps and contextual quick orders. Deterministic sim partitions allow relevant groups to act while distant factions progress in aggregate.

### Replayable 30–45m operations

Objective variant graphs, secondary objectives, extraction modifiers, dynamic boss tactics, curated encounter arenas, enemy factions with asymmetric logistics, operations with pacing guardrails, and open-ended free roam between them. The current six-stage template is the seed of this system, not the fully generated mission catalog.

### Multiplayer, mod support, accessibility

Authoritative co-op and persistent hosting, server reconstruction, anticheat, rollback/prediction where applicable; graphics options, remapping, subtitles, controller support and assist settings; deterministic seed and content recipe formats for user-generated dungeon packs and private servers.

## Production checkpoints

- **P0 (here):** original functional browser prototype, simulation and browser smoke tests; prove third-person + live-orders + Fold/Echo.
- **P1:** UE5.8.4 3rd-person feel prototype, fixed-step combat sim, input latency target, real character rigs and keyframe/animation graph.
- **P2:** one highly polished 30–45m dungeon with unique geography, 3-branch objectives and a full enemy faction, end-to-end.
- **P3:** streamable overworld region + persistent base, navigation, pathfinding, enemy camps and meaningful dungeon consequences.
- **P4:** two more unique biome operations, progression loop, deep faction RTS and resource economy.
- **P5:** multiplayer if supported by design and staffing, console/performance profiles, progression economy, performance profiling, full content/art/audio and extensive playtesting.

Do not promise AAA fidelity or multi-year scope based on the current browser build alone. Each checkpoint needs concrete fps, frame-time, memory and fun/playtest acceptance criteria.
