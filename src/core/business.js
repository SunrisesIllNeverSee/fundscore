'use strict';

/**
 * Business viability — investor signal communication checks.
 *
 * Reframed from "we measure your business" to "does your repo communicate
 * the signals investors look for?" These checks verify that the repo's docs
 * mention key business viability concepts. The asterisk on the score:
 * "Snapshot of repo-readiness signals, not a business valuation."
 *
 * Score: 0-100 (weighted checklist, same pattern as rubric.js)
 */

const BUSINESS_CHECKS = [
  {
    id: 'monetization-clarity',
    label: 'How the business makes money is clearly stated',
    weight: 8,
    required: false,
    check(ctx) {
      const content = (ctx.readFile('README.md') || '') + (ctx.readFile('FUNDING.md') || '');
      const patterns = [
        /\b(?:revenue|monetiz|pricing|subscription|freemium|saas|paying|paid|tier|plan)\b/i,
        /\$\d+.*?(?:\/mo|\/year|per month|per year|\/user|per user)/i,
        /\b(?:business model|how we make money|how.*?makes money|revenue model)\b/i,
        /\b(?:marketplace|transaction fee|take rate|commission|stripe|payment|checkout)\b/i,
      ];
      const hits = patterns.filter((p) => p.test(content));
      if (hits.length >= 1) {
        return { pass: true, evidence: ['README.md'], reason: 'Repo mentions monetization, pricing, or revenue model.' };
      }
      return { pass: false, evidence: [], reason: 'No mention of how the business makes money (pricing, revenue model, monetization).' };
    },
  },
  {
    id: 'recession-resilience',
    label: 'Recession resilience signals (recurring revenue, moat, fixed costs)',
    weight: 6,
    required: false,
    check(ctx) {
      const content = (ctx.readFile('README.md') || '') +
        (ctx.readFile('FUNDING.md') || '') +
        (ctx.readFile('RISKS.md') || '') +
        (ctx.readFile('ROADMAP.md') || '');
      const signals = [
        /\brecurring\s+(?:revenue|payment|subscription)/i,
        /\b(?:moat|defensible|defensibility|switching\s+cost|sticky|lock-?in)\b/i,
        /\b(?:fixed\s+cost|low\s+overhead|high\s+margin|gross\s+margin|unit\s+economic)/i,
        /\b(?:diversified|multiple\s+(?:revenue|income)\s+stream|not\s+dependent\s+on)\b/i,
      ];
      const hits = signals.filter((p) => p.test(content));
      if (hits.length >= 1) {
        return { pass: true, evidence: ['README.md'], reason: `${hits.length} recession-resilience signal(s) found.` };
      }
      return { pass: false, evidence: [], reason: 'No recession-resilience signals (recurring revenue, moat, fixed costs, diversification).' };
    },
  },
  {
    id: 'pricing-power',
    label: 'Pricing power signals (switching costs, sticky product, CAC)',
    weight: 6,
    required: false,
    check(ctx) {
      const content = (ctx.readFile('README.md') || '') +
        (ctx.readFile('FUNDING.md') || '') +
        (ctx.readFile('ROADMAP.md') || '');
      const signals = [
        /\b(?:switching\s+cost|sticky|churn|retention|loyalty)\b/i,
        /\b(?:recurring|subscription|annual\s+contract|multi-?year)\b/i,
        /\b(?:cac|customer\s+acquisition\s+cost|ltv|lifetime\s+value|payback)\b/i,
        /\b(?:inelastic|price\s+increase|premium|upsell|cross-?sell)\b/i,
        /\b(?:integration\s+cost|migrate|migration\s+cost|embedded)\b/i,
      ];
      const hits = signals.filter((p) => p.test(content));
      if (hits.length >= 1) {
        return { pass: true, evidence: ['README.md'], reason: `${hits.length} pricing-power signal(s) found.` };
      }
      return { pass: false, evidence: [], reason: 'No pricing-power signals (switching costs, retention, CAC/LTV, upsell).' };
    },
  },
  {
    id: 'tech-enabled-margins',
    label: 'Tech-enabled margin signals (automation, API, scale)',
    weight: 5,
    required: false,
    check(ctx) {
      const content = (ctx.readFile('README.md') || '') +
        (ctx.readFile('ROADMAP.md') || '') +
        (ctx.readFile('FUNDING.md') || '');
      const signals = [
        /\b(?:automat|api|async|pipeline|workflow|orchestrat)/i,
        /\b(?:scale|scalable|throughput|efficiency|productivity)/i,
        /\b(?:margin|cost\s+reduction|operating\s+leverage|zero\s+marginal\s+cost)/i,
        /\b(?:ai|ml|llm|model|inference|agent)/i,
        /\b(?:self-?serve|self-?service|low\s+touch|high\s+touch)/i,
      ];
      const hits = signals.filter((p) => p.test(content));
      if (hits.length >= 2) {
        return { pass: true, evidence: ['README.md'], reason: `${hits.length} tech-margin signal(s) found.` };
      }
      return { pass: false, evidence: [], reason: 'Insufficient tech-margin signals (need 2+: automation, API, scale, AI, self-serve).' };
    },
  },
  {
    id: 'contingency-depth',
    label: 'Contingency / downside planning (scenario planning, risk mitigation)',
    weight: 4,
    required: false,
    check(ctx) {
      const risks = ctx.readFile('RISKS.md') || '';
      const roadmap = ctx.readFile('ROADMAP.md') || '';
      const readme = ctx.readFile('README.md') || '';
      const signals = [
        /scenario|downside|worst\s+case|fallback|plan\s+b|contingenc/i,
        /mitigat|hedge|diversif|backup|failover|resilien/i,
        /if.*?(?:fail|doesn't|does\s+not|shuts?|pivot)/i,
        /runway|burn\s+rate|cash\s+flow|break-?even/i,
      ];
      const combined = risks + '\n' + roadmap + '\n' + readme;
      const hits = signals.filter((p) => p.test(combined));
      if (hits.length >= 1) {
        return { pass: true, evidence: ['RISKS.md'], reason: `${hits.length} contingency signal(s) found.` };
      }
      return { pass: false, evidence: [], reason: 'No contingency/downside planning signals (scenario, mitigation, runway, break-even).' };
    },
  },
  {
    id: 'market-evidence',
    label: 'Market evidence (market size, competitors, positioning)',
    weight: 6,
    required: false,
    check(ctx) {
      const content = (ctx.readFile('README.md') || '') +
        (ctx.readFile('FUNDING.md') || '') +
        (ctx.readFile('COMPARABLES.md') || '');
      const signals = [
        /\b(?:tam|sam|som|market\s+size|total\s+addressable)\b/i,
        /\b(?:competitor|comparable|comp|alternative|incumbent)\b/i,
        /\b(?:positioning|differentiat|unique\s+value|value\s+prop|moat)\b/i,
        /\$\d+[bBmM].*?(?:market|tam|sam)/i,
        /\b(?:growing|growth\s+rate|cagr|expanding)\b/i,
      ];
      const hits = signals.filter((p) => p.test(content));
      if (hits.length >= 1) {
        return { pass: true, evidence: ['README.md'], reason: `${hits.length} market-evidence signal(s) found.` };
      }
      return { pass: false, evidence: [], reason: 'No market-evidence signals (TAM, competitors, positioning, growth rate).' };
    },
  },
  {
    id: 'traction-evidence',
    label: 'Traction evidence (users, revenue, growth metrics)',
    weight: 7,
    required: false,
    check(ctx) {
      const content = (ctx.readFile('README.md') || '') +
        (ctx.readFile('FUNDING.md') || '') +
        (ctx.readFile('ROADMAP.md') || '');
      const signals = [
        /\b\d+\s*(?:users?|customers?|signups?|accounts?|subscribers?)\b/i,
        /\$\d+[kKmM]?\s*(?:arr|mrr|revenue|monthly|annual)/i,
        /\b\d+%\s*(?:growth|retention|churn|conversion)/i,
        /\b(?:traction|momentum|growing\s+fast|hockey\s+stick)\b/i,
        /\b(?:launched|live|deployed|in\s+production|serving)\b/i,
        /\b(?:nps|csat|satisfaction|testimoni)/i,
      ];
      const hits = signals.filter((p) => p.test(content));
      if (hits.length >= 1) {
        return { pass: true, evidence: ['README.md'], reason: `${hits.length} traction signal(s) found.` };
      }
      return { pass: false, evidence: [], reason: 'No traction signals (users, revenue, growth metrics, testimonials).' };
    },
  },
];

/**
 * Build the effective check list, applying overrides from .fundscore.yml.
 */
function buildBusinessChecks(overrides) {
  const weightOverrides = (overrides && overrides.businessWeights) || {};
  const requiredOverrides = (overrides && overrides.businessRequired) || {};

  return BUSINESS_CHECKS.map((check) => ({
    ...check,
    weight: weightOverrides[check.id] !== undefined ? Number(weightOverrides[check.id]) : check.weight,
    required: requiredOverrides[check.id] !== undefined ? Boolean(requiredOverrides[check.id]) : check.required,
  }));
}

/**
 * Run all business checks and return per-check results plus a normalised score (0-100).
 */
function computeBusiness(ctx, overrides = {}) {
  const checks = buildBusinessChecks(overrides);
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
  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100 * 100) / 100 : 0;

  return { score, checks: results };
}

module.exports = { computeBusiness, BUSINESS_CHECKS };
