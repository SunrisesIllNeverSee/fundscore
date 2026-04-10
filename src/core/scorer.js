'use strict';

const { readFile, findFile, listFiles, loadOverrides } = require('./loader');
const { inferLens } = require('./lens');
const { runRubric } = require('./rubric');
const { computeQuality } = require('./quality');

/**
 * Default scoring weights.
 */
const DEFAULT_WEIGHTS = { coverage: 0.6, quality: 0.4 };

/**
 * Build the check context used by both rubric and quality modules.
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
  const files = listFiles(repoRoot);
  const overrides = loadOverrides(repoRoot);
  const ctx = buildContext(repoRoot, files);

  // Lens inference
  const textBlobs = [
    readFile(repoRoot, 'README.md'),
    readFile(repoRoot, 'FUNDING.md'),
    readFile(repoRoot, 'ROADMAP.md'),
    readFile(repoRoot, '.fundscore.yml'),
  ];
  const lens = inferLens(textBlobs, overrides);

  // Coverage score
  const { coverageScore, checks } = runRubric(ctx, overrides);

  // Quality score
  const { qualityScore, dimensions } = computeQuality(ctx);

  // Weights (configurable via overrides)
  const weightOverrides = (overrides && overrides.scoring) || {};
  const coverageWeight = weightOverrides.coverageWeight !== undefined
    ? Number(weightOverrides.coverageWeight) : DEFAULT_WEIGHTS.coverage;
  const qualityWeight = weightOverrides.qualityWeight !== undefined
    ? Number(weightOverrides.qualityWeight) : DEFAULT_WEIGHTS.quality;

  const totalWeight = coverageWeight + qualityWeight;
  const overallScore = Math.round(
    ((coverageScore * coverageWeight + qualityScore * qualityWeight) / totalWeight) * 10
  ) / 10;

  // Thresholds
  const thresholds = {
    warn: (overrides.thresholds && overrides.thresholds.warn) || 5,
    fail: (overrides.thresholds && overrides.thresholds.fail) || 3,
  };

  const status = overallScore >= thresholds.warn ? 'pass'
    : overallScore >= thresholds.fail ? 'warn' : 'fail';

  return {
    repoRoot,
    generatedAt: new Date().toISOString(),
    lens,
    scores: {
      coverageScore,
      qualityScore,
      overallScore,
      weights: { coverage: coverageWeight, quality: qualityWeight },
    },
    status,
    thresholds,
    coverage: { checks },
    quality: { dimensions },
  };
}

module.exports = { score };
