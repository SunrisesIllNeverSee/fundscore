# fundscore — R&D Deep Dive

2026-07-07. Synthesis of competitive research + design analysis + direction brainstorm.

---

## I. The competitive landscape (is the elevator packed?)

**Short answer:** Crowded, but not in our exact spot.

### What's crowded

The "general repo health" space is packed. RepoScore, Repo Audit, Astraudit, RepoPulse, RepoHealth, RepoMedic, repo-readiness, repo-check, oss-readiness-checker — all deterministic, all score repos 0-100, all check for README/LICENSE/tests/CI. This is a commodity. Competing here would be pointless.

The "AI-powered repo analysis" space is also crowded. GitHub Venture Scout, RepoRadar, OpenClaw Finance Analyst, Comreadiness — all use LLMs to evaluate repos or businesses. Different approach, different tradeoffs.

### What's NOT crowded

**Investor-readiness scoring for repos, deterministic, CLI + GitHub Action.** That specific combination is unoccupied. The closest competitors each miss at least one element:

| Competitor            | Investor-ready?    | Deterministic? | CLI?             | GH Action PR comments? |
| --------------------- | ------------------ | -------------- | ---------------- | ---------------------- |
| Comreadiness          | Yes                | No (AI)        | No (SaaS)        | Unclear                |
| Repo Doctor AI        | Mentions investors | Unclear        | Yes              | No                     |
| RepoHealth            | No (general)       | Yes            | Yes              | No                     |
| RepoPulse             | No (general)       | Yes            | Yes              | No                     |
| Agent Friendly Action | No (AI-readiness)  | Yes            | No (Action only) | Yes                    |
| OpenSSF Scorecard     | No (security)      | Yes            | Yes              | Yes                    |

**Nobody does all four.** That's the wedge.

### Name collision

"FundScore" is used in financial services (mutual fund scoring, credit analytics). Not in GitHub/repo tooling. Moderate risk — the name is descriptive, probably not trademarkable, and the domains are different. Could differentiate as "fundscore-oss" if needed, but "fundscore" is fine for now.

### Verdict

**The elevator has people, but there's a clear open corner.** The investor-readiness niche is under-served by automated tools. Most tools either do general repo health (crowded) or AI-powered business analysis (different approach). The deterministic, investor-focused, CLI + Action combo is open.

---

## II. What fundscore actually is (honest framing)

### The false-precision problem

The current tool has two dimensions:

- **Coverage** (12 checks for doc presence) — honest, useful, defensible
- **Quality** (Flesch reading ease, regex for numbers) — crude heuristics dressed up as a 0-10 score

The proposed "Business Viability" extension (regex for "recurring revenue" in README) would make this worse. It would pretend to evaluate business viability by checking whether the README _says_ "recurring revenue." That's not business analysis — it's string matching.

**A repo-only, no-LLM tool cannot evaluate business viability.** It can only evaluate whether the _artifacts_ exist. The honest framing is:

> "Investors will look at your repo. fundscore tells you what they'll find — and what's missing — before they do."

This is NOT "we evaluate your business." It's "we check your repo's investor-readiness surface." The coverage checklist already does this. The question is whether to make it better at that, or to add dimensions that pretend to know more.

### What's genuinely knowable from a repo

- Does it have the docs investors expect? (coverage — yes)
- Does it have tests, CI, security? (coverage — yes)
- Is the README structured? (quality — crude but defensible)
- Is there a license? (coverage — yes)
- Is the repo active? (git log — NOT currently checked, strong signal)
- How many contributors? (git log — NOT currently checked, strong signal)
- Is there a deployed URL? (regex — weak but real)
- Does it have dependencies that are maintained? (lockfile analysis — possible)

### What's NOT knowable from a repo

- Whether the business has real revenue
- Whether customers are real
- Whether the pricing works
- Whether the team can execute
- Whether the market is real

**The tool should stay in the "knowable" column and be honest about it.**

---

## III. Strategic options

### Option A: "Honest artifact checker" (minimal, fast to ship)

Keep the current architecture. Fix the bugs. Kill or simplify the quality score. Add a few more coverage checks (git activity, deployed URL, multi-language test detection). Add `--fix` mode that scaffolds missing docs. Ship.

- **Pros:** Honest, fast, defensible, differentiated
- **Cons:** Limited ceiling. "Checklist tool" isn't exciting.
- **Effort:** ~1 day

### Option B: "Investor-readiness platform" (ambitious)

Restructure around the investor-readiness wedge. Three tiers:

