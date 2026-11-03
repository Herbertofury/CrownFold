# Chronofold & Lost Futures — No Century Is the Best

**Design law:** choosing a historical era is choosing a *culture, aesthetic and philosophy*, not accepting inferior equipment. CrownFold's central fantasy is not “modern guns beat medieval knights.” It is that every civilization reached branches of science other civilizations forgot, and any commander can research, develop and hybridize them.

## Chronofold: move an area of time *and* space

1. Choose a target era with **`T`**. The HUD displays the active target stratum.
2. Press **`Q`** to Fold the nearby 24-meter facet for 35 Flux (cooldown applies).
3. The facet rotates 90 degrees, physically relocating nearby living enemies, squadmates, war battalions, structures, timewells, siege anchors and mission objectives inside its boundaries. The player stays in place.
4. A visible era stamp persists on that facet. Units whose *own doctrine* matches its conditions get a situational local bonus; the defenders can counterfold, surround or deny logistics. No era gets an intrinsic global attack modifier against another era.
5. **Echo** (`Z`) returns your current body and health to a remembered moment without undoing inventory expenditures, deaths, mission captures or the rest of the world. It remains distinct from Chronofold.

**Current limitation:** the browser engine rotates the objects and renders a colored time-facet. Fully deformable collision geometry, swapped architecture/biomes, re-baked navigation and destructible materials are *not yet implemented*.

## The Doctrine Weave (implemented in v0.5)

Press **`Y`** outside operations to choose one of five freely switchable heritages. They are different *command styles*, not chronological tiers:

| Heritage | Identity | Tactical trait |
| --- | --- | --- |
| Oathbound Architect | Cathedral and resonance engineering | Better defensive formations |
| Unwritten Pathfinder | Biological maps, first-language tactics | Faster neutral-timewell capture |
| Escapement Magister | Analog computers and impossible gears | Faster military production |
| Signal Corsair | Courier-mesh and distributed organization | Faster mobile deployments |
| Gravity Gardener | Living gravity and local physics gardening | Faster field-power recovery |

Research discoveries with **Chronicle Insight** earned by surveying different eras and winning operations. A surveyed site reduces that era's science costs. Research is permanent; equip any three learned technologies for a mission. Ten technology cards are implemented: Oath Geometry, the Sunless Sun, Murmuration Engine, Bone Lattice, Escapement Oracle, Ether Reactor, Ghost Protocol, Prism Mesh, Gravity Garden and Phase Archive. They modify *real combat*, logistics or mobility, and **all thirteen units can be recruited with any commander heritage**.

### Cross-era discoveries that unlock a third idea

| Fusion | Combined research | Effect |
| --- | --- | --- |
| Cathedral of Light | Oath Geometry + Prism Mesh | Better protection for ranged troops in a Bulwark stance |
| Wild Oracle | Murmuration Engine + Escapement Oracle | Extra skirmish ranged damage |
| Sun Garden | The Sunless Sun + Gravity Garden | Battlefield siege-repair synergy |
| Phantom Rail | Ghost Protocol + Ether Reactor | Faster skirmishing plus stronger economy |

### Battlefield powers (implemented)

**Oathwall** fortifies nearby squads; **Flux Rush** trades temporary vulnerability for speed and firepower; **Hushfield** suppresses enemy targeting using biological computation; **Gravity Root** accelerates timewell capture and bolsters defenders. Abilities use War Supplies, have cooldowns and must be unlocked *and equipped*; they can fail safely without consuming resources when no valid target is in range.

## What actually decides a battle (v0.6)

- **Unit role**: pikes beat cavalry in the right position; skirmishers can crack exposed guns; hunters can outwit prediction; specialists can counter other specialists. The counters are per-unit in `src/war.mjs`, **not** a hard-coded era hierarchy.
- **Local Fold**: an army with matching doctrine can exploit a stamped patch, regardless of its commander's birth year. Enemies can contest the terrain.
- **Logistics**: timewells generate income for either side. Enemy commanders now spend finite supplies on reinforcements and react to your most threatening unit types.
- **Morale**: surviving troops recover near controlled supply points, while battered forces withdraw and must regroup.
- **Special projects**: 36-minute war rifts can spawn lost-archive recoveries, hostile chronal spires, and civilian escorts; winning these awards war resources and Insight.

## Ideas deliberately NOT claimed as shipped

- Physics-stable whole-city rotations and reconfigured interiors/roads.
- Fully destructible architecture and battlefields that rebuild themselves into another century.
- Persistent economic politics and centuries of NPC family histories reacting causally to time travel.
- Predictive enemy commanders that learn per player over dozens of sessions.
- AAA-resolution art, large soldier crowds, native multiplayer, voiced quest cinematics.

**Ruling principle:** research, cleverness, and chosen aesthetics decide the future. The calendar never does.
