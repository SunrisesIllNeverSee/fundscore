#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { score } = require('../src/core/index');
const { toMarkdown, toSummary } = require('../src/core/format');
const { getFixPlan } = require('../src/core/templates');

const args = process.argv.slice(2);
const flags = new Set();
const commands = new Set();

// Parse --fail-below <n>
let failBelow = null;
let skipNext = false;
const positional = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (skipNext) {
    skipNext = false;
    continue;
  }
  if (arg === '--fail-below') {
    if (args[i + 1] !== undefined) {
      failBelow = parseFloat(args[i + 1]);
      skipNext = true;
    }
  } else if (arg.startsWith('--')) {
    flags.add(arg);
  } else if (!arg.startsWith('-')) {
    // Check if it's a command
    if (
      positional.length === 0 &&
      ['fix', 'history', 'badge', 'mcp'].includes(arg)
    ) {
      commands.add(arg);
    } else {
      positional.push(arg);
    }
  }
}

// repo root: positional arg or cwd
const repoRoot = positional[0] ? path.resolve(positional[0]) : process.cwd();

// --- COMMANDS ---

if (commands.has('fix')) {
  // --fix mode: generate scaffold templates for missing docs
  let report;
  try {
    report = score(repoRoot);
  } catch (err) {
    process.stderr.write(`fundscore error: ${err.message}\n`);
    process.exit(1);
  }

  const allChecks = [...report.coverage.checks, ...report.business.checks];
  const missing = allChecks.filter((c) => !c.pass);
  const fixPlan = getFixPlan(missing);

  if (fixPlan.length === 0) {
    process.stdout.write(
      'fundscore fix — nothing to scaffold. All templateable checks are passing.\n',
    );
    process.exit(0);
  }

  if (flags.has('--apply')) {
    // Write the files
    let written = 0;
    for (const item of fixPlan) {
      const fullPath = path.join(repoRoot, item.file);
      if (fs.existsSync(fullPath) && !flags.has('--force')) {
        process.stdout.write(
          `  ⚠️  Skipped ${item.file} (already exists, use --force to overwrite)\n`,
        );
        continue;
      }
      const content = item.template(repoRoot);
      fs.writeFileSync(fullPath, content);
      process.stdout.write(
        `  ✅ Created ${item.file} (fixes: ${item.checks.join(', ')})\n`,
      );
      written++;
    }
    process.stdout.write(
      `\nfundscore fix — wrote ${written} file(s). Edit them and re-run fundscore to see your score improve.\n`,
    );
  } else {
    // Dry-run: print the plan
    process.stdout.write('fundscore fix — scaffold plan (dry run)\n\n');
    for (const item of fixPlan) {
      process.stdout.write(
        `  📄 ${item.file} (fixes: ${item.checks.join(', ')})\n`,
      );
    }
    process.stdout.write(
      '\n  Run `fundscore fix --apply` to create these files.\n',
    );
    process.stdout.write(
      '  Run `fundscore fix --apply --force` to overwrite existing files.\n',
    );
  }
  process.exit(0);
}

