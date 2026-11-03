# Real-Time Strategy, Battalions & Rift Campaigns

## Shooter ↔ commander, in real time

You physically fight in third person with weapons and powers. Press `TAB` at any moment to raise the bird's-eye tactical view **without pausing the simulation**. Select Move / Assault / Defend / Follow and order all allied battalions toward a target. The battalions retain their orders when you return to third-person action; your own guns, explosions and folded terrain can affect the war.

## The implemented warfare economy

- **Starting resources:** 205 War Supplies, one Muster Hall, Pike Wall and Longbow Circle battalions, 2.1 base supply/s.
- **Timewells:** three contested control points. Capture a well by keeping forces (or the player) nearby uncontested for 12 seconds; each held well increases supply income by **2.3/s**.
- **Production:** War Supplies buy battalions through a real training queue. Construct a Time Forge to unlock industrial/future units. Muster Hall unlocks analog infantry/cavalry/hunters. Chronal Watchtowers damage approaching enemies.
- **Population cap:** 120 individual troopers represented through aggregate formations for this browser slice.
- **Opponent AI:** five enemy commander doctrines. It earns its own supply income from controlled timewells, pays for mixed-era reinforcements, chooses role counters based on the strongest allied battalions, and maneuvers to contest objectives. Reinforcements are no longer free arbitrary waves.
- **Victory:** first breach two destructible **Chronal Anchors** protecting the opposing Throne, then destroy its citadel before the **36-minute** cap, while keeping your own citadel alive. Untouched anchors greatly absorb HQ damage. Results return to the original era with persistent XP, money, materials, and Chronicle Insight for first victories.
- **Fold:** select the destination time and rotate a 24-meter facet, moving live formations and wells into new positions while altering combat affinities.

### The thirteen trainable battalions

| Battalion | Era | Cost | Role |
| --- | --- | ---: | --- |
| Pike Wall | Medieval | 38 | Disciplined defensive infantry, 12 soldiers |
| Longbow Circle | Medieval | 52 | Cheap analog ranged pressure, 9 archers |
| Thunder Cavalry | Medieval | 78 | Rapid flank and shock charge, 8 riders |
| Rootbound Hunters | Primeval | 56 | Unnetworked ambush, 10 hunters |
| Clockwork Guard | Industrial | 78 | Heavy mechanical infantry, 8 guards |
| Coal Siege Train | Industrial | 140 | Slow ranged siege, 3 cannons |
| Signal Rangers | Network Age | 89 | Mid-future mobile ranged troops, 9 soldiers |
| Oracle Synths | Far Future | 120 | Predictive elite ranged troops, 6 synths |
| Chordwright Templars | Medieval | 110 | Lost cathedral harmonic shields and projectors |
| Murmuration Seers | Primeval | 106 | Living probability computing and swarm feints |
| Escapement Oracles | Industrial | 109 | Analog battlefield prediction with impossible gears |
| Null Couriers | Network Age | 72 | Fast signal-free scouts and supply raiders |
| Gravity Shepherds | Far Future | 132 | Mobile gravitic bulwarks for holding objectives |

## The Living War — implemented dynamic crisis director (v0.6)

Every war rift generates recurring, **optional** timed battlefield crises. These show up as physical objects in the 3D scene, a gold minimap marker, a world objective marker and a commander panel with progress and deadline. They can be played as a third-person shooter, an RTS commander, or both.

| Crisis | What you actually do | Consequences |
| --- | --- | --- |
| **Recover the Living Archive** | Secure a chronal cache with your soldier or friendly battalions; enemy troops contest the site | +125 War Supplies and +4 Chronicle Insight |
| **Silence the Chronal Spire** | Destroy the transmitter with rifle fire, explosions or battalion fire | +155 supplies, +2 Insight, enemy wave delay and a supply penalty |
| **Escort the Timeless** | Keep allied units or your soldier near a moving civilian caravan; hostiles can destroy it | +125 supplies, +2 Insight, restore friendly morale and repair troops |

Ignoring a crisis gives the opposing commander extra supplies. Enemy reinforcements now have a real expense and resource budget, so taking timewells and denying opponent income matters. Battlefield morale drops after losses; shattered battalions withdraw to a safe line, then regroup. Role counters (pikes vs cavalry, skirmishers vs exposed artillery, living prediction vs machine forecasting) matter independently of historical year. Two anchors form the required main siege breach. **Current typical war pacing still falls short of the intended 25–45-minute authored campaigns.**

## Five warfronts — playable core and authored campaign vision

These are **working campaign destinations with different enemy era rosters, difficulty, bases, capture points and war economy**, but the extensive named objectives below are the *long-term scenario designs*.

### 01. Siege of Eleven Bells — The Crownless March, 1278

**Current opponent:** Brass Syndicate (1889); difficulty 1. **Design scenario:** Free villages from a clockwork siege, tear out rail bridges to starve cannons, recruit a desperate medieval knight order, assemble an unexpected artillery line and capture bells ringing from parallel years. The Bell Regent's throne switches position when the eleventh bell sounds. Side objectives: recover the missing bell clapper, rescue a siege smith, settle a peasant revolt.

### 02. Before the First Fire — The First Garden, 12,400 BCE

**Current opponent:** Oracle Consortium (8420); difficulty 2. **Design scenario:** An algorithmic reconnaissance army enters a primeval forest and predicts every human movement—except the Rootbound hunters' local animal-language signals. Lead mammoths to upset walkers, use torches to disrupt scanners, sabotage an aerial forecast pylon and protect the very first fire from being captured by history merchants.

### 03. The Iron Parliament — The Gilded Engine, 1889

**Current opponent:** Signal Houses (2086); difficulty 2. **Design scenario:** A mechanized parliament wants exclusive rights to all time gates. Storm a smog-covered capital, liberate a union foundry, redirect a military railway with Chronofold, defend workers as they forge an impossible cannon and stop a network-age sabotage plot before a citywide strike becomes a massacre.

### 04. The Blackout Coup — The Electric Republic, 2086

**Current opponent:** Ashen Thrones (1278); difficulty 3. **Design scenario:** A knightly army conquers a hyperconnected city after slicing its power infrastructure by hand. The player must combine local resistance, swords, analog messages, drones and rooftop weapons. Win by restoring three isolated microgrids, extracting captives and deciding whether to save the very network that enables surveillance.

### 05. The Unborn Palace — The Last Tomorrow, 8420

**Current opponent:** Rootbound Circles (12,400 BCE); difficulty 4. **Design scenario:** A predictive monarchy cannot account for beings who refuse to be recorded. Infiltrate a city made of tomorrow's materials, recruit an oracle defector, learn to disguise tactical intentions from the prediction engines and dethrone the Hollow Empress without letting time itself choose the victor.

## The earlier operation family

The three prior classic shooter operations remain in `CONTRACTS`: **Glassfall Incursion**, **The Sunken Signal**, and **Operation Thunderroot**. Each is a separate six-phase mission: signal capture, destroy fabricators, protect a drill, connect three pylons, defeat an elite boss, and extract. They share the third-person RPG systems but do not currently include battalion production. A war-rift version with branching custom objectives and siege roles is a planned upgrade.

## Production design — not implemented

The full CrownFold war mode should include destructible fortifications, siege ladders and walls, vehicles and aircraft, officer units, thousands of individually simulated visible soldiers, spatially robust pathfinding, authored multi-act campaigns, persistent strategic fronts, construction placement previews, co-op and PvP, and fully voiced context-specific mission arcs. The prototype now implements role counters, basic morale/rout, tactical crises, supply caravans as escort objectives and adaptive reinforcement economies at aggregate scale, **not** those production features.
