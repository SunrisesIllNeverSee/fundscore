"use strict";

/**
 * Template scaffolding for --fix mode.
 * Each template is a function that returns file content.
 * Templates use the repo name (inferred from directory) as a placeholder.
 */

const path = require("path");

function repoName(repoRoot) {
  return path.basename(path.resolve(repoRoot));
}

const TEMPLATES = {
  "FUNDING.md": (repoRoot) => {
    const name = repoName(repoRoot);
    return `# ${name} — Funding

## Round
<!-- pre-seed | seed | series-a | grant -->

## Check Size
<!-- e.g. $500k, $1.5M, $5M -->

## Use of Funds
- [ ] Engineering
- [ ] Go-to-market
- [ ] Operations

## Revenue Model
<!-- How does ${name} make money? -->

## Traction
<!-- Current users, revenue, growth metrics -->

## Team
<!-- Founders, roles, background -->

## Market
<!-- TAM, SAM, competitors, positioning -->
`;
  },

  "ROADMAP.md": (repoRoot) => {
    const name = repoName(repoRoot);
    return `# ${name} — Roadmap

## Now (0-3 months)
- [ ]

## Next (3-6 months)
- [ ]

## Later (6-12 months)
- [ ]

## Vision (12+ months)
- [ ]

## Milestones
| Quarter | Goal | Status |
|---------|------|--------|
| Q1 | | |
| Q2 | | |
`;
  },

  "RISKS.md": (repoRoot) => {
    const name = repoName(repoRoot);
    return `# ${name} — Risks & Mitigations

## Technical Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| | | | |

## Business Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| | | | |

## Market Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| | | | |

## Contingency Plan
<!-- What happens if things go wrong? Runway, pivot options, downside scenarios. -->
`;
  },

  "SECURITY.md": (repoRoot) => {
    const name = repoName(repoRoot);
    return `# Security Policy — ${name}

## Reporting a Vulnerability
<!-- How to report security issues. Email, PGP, response time. -->

## Supported Versions
| Version | Supported |
|---------|-----------|
| | |

## Security Measures
- [ ] Dependency scanning
- [ ] Secret scanning
- [ ] Code review required
`;
  },

  "CONTRIBUTING.md": (repoRoot) => {
    const name = repoName(repoRoot);
    return `# Contributing to ${name}

## Getting Started
1. Fork the repo
2. Create a branch: \`git checkout -b feature/your-feature\`
3. Make changes
4. Run tests: \`npm test\`
5. Submit a PR

## Code Style
<!-- Describe your code style / linting rules -->

## PR Process
- All PRs require review
- Tests must pass
- Keep PRs focused and small

## Issues
- Use issues for bugs and feature requests
- Tag appropriately
`;
  },

  "CHANGELOG.md": () => {
    return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- 

### Changed
- 

### Fixed
- 

## [0.1.0] - ${new Date().toISOString().split("T")[0]}
### Added
- Initial release
`;
  },

  "COMPARABLES.md": (repoRoot) => {
    const name = repoName(repoRoot);
    return `# ${name} — Market & Comparables

## Market Size
<!-- TAM, SAM, SOM with sources -->

## Competitors
| Company | Funding | Differentiator | ${name} Advantage |
|---------|---------|---------------|-------------------|
| | | | |

## Positioning
<!-- How is ${name} different? What's the moat? -->

## Growth Rate
<!-- Market growth rate, CAGR, trends -->
`;
  },
};

/**
 * Map check IDs to the template files that would fix them.
 */
const CHECK_TO_TEMPLATE = {
  "funding-or-roadmap": ["FUNDING.md", "ROADMAP.md"],
  "risks-honest": ["RISKS.md"],
  security: ["SECURITY.md"],
  contributing: ["CONTRIBUTING.md"],
  changelog: ["CHANGELOG.md"],
  "market-comps": ["COMPARABLES.md"],
};

/**
 * Get the list of template files that would fix the missing checks.
 * @param {Array} missingChecks - array of check objects with .id
 * @returns {Array} - array of { file, template, checks: [checkIds] }
 */
function getFixPlan(missingChecks) {
  const fileMap = {};
  for (const check of missingChecks) {
    const templates = CHECK_TO_TEMPLATE[check.id];
    if (!templates) continue;
    for (const file of templates) {
      if (!fileMap[file]) {
        fileMap[file] = { file, checks: [], template: TEMPLATES[file] };
      }
      fileMap[file].checks.push(check.id);
    }
  }
  return Object.values(fileMap);
}

module.exports = { TEMPLATES, CHECK_TO_TEMPLATE, getFixPlan, repoName };
