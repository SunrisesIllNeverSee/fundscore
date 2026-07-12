'use strict';

/**
 * Format a fundscore report as a Markdown string.
 * @param {object} report
 * @returns {string}
 */
function toMarkdown(report) {
  const {
    lens,
    lensReport,
    scores,
    status,
    coverage,
    business,
    quality,
    generatedAt,
    fixDeltas,
  } = report;

  const statusEmoji =
    status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
  const lines = [];

  lines.push('## 🔥 Fundscore — Investor Readiness Report');
  lines.push('');
  lines.push(`> Generated: ${generatedAt}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Headline score
  lines.push(
    `### ${statusEmoji} Overall Score: **${scores.overallScore}/100**`,
  );
  lines.push('');
  lines.push(
    '> ⚠️ **Asterisk:** This is a snapshot of repo-readiness signals, not a business valuation. The score reflects what your repo communicates, not what your business is.',
  );
  lines.push('');
  lines.push('| Dimension | Score | Weight |');
  lines.push('|-----------|-------|--------|');
  lines.push(
    `| Artifacts | ${scores.artifactsScore.toFixed(1)}/100 | ${Math.round(scores.weights.artifacts * 100)}% |`,
  );
  lines.push(
    `| Business Viability | ${scores.businessScore.toFixed(1)}/100 | ${Math.round(scores.weights.business * 100)}% |`,
  );
  lines.push(
    `| Quality | ${scores.qualityScore.toFixed(1)}/100 | ${Math.round(scores.weights.quality * 100)}% |`,
  );
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

  // Round-specific report
  if (lensReport) {
    lines.push(
      `### 📊 Round-Specific Report: ${lensReport.round} (${lensReport.roundScore}/100)`,
    );
    lines.push('');
    lines.push(`> ${lensReport.description}`);
    lines.push('');
    lines.push(`> Check size: ${lensReport.checkSize}`);
    lines.push('');

    const catLine = (label, data) => {
      if (data.total === 0) return null;
      const items = data.items.map((i) => (i.pass ? '✅' : '❌')).join(' ');
      return `| ${label} | ${data.passed}/${data.total} | ${items} |`;
    };

    lines.push('| Category | Passed | Items |');
    lines.push('|----------|--------|-------|');
    const reqLine = catLine('Required', lensReport.required);
    const expLine = catLine('Expected', lensReport.expected);
    const bonLine = catLine('Bonus', lensReport.bonus);
    if (reqLine) lines.push(reqLine);
    if (expLine) lines.push(expLine);
    if (bonLine) lines.push(bonLine);
    lines.push('');
  }

  // Artifacts breakdown
  lines.push('### 📋 Artifacts (Coverage Checks)');
  lines.push('');
  lines.push('| # | Check | Weight | Status | Notes |');
  lines.push('|---|-------|--------|--------|-------|');
  coverage.checks.forEach((c, i) => {
    const icon = c.pass ? '✅' : c.required ? '❌' : '⚠️';
    const evidence = c.evidence.length ? c.evidence.join(', ') : '—';
    lines.push(
      `| ${i + 1} | ${c.label} | ${c.weight} | ${icon} | ${c.reason} \`${evidence}\` |`,
    );
  });
  lines.push('');

  // Business viability breakdown
  lines.push('### 💰 Business Viability (Investor Signal Communication)');
  lines.push('');
  lines.push('| # | Check | Weight | Status | Notes |');
  lines.push('|---|-------|--------|--------|-------|');
  business.checks.forEach((c, i) => {
    const icon = c.pass ? '✅' : c.required ? '❌' : '⚠️';
    const evidence = c.evidence.length ? c.evidence.join(', ') : '—';
    lines.push(
      `| ${i + 1} | ${c.label} | ${c.weight} | ${icon} | ${c.reason} \`${evidence}\` |`,
    );
  });
  lines.push('');

  // Quality breakdown
  lines.push('### 🧠 Quality (Heuristic)');
  lines.push('');
  lines.push('| Dimension | Score | Weight |');
  lines.push('|-----------|-------|--------|');
  for (const [, dim] of Object.entries(quality.dimensions)) {
    lines.push(`| ${dim.label} | ${dim.score}/100 | ${dim.weight} |`);
  }
  lines.push('');

  // Fix recommendations with score deltas
  if (fixDeltas && fixDeltas.length > 0) {
    lines.push('### 📌 Recommended Fixes (sorted by score impact)');
    lines.push('');
    fixDeltas.slice(0, 10).forEach((f, i) => {
      lines.push(`${i + 1}. **${f.label}** (+${f.delta} pts) — ${f.reason}`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push(
    '_Powered by [fundscore](https://github.com/SunrisesIllNeverSee/fundscore) — Lighthouse for repos. Deterministic, no LLM, no external APIs._',
  );

  return lines.join('\n');
}

/**
 * Format a short summary suitable for terminal stdout.
 * @param {object} report
 * @returns {string}
 */
function toSummary(report) {
  const { scores, status, coverage, business, lensReport } = report;
  const statusLabel =
    status === 'pass' ? '✅ PASS' : status === 'warn' ? '⚠️  WARN' : '❌ FAIL';
  const passed = coverage.checks.filter((c) => c.pass).length;
  const total = coverage.checks.length;
  const bizPassed = business.checks.filter((c) => c.pass).length;
  const bizTotal = business.checks.length;

  const lines = [
    `fundscore ${statusLabel}`,
    `  Overall  : ${scores.overallScore}/100`,
    `  Artifacts: ${scores.artifactsScore.toFixed(1)}/100  (${passed}/${total} checks)`,
    `  Business : ${scores.businessScore.toFixed(1)}/100  (${bizPassed}/${bizTotal} checks)`,
    `  Quality  : ${scores.qualityScore.toFixed(1)}/100`,
  ];

  if (lensReport) {
    lines.push(
      `  Round    : ${lensReport.round} → ${lensReport.roundScore}/100  (check size: ${lensReport.checkSize})`,
    );
  }

  // Top fixes with score deltas
  if (report.fixDeltas && report.fixDeltas.length > 0) {
    lines.push('');
    lines.push('  Top fixes (by score impact):');
    report.fixDeltas.slice(0, 5).forEach((f) => {
      lines.push(`    +${f.delta.toFixed(1)} pts  ${f.label}`);
    });
  }

  return lines.join('\n');
}

module.exports = { toMarkdown, toSummary };
