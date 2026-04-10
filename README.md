# Burnmydays — `fundscore`

**Repo-only funding viability scorer.** A deterministic, no-LLM tool that scores your GitHub repository against investor-readiness criteria — running locally as a CLI and automatically in CI via a GitHub Action.

## What is this?

`fundscore` reads your repository's files and metadata, then produces two complementary scores:

| Score | How it works |
|-------|--------------|
| **Coverage Score** (0-10) | Deterministic checklist: checks for the presence and content of key investor artifacts (README, funding docs, market docs, etc.) |
| **Quality Score** (0-10) | Heuristic-only: measures readability, specificity (concrete numbers/metrics), document structure, and internal consistency — **no LLM, no external API** |

The **Overall Score** is a weighted average of Coverage + Quality (60/40 by default, configurable).

The tool also auto-infers an **Investor Lens** (funding round, check size, team mode, NAICS code) from your repo content, so the context is always visible alongside the score.

---

## How scoring works

### Coverage Score

Twelve checks, each with a weight:

| ID | Check | Default Weight |
|----|-------|---------------|
| `readme-exists` | README.md is present | 8 |
| `readme-oneliner` | README has a one-liner / problem statement | 7 |
| `readme-cta` | README has a CTA or contact info | 5 |
| `readme-demo` | README has a demo link or screenshot | 4 |
| `funding-or-roadmap` | FUNDING.md or ROADMAP.md exists | 9 |
| `market-comps` | COMPARABLES.md / market section in README | 7 |
| `risks-honest` | RISKS.md or limitations section | 6 |
| `license` | LICENSE file or licensing text | 5 |
| `tests-or-ci` | Test files, test script, or CI workflow | 4 |
| `security` | SECURITY.md or dependency scanning config | 3 |
| `contact-team` | Team or contact info mentioned | 5 |
| `audience-customer` | Audience / target customer identified | 6 |

Final Coverage Score = (sum of weights of passing checks) / (sum of all weights) × 10.

### Quality Score

Five heuristic dimensions (no external calls):

| Dimension | Description | Weight |
|-----------|-------------|--------|
| **Readability** | Flesch Reading Ease approximation of README | 3 |
| **Specificity** | Count of concrete numbers/metrics/dates in docs | 3 |
| **Structure** | Headings, lists, code blocks in README | 2 |
| **Length** | README length (penalises sparse or padded) | 1 |
| **Consistency** | Checks for contradicting numbers across docs | 1 |

### Overall Score

```
overallScore = (coverageScore × coverageWeight + qualityScore × qualityWeight) / (coverageWeight + qualityWeight)
```

Default weights: `coverageWeight = 0.6`, `qualityWeight = 0.4`.

---

## Configuration — `.fundscore.yml`

Create a `.fundscore.yml` file at the repo root to override any defaults:

```yaml
# .fundscore.yml — optional overrides for fundscore

# Override the auto-inferred Investor Lens
lens:
  round: seed          # pre-seed | seed | series-a | grant
  checkSize: "$500k"
  teamMode: solo       # solo | small-team | operating-team
  naics: "511210"

# Override individual check weights (use check IDs from the table above)
weights:
  funding-or-roadmap: 10
  market-comps: 8
  readme-exists: 9

# Mark specific checks as required (fail status if not passing)
required:
  readme-exists: true
  funding-or-roadmap: true

# Scoring weights (must sum to a positive number)
scoring:
  coverageWeight: 0.7
  qualityWeight: 0.3

# Score thresholds
thresholds:
  warn: 5    # score < warn → status: warn
  fail: 3    # score < fail → status: fail
```

All fields are optional. Unset fields use defaults.

---

## Running locally

### Install

```bash
# In the repo directory:
npm install

# Or install globally:
npm install -g .
```

### Usage

```bash
# Run against current directory (summary output)
fundscore

# OR use node directly
node bin/fundscore.js

# JSON output (full structured report)
fundscore --json

# Markdown report
fundscore --md

# Exit non-zero if overallScore < threshold
fundscore --fail-below 5

# Combine flags
fundscore --md --fail-below 6

# Run against a specific path
fundscore /path/to/repo
```

### Sample output

```
fundscore ✅ PASS
  Overall : 7.4/10
  Coverage: 8.3/10  (10/12 checks passed)
  Quality : 6.0/10
  Lens    : seed / solo / NAICS 511210

  Top missing items:
    - Security posture hint present
    - README contains a demo link or screenshot
```

---

## Running in CI (GitHub Action)

The included workflow (`.github/workflows/fundscore.yml`) runs automatically on every push and pull request.

**On pull requests:** Posts (or updates) a comment with the full Markdown report.

**On pushes:** Uploads `fundscore-report.json` as a build artifact (retained for 30 days).

The workflow uses only `GITHUB_TOKEN` — no additional secrets required.

To adjust CI behaviour, edit `.github/workflows/fundscore.yml` or add a `.fundscore.yml` to your repo.

---

## Non-goals

- No web UI.
- No real investor probability predictions.
- No LLM or external API calls.
- No paid services required.

---

## License

MIT © SunrisesIllNeverSee
