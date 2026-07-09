# fundscore — Full Build Report

2026-07-07. Complete record of what was built, what was fixed, and what remains.

---

## I. What was built (this session)

### Starting point

The repo had a working but thin MVP: 2-dimension scoring (coverage + quality) on a 0-10 scale, 12 coverage checks, Node.js-only test detection, 23 tests passing, 4 known bugs.

### What shipped (v0.2.0)

**1. Three-dimension scoring (0-100 scale)**

Restructured from 2 dimensions to 3:

| Dimension          | Weight | Checks      | What it measures                               |
| ------------------ | ------ | ----------- | ---------------------------------------------- |
| Artifacts          | 50%    | 18          | Does your repo have the docs investors expect? |
| Business Viability | 30%    | 7           | Does your repo communicate investor signals?   |
| Quality            | 20%    | 5 heuristic | Are your docs readable, specific, structured?  |

**2. Artifacts dimension — expanded from 12 to 18 checks**

New checks added:

- `deployed-url` — detects live product URLs (Vercel, Netlify, Heroku, Fly, Render, custom domains). Excludes GitHub/npm/PyPI URLs.
- `changelog` — CHANGELOG.md or release history
- `contributing` — CONTRIBUTING.md (signals serious project)
- `architecture` — ARCHITECTURE.md or docs/ with 3+ documents
- `git-activity` — commits in last 90 days (not a dead repo). Uses `git log`.
- `contributor-count` — 2+ contributors (team signal). Uses `git shortlog`.

Multi-language test detection expanded from Node.js-only to:

