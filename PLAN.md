# fundscore — Master Plan

2026-07-07. The Lighthouse-for-repos playbook. Each phase has a feedback loop that feeds the next.

---

## The model

```
CLI (score + fix)  →  GitHub Action (history)  →  Badge (viral loop)
        ↓                    ↓                         ↓
   adoption           score trajectory         README signaling
        ↓                    ↓                         ↓
  Web UI (paste URL)  →  Profile pages  →  Discovery platform
        ↓                    ↓                         ↓
   marketing          investor browsing      founders ↔ investors
```

Each stage makes the next one possible. You don't build stage 3 until stage 1 works. The score trajectory is the moat — competitors can't backdate it.

---

## Phase 0: Fix & Harden (now)

**Goal:** make the current tool correct and credible.

- [ ] BUG-1: Nonexistent path doesn't error → add path validation in `scorer.js`
- [ ] BUG-2: Non-deterministic output → separate `generatedAt` from deterministic payload
- [ ] BUG-3: Wrong GitHub URL in markdown footer → fix `format.js`
- [ ] BUG-4: Name inconsistency in README → remove "Burnmydays" branding
- [ ] DESIGN-1: Multi-language test detection (pytest, cargo, go test, rspec, etc.)
- [ ] DESIGN-2: Move `rokrev` to archive (unrelated research)
- [ ] DESIGN-3: Dogfood — add `.fundscore.yml` + missing docs to fundscore's own repo
- [ ] Add `--fix` mode: scaffold templates for missing docs (FUNDING.md, ROADMAP.md, RISKS.md, SECURITY.md, CONTRIBUTING.md, CHANGELOG.md)
- [ ] Add score-delta per fix: "add FUNDING.md: +0.9 points"
- [ ] Add `fundscore history` command: read stored JSON artifacts, show score over time
- [ ] Tests for all new features
- [ ] Version bump to 0.2.0

**Loop:** fixes → credible tool → people trust the score → adoption

---

## Phase 1: Three Dimensions (next)

**Goal:** restructure the score into the three-dimension model that differentiates fundscore from general repo health tools.

### Dimension 1: Artifacts (0-10) — expanded coverage

Current 12 checks, plus:
- [ ] `deployed-url` — README mentions a live deployed URL (not just any URL)
- [ ] `changelog` — CHANGELOG.md or GitHub releases exists
- [ ] `contributing` — CONTRIBUTING.md exists (signals serious project)
- [ ] `architecture` — ARCHITECTURE.md or docs/ structure exists
- [ ] `git-activity` — commits in last 30/90 days (not a dead repo)
- [ ] `contributor-count` — >1 contributor (team signal)
- [ ] `dependency-health` — lockfile analysis (no abandoned deps)
- [ ] Multi-language test detection (from Phase 0)

### Dimension 2: Business Viability (0-10) — investor signal communication

Reframed from "we measure your business" to "does your repo communicate the signals investors look for?"

- [ ] `recession-resilience` — README/RISKS/ROADMAP mentions recurring revenue, moat, fixed cost base, diversified customers
- [ ] `pricing-power` — README/FUNDING mentions switching costs, sticky product, recurring revenue, CAC payback
- [ ] `tech-enabled-margins` — evidence of automation, API integrations, async ops, margin roadmap
- [ ] `contingency-depth` — RISKS.md lists scenario planning, ROADMAP shows low-dependency features
- [ ] `monetization-clarity` — README/FUNDING clearly states how the business makes money
- [ ] `market-evidence` — COMPARABLES.md or README mentions market size, competitors, positioning

**Asterisk on the score:** "Snapshot of repo-readiness signals, not a business valuation. The score reflects what your repo communicates, not what your business is."

### Dimension 3: Investor Lens (report, not a score) — the differentiator

Round-specific gap analysis. No competitor has this.

- [ ] Define round-specific checklists:
  - **Pre-seed:** README + one-liner + demo + team + problem statement
  - **Seed:** + FUNDING.md + market/comps + monetization clarity + traction signals + RISKS
  - **Series A:** + metrics/evidence + governance + security + contributor count + architecture docs
  - **Grant:** + problem statement + public benefit + open license + reproducibility
- [ ] Auto-infer round from repo signals (current lens inference, expanded)
- [ ] Report: "For a [round] round, you're at X/10. Here's what's present, what's missing, and the score delta for each fix."
- [ ] Compare-and-contrast mode: `fundscore compare --round seed` shows your repo vs the seed-round checklist

**Loop:** three dimensions → differentiated from general health tools → "investor readiness" niche → adoption

---

## Phase 2: Badge + Viral Loop