1. **Artifact checks** (current coverage, expanded) — free, deterministic
2. **Signal analysis** (git activity, contributor count, deployment evidence, dependency health) — free, deterministic
3. **Investor lens report** (what round/check size does this repo suggest, what's missing for that round) — free, deterministic

Kill the fake quality score. Replace with signal analysis that's actually knowable. The "investor lens" becomes the differentiator — not just "you're missing FUNDING.md" but "for a seed round, you're missing X, Y, Z. For series A, you'd also need A, B, C."

- **Pros:** Genuinely useful, differentiated, honest, has a narrative
- **Cons:** More work. Need to define what investors actually look for by round.
- **Effort:** ~2-3 days

### Option C: "Business viability extension" (as proposed by the other tool)

Add the 3-pillar business viability dimension (recession resilience, pricing power, tech-enabled margins) via regex matching.

- **Pros:** Sounds impressive in a README
- **Cons:** False precision. Regex for "recurring revenue" doesn't measure recession resilience. Damages credibility. Investors would laugh at a "recession resilience score" derived from README string matching.
- **Verdict:** **Don't do this.**

---

## IV. My recommendation: Option B, with a specific structure

### Kill the quality score

The Flesch reading ease approximation and regex specificity check don't add value. They produce a number that looks precise but isn't. Replace with something honest.

### Restructure into three dimensions

**1. Artifacts (0-10)** — expanded from current coverage

- Current 12 checks, plus:
  - `deployed-url` — README mentions a live URL (not just any URL, but a deployed product)
  - `changelog` — CHANGELOG.md or releases page exists
  - `contributing` — CONTRIBUTING.md exists (signals serious project)
  - `architecture` — ARCHITECTURE.md or docs/ structure exists
  - Multi-language test detection (pytest, cargo test, go test, rspec, etc.)
  - Git activity (commits in last 30/90 days, not a dead repo)
  - Contributor count (>1 = team signal)

**2. Investor Lens (report, not a score)** — the differentiator
Instead of scoring "business viability," produce a structured report:

- **Inferred round:** pre-seed / seed / series-a / grant (from README/FUNDING.md signals)
- **What investors expect at this round:** checklist of artifacts + signals
- **What's present:** ✓/✗ for each
- **What's missing:** sorted by impact
- **Score delta per fix:** "add FUNDING.md: +0.9 points"

This is the feature that no competitor has. Not "your business viability is 6.5/10" but "for a seed round, you're at 7/10. Here's what's keeping you from 9."

**3. `--fix` mode** — the actionable feature
Given the missing items, generate scaffold templates:

- Missing FUNDING.md → generate a FUNDING.md template
- Missing ROADMAP.md → generate a ROADMAP.md template
- Missing RISKS.md → generate a RISKS.md template
- Missing SECURITY.md → generate a SECURITY.md template

Not auto-creating files. Outputting templates the founder can fill in. `fundscore --fix > fix-plan.md` or `fundscore --fix --apply` to write the files.

### Why this works

- **Honest:** only claims what it can actually verify from a repo
- **Differentiated:** no competitor does round-specific investor-readiness gap analysis
- **Actionable:** `--fix` mode tells you exactly what to do, not just what's wrong
- **Viral:** the GitHub Action PR comment becomes a "here's what to fix before your next investor meeting" — that's shareable
- **Badge-ready:** "fundscore 7.4/10 — seed ready" is a badge people would put in their README

---

## V. Open questions for the owner

1. **Do you want the quality score killed, or kept as a secondary signal?** My recommendation is kill it and replace with signal analysis (git activity, contributors, deployment evidence).

2. **The business viability extension — do you still want it?** My recommendation is no (false precision). But if you do, it should be opt-in and clearly labeled as "self-reported signals" not "viability score."

3. **Round-specific checklists — where do the expectations come from?** I can define these from general VC knowledge (pre-seed: README + demo + team. Seed: + FUNDING.md + market + traction signals. Series A: + metrics + governance + security). Or you have a specific framework from the CIVITAE/Signomy research in `rokrev`?

4. **Should fundscore have a web component?** The competitors show that SaaS web apps (Comreadiness, RepoRadar) get more visibility than CLI-only tools. A simple "paste your repo URL, get a score" landing page would dramatically increase reach. But it's more work + hosting.

5. **The `rokrev` file — should it inform the rubric?** It has a detailed 8-dimension composite scoring framework (traction, monetization, trust, governance, team missions, provenance, infrastructure, defensibility). Most of those dimensions can't be evaluated from a repo. But some can (infrastructure = tests/CI/endpoints, defensibility = license/patents, trust = security posture). Worth pulling the repo-evaluable ones into the coverage checks?

6. **Name — keep "fundscore" or differentiate?** The financial services collision is moderate. "fundscore-oss" or "repo-fundscore" would be safer but less clean.
