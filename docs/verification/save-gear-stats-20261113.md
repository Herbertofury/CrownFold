# Equipped-gear save recovery

A damaged equipment record could restore strings, arrays, objects or negative bonuses directly into combat stat arithmetic. For example, `health: "broken"` changed max health into text and current health into NaN, making an otherwise recoverable campaign unplayable.

The restore boundary retains the gear item and equipped slot but rebuilds its stat record from supported finite nonnegative numeric bonuses. Values are bounded to 10,000 to prevent unreasonable restored magnitudes. Invalid/unknown bonuses are omitted. Ordinary generated armor, relic and weapon-mod stats remain unchanged.

Eight new Node regression cases cover damaged bonuses, valid generated equipment across tiers, continued simulation, repeated save/reload, extreme values and unknown properties. The existing served/offline Chromium Continue/Save regression now also injects malformed equipped gear and verifies healthy restored vitals, preserved equipment identity, and corrected persisted stats. This deliberately damaged fixture is not a human campaign playtest.

The original failing Node reproduction is retained locally in `evidence/baseline-gear.log`. Browser verification is supplied by exact-head hosted CI, not claimed from local execution on the socket-restricted cloud host. No installed game or user save was modified. Full native/hardware/campaign acceptance remains separate under #17.
