# CrownFold v0.6 — Lost Futures + The Living War verification (2026-11-03)

**Build:** desktop browser single-player **pre-alpha**. Current tests prove simulation safety and UI flows, not AAA readiness.

- `npm test`: **144 / 144 automated tests pass**, covering all prior RPG, cross-era, RTS war, lost sciences and the new war director systems.
- `npm run check`: syntax/lint checks for all maintained JavaScript modules.
- `npm run build`: rebuilt the offline HTML game with `src/lineage.mjs` included.
- `python tests/lost_futures_browser.py`: **23 feature checks pass**, including heritage change, ten sciences, field-power gating and mixed armies.
- `python tests/war_director_browser.py`: **11 interactive checks pass**, including timed crisis spawn, objective HUD, completion, reward, and continued command. No reported page errors.
- `python tests/chronicle_browser.py`: **21 checks pass** across world travel, dialogue, RTS production and war victory.
- Original RPG integration tests remain supported; automated tests use fast-forward and test-state teleportation where appropriate.

**Balance finding:** a scripted auto-commander can complete or lose current prototype wars in roughly **3–8 simulated minutes** despite the 36-minute timer. Two destructible anchors now create a multi-stage siege, but full 25–45-minute authored mission pacing remains **unmet** and requires scenario design, content, human playtesting and repeated benchmarks.

**Renderer:** hardware-accelerated WebGL2 is present in source but physical GPU QA is missing; browser captures in this environment use the software fallback. The build does not use Unreal Engine and has not shipped multiplayer, native physics or large-scale AI.

**Wiki:** Markdown documents are in the repository-backed `wiki/` mirror, not yet synchronized to GitHub's separate Wiki Git repository.

---

# CrownFold v0.4 — Great Entanglement verification (2026-11-03)

**Release:** experimental browser vertical slice. All statements below refer to actual local checks; not native AAA gameplay or a fully human-playtested campaign.

- `npm test`: **104/104 pass** (84 v0.3 simulation checks + 20 new temporal/RTS regression tests).
- `npm run check`: all JavaScript and test syntax checks passed.
- `npm run build`: generated self-contained offline game and preserved original 3D board mode.
- `python tests/browser_smoke.py`: original shooter/build/RTS/mission smoke pass.
- `python tests/rpg_browser.py`: previous RPG/dungeon/pickpocket/quest/safe interaction pass (29 checks).
- `python tests/chronicle_browser.py`: **21/21 browser checks pass** through 1278→1889 gate, era NPC, Chronofold, war HQ, commander view, training queue, foundry construction, win and return.
- No JavaScript page errors in the Chronicle browser integration. Headless software renderer was used, not verified hardware WebGL2.
- Campaign AI uses aggregate battalions rather than thousands of individually simulated NPCs; the 36-minute scenario *timer* is implemented, but a full no-shortcut 36-minute playthrough has not been verified.
- GitHub Wiki pages are mirrored under `wiki/` in the repository rather than synced to the separate Wiki Git remote.

---

## Historical v0.3 QA record

# CROWNFOLD: RIFTFRONT — v0.3 verification record

**Date:** 2026-11-03. **Build:** playable single-player, dependency-free browser pre-alpha. All checks listed are actual automated tests, not predictions of AAA readiness.

## Executed test suites

| Command | Result | Scope |
|:--|:--|:--|
| `npm run check` | Pass | JS syntax checks for game, renderer, RPG, simulation, build and tests |
| `npm test` | **84/84 pass** | 40 original simulation tests + 44 RPG, crime, ability, bounty, weapon, save and dungeon checks |
| `npm run build` | Pass | Embedded offline HTML bundle and original board-game HTML generated |
| `python tests/browser_smoke.py` | Pass | Original menu, movement, RTS, Fold, building, operation in headless Chromium |
| `python tests/rpg_browser.py` | **29/29 interactions pass** | Perk screen, upgrade, journal, forge, map, bounty board, homestead rest, NPC conversation, quest acceptance, thievery, lockpicking UI, loot, dungeon progression, return, original operation |

The browser run includes programmed teleports and combat bypasses to reach otherwise lengthy dungeon/quest states and is an integration check, **not** a human-verified complete dungeon or 36-minute mission playthrough. See `test-results/*.json` for captured structured results and `test-results/rpg-*.png` for real screenshots.

## Issues caught and fixed

- Corrected six-phase operation progression to avoid a double stage advance in one frame.
- Prevented weapon, craft, and building materials from being spent beyond their validated budgets.
- Preserved overworld coordinates in saves made during operations and dungeon excursions.
- Ensured original v0.2 save state can load with new default RPG fields.
- Added distinct ammunition types and reload/resupply support for the new SMG, cryo caster and heavy launcher.
- Fixed cipher-safe UI stacking: the modal now overlays the 3D world rather than being visually hidden behind its canvas.
- Corrected dungeon return-portal positioning and maintained alternate exit access.
- Made theft non-repeatable per NPC, cipher caches one-time loot, and quest turn-ins check the correct quest giver.

## Renderer and performance caveats

Headless Chromium used the **software triangle rendering fallback** on this host. Its screenshots prove UI and fallback-level 3D scene construction. The source contains native-browser WebGL2 3D instancing, a terrain shader and procedural scene renderer, but **physical GPU WebGL2 performance, hardware lighting/fidelity, memory use and frame pacing are not verified**. A high-end Unreal Engine rendering target documented elsewhere in this repository is a future architecture recommendation, not an accomplished port.

## Important missing production work

- No verified full 30+ minute human session across all six operation phases; no broad balance or difficulty data.
- No general collision/navmesh, responsive motion-captured character animation, authored dialogue cinematics, large numbers of handcrafted quest dungeons or fully scheduled NPC social lives.
- No multiplayer backend or synchronized squad world, no controller/keyboard rebinding, no full accessibility and localization coverage.
- Saves rely on browser `localStorage`. File URLs may have origin-specific storage; backups and long-term migrations are not production-grade.
- The infinite-seeming frontier has procedurally deterministic biome chunks but only eight authored major landmarks, three operations with one general objective template, and three RPG dungeons.
- Faction endings and legal consequences are compact modifiers/flags rather than production-scale scripted reactivity.
- Full Firefox, Safari and mobile responsive testing is outstanding.

## Recommended next acceptance gates

1. Physical GPU WebGL2 and fallback visual checks on Chrome/Edge/Firefox; target frame budgets and benchmark performance profiles.
2. Full no-cheat operation playthrough on every difficulty with 30–45-minute pacing, error logging and reward validation.
3. Play each dungeon legitimately, including actual combat, independent guardian AI, safe puzzle solves and retreat/return flows.
4. Simulate multiple in-game weeks and save/reload cycles on long-distance landmarks, and check localStorage boundary/corruption behavior.
5. Create design-driven playtests for perk usefulness, spell synergy, NPC interaction clarity, safe minigame skill ceiling and companion behavior.
