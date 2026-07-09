"use strict";

/**
 * Investor Lens Report — round-specific gap analysis.
 *
 * For each funding round, defines what investors expect to see in a repo.
 * Then compares against actual check results to produce a gap report:
 * "For a [round] round, you're at X/100. Here's what's present, what's missing."
 *
 * Based on general VC knowledge:
 * - Pre-seed: idea + team + problem
 * - Seed: + market + traction signals + monetization
 * - Series A: + metrics + governance + scale evidence
 * - Grant: + public benefit + open license + reproducibility
 */

const ROUND_CHECKLISTS = {
  "pre-seed": {
    label: "Pre-Seed",
    checkSize: "$250k - $500k",
    description:
      "Investors want to see a clear problem, a team that can build, and early signals of life.",
    required: [
      "readme-exists",
      "readme-oneliner",
      "contact-team",
      "audience-customer",
    ],
    expected: [
      "readme-demo",
      "deployed-url",
      "license",
      "tests-or-ci",
      "git-activity",
    ],
    bonus: ["funding-or-roadmap", "monetization-clarity", "market-evidence"],
  },
  seed: {
    label: "Seed",
    checkSize: "$1M - $3M",
    description:
      "Investors want evidence the product works, the market is real, and there's a path to revenue.",
    required: [
      "readme-exists",
      "readme-oneliner",
      "audience-customer",
      "funding-or-roadmap",
      "market-evidence",
    ],
    expected: [
      "deployed-url",
      "readme-demo",
      "license",
      "tests-or-ci",
      "git-activity",
      "monetization-clarity",
      "traction-evidence",
    ],
    bonus: [
      "risks-honest",
      "security",
      "contributing",
      "architecture",
      "recession-resilience",
      "pricing-power",
    ],
  },
  "series-a": {
    label: "Series A",
    checkSize: "$5M - $15M",
    description:
      "Investors want real traction, governance, scale evidence, and a defensible moat.",
    required: [
      "readme-exists",
      "readme-oneliner",
      "audience-customer",
      "funding-or-roadmap",
      "market-evidence",
      "monetization-clarity",
      "traction-evidence",
      "deployed-url",
    ],
    expected: [
      "license",
      "tests-or-ci",
      "git-activity",
      "contributor-count",
      "security",
      "architecture",
      "changelog",
      "contributing",
      "risks-honest",
      "recession-resilience",
      "pricing-power",
      "tech-enabled-margins",
    ],
    bonus: ["contingency-depth", "readme-cta", "readme-demo"],
  },
  grant: {
    label: "Grant",
    checkSize: "varies",
    description:
      "Grantors want public benefit, open access, reproducibility, and clear impact.",
    required: [
      "readme-exists",
      "readme-oneliner",
      "license",
      "audience-customer",
    ],
    expected: [
      "tests-or-ci",
      "git-activity",
      "contributing",
      "changelog",
      "architecture",
    ],
    bonus: [
      "funding-or-roadmap",
      "market-evidence",
      "security",
      "deployed-url",
    ],
  },
  unknown: {
    label: "General",
    checkSize: "unknown",
    description:
      "No funding round inferred. Showing general investor-readiness checklist.",
    required: [
      "readme-exists",
      "readme-oneliner",
      "audience-customer",
      "license",
    ],
    expected: [
      "funding-or-roadmap",
      "market-evidence",
      "deployed-url",
      "tests-or-ci",
      "git-activity",
      "contact-team",
      "monetization-clarity",
    ],
    bonus: [
      "risks-honest",
      "security",
      "contributing",
      "architecture",
      "traction-evidence",
    ],
  },
};

/**
 * Build a round-specific gap analysis report.
 * @param {string} round - the inferred funding round
 * @param {object} checkResults - { artifacts: [...checks], business: [...checks] }
 * @returns {object} lens report
 */
function buildLensReport(round, checkResults) {
  const checklist = ROUND_CHECKLISTS[round] || ROUND_CHECKLISTS["unknown"];

  // Build a map of check id → pass status
  const allChecks = [
    ...(checkResults.artifacts || []),
    ...(checkResults.business || []),
  ];
  const checkMap = {};
  for (const c of allChecks) {
    checkMap[c.id] = c.pass;
  }

  // Evaluate each category
  const evaluateCategory = (ids) =>
    ids.map((id) => ({
      id,
      pass: checkMap[id] !== undefined ? checkMap[id] : false,
      present: checkMap[id] === true,
    }));

  const requiredResults = evaluateCategory(checklist.required);
  const expectedResults = evaluateCategory(checklist.expected);
  const bonusResults = evaluateCategory(checklist.bonus);

  const requiredPassed = requiredResults.filter((r) => r.pass).length;
  const expectedPassed = expectedResults.filter((r) => r.pass).length;
  const bonusPassed = bonusResults.filter((r) => r.pass).length;

  // Round-specific score: required = 60%, expected = 30%, bonus = 10%
  const requiredScore =
    checklist.required.length > 0
      ? (requiredPassed / checklist.required.length) * 60
      : 0;
  const expectedScore =
    checklist.expected.length > 0
      ? (expectedPassed / checklist.expected.length) * 30
      : 0;
  const bonusScore =
    checklist.bonus.length > 0
      ? (bonusPassed / checklist.bonus.length) * 10
      : 0;

  const roundScore =
    Math.round((requiredScore + expectedScore + bonusScore) * 100) / 100;

  // Missing items (sorted: required first, then expected, then bonus)
  const missing = [
    ...requiredResults
      .filter((r) => !r.pass)
      .map((r) => ({ ...r, category: "required" })),
    ...expectedResults
      .filter((r) => !r.pass)
      .map((r) => ({ ...r, category: "expected" })),
    ...bonusResults
      .filter((r) => !r.pass)
      .map((r) => ({ ...r, category: "bonus" })),
  ];

  return {
    round: checklist.label,
    roundKey: round,
    checkSize: checklist.checkSize,
    description: checklist.description,
    roundScore,
    required: {
      total: checklist.required.length,
      passed: requiredPassed,
      items: requiredResults,
    },
    expected: {
      total: checklist.expected.length,
      passed: expectedPassed,
      items: expectedResults,
    },
    bonus: {
      total: checklist.bonus.length,
      passed: bonusPassed,
      items: bonusResults,
    },
    missing,
  };
}

module.exports = { buildLensReport, ROUND_CHECKLISTS };
