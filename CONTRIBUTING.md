# Contributing to fundscore

Thanks for your interest! fundscore is the deterministic investor-readiness scorer for GitHub repositories.

## Quick start

```bash
git clone https://github.com/SunrisesIllNeverSee/fundscore.git
cd fundscore
npm install
node tests/core.test.js    # run tests
node bin/fundscore.js       # score the current repo
```

## Before you commit

```bash
node tests/core.test.js    # all tests pass
node bin/fundscore.js       # runs without error on this repo
```

## Invariants — do not break

- **Deterministic.** No LLM, no AI, no external API calls. Same repo, same score, every time.
- **Transparent.** Every check is visible, every weight is configurable, every score delta is shown.
- **Honest.** The asterisk is prominent — the score reflects what a repo communicates, not what a business is.

## Adding a check

1. Add the check to the appropriate dimension (artifacts, business, or quality) in `src/core/`.
2. Add a test case to `tests/core.test.js`.
3. Update the check table in README.md with the check name, description, and weight.
4. Verify `fundscore` still runs and the score delta is shown correctly.

## Pull requests

Fork → branch → `node tests/core.test.js` passes → open PR against `main`. Reference any related issues.
