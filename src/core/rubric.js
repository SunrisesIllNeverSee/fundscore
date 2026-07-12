'use strict';

const { execSync } = require('child_process');

/**
 * Coverage rubric — deterministic checklist-based scoring (0-100).
 * Each check has:
 *   id        — unique identifier
 *   label     — human-readable name
 *   weight    — relative weight (normalised to sum)
 *   required  — whether failing this check is a hard deduction
 *   check(ctx) — function returning { pass: boolean, evidence: string[], reason: string }
 */

const DEFAULT_CHECKS = [
  {
    id: 'readme-exists',
    label: 'README.md exists',
    weight: 8,
    required: true,
    check(ctx) {
      const found = ctx.findFile('README.md');
      if (!found)
        return { pass: false, evidence: [], reason: 'No README.md found.' };
      return { pass: true, evidence: [found], reason: 'README.md is present.' };
    },
  },
  {
    id: 'readme-oneliner',
    label: 'README contains a one-liner / problem statement',
    weight: 7,
    required: false,
    check(ctx) {
      const content = ctx.readFile('README.md') || '';
      const lines = content
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const firstPara = lines.find(
        (l) => !l.startsWith('#') && l.split(/\s+/).length >= 5,
      );
      if (firstPara) {
        return {
          pass: true,
          evidence: ['README.md'],
          reason: 'README appears to contain a one-liner or description.',
        };
      }
      return {
        pass: false,
        evidence: ['README.md'],
        reason:
          'README lacks a meaningful description/one-liner after the title.',
      };
    },
  },
  {
    id: 'readme-cta',
    label: 'README contains a CTA or contact info',
    weight: 5,
    required: false,
    check(ctx) {
      const content = ctx.readFile('README.md') || '';
      const ctaPatterns = [
        /contact/i,
        /reach\s+out/i,
        /email/i,
        /mailto:/i,
        /get\s+in\s+touch/i,
        /schedule/i,
        /calendly/i,
        /demo/i,
        /book\s+a\s+call/i,
        /inquir/i,
      ];
      const found = ctaPatterns.find((p) => p.test(content));
      if (found)
        return {
          pass: true,
          evidence: ['README.md'],
          reason: 'README contains a CTA or contact reference.',
        };
      return {
        pass: false,
        evidence: ['README.md'],
        reason: 'README lacks a call-to-action or contact information.',
      };
    },
  },
  {
    id: 'readme-demo',
    label: 'README contains a demo link or screenshot',
    weight: 4,
    required: false,
    check(ctx) {
      const content = ctx.readFile('README.md') || '';
      if (/https?:\/\/[^\s)]+|!\[.*?\]\(/.test(content)) {
        return {
          pass: true,
          evidence: ['README.md'],
          reason: 'README contains a URL or image (possible demo/screenshot).',
        };
      }
      return {
        pass: false,
        evidence: [],
        reason: 'README has no demo link or embedded image.',
      };
    },
  },
  {
    id: 'deployed-url',
    label: 'Live deployed product URL mentioned',
    weight: 6,
    required: false,
    check(ctx) {
      const content =
        (ctx.readFile('README.md') || '') + (ctx.readFile('FUNDING.md') || '');
      // Look for deployed product URLs (not just any URL — exclude github.com, npm, etc.)
      const deployedPatterns = [
        /https?:\/\/(?!github\.com|npmjs\.com|pypi\.org|registry\.|docs\.google|raw\.github)[^\s)]+\.(?:com|io|app|dev|ai|xyz|co|net|org)/i,
        /https?:\/\/[a-z0-9-]+\.vercel\.app/i,
        /https?:\/\/[a-z0-9-]+\.netlify\.app/i,
        /https?:\/\/[a-z0-9-]+\.herokuapp\.com/i,
        /https?:\/\/[a-z0-9-]+\.fly\.dev/i,
        /https?:\/\/[a-z0-9-]+\.render\.com/i,
      ];
      const found = deployedPatterns.find((p) => p.test(content));
      if (found)
        return {
          pass: true,
          evidence: ['README.md'],
          reason: 'README mentions a live deployed product URL.',
        };
      return {
        pass: false,
        evidence: [],
        reason: 'No live deployed product URL found in README.',
      };
    },
  },
  {
    id: 'funding-or-roadmap',
    label: 'Funding or roadmap document exists (FUNDING.md / ROADMAP.md)',
    weight: 9,
    required: false,
    check(ctx) {
      const candidates = [
        'FUNDING.md',
        'ROADMAP.md',
        'docs/FUNDING.md',
        'docs/ROADMAP.md',
      ];
      for (const c of candidates) {
        const found = ctx.findFile(c);
        if (found)
          return { pass: true, evidence: [found], reason: `Found ${found}.` };
      }
      return {
        pass: false,
        evidence: [],
        reason: 'No FUNDING.md or ROADMAP.md found.',
      };
    },
  },
  {
    id: 'market-comps',
    label: 'Market / comparables document exists',
    weight: 7,
    required: false,
    check(ctx) {
      const candidates = [
        'COMPARABLES.md',
        'COMP-SCORE.md',
        'docs/COMPARABLES.md',
        'docs/MARKET.md',
        'MARKET.md',
      ];
      for (const c of candidates) {
        const found = ctx.findFile(c);
        if (found)
          return { pass: true, evidence: [found], reason: `Found ${found}.` };
      }
      const readme = ctx.readFile('README.md') || '';
      if (
        /##?\s*(comparable|competitor|market|comps|landscape)/i.test(readme)
      ) {
        return {
          pass: true,
          evidence: ['README.md'],
          reason: 'README contains a comparables/market section.',
        };
      }
      return {
        pass: false,
        evidence: [],
        reason: 'No market/comparables document or README section found.',
      };
    },
  },
  {
    id: 'risks-honest',
    label: 'Risks / honest assessment document exists',
    weight: 6,
    required: false,
    check(ctx) {
      const candidates = [
        'RISKS.md',
        'COMP-SCORE.md',
        'docs/RISKS.md',
        'LIMITATIONS.md',
      ];
      for (const c of candidates) {
        const found = ctx.findFile(c);
        if (found)
          return { pass: true, evidence: [found], reason: `Found ${found}.` };
      }
      const readme = ctx.readFile('README.md') || '';
      if (/##?\s*(risk|limitation|caveat|honest|warning)/i.test(readme)) {
        return {
          pass: true,
          evidence: ['README.md'],
          reason: 'README contains a risks/limitations section.',
        };
      }
      return {
        pass: false,
        evidence: [],
        reason: 'No risks/limitations document found.',
      };
    },
  },
  {
    id: 'license',
    label: 'License / IP posture stated',
    weight: 5,
    required: false,
    check(ctx) {
      const licenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING'];
      for (const f of licenseFiles) {
        if (ctx.findFile(f))
          return { pass: true, evidence: [f], reason: `${f} found.` };
      }
      const readme = ctx.readFile('README.md') || '';
      if (
        /licen[sc]e|copyright|all\s+rights\s+reserved|proprietary/i.test(readme)
      ) {
        return {
          pass: true,
          evidence: ['README.md'],
          reason: 'README mentions license or IP posture.',
        };
      }
      return {
        pass: false,
        evidence: [],
        reason: 'No license file or licensing mention found.',
      };
    },
  },
  {
    id: 'tests-or-ci',
    label: 'Tests or CI present (multi-language)',
    weight: 5,
    required: false,
    check(ctx) {
      // Node.js: package.json with test script
      const pkg = ctx.readFile('package.json');
      if (pkg) {
        try {
          const parsed = JSON.parse(pkg);
          if (parsed.scripts && parsed.scripts.test) {
            return {
              pass: true,
              evidence: ['package.json'],
              reason: 'package.json has a test script.',
            };
          }
        } catch {
          /* ignore */
        }
      }
      // JS test files
      const jsTest = ctx.files.find((f) =>
        /__tests__|\.test\.[jt]s$|\.spec\.[jt]s$|vitest|jest/.test(f),
      );
      if (jsTest)
        return {
          pass: true,
          evidence: [jsTest],
          reason: 'JS test files detected.',
        };
      // Python: pytest, unittest, tox, nox
      const pyTest = ctx.files.find((f) =>
        /test_.*\.py$|.*_test\.py$|conftest\.py$|pytest\.ini$|tox\.ini$|noxfile\.py$|setup\.cfg$/.test(
          f,
        ),
      );
      if (pyTest)
        return {
          pass: true,
          evidence: [pyTest],
          reason: 'Python test files detected.',
        };
      // Rust: cargo test
      if (
        ctx.findFile('Cargo.toml') &&
        ctx.files.some((f) => f.startsWith('tests/'))
      ) {
        return {
          pass: true,
          evidence: ['Cargo.toml', 'tests/'],
          reason: 'Rust test directory detected.',
        };
      }
      // Go: _test.go files
      const goTest = ctx.files.find((f) => /_test\.go$/.test(f));
      if (goTest)
        return {
          pass: true,
          evidence: [goTest],
          reason: 'Go test files detected.',
        };
      // Ruby: rspec, minitest
      const rubyTest = ctx.files.find((f) =>
        /spec\/.*_spec\.rb$|test\/.*_test\.rb$|\.rspec$|Gemfile$/.test(f),
      );
      if (
        rubyTest &&
        ctx.readFile('Gemfile') &&
        /rspec|minitest/.test(ctx.readFile('Gemfile'))
      ) {
        return {
          pass: true,
          evidence: [rubyTest],
          reason: 'Ruby test files detected.',
        };
      }
      // Java: pom.xml with surefire, build.gradle with test
      const pom = ctx.readFile('pom.xml');
      if (pom && /surefire|junit|testng/i.test(pom)) {
        return {
          pass: true,
          evidence: ['pom.xml'],
          reason: 'Java test config detected (Maven).',
        };
      }
      const gradle = ctx.files.find((f) =>
        /build\.gradle$|build\.gradle\.kts$/.test(f),
      );
      if (
        gradle &&
        ctx.readFile(gradle) &&
        /test|junit/i.test(ctx.readFile(gradle))
      ) {
        return {
          pass: true,
          evidence: [gradle],
          reason: 'Java test config detected (Gradle).',
        };
      }
      // CI config (any language)
      const ciFile = ctx.files.find((f) =>
        /\.github\/workflows\/.*\.ya?ml$/.test(f),
      );
      if (ciFile)
        return {
          pass: true,
          evidence: [ciFile],
          reason: 'CI workflow detected.',
        };
      return {
        pass: false,
        evidence: [],
        reason: 'No test files or CI configuration found.',
      };
    },
  },
  {
    id: 'security',
    label: 'Security posture hint present',
    weight: 3,
    required: false,
    check(ctx) {
      const candidates = [
        'SECURITY.md',
        '.github/SECURITY.md',
        'docs/SECURITY.md',
      ];
      for (const c of candidates) {
        if (ctx.findFile(c))
          return { pass: true, evidence: [c], reason: `${c} found.` };
      }
      const depScan = ctx.files.find((f) =>
        /dependabot\.ya?ml|\.snyk|\.whitesource|renovate\.json/.test(f),
      );
      if (depScan)
        return {
          pass: true,
          evidence: [depScan],
          reason: 'Dependency scanning config detected.',
        };
      return {
        pass: false,
        evidence: [],
        reason: 'No SECURITY.md or dependency scanning config found.',
      };
    },
  },
  {
    id: 'contact-team',
    label: 'Contact or team info present',
    weight: 5,
    required: false,
    check(ctx) {
      const content =
        (ctx.readFile('README.md') || '') +
        (ctx.readFile('FUNDING.md') || '') +
        (ctx.readFile('TEAM.md') || '');
      if (
        /\b(team|founder|author|built\s+by|contact|email|linkedin|twitter|github\.com\/[a-z])/i.test(
          content,
        )
      ) {
        return {
          pass: true,
          evidence: ['README.md'],
          reason: 'Team or contact info referenced.',
        };
      }
      return {
        pass: false,
        evidence: [],
        reason: 'No team or contact information found.',
      };
    },
  },
  {
    id: 'audience-customer',
    label: 'Audience or customer clearly identified',
    weight: 6,
    required: false,
    check(ctx) {
      const content = ctx.readFile('README.md') || '';
      if (
        /\b(customer|user|client|audience|target|for\s+[a-z]|designed\s+for|built\s+for|who\s+(is|are|this)|use\s+case)\b/i.test(
          content,
        )
      ) {
        return {
          pass: true,
          evidence: ['README.md'],
          reason: 'README identifies audience or target customer.',
        };
      }
      return {
        pass: false,
        evidence: [],
        reason: 'README does not clearly identify audience or customer.',
      };
    },
  },
  // --- NEW CHECKS (Phase 1 expansion) ---
  {
    id: 'changelog',
    label: 'CHANGELOG or release history exists',
    weight: 3,
    required: false,
    check(ctx) {
      const candidates = [
        'CHANGELOG.md',
        'CHANGELOG',
        'CHANGES.md',
        'HISTORY.md',
        'docs/CHANGELOG.md',
      ];
      for (const c of candidates) {
        const found = ctx.findFile(c);
        if (found)
          return { pass: true, evidence: [found], reason: `Found ${found}.` };
      }
      return {
        pass: false,
        evidence: [],
        reason: 'No changelog or release history found.',
      };
    },
  },
  {
    id: 'contributing',
    label: 'CONTRIBUTING.md exists (signals serious project)',
    weight: 3,
    required: false,
    check(ctx) {
      const candidates = [
        'CONTRIBUTING.md',
        '.github/CONTRIBUTING.md',
        'docs/CONTRIBUTING.md',
      ];
      for (const c of candidates) {
        const found = ctx.findFile(c);
        if (found)
          return { pass: true, evidence: [found], reason: `Found ${found}.` };
      }
      return { pass: false, evidence: [], reason: 'No CONTRIBUTING.md found.' };
    },
  },
  {
    id: 'architecture',
    label: 'Architecture / technical design docs exist',
    weight: 4,
    required: false,
    check(ctx) {
      const candidates = [
        'ARCHITECTURE.md',
        'docs/ARCHITECTURE.md',
        'DESIGN.md',
        'docs/DESIGN.md',
        'docs/architecture',
      ];
      for (const c of candidates) {
        const found = ctx.findFile(c);
        if (found)
          return { pass: true, evidence: [found], reason: `Found ${found}.` };
      }
      // Check for docs/ directory with multiple files
      const docsFiles = ctx.files.filter(
        (f) => f.startsWith('docs/') && /\.(md|rst|txt)$/i.test(f),
      );
      if (docsFiles.length >= 3) {
        return {
          pass: true,
          evidence: ['docs/'],
          reason: `docs/ directory with ${docsFiles.length} documents found.`,
        };
      }
      return {
        pass: false,
        evidence: [],
        reason: 'No architecture or design documentation found.',
      };
    },
  },
  {
    id: 'git-activity',
    label: 'Repo has recent activity (commits in last 90 days)',
    weight: 5,
    required: false,
    check(ctx) {
      try {
        const output = execSync('git log --since="90 days ago" --oneline', {
          cwd: ctx.repoRoot,
          encoding: 'utf8',
          timeout: 5000,
          stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        const count = output ? output.split('\n').length : 0;
        if (count > 0) {
          return {
            pass: true,
            evidence: [`${count} commits in last 90 days`],
            reason: `Repo has ${count} commits in the last 90 days.`,
          };
        }
        return {
          pass: false,
          evidence: [],
          reason: 'No commits in the last 90 days — repo appears inactive.',
        };
      } catch {
        return {
          pass: false,
          evidence: [],
          reason: 'Unable to read git log (may not be a git repo).',
        };
      }
    },
  },
  {
    id: 'contributor-count',
    label: 'Multiple contributors (team signal)',
    weight: 4,
    required: false,
    check(ctx) {
      try {
        const output = execSync('git shortlog -sne --all', {
          cwd: ctx.repoRoot,
          encoding: 'utf8',
          timeout: 5000,
          stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        const count = output ? output.split('\n').length : 0;
        if (count >= 2) {
          return {
            pass: true,
            evidence: [`${count} contributors`],
            reason: `Repo has ${count} contributors.`,
          };
        }
        return {
          pass: false,
          evidence: [],
          reason: 'Only 1 contributor — no team signal.',
        };
      } catch {
        return {
          pass: false,
          evidence: [],
          reason: 'Unable to read git contributors.',
        };
      }
    },
  },
];

/**
 * Build the effective check list, applying overrides from .fundscore.yml.
 */
function buildChecks(overrides) {
  const weightOverrides = (overrides && overrides.weights) || {};
  const requiredOverrides = (overrides && overrides.required) || {};

  return DEFAULT_CHECKS.map((check) => ({
    ...check,
    weight:
      weightOverrides[check.id] !== undefined
        ? Number(weightOverrides[check.id])
        : check.weight,
    required:
      requiredOverrides[check.id] !== undefined
        ? Boolean(requiredOverrides[check.id])
        : check.required,
  }));
}

/**
 * Run all checks and return per-check results plus a normalised score (0-100).
 */
function runRubric(ctx, overrides = {}) {
  const checks = buildChecks(overrides);
  const results = checks.map((check) => {
    let result;
    try {
      result = check.check(ctx);
    } catch (err) {
      result = {
        pass: false,
        evidence: [],
        reason: `Check error: ${err.message}`,
      };
    }
    return {
      id: check.id,
      label: check.label,
      weight: check.weight,
      required: check.required,
      pass: result.pass,
      evidence: result.evidence || [],
      reason: result.reason || '',
    };
  });

  const totalWeight = results.reduce((s, r) => s + r.weight, 0);
  const earnedWeight = results.reduce((s, r) => s + (r.pass ? r.weight : 0), 0);
  const score =
    totalWeight > 0
      ? Math.round((earnedWeight / totalWeight) * 100 * 100) / 100
      : 0;

  return { score, checks: results };
}

module.exports = { runRubric, DEFAULT_CHECKS };
