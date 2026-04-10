'use strict';

/**
 * Coverage rubric — deterministic checklist-based scoring.
 * Each check has:
 *   id        — unique identifier
 *   label     — human-readable name
 *   weight    — relative weight (0–10 scale is normalised to sum)
 *   required  — whether failing this check is a hard deduction
 *   check(ctx) — function returning { pass: boolean, evidence: string[], reason: string }
 */

/** @typedef {{ repoRoot: string, files: string[], readFile: (f: string) => string|null, findFile: (f: string) => string|null, lens: object }} CheckContext */

const DEFAULT_CHECKS = [
  {
    id: 'readme-exists',
    label: 'README.md exists',
    weight: 8,
    required: true,
    check(ctx) {
      const found = ctx.findFile('README.md');
      if (!found) return { pass: false, evidence: [], reason: 'No README.md found.' };
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
      // Look for a short sentence (≤ 40 words) after the first heading that is not just the repo name
      const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
      // A "one-liner" heuristic: first non-empty non-heading line with 5–60 words
      const firstPara = lines.find((l) => !l.startsWith('#') && l.split(/\s+/).length >= 5);
      if (firstPara) {
        return { pass: true, evidence: ['README.md'], reason: 'README appears to contain a one-liner or description.' };
      }
      return { pass: false, evidence: ['README.md'], reason: 'README lacks a meaningful description/one-liner after the title.' };
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
        /contact/i, /reach\s+out/i, /email/i, /mailto:/i,
        /get\s+in\s+touch/i, /schedule/i, /calendly/i,
        /demo/i, /book\s+a\s+call/i, /inquir/i,
      ];
      const found = ctaPatterns.find((p) => p.test(content));
      if (found) return { pass: true, evidence: ['README.md'], reason: 'README contains a CTA or contact reference.' };
      return { pass: false, evidence: ['README.md'], reason: 'README lacks a call-to-action or contact information.' };
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
        return { pass: true, evidence: ['README.md'], reason: 'README contains a URL or image (possible demo/screenshot).' };
      }
      return { pass: false, evidence: [], reason: 'README has no demo link or embedded image.' };
    },
  },
  {
    id: 'funding-or-roadmap',
    label: 'Funding or roadmap document exists (FUNDING.md / ROADMAP.md)',
    weight: 9,
    required: false,
    check(ctx) {
      const candidates = ['FUNDING.md', 'ROADMAP.md', 'docs/FUNDING.md', 'docs/ROADMAP.md'];
      for (const c of candidates) {
        const found = ctx.findFile(c);
        if (found) return { pass: true, evidence: [found], reason: `Found ${found}.` };
      }
      return { pass: false, evidence: [], reason: 'No FUNDING.md or ROADMAP.md found.' };
    },
  },
  {
    id: 'market-comps',
    label: 'Market / comparables document exists',
    weight: 7,
    required: false,
    check(ctx) {
      const candidates = ['COMPARABLES.md', 'COMP-SCORE.md', 'docs/COMPARABLES.md', 'docs/MARKET.md', 'MARKET.md'];
      for (const c of candidates) {
        const found = ctx.findFile(c);
        if (found) return { pass: true, evidence: [found], reason: `Found ${found}.` };
      }
      // Also check README for comps section
      const readme = ctx.readFile('README.md') || '';
      if (/##?\s*(comparable|competitor|market|comps|landscape)/i.test(readme)) {
        return { pass: true, evidence: ['README.md'], reason: 'README contains a comparables/market section.' };
      }
      return { pass: false, evidence: [], reason: 'No market/comparables document or README section found.' };
    },
  },
  {
    id: 'risks-honest',
    label: 'Risks / honest assessment document exists',
    weight: 6,
    required: false,
    check(ctx) {
      const candidates = ['RISKS.md', 'COMP-SCORE.md', 'docs/RISKS.md', 'LIMITATIONS.md'];
      for (const c of candidates) {
        const found = ctx.findFile(c);
        if (found) return { pass: true, evidence: [found], reason: `Found ${found}.` };
      }
      const readme = ctx.readFile('README.md') || '';
      if (/##?\s*(risk|limitation|caveat|honest|warning)/i.test(readme)) {
        return { pass: true, evidence: ['README.md'], reason: 'README contains a risks/limitations section.' };
      }
      return { pass: false, evidence: [], reason: 'No risks/limitations document found.' };
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
        if (ctx.findFile(f)) return { pass: true, evidence: [f], reason: `${f} found.` };
      }
      const readme = ctx.readFile('README.md') || '';
      if (/licen[sc]e|copyright|all\s+rights\s+reserved|proprietary/i.test(readme)) {
        return { pass: true, evidence: ['README.md'], reason: 'README mentions license or IP posture.' };
      }
      return { pass: false, evidence: [], reason: 'No license file or licensing mention found.' };
    },
  },
  {
    id: 'tests-or-ci',
    label: 'Tests or CI present (code repo signal)',
    weight: 4,
    required: false,
    check(ctx) {
      // package.json with a test script
      const pkg = ctx.readFile('package.json');
      if (pkg) {
        try {
          const parsed = JSON.parse(pkg);
          if (parsed.scripts && parsed.scripts.test) {
            return { pass: true, evidence: ['package.json'], reason: 'package.json has a test script.' };
          }
        } catch { /* ignore */ }
      }
      // __tests__ directory or *.test.* / *.spec.* files
      const testFile = ctx.files.find((f) =>
        /__tests__|\.test\.[jt]s$|\.spec\.[jt]s$|vitest|jest/.test(f)
      );
      if (testFile) return { pass: true, evidence: [testFile], reason: 'Test files detected.' };
      // CI config
      const ciFile = ctx.files.find((f) => /\.github\/workflows\/.*\.ya?ml$/.test(f));
      if (ciFile) return { pass: true, evidence: [ciFile], reason: 'CI workflow detected.' };
      return { pass: false, evidence: [], reason: 'No test files or CI configuration found.' };
    },
  },
  {
    id: 'security',
    label: 'Security posture hint present',
    weight: 3,
    required: false,
    check(ctx) {
      const candidates = ['SECURITY.md', '.github/SECURITY.md', 'docs/SECURITY.md'];
      for (const c of candidates) {
        if (ctx.findFile(c)) return { pass: true, evidence: [c], reason: `${c} found.` };
      }
      // Dependency scanning configs
      const depScan = ctx.files.find((f) =>
        /dependabot\.ya?ml|\.snyk|\.whitesource|renovate\.json/.test(f)
      );
      if (depScan) return { pass: true, evidence: [depScan], reason: 'Dependency scanning config detected.' };
      return { pass: false, evidence: [], reason: 'No SECURITY.md or dependency scanning config found.' };
    },
  },
  {
    id: 'contact-team',
    label: 'Contact or team info present',
    weight: 5,
    required: false,
    check(ctx) {
      const content = (ctx.readFile('README.md') || '') +
        (ctx.readFile('FUNDING.md') || '') +
        (ctx.readFile('TEAM.md') || '');
      if (/\b(team|founder|author|built\s+by|contact|email|linkedin|twitter|github\.com\/[a-z])/i.test(content)) {
        return { pass: true, evidence: ['README.md'], reason: 'Team or contact info referenced.' };
      }
      return { pass: false, evidence: [], reason: 'No team or contact information found.' };
    },
  },
  {
    id: 'audience-customer',
    label: 'Audience or customer clearly identified',
    weight: 6,
    required: false,
    check(ctx) {
      const content = ctx.readFile('README.md') || '';
      if (/\b(customer|user|client|audience|target|for\s+[a-z]|designed\s+for|built\s+for|who\s+(is|are|this)|use\s+case)\b/i.test(content)) {
        return { pass: true, evidence: ['README.md'], reason: 'README identifies audience or target customer.' };
      }
      return { pass: false, evidence: [], reason: 'README does not clearly identify audience or customer.' };
    },
  },
];

