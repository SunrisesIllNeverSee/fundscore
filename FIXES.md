# fundscore — Fixes & Proposed Changes

Documented 2026-07-07. Bugs found during testing + owner's proposed business viability extension.

---

## Bugs (found during test run)

### BUG-1: Nonexistent path doesn't error
**Severity:** Medium  
**Repro:** `node bin/fundscore.js /tmp/does-not-exist` → scores 0.6/10, exits 0  
**Expected:** Error message + exit 1  
**Root cause:** `listFiles()` in `loader.js` silently returns `[]` when `fs.readdirSync` fails. The scorer never knows the path was invalid.  
**Fix:** Add a path-exists check at the top of `score()` in `scorer.js`:
```js
if (!fs.existsSync(repoRoot) || !fs.statSync(repoRoot).isDirectory()) {
  throw new Error(`Repository path does not exist or is not a directory: ${repoRoot}`);
}
```

### BUG-2: Non-deterministic output
**Severity:** Low (but contradicts README claim of "deterministic")  
**Repro:** Run `fundscore --json` twice → `generatedAt` differs every run  
**Root cause:** `new Date().toISOString()` in `scorer.js` line 73  
**Fix:** Either (a) remove `generatedAt` from the deterministic payload and put it in a separate metadata wrapper, or (b) accept a `--timestamp` flag for reproducible runs, or (c) just remove the "deterministic" claim from the README. Option (a) is cleanest.

### BUG-3: Wrong GitHub URL in markdown footer
**Severity:** Low  
**Repro:** `node bin/fundscore.js --md` → footer says `github.com/SunrisesIllNeverSee/Burnmydays`  
**Expected:** `github.com/SunrisesIllNeverSee/fundscore`  
**Root cause:** `format.js` line 99 has hardcoded `Burnmydays` URL  
**Fix:** Change to `https://github.com/SunrisesIllNeverSee/fundscore`

### BUG-4: Name inconsistency in README
**Severity:** Low  
**Repro:** `head -1 README.md` → `# Burnmydays — fundscore`  
**Expected:** `# fundscore` (the repo is named fundscore, no Burnmydays branding)  
**Fix:** Remove "Burnmydays —" from README header

---

## Design issues (not bugs, but worth fixing)

### DESIGN-1: Node.js-only test detection
The `tests-or-ci` check only recognizes `package.json` test scripts, jest/vitest files, and `.github/workflows/*.yml`. A Python repo with 200 pytest tests, a Rust repo with `cargo test`, a Go repo with `_test.go` files — all score 0 on this check.  
**Fix:** Extend the check to recognize: `pytest.ini`, `conftest.py`, `test_*.py`/`*_test.py`, `Cargo.toml` with `[[test]]` or `tests/` dir, `*_test.go` files, `spec/` dir + `Gemfile` (rspec), `pom.xml`/`build.gradle` with test config, `tox.ini`, `noxfile.py`.

### DESIGN-2: `rokrev` file is unrelated research
The `rokrev` file is a 500+ line research dump about AI agent marketplace composite scoring, DAO governance, CIVITAE/Signomy, Robert's Rules DAO. It has nothing to do with fundscore.  
**Fix:** Move to archive or delete.

### DESIGN-3: No dogfooding
fundscore doesn't have a `.fundscore.yml` in its own repo and scores itself 6.1/10 with FUNDING.md, ROADMAP.md, COMPARABLES.md, RISKS.md, SECURITY.md all missing.  
**Fix:** Add the missing docs + a `.fundscore.yml` to bring its own score up.

---

## Proposed: Business Viability extension (owner's 3-pillar framework)

Owner wants to add a third scoring dimension alongside Coverage + Quality:

### New dimension: Business Viability (0-10)

| Pillar | Weight | What it checks (repo evidence) |
|--------|--------|-------------------------------|
| Recession Resilience | 3 | RISKS.md/ROADMAP mentions recurring revenue, economic moat, fixed cost base, diversified customers |
| Pricing Power | 3 | README/FUNDING.md mentions switching costs, sticky product, recurring revenue, low CAC payback |
| Tech-Enabled Margins | 3 | Evidence of automation, API integrations, async ops, margin roadmap |
| Contingency Depth | 1 | RISKS.md lists scenario planning, ROADMAP shows low-dependency features |

### Implementation plan
1. New file: `src/core/business.js` — 4 checks, same pattern as `rubric.js`
2. Update `scorer.js` — call `computeBusinessViability(ctx)` alongside coverage/quality
3. Update `format.js` — add Business Viability section to markdown + summary
4. Update `.fundscore.yml` schema — add `business` weights section
5. Update scoring weights — e.g., 40% coverage, 20% quality, 40% business (configurable)
6. Update README — document the 3-pillar model
7. Update GitHub Action — business viability shows in PR comments

### Open questions for R&D
- Is regex-matching for "recurring revenue" in a README actually useful signal, or false precision?
- Should business viability be opt-in (off by default) since most OSS repos aren't businesses?
- What's the right default weight split? 40/20/40 penalizes pure OSS projects.
- Should this be a separate command (`fundscore --business`) or always-on?
