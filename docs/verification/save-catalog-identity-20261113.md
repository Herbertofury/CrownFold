# Damaged-save catalog recovery — 2026-11-13

Scope: reject JavaScript prototype names as registered weapons, structures, quests, tracked quests, factions or gear slots when restoring a save. This changes no valid identifier and retains the rest of a recoverable campaign.

Baseline `64b82dd680669d5210b0ec5dd0c28b72c79f4be2`: synthetic saved quests named `constructor`, `toString`, `__proto__` or `valueOf` throw while reading a nonexistent quest goal, disabling Continue. Separately, the inherited weapon names are accepted and firing can produce invalid ammo values. These are damaged-data fault controls, not claims of naturally observed player-save corruption.

The restore boundary now checks own registered entries (and string types for values). Five new Node tests cover all four names, preserved campaign inventory, valid-weapon/structure round trips and an actual simulation step after recovery. All 321 Node tests, syntax checks and offline build passed locally. The rebuilt offline artifact embeds the same corrected modules.

`tests/save_catalog_browser.py` exercises actual Continue and Save controls for served and offline builds with a deliberately damaged save. It is included in the gameplay CI workflow. Local browser execution was not accepted: the installed system Chromium fails on an OS socket restriction. Browser results must be read from exact-head hosted CI before claiming browser acceptance.

No changes to user saves, installed builds, repository visibility or native gameplay acceptance.