**Goal:** make the score visible and shareable.

- [ ] SVG badge generator: `fundscore badge` → outputs SVG with score + status color
- [ ] Badge formats:
  - `![fundscore](https://img.shields.io/badge/fundscore-7.4-green)` (static)
  - Dynamic badge endpoint (if web component exists)
- [ ] Trend indicator: score went up/down since last run
- [ ] README snippet: "## 📊 Investor Readiness" with badge + score breakdown
- [ ] `fundscore badge --embed` → outputs markdown snippet ready to paste

**Loop:** badge in README → other developers see it → they install fundscore → their badge appears → viral adoption

---

## Phase 3: Web UI (Level 1)

**Goal:** make fundscore discoverable without installing anything.

- [ ] Landing page: paste GitHub repo URL → get instant score + report
- [ ] No auth, no database — just runs the scorer server-side on the cloned repo
- [ ] Shareable URL: `fundscore.dev/repo/SunrisesIllNeverSee/fundscore` → live report
- [ ] "Add to your repo" CTA → instructions for CLI + GitHub Action
- [ ] Deploy on Vercel (Next.js, or simple Express + static)
- [ ] SEO: "fundscore" → landing page. "repo investor readiness" → landing page.

**Loop:** web UI → people share links → others try it → some install the CLI/Action → badge appears → more people see it → more links shared

---

## Phase 4: Score History + Profile Pages (Level 2)

**Goal:** make the trajectory visible. This is where the moat deepens.

- [ ] Database: store score snapshots (repo, score, dimensions, timestamp, commit SHA)
- [ ] Data source: GitHub Action artifacts (auto-upload to fundscore.dev API)
- [ ] Profile page per repo: `fundscore.dev/repo/owner/name`
  - Current score + badge
  - Score trajectory chart (line graph over time)
  - Dimension breakdown (radar or bar chart)
  - Investor lens report
  - "What changed" log (commit-level score deltas)
- [ ] `fundscore history --sync` → push local history to fundscore.dev
- [ ] Privacy: opt-in. repos must explicitly enable history sync.

**Loop:** profile pages → investors browse repos by score → founders want to be listed → they install the Action → more data → better discovery → more investors → more founders

---

## Phase 5: Discovery Platform (Level 3)

**Goal:** connect founders and investors with deterministic evidence.

- [ ] Browse/filter repos by: score, round, sector (NAICS), trajectory, contributor count
- [ ] "Top repos this week" / "Rising repos" (biggest score improvements)
- [ ] Investor accounts: save searches, watch repos, get notifications
- [ ] Founder accounts: claim repo, add context (pitch, team, traction)
- [ ] Evidence-backed claims: "recurring revenue" check links to the README line that mentions it
- [ ] API: `fundscore.dev/api/score/owner/repo` → JSON score (for integrations)
- [ ] Leaderboards: by sector, by round, by trajectory

**Loop:** discovery platform → investors find repos → founders get funded → success stories → more founders install fundscore → more data → better discovery → more investors

---

## Feedback loops (the whole system)

```
Phase 0 (fix) → credible score → trust
     ↓
Phase 1 (dimensions) → differentiated score → niche adoption
     ↓
Phase 2 (badge) → viral loop → mass adoption
     ↓
Phase 3 (web UI) → discoverable → non-developer adoption
     ↓
Phase 4 (history) → trajectory visible → moat deepens
     ↓
Phase 5 (discovery) → founders ↔ investors → company

Each phase feeds the next. Each phase has its own loop.
You can stop at any phase and still have a useful product.
The score trajectory is the unbreakable moat — competitors can't backdate it.
```

---

## What to build NOW

Phase 0 (fix & harden) + Phase 1 (three dimensions) in one pass. That's the next work session.

Then Phase 2 (badge) — small, high-impact, unlocks the viral loop.

Phase 3 (web UI) when ready to promote.

Phase 4 and 5 when adoption forces them.

---

## Open decisions (owner)

1. **Round-specific checklists** — I define from general VC knowledge, or you have a framework from the CIVITAE/Signomy research?
2. **Business viability pillars** — keep the 3 from the proposal (recession resilience, pricing power, tech-enabled margins) + add monetization-clarity and market-evidence? Or redefine?
3. **Score scale** — keep 0-10 (cleaner, less Lighthouse-like) or switch to 0-100 (more Lighthouse-like, more granular)?
4. **Badge design** — shields.io style (standard) or custom SVG?
5. **Web domain** — fundscore.dev? fundscore.io? Something else?
6. **The asterisk** — how prominent? Footer disclaimer? Inline next to score? Tooltip on badge?
