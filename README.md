# fundscore — Lighthouse for repos

**Deterministic investor-readiness scoring for GitHub repositories.** A no-LLM CLI tool and GitHub Action that scores your repo 0-100 across three dimensions — artifacts, business viability, and quality — and tells you exactly what to fix and by how much.

> ⚠️ **Asterisk:** The score is a snapshot of repo-readiness signals, not a business valuation. It reflects what your repo *communicates*, not what your business *is*. The value compounds over time — score history is a track record that can't be backdated.

---

## What it does

```
fundscore ✅ PASS
  Overall  : 63.63/100
  Artifacts: 67.4/100  (13/18 checks)
  Business : 57.1/100  (4/7 checks)
  Quality  : 64.0/100
  Round    : Seed → 69.33/100  (check size: $1M - $3M)

  Top fixes (by score impact):
    +6.6 pts  Funding or roadmap document exists (FUNDING.md / ROADMAP.md)
    +5.1 pts  Market / comparables document exists
    +4.4 pts  Risks / honest assessment document exists
```

Three dimensions, scored 0-100:

| Dimension | What it measures | Weight |
|-----------|-----------------|--------|
| **Artifacts** | Does your repo have the docs investors expect? (18 checks: README, FUNDING, ROADMAP, RISKS, LICENSE, tests, CI, security, changelog, contributing, architecture, git activity, contributors, deployed URL, etc.) | 50% |
| **Business Viability** | Does your repo communicate the signals investors look for? (7 checks: monetization clarity, recession resilience, pricing power, tech-enabled margins, contingency depth, market evidence, traction evidence) | 30% |
| **Quality** | Are your docs readable, specific, well-structured, and consistent? (5 heuristic dimensions, no LLM) | 20% |

Plus a **Round-Specific Report**: auto-infers your funding round (pre-seed / seed / series-a / grant) and shows what investors expect at that round, what you have, and what's missing.

---

## Quick start

```bash
# Install
npm install -g .

# Score your repo
fundscore

# Full markdown report
fundscore --md

# JSON output (for CI / programmatic use)
fundscore --json

# Score a specific repo
fundscore /path/to/repo

# Fail CI if score below threshold
fundscore --fail-below 50
```

### Commands

```bash
fundscore                    # Score current repo (summary output)
fundscore --md               # Full markdown report
fundscore --json             # JSON output
fundscore --fail-below 50    # Exit 1 if score < 50

fundscore fix                # Show scaffold plan for missing docs
fundscore fix --apply        # Create missing doc templates
fundscore fix --apply --force  # Overwrite existing docs

fundscore history            # Show score over time
fundscore history --save     # Save current score as a snapshot

fundscore badge              # Output SVG badge
fundscore badge --embed      # Output markdown badge snippet
fundscore badge --save       # Save SVG badge to repo
```

---

## The three dimensions

### 1. Artifacts (18 checks)

Deterministic file-presence and content checks. Each has a weight; score = weighted pass rate × 100.

| Check | Description | Weight |
|-------|-------------|--------|
| `readme-exists` | README.md is present | 8 |
| `readme-oneliner` | README has a problem statement / one-liner | 7 |
| `readme-cta` | README has a CTA or contact info | 5 |
| `readme-demo` | README has a demo link or screenshot | 4 |
| `deployed-url` | README mentions a live deployed product URL | 6 |
| `funding-or-roadmap` | FUNDING.md or ROADMAP.md exists | 9 |
| `market-comps` | COMPARABLES.md or market section in README | 7 |
| `risks-honest` | RISKS.md or limitations section | 6 |
| `license` | LICENSE file or licensing text | 5 |
| `tests-or-ci` | Tests or CI present (multi-language: JS, Python, Rust, Go, Ruby, Java) | 5 |
| `security` | SECURITY.md or dependency scanning config | 3 |
| `contact-team` | Team or contact info mentioned | 5 |
| `audience-customer` | Target audience / customer identified | 6 |
| `changelog` | CHANGELOG.md or release history | 3 |
| `contributing` | CONTRIBUTING.md exists | 3 |
| `architecture` | ARCHITECTURE.md or docs/ structure | 4 |
| `git-activity` | Commits in last 90 days (not a dead repo) | 5 |
| `contributor-count` | 2+ contributors (team signal) | 4 |

### 2. Business Viability (7 checks)

Checks whether your repo *communicates* the signals investors look for. Not "we evaluate your business" — "does your repo say the things investors need to hear?"

