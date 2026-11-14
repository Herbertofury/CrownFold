# Settings persistence regression (2026-11-14)

PR #24's first player-settings run failed only the explicit reduced-motion override after closing the last offline page. Its retry passed. This was not evidence of a fixed bug.

A bounded local reproduction on Chromium headless shell 141.0.7390.37 initially passed 25 trials, then failed trial 10 of a separate 12-trial run. Before closing, both runtime and localStorage held `reduceEffects:false`. After reopening the same file in an ephemeral browser context, localStorage was **null**, causing the correct system-default fallback (`true`). No application parser or preference-saving change is justified by this evidence.

The original test wanted a fresh document without its corruption init script, not an empty ephemeral file-origin storage lifecycle. It now opens that fresh document before closing the previous one. All 26 original assertions remain. The test retains before/after bytes for future diagnosis.

The additional durable harness checks:
- 12 fresh-document trials with a reduced-motion system default and explicit opposite preference;
- 4 independent persistent profiles, each fully closing and relaunching the browser before checking exact stored bytes and runtime preference;
- no retries, ignored failures, fixed sleeps or relaxed success conditions.

Both the full 26-check UI/audio test and all 16 new trials passed locally. CI repeats them using its pinned Playwright Chromium. This repairs test lifecycle modeling, not a claim to repair Chromium's ephemeral file-origin behavior or prove every browser's persistence. Hardware audio and long-term campaign acceptance are outside scope.

Synthetic evidence, with no personal saves or credentials:
- [Reproduced failure](evidence/settings-persistence-failure-20261114.json)
- [Local fresh-document and real-profile restart results](evidence/settings-persistence-fixed-20261114.json)

Commands: `python tests/settings_browser.py` and `python tests/settings_persistence_browser.py`. Set `CHROMIUM_PATH` to an existing supported browser only when needed. CI uploads the fresh evidence under `test-results/` even when checks fail.
