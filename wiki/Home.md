# CrownFold — Home

> **The world is not post-apocalyptic. The apocalypse is administrative.** Every civilization, still thriving on its own terms, suddenly has to share its territory, trade routes and history with every other century.

Welcome to **CrownFold**, an original third-person open-world survival RPG where you can step into the command seat of a real-time strategy army. Begin in medieval 1278, live as a wandering explorer, build an outpost, recruit specialists from different eras, and use **Advanced Rifts** to visit other open worlds. Enter **War Rifts** for objective-based RTS campaigns where you move and fight in person or issue army orders in real time.

## Three layers of the game

1. **The living frontier — free roam.** The player exists physically in one of five eras at a time. Persistent personal progression, companions, explored rift sites and the consequences of campaigns travel with them.
2. **Rift wars — tactical campaigns.** In a 36-minute competitive war operation, manage supplies, construct production buildings, train battalions, capture timewells and destroy the opposing citadel. You can fight yourself with rifles, siege weapons, spells, and Fold powers while your formations carry out orders.
3. **The Crownfold — reshape spacetime.** Choose a target historical stratum and rotate a battlefield facet. It moves troops and existing structures, gives the ground properties of the selected era, and enables the improbable matchup: a prehistoric hunter can beat a sentient weapon by refusing to think like a machine.

## Start here

- [The Great Entanglement: what happened, who rules and why](World-Lore.md)
- [Five eras and non-linear Advanced Rifts](Eras-And-Open-Worlds.md)
- [How Chronofold works, and why no century always wins](Chronofold-Mechanics.md)
- [War Rift maps, battalions, economy and campaigns](RTS-Campaigns.md)
- [Survival, loot, magic, quests, factions and companions](RPG-And-Survival.md)
- [Code structure, working prototype, QA and production roadmap](Development-And-Tech.md)

## Current prototype versus full vision

**Implemented in browser v0.8:** five seeded overworld environments, Advanced Rifts, named era witnesses, Chronofold, mixed-era battalions, a resource-backed RTS economy, thirteen unit types, four structure types, captureable timewells, five differentiated opponent doctrines, four formations, battlefield powers, three recurring optional crises, two destructible siege anchors, five war maps with distinct enemy forces, 36-minute timers, third-person shooter controls, eighteen RPG perks, ten researchable lost sciences, six arcane arts, original story quests, three smaller dungeons and the separate original 3D board game. All five eras offer viable technologies and independently chosen commander heritage; none is a universal tech tier.

**Production vision, NOT implemented:** vast and dense bespoke living lands with layered societies and schedules, full-scale siege warfare, vehicles, historic/futurist architecture and equipment, faction diplomacy, branching quests, emergent economics, mutable terrain streaming, authored 30–40 minute campaigns, larger interlocking long-term quest lines, multiplayer and AAA visuals. These are **not claimed as shipped**.

The name is **CrownFold**, without subtitles. The earlier prototype names *Riftfront* and *The Living Frontier* describe development phases, not separate game brands.

## Current quality bar

The playable v0.8 version is a **pre-alpha vertical slice**, not a AAA production. Automated checks cover core mechanics, but its typical simulated RTS rounds finish or fail much earlier than the 36-minute cap. Priority milestones: meaningful 25–45-minute mission arcs, player-validated balance, reliable squad nav, a proper visual/animation pipeline, networking and multiplayer, long-session performance budgets and dense authored cities, dungeons and quests. The [development page](Development-And-Tech.md) tracks these gates without calling planned content shipped.

## v0.7 — The Four Acts

War Rifts are no longer won by rushing a single enemy base. Establish a supplied beachhead, disable two Chronal Anchors, break the enemy Throne and defend a contested extraction corridor. A separate panning RTS camera, box selection, saved battalion groups and compact command console make the player genuinely alternate between ground combat and leading an army. See [RTS campaigns](RTS-Campaigns.md).

## v0.8 — Warforged

Battalions now navigate around actual destructible cover and player gunfire can breach it. Enemy ranged hits are telegraphed as visible target zones, opening opportunities for sprint and dodge counterplay. Precision weak-point hits reward accuracy with bonus damage and stagger. The 2D tactical routing is bounded A* and is intentionally still a prototype; see [development details](Development-And-Tech.md) and [`docs/WARFORGED_V08.md`](../docs/WARFORGED_V08.md).
