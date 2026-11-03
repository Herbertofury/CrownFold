# Chronofold — Your Battlefield Is a Time Machine

CrownFold isn't just about jumping between worlds. The player or commander can impose one era on a **small piece of another** and rotate that slice of space. The ancient art is called **Chronofold**.

## How the playable prototype works

1. **Choose an era** with `T`. The HUD shows the target time stratum.
2. **Cast Chronofold** with `Q`. Costs 35 Flux with cooldown; selected facet is rounded to the nearest 24-meter battlefield tile.
3. Everything **eligible inside the tile** is rotated around its center: nearby enemy units, squadmates, player structures, war battalions, timewells and scenario objectives. The player doesn't teleport with it.
4. The tile is **stamped** with the target era: color/material marker, 90-degree turn state and damage-affinity modifier. The stamp is saved persistently; multiple facets can exist in different eras and zones.
5. Fighters matching the imposed era benefit, while troops whose historic doctrine is disfavored may suffer. The same Fold can create a flank, disrupt a defensive firing line, cut a supply approach or move an objective.
6. **Echo** remains separate: rewind your position and health to a remembered moment. Inventory, consumables, enemy deaths and campaign captures aren't undone.

This is the current prototype implementation. It rotates entities, captures and applies an era affinity, **not actual sculpted mesh terrain or destructible physics geometry**. Fully morphing castles into future towers is part of the production architecture.

## The Counter Doctrine: technology isn't a linear RPG ladder

Every era is viable. Technology provides raw strength but also new dependencies. Every dependency is a weapon waiting for the wrong century.

| Unit/Doctrine | Tactical power | Vulnerability |
| --- | --- | --- |
| Ancient Rootbound hunters | Ambush and anti-prediction | Poor conventional armor and low direct firepower |
| Medieval archers and pikemen | Independent, reliable, cheap; deliberate positioning | Weak against industrial armor without flanks or terrain |
| 1889 clockwork | Mechanically self-contained, effective siege | Heavy supplies, slow movement and range constraints |
| 2086 signal rangers | Recon, accurate weapons and rapid coordination | Antennae, cables, command relays and supply cutoffs |
| 8420 oracle synths | Prediction and extreme firepower | Overfitting to known strategies; vulnerability to unmodelled primal behavior |

The numerical prototype uses asymmetric bonus/penalty pairs and battlefield facet affinity. This is a balance starting point, not a proof that a specific ancient unit always beats a future one. Competitive balance should be driven by 10,000-match seeded simulations and human test data in later stages.

## Chronicle doctrine upgrades (roguelite progression)

Survey sites grant **Insight**. Spend it in the Chronicle screen on permanent doctrines: **Ancestral Genius** (+7% per rank to ancient unit damage), **Gilded Ingenuity** (+8% to 1889 units), and **Tomorrowcraft** (+7% to the two high-tech eras). Each has three ranks and escalating Insight cost. War victories grant bonus Insight. They persist across campaigns, turning repeated expeditions into strategic builds.

### Production ideas, unshipped

- Full geometry patch blending between time palettes, with heightfield deformation and navmesh updates.
- Supply-dependent fields that prevent powered future units from firing while letting analog troops continue.
- Temporary Fold fractures that connect distant tiles through unusual path geometry, maintaining navigable world rules.
- Commander specialties: Cartographer, Historian, Clocksmith, Oracle Defector, Siege Witch, Farmer General.
- Environmental counters: mud against walkers, water against rails, fog against optics, lightning against radios, fire against prehistoric jungles.
- Costly counterfolds and temporal gambits that opponents can telegraph and interrupt rather than unblockable surprises.

The design law: **The commander who understands a century should be able to outplay the commander who simply owns it.**
