#!/usr/bin/env node
'use strict';

const path = require('path');
const { score } = require('../src/core/index');
const { toMarkdown, toSummary } = require('../src/core/format');

const args = process.argv.slice(2);
const flags = new Set();

// --fail-below <n>
let failBelow = null;
let skipNext = false;
const positional = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (skipNext) { skipNext = false; continue; }
  if (arg === '--fail-below') {
    if (args[i + 1] !== undefined) {
      failBelow = parseFloat(args[i + 1]);
      skipNext = true;
    }
  } else if (arg.startsWith('--')) {
    flags.add(arg);
  } else {
    positional.push(arg);
  }
}

// repo root: positional arg or cwd
const repoRoot = positional[0] ? path.resolve(positional[0]) : process.cwd();

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
