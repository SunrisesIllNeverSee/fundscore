'use strict';

const fs = require('fs');
const path = require('path');
const { readFile, findFile, listFiles, loadOverrides } = require('./loader');
const { inferLens } = require('./lens');
const { runRubric } = require('./rubric');
const { computeBusiness } = require('./business');
const { computeQuality } = require('./quality');
const { buildLensReport } = require('./lens-report');

/**
 * Default scoring weights (0-100 scale).
 * Three dimensions: artifacts, business viability, quality.
 */
const DEFAULT_WEIGHTS = { artifacts: 0.5, business: 0.3, quality: 0.2 };

/**
 * Default thresholds (0-100 scale).
 */
const DEFAULT_THRESHOLDS = { warn: 50, fail: 30 };

/**
 * Build the check context used by all scoring modules.
 * @param {string} repoRoot
 * @param {string[]} files
 * @returns {object}
 */
function buildContext(repoRoot, files) {
  return {
    repoRoot,
    files,
    readFile: (f) => readFile(repoRoot, f),
    findFile: (f) => findFile(repoRoot, f),
  };
}

/**
 * Score a repository and return a structured report.
 * @param {string} repoRoot - absolute path to repo root
 * @returns {object} report
 */
function score(repoRoot) {
  // BUG-1 fix: validate path exists
  const resolved = path.resolve(repoRoot);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Repository path does not exist: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolved}`);
  }

  const files = listFiles(resolved);
  const overrides = loadOverrides(resolved);
  const ctx = buildContext(resolved, files);

  // Lens inference
  const textBlobs = [
    readFile(resolved, 'README.md'),
    readFile(resolved, 'FUNDING.md'),
    readFile(resolved, 'ROADMAP.md'),
    readFile(resolved, '.fundscore.yml'),
  ];
  const lens = inferLens(textBlobs, overrides);

  // Dimension 1: Artifacts (coverage)
  const { score: artifactsScore, checks } = runRubric(ctx, overrides);

  // Dimension 2: Business viability (investor signal communication)
  const { score: businessScore, checks: businessChecks } = computeBusiness(
    ctx,
    overrides,
  );

  // Dimension 3: Quality (heuristic text properties)
  const { qualityScore, dimensions } = computeQuality(ctx);

  // Weights (configurable via overrides)
  const weightOverrides = (overrides && overrides.scoring) || {};
  const artifactsWeight =
    weightOverrides.artifactsWeight !== undefined
      ? Number(weightOverrides.artifactsWeight)
      : DEFAULT_WEIGHTS.artifacts;
  const businessWeight =
    weightOverrides.businessWeight !== undefined
      ? Number(weightOverrides.businessWeight)
      : DEFAULT_WEIGHTS.business;
  const qualityWeight =
    weightOverrides.qualityWeight !== undefined
      ? Number(weightOverrides.qualityWeight)
      : DEFAULT_WEIGHTS.quality;

  const totalWeight = artifactsWeight + businessWeight + qualityWeight;
  const overallScore =
    Math.round(
      ((artifactsScore * artifactsWeight +
        businessScore * businessWeight +
        qualityScore * qualityWeight) /
        totalWeight) *
        100,
    ) / 100;

  // Thresholds
  const thresholds = {
    warn:
      (overrides.thresholds && overrides.thresholds.warn) ||
      DEFAULT_THRESHOLDS.warn,
    fail:
      (overrides.thresholds && overrides.thresholds.fail) ||
      DEFAULT_THRESHOLDS.fail,
  };

  const status =
    overallScore >= thresholds.warn
      ? 'pass'
      : overallScore >= thresholds.fail
        ? 'warn'
        : 'fail';

  // Investor lens report (round-specific gap analysis)
  const lensReport = buildLensReport(lens.round, {
    artifacts: checks,
    business: businessChecks,
  });

  // Score deltas for missing items
  const allChecks = [...checks, ...businessChecks];
  const missing = allChecks.filter((c) => !c.pass);
  const fixDeltas = missing
    .map((c) => {
      const maxScore = 100;
      const totalCheckWeight = allChecks.reduce((s, r) => s + r.weight, 0);
      const delta =
        Math.round((c.weight / totalCheckWeight) * maxScore * 10) / 10;
      return { id: c.id, label: c.label, delta, reason: c.reason };
    })
    .sort((a, b) => b.delta - a.delta);

  return {
    repoRoot: resolved,
    // BUG-2 fix: generatedAt is metadata, not part of deterministic score
    generatedAt: new Date().toISOString(),
    lens,
    lensReport,
    scores: {
      artifactsScore,
      businessScore,
      qualityScore,
      overallScore,
      weights: {
        artifacts: artifactsWeight,
        business: businessWeight,
        quality: qualityWeight,
      },
    },
    status,
    thresholds,
    coverage: { checks },
    business: { checks: businessChecks },
    quality: { dimensions },
    fixDeltas,
  };
}

module.exports = { score };
