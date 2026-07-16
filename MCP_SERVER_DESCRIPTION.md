# Fundscore MCP Server

> Lighthouse for repos — deterministic investor-readiness scoring via MCP. 3 tools that score any GitHub repository 0-100, generate fix plans, and scaffold missing docs.

Fundscore is a deterministic scoring engine that evaluates a repository's investor readiness across three dimensions: artifacts (docs, CI, licensing), business viability (funding signals, roadmap, risks), and code quality. It exposes 3 MCP tools so AI agents (Claude Code, Cursor, Windsurf) can score repos, get fix plans, and scaffold missing docs without leaving the editor.

## Install

```bash
npx fundscore mcp
```

Or add to your MCP client config:

```json
{
  "mcpServers": {
    "fundscore": {
      "command": "npx",
      "args": ["fundscore", "mcp"]
    }
  }
}
```

**No API key required.** All tools run locally against the repo on disk.

## The 3 MCP Tools

| # | Tool | What it does | Write? |
|---|------|-------------|--------|
| 1 | `score_repo` | Score a repo 0-100 for investor readiness. Returns 3 dimension scores (artifacts, business viability, quality), round-specific gap analysis, top fixes with score deltas, and missing checks. Auto-saves a snapshot to `.fundscore-history/`. | Read + snapshot |
| 2 | `get_fix_plan` | Get a scaffold plan for missing investor-readiness docs. Returns the list of template files that would be created (FUNDING.md, ROADMAP.md, RISKS.md, etc.), which checks each fixes, and the score delta for each fix. Read-only. | Read-only |
| 3 | `apply_fixes` | Create template files for missing investor-readiness docs. Generates scaffold templates that the founder can fill in. Supports `dryRun=true` (default) to preview without writing. Does not overwrite existing files unless `force=true`. | Write (with dryRun default) |

## Tool details

### score_repo
Scores a repository on a 0-100 scale across three dimensions:
- **Artifacts** — README, LICENSE, CONTRIBUTING, SECURITY, FUNDING, ROADMAP, RISKS, CI/CD, issue templates, PR template
- **Business viability** — funding signals, market indicators, team signals
- **Quality** — code quality signals, test coverage, linting

Returns: overall score, status (pass/fail/warn), thresholds, per-dimension scores, inferred funding round (pre-seed/seed/Series A/B), check-size estimate, top 10 fixes with score deltas, and missing checks. Auto-saves a snapshot to `.fundscore-history/` to build score trajectory over time.

### get_fix_plan
Read-only tool that returns a scaffold plan for missing docs. For each missing file, shows: file name, which checks it fixes, and the score delta for each fix. Also shows total potential gain from fixing all missing items.

### apply_fixes
Creates template files (FUNDING.md, ROADMAP.md, RISKS.md, SECURITY.md, etc.) for missing investor-readiness docs. Defaults to `dryRun=true` (preview only). Set `dryRun=false` to write files. Re-scores after writing to show the score delta. Does not overwrite existing files unless `force=true`.

## Privacy

All tools run **locally**. The scoring engine reads files on disk from the repository path. No data is transmitted. Snapshots are saved to `.fundscore-history/` in the repo root (configurable via `.fundscore.yml`).

## Key Facts

| Field | Value |
|-------|-------|
| npm package | `fundscore` |
| GitHub | https://github.com/SunrisesIllNeverSee/fundscore |
| License | MIT |
| Transport | stdio |
| Platform | Cross-platform (Node.js >= 18) |
| Language | JavaScript (CommonJS) |
| Tools | 3 |
| Auth | None (all local) |
| Category | Developer Tools / Repo Health |

## Registries

- [npm](https://www.npmjs.com/package/fundscore) (live, v0.2.0)
- [Smithery](https://smithery.ai) (pending submission)
- [Glama](https://glama.ai) (pending submission)
- [MCP Registry](https://registry.modelcontextprotocol.io) (pending submission)
- [Anthropic Connectors Directory](https://claude.com/docs/connectors/building/submission) (pending submission)