| Check | Description | Weight |
|-------|-------------|--------|
| `monetization-clarity` | How the business makes money is stated (pricing, revenue model) | 8 |
| `recession-resilience` | Recurring revenue, moat, fixed costs, diversification signals | 6 |
| `pricing-power` | Switching costs, retention, CAC/LTV, upsell signals | 6 |
| `tech-enabled-margins` | Automation, API, scale, AI, self-serve signals | 5 |
| `contingency-depth` | Scenario planning, mitigation, runway, break-even | 4 |
| `market-evidence` | TAM, competitors, positioning, growth rate | 6 |
| `traction-evidence` | Users, revenue, growth metrics, testimonials | 7 |

### 3. Quality (5 heuristic dimensions)

No LLM, no external API. Pure text analysis.

| Dimension | What it measures | Weight |
|-----------|-----------------|--------|
| Readability | Flesch Reading Ease approximation | 3 |
| Specificity | Concrete numbers, dates, metrics | 3 |
| Structure | Headings, lists, code blocks | 2 |
| Length | Not too sparse, not too padded | 1 |
| Consistency | No contradicting numbers across docs | 1 |

---

## Round-Specific Reports

fundscore auto-infers your funding round and shows what investors expect:

| Round | Check Size | What investors want |
|-------|-----------|-------------------|
| **Pre-Seed** | $250k-$500k | Problem, team, early signals of life |
| **Seed** | $1M-$3M | Working product, real market, path to revenue |
| **Series A** | $5M-$15M | Real traction, governance, scale, defensible moat |
| **Grant** | varies | Public benefit, open access, reproducibility |

Each round has **required** (60% of round score), **expected** (30%), and **bonus** (10%) checks. The report shows what you have, what's missing, and your round-specific score.

---

## `--fix` mode

```bash
$ fundscore fix
fundscore fix — scaffold plan (dry run)

  FUNDING.md (fixes: funding-or-roadmap)
  ROADMAP.md (fixes: funding-or-roadmap)
  RISKS.md (fixes: risks-honest)
  SECURITY.md (fixes: security)
  CHANGELOG.md (fixes: changelog)
  CONTRIBUTING.md (fixes: contributing)

  Run `fundscore fix --apply` to create these files.
```

Generates template files for missing docs. Edit them, re-run fundscore, watch your score go up.

---

## Score history (the moat)

```bash
$ fundscore history --save   # Save a snapshot
$ fundscore history          # Show trajectory

fundscore history

  Date                     Score    Artifacts  Business  Quality   Round
  ───────────────────────────────────────────────────────────────────────────
  2026-07-07T11:26:21       51.7       52.6       40.5       66.0   pre-seed
  2026-07-08T09:15:03       58.3       61.2       48.1       66.0   pre-seed
  2026-07-15T14:22:10       67.9       72.4       55.7       72.0   seed

  Trajectory: ↑ +16.2 pts over 3 snapshots
```

Score history is a track record. A repo that went 42 → 58 → 71 over 6 months tells a story. Competitors can build a better scorer, but they can't backdate your history.

---

## Badge

```bash
$ fundscore badge --embed
[![fundscore](https://img.shields.io/badge/fundscore-64%2F100-dfb317)](https://github.com/SunrisesIllNeverSee/fundscore)
```

Embed in your README. The badge signals investor-readiness, same way a Lighthouse badge signals web quality.

---

## Configuration — `.fundscore.yml`

```yaml
# Override the auto-inferred Investor Lens
lens:
  round: seed
  checkSize: "$1.5M"
  teamMode: solo
  naics: "511210"

# Override artifact check weights
weights:
  funding-or-roadmap: 10
  market-comps: 8

# Override business check weights
businessWeights:
  monetization-clarity: 10
  traction-evidence: 8

# Mark checks as required
required:
  readme-exists: true
  funding-or-roadmap: true

# Dimension weights (must sum to a positive number)
scoring:
  artifactsWeight: 0.5
  businessWeight: 0.3
  qualityWeight: 0.2

# Score thresholds (0-100 scale)
thresholds:
  warn: 50
  fail: 30
```

---

## GitHub Action

The included workflow (`.github/workflows/fundscore.yml`) runs on every push and PR:

- **Pull requests:** Posts a comment with the full markdown report
- **Pushes:** Uploads `fundscore-report.json` as a build artifact (30-day retention)

Uses only `GITHUB_TOKEN` — no additional secrets required.

---

## Design principles

- **Deterministic** — no LLM, no AI, no external API calls. Same repo, same score, every time.
- **Transparent** — every check is visible, every weight is configurable, every score delta is shown.
- **Honest** — the asterisk is prominent. The score reflects what your repo communicates, not what your business is.
- **Actionable** — `--fix` mode tells you exactly what to do, and each fix shows its score impact.
- **Alive** — score history grows with your repo. The trajectory is the product.

---

## License

MIT © SunrisesIllNeverSee