if (commands.has('history')) {
  // history command: read stored JSON artifacts and show score over time
  const historyDir = path.join(repoRoot, '.fundscore-history');

  if (flags.has('--save')) {
    // Save current report to history
    let report;
    try {
      report = score(repoRoot);
    } catch (err) {
      process.stderr.write(`fundscore error: ${err.message}\n`);
      process.exit(1);
    }
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const historyFile = path.join(historyDir, `fundscore-${ts}.json`);
    fs.mkdirSync(historyDir, { recursive: true });
    fs.writeFileSync(historyFile, JSON.stringify(report, null, 2));
    process.stdout.write(
      `fundscore history — saved snapshot to ${historyFile}\n`,
    );
    process.exit(0);
  }

  if (!fs.existsSync(historyDir)) {
    process.stdout.write('fundscore history — no history found.\n');
    process.stdout.write(
      '  History is stored when you run fundscore with the GitHub Action or manually save reports.\n',
    );
    process.stdout.write(
      '  Run `fundscore` to generate a report, then `fundscore history --save` to store it.\n',
    );
    process.exit(0);
  }

  // Read all history files
  const files = fs
    .readdirSync(historyDir)
    .filter((f) => f.startsWith('fundscore-') && f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    process.stdout.write('fundscore history — no snapshots found.\n');
    process.exit(0);
  }

  process.stdout.write('fundscore history\n\n');
  process.stdout.write(
    '  Date                     Score    Artifacts  Business  Quality   Round\n',
  );
  process.stdout.write(
    '  ───────────────────────────────────────────────────────────────────────────\n',
  );

  for (const file of files) {
    try {
      const data = JSON.parse(
        fs.readFileSync(path.join(historyDir, file), 'utf8'),
      );
      const date =
        data.generatedAt || file.replace('fundscore-', '').replace('.json', '');
      const overall = (data.scores?.overallScore ?? 0).toFixed(1).padStart(6);
      const art = (data.scores?.artifactsScore ?? 0).toFixed(1).padStart(8);
      const biz = (data.scores?.businessScore ?? 0).toFixed(1).padStart(8);
      const qual = (data.scores?.qualityScore ?? 0).toFixed(1).padStart(8);
      const round = data.lens?.round || 'unknown';
      process.stdout.write(
        `  ${date}   ${overall}   ${art}   ${biz}   ${qual}   ${round}\n`,
      );
    } catch {
      /* skip corrupt files */
    }
  }

  // Show trajectory
  if (files.length >= 2) {
    try {
      const first = JSON.parse(
        fs.readFileSync(path.join(historyDir, files[0]), 'utf8'),
      );
      const last = JSON.parse(
        fs.readFileSync(path.join(historyDir, files[files.length - 1]), 'utf8'),
      );
      const delta =
        (last.scores?.overallScore ?? 0) - (first.scores?.overallScore ?? 0);
      const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
      process.stdout.write(
        `\n  Trajectory: ${arrow} ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts over ${files.length} snapshots\n`,
      );
    } catch {
      /* ignore */
    }
  }

  process.exit(0);
}

if (commands.has('badge')) {
  // badge command: output SVG badge
  let report;
  try {
    report = score(repoRoot);
  } catch (err) {
    process.stderr.write(`fundscore error: ${err.message}\n`);
    process.exit(1);
  }

  const s = report.scores.overallScore;
  const color =
    s >= 70 ? '#4c1' : s >= 50 ? '#dfb317' : s >= 30 ? '#e05d44' : '#9f9f9f';
  const label = 'fundscore';
  const value = `${s.toFixed(0)}/100`;
  const labelWidth = 70;
  const valueWidth = Math.max(40, value.length * 8 + 10);
  const totalWidth = labelWidth + valueWidth;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
    <path fill="${color}" d="M${labelWidth} 0h${valueWidth}v20H${labelWidth}z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15">${value}</text>
  </g>
</svg>`;

  if (flags.has('--embed')) {
    // Output markdown snippet
    process.stdout.write(
      `[![fundscore](https://img.shields.io/badge/fundscore-${s.toFixed(0)}%2F100-${color.replace('#', '')})](https://github.com/SunrisesIllNeverSee/fundscore)\n`,
    );
  } else {
    process.stdout.write(svg + '\n');
  }

  if (flags.has('--save')) {
    const badgePath = path.join(repoRoot, 'fundscore-badge.svg');
    fs.writeFileSync(badgePath, svg);
    process.stderr.write(`Saved badge to ${badgePath}\n`);
  }

  process.exit(0);
}

if (commands.has('mcp')) {
  // mcp command: start stdio MCP server for AI agent integration
  const { startMcpServer } = require('../src/mcp/server');
  startMcpServer().catch((err) => {
    process.stderr.write(`fundscore mcp error: ${err.message}\n`);
    process.exit(1);
  });
  // The server runs until killed — don't fall through to default
} else {
  // --- DEFAULT: score + report ---

  let report;
  try {
    report = score(repoRoot);
  } catch (err) {
    process.stderr.write(`fundscore error: ${err.message}\n`);
    process.exit(1);
  }

  if (flags.has('--json')) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else if (flags.has('--md')) {
    process.stdout.write(toMarkdown(report) + '\n');
  } else {
    process.stdout.write(toSummary(report) + '\n');
  }

  if (failBelow !== null && report.scores.overallScore < failBelow) {
    process.exit(1);
  }
} // end else (not mcp)