/**
 * Build the effective check list, applying overrides from .fundscore.yml.
 * @param {object} overrides - parsed .fundscore.yml
 * @returns {typeof DEFAULT_CHECKS}
 */
function buildChecks(overrides) {
  const weightOverrides = (overrides && overrides.weights) || {};
  const requiredOverrides = (overrides && overrides.required) || {};

  return DEFAULT_CHECKS.map((check) => ({
    ...check,
    weight: weightOverrides[check.id] !== undefined ? Number(weightOverrides[check.id]) : check.weight,
    required: requiredOverrides[check.id] !== undefined ? Boolean(requiredOverrides[check.id]) : check.required,
  }));
}

/**
 * Run all checks and return per-check results plus a normalised coverageScore (0-10).
 * @param {CheckContext} ctx
 * @param {object} overrides
 * @returns {{ coverageScore: number, checks: Array }}
 */
function runRubric(ctx, overrides = {}) {
  const checks = buildChecks(overrides);
  const results = checks.map((check) => {
    let result;
    try {
      result = check.check(ctx);
    } catch (err) {
      result = { pass: false, evidence: [], reason: `Check error: ${err.message}` };
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
  const coverageScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) / 10 : 0;

  return { coverageScore, checks: results };
}

module.exports = { runRubric, DEFAULT_CHECKS };