- JavaScript (package.json test script, _.test._, _.spec._, **tests**)
- Python (test_*.py, *_test.py, conftest.py, pytest.ini, tox.ini, noxfile.py)
- Rust (Cargo.toml + tests/ directory)
- Go (*_test.go files)
- Ruby (spec/*_spec.rb, Gemfile with rspec/minitest)
- Java (pom.xml with surefire/junit, build.gradle with test/junit)

**3. Business viability dimension — 7 new checks**

Reframed from "we evaluate your business" to "does your repo communicate the signals investors look for?" Each check regex-matches for investor-relevant language in README/FUNDING/RISKS/ROADMAP docs.

| Check                  | Signals detected                                             |
| ---------------------- | ------------------------------------------------------------ |
| `monetization-clarity` | Pricing, revenue model, SaaS, subscription, payment          |
| `recession-resilience` | Recurring revenue, moat, fixed costs, diversification        |
| `pricing-power`        | Switching costs, retention, CAC/LTV, upsell, sticky          |
| `tech-enabled-margins` | Automation, API, scale, AI/ML, self-serve (needs 2+ signals) |
| `contingency-depth`    | Scenario planning, mitigation, runway, break-even            |
| `market-evidence`      | TAM/SAM, competitors, positioning, growth rate               |
| `traction-evidence`    | Users, revenue, growth metrics, testimonials, deployed       |

Asterisk prominently displayed: "Snapshot of repo-readiness signals, not a business valuation."

**4. Round-specific investor lens reports**

Auto-infers funding round (pre-seed / seed / series-a / grant) and produces a gap analysis:

| Round    | Check Size  | Required (60%)                                                                 | Expected (30%)                                                                                                               | Bonus (10%)                                                      |
| -------- | ----------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Pre-Seed | $250k-$500k | README, one-liner, team, audience                                              | demo, deployed URL, license, tests, git activity                                                                             | funding, monetization, market                                    |
| Seed     | $1M-$3M     | README, one-liner, audience, funding, market                                   | deployed, demo, license, tests, git, monetization, traction                                                                  | risks, security, contributing, architecture, resilience, pricing |
| Series A | $5M-$15M    | README, one-liner, audience, funding, market, monetization, traction, deployed | license, tests, git, contributors, security, architecture, changelog, contributing, risks, resilience, pricing, tech-margins | contingency, CTA, demo                                           |
| Grant    | varies      | README, one-liner, license, audience                                           | tests, git, contributing, changelog, architecture                                                                            | funding, market, security, deployed                              |

Source: general VC knowledge (not from rokrev/CIVITAE framework).

**5. `--fix` mode with template scaffolding**

7 scaffoldable doc templates: FUNDING.md, ROADMAP.md, RISKS.md, SECURITY.md, CONTRIBUTING.md, CHANGELOG.md, COMPARABLES.md.

- `fundscore fix` — dry run, shows what would be created
- `fundscore fix --apply` — creates the files
- `fundscore fix --apply --force` — overwrites existing

Each missing check shows its score delta ("+6.6 pts for FUNDING.md").

**6. Score history + trajectory**

- `fundscore history --save` — saves a JSON snapshot to `.fundscore-history/`
- `fundscore history` — shows score table over time with trend arrow (↑/↓/→)
- MCP `score_repo` auto-saves on every call (configurable via `.fundscore.yml`)

The trajectory is the moat — competitors can't backdate score history.

**7. SVG badge**

- `fundscore badge` — outputs SVG with score + color (green/yellow/red/gray)
- `fundscore badge --embed` — markdown snippet for README
- `fundscore badge --save` — writes SVG to repo

**8. MCP server (3 tools)**

Stdio MCP server for AI agent integration (Claude Code, Cursor, Windsurf):

| Tool           | Behavior                                                                              |
| -------------- | ------------------------------------------------------------------------------------- |
| `score_repo`   | Scores repo, returns agent-optimized report. Auto-saves snapshot.                     |
| `get_fix_plan` | Read-only scaffold plan with score deltas.                                            |
| `apply_fixes`  | Creates templates. `dryRun=true` default. `force=true` to overwrite. Re-scores after. |

Agent-optimized response format: structured JSON with dimensions, round analysis, top fixes, missing checks, asterisk. Agents weave this into natural language.

**9. Bug fixes**

| Bug                             | Before                       | After                                  |
| ------------------------------- | ---------------------------- | -------------------------------------- |
| BUG-1: Nonexistent path         | Silently scored 0.6          | Throws error, exits 1                  |
| BUG-2: Non-deterministic output | generatedAt mixed into score | Separated as metadata                  |
| BUG-3: Wrong GitHub URL         | Pointed to Burnmydays        | Fixed to SunrisesIllneverSee/fundscore |
| BUG-4: Name inconsistency       | "Burnmydays — fundscore"     | "fundscore — Lighthouse for repos"     |

**10. Tests**

67/67 passing:

- 43 core tests (lens, quality, rubric, business, lens-report, templates, scorer integration, format)
- 24 MCP tests (tool definitions, score_repo, get_fix_plan, apply_fixes, buildAgentReport, error handling)

**11. npm publication**

Published as `fundscore@0.2.0` on npm. 16 files, 27KB. `npx fundscore` and `npx fundscore mcp` both work.

**12. Documentation**

- README.md — full documentation with all commands, dimensions, MCP setup
- FIXES.md — 4 bugs + business viability proposal
- RESEARCH.md — competitive landscape (20+ competitors analyzed) + R&D analysis
- PLAN.md — Phase 0-5 playbook with feedback loops
- STATE.yaml — machine-readable state snapshot

---

## II. What remains

### Phase 3: Web UI (~1 day)

Landing page: paste GitHub URL → get instant score + report. No auth, no database. Server-side clone + score. Shareable URL. Deploy on Vercel. This is the marketing surface that makes fundscore discoverable by non-developers.

### Phase 3.5: MCP Registry + Smithery listing (~30 min)

Submit fundscore to MCP registries for discoverability. Package already on npm.

### Phase 3.7: GitHub Action real CI test (~1 hour)

The workflow file exists but hasn't been tested in real GitHub CI. Needs a test PR to verify the comment posting and artifact upload.

### Phase 4: Score history profile pages (~1 week)

Database to store score snapshots. Profile pages per repo showing trajectory chart, dimension breakdown, round report. Data source: GitHub Action artifacts auto-upload. Privacy: opt-in.

### Phase 5: Discovery platform (company-level)

Browse/filter repos by score, round, sector, trajectory. Investor accounts. Founder accounts. Evidence-backed claims. API. Leaderboards. This is the endgame — AngelList with deterministic repo evidence.

### Integration with SigRank

OWNER EXPLORING — details TBD. fundscore's scoring engine is a pure function (`score(repoRoot) → report`). The MCP pattern matches sigrank-mcp. Architecture is compatible. Data flow to be defined by owner.

---

## III. File inventory

### Core engine (src/core/)

| File           | Lines | Purpose                                                                  |
| -------------- | ----- | ------------------------------------------------------------------------ |
| index.js       | 5     | Entry point, exports score()                                             |
| scorer.js      | 134   | Main orchestration, path validation, 3-dimension aggregation, fix deltas |
| rubric.js      | 310   | 18 artifact checks, multi-language test detection, git activity          |
| business.js    | 210   | 7 business viability checks                                              |
| quality.js     | 149   | 5 heuristic quality dimensions (0-100)                                   |
| lens.js        | 78    | Investor lens inference (round, check size, team, NAICS)                 |
| lens-report.js | 130   | Round-specific gap analysis (required/expected/bonus)                    |
| format.js      | 157   | Markdown + summary output (0-100, asterisk, 3 dimensions)                |
| templates.js   | 145   | 7 scaffold templates + check-to-template mapping                         |
| loader.js      | 91    | File reading, listing, overrides                                         |

### MCP server (src/mcp/)

| File      | Lines | Purpose                                        |
| --------- | ----- | ---------------------------------------------- |
| server.js | 230   | Stdio MCP server, 3 tools, auto-save snapshots |

### CLI (bin/)

| File         | Lines | Purpose                                    |
| ------------ | ----- | ------------------------------------------ |
| fundscore.js | 244   | CLI entry: score, fix, history, badge, mcp |

### Tests

| File         | Tests | Purpose           |
| ------------ | ----- | ----------------- |
| core.test.js | 43    | Core engine tests |
| mcp.test.js  | 24    | MCP server tests  |

### Docs

| File        | Purpose                       |
| ----------- | ----------------------------- |
| README.md   | Full documentation            |
| FIXES.md    | Bug documentation + proposals |
| RESEARCH.md | Competitive landscape + R&D   |
| PLAN.md     | Phase 0-5 playbook            |
| STATE.yaml  | Machine-readable state        |

### Config

| File                            | Purpose               |
| ------------------------------- | --------------------- |
| .fundscore.example.yml          | Example configuration |
| .github/workflows/fundscore.yml | GitHub Action         |
| package.json                    | npm package (0.2.0)   |

### Archived

| File            | Purpose                                            |
| --------------- | -------------------------------------------------- |
| rokrev.archived | Original research notes (moved out of active path) |
