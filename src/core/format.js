'use strict';

/**
 * Format a fundscore report as a Markdown string.
 * @param {object} report
 * @returns {string}
 */
function toMarkdown(report) {
  const { lens, scores, status, coverage, quality, generatedAt } = report;

  const statusEmoji = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
  const lines = [];

  lines.push('## 🔥 Fundscore — Funding Viability Report');
  lines.push('');
  lines.push(`> Generated: ${generatedAt}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Headline score
  lines.push(`### ${statusEmoji} Overall Score: **${scores.overallScore}/10**`);
  lines.push('');
  lines.push('| Dimension | Score | Weight |');
  lines.push('|-----------|-------|--------|');
  lines.push(`| Coverage  | ${scores.coverageScore.toFixed(1)}/10 | ${Math.round(scores.weights.coverage * 100)}% |`);
  lines.push(`| Quality   | ${scores.qualityScore.toFixed(1)}/10 | ${Math.round(scores.weights.quality * 100)}% |`);
  lines.push('');

  // Investor lens
  lines.push('### 🔍 Investor Lens (auto-inferred)');
  lines.push('');
  lines.push('| Field | Value | Source |');
  lines.push('|-------|-------|--------|');
  lines.push(`| Round | ${lens.round} | ${lens.confidence.round} |`);
  lines.push(`| Check Size | ${lens.checkSize} | ${lens.confidence.round} |`);
  lines.push(`| Team Mode | ${lens.teamMode} | ${lens.confidence.teamMode} |`);
  lines.push(`| NAICS | ${lens.naics} | ${lens.confidence.naics} |`);
  lines.push('');

  // Coverage breakdown
  lines.push('### 📋 Coverage Checks');
  lines.push('');
  lines.push('| # | Check | Weight | Status | Notes |');
  lines.push('|---|-------|--------|--------|-------|');
  coverage.checks.forEach((c, i) => {
    const icon = c.pass ? '✅' : c.required ? '❌' : '⚠️';
    const evidence = c.evidence.length ? c.evidence.join(', ') : '—';
    lines.push(`| ${i + 1} | ${c.label} | ${c.weight} | ${icon} | ${c.reason} \`${evidence}\` |`);
  });
  lines.push('');

  // Quality breakdown
  lines.push('### 🧠 Quality Dimensions (heuristic)');
  lines.push('');
  lines.push('| Dimension | Score | Weight |');
  lines.push('|-----------|-------|--------|');
  for (const [, dim] of Object.entries(quality.dimensions)) {
    lines.push(`| ${dim.label} | ${dim.score}/10 | ${dim.weight} |`);
  }
  lines.push('');

  // Missing items
  const missing = coverage.checks.filter((c) => !c.pass);
  if (missing.length > 0) {
    lines.push('### 📌 Recommended Next Steps');
    lines.push('');
    // Sort by weight descending for highest-impact first
    missing
      .slice()
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .forEach((c, i) => {
        lines.push(`${i + 1}. **${c.label}** — ${c.reason}`);
      });
    lines.push('');
  }

  lines.push('---');
  lines.push('_Powered by [fundscore](https://github.com/SunrisesIllNeverSee/Burnmydays) — repo-only, no external APIs._');

  return lines.join('\n');
}

/**
 * Format a short summary suitable for terminal stdout.
 * @param {object} report
 * @returns {string}
 */
function toSummary(report) {
  const { scores, status, coverage } = report;
  const statusLabel = status === 'pass' ? '✅ PASS' : status === 'warn' ? '⚠️  WARN' : '❌ FAIL';
  const passed = coverage.checks.filter((c) => c.pass).length;
  const total = coverage.checks.length;

  const lines = [
    `fundscore ${statusLabel}`,
    `  Overall : ${scores.overallScore}/10`,
    `  Coverage: ${scores.coverageScore.toFixed(1)}/10  (${passed}/${total} checks passed)`,
    `  Quality : ${scores.qualityScore.toFixed(1)}/10`,
    `  Lens    : ${report.lens.round} / ${report.lens.teamMode} / NAICS ${report.lens.naics}`,
  ];

  const missing = coverage.checks
    .filter((c) => !c.pass)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  if (missing.length) {
    lines.push('');
    lines.push('  Top missing items:');
    missing.forEach((c) => lines.push(`    - ${c.label}`));
  }

  return lines.join('\n');
}

module.exports = { toMarkdown, toSummary };
