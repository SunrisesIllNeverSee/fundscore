'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');

const { score } = require('../src/core/index');
const { inferLens } = require('../src/core/lens');
const { runRubric } = require('../src/core/rubric');
const { scoreReadability, scoreSpecificity, scoreStructure, scoreConsistency } = require('../src/core/quality');
const { toMarkdown, toSummary } = require('../src/core/format');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempRepo(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fundscore-test-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
  }
  return dir;
}

function cleanupDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// lens.js
// ---------------------------------------------------------------------------
describe('inferLens', () => {
  test('detects pre-seed from text', () => {
    const lens = inferLens(['We are raising a pre-seed round of $250k']);
    expect(lens.round).toBe('pre-seed');
    expect(lens.checkSize).toBe('$250k');
  });

  test('detects seed from SAFE mention', () => {
    const lens = inferLens(['Offering a SAFE note to investors']);
    expect(lens.round).toBe('seed');
  });

  test('detects solo founder', () => {
    const lens = inferLens(['I am a solo founder building this']);
    expect(lens.teamMode).toBe('solo');
  });

  test('detects NAICS code', () => {
    const lens = inferLens(['NAICS: 511210 Software publishers']);
    expect(lens.naics).toBe('511210');
  });

  test('applies overrides', () => {
    const lens = inferLens(['some text'], { lens: { round: 'series-a', naics: '999999' } });
    expect(lens.round).toBe('series-a');
    expect(lens.naics).toBe('999999');
    expect(lens.confidence.round).toBe('override');
  });

  test('returns unknown for empty input', () => {
    const lens = inferLens([]);
    expect(lens.round).toBe('unknown');
    expect(lens.teamMode).toBe('unknown');
    expect(lens.naics).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// quality.js
// ---------------------------------------------------------------------------
describe('scoreReadability', () => {
  test('returns low score for very short text', () => {
    expect(scoreReadability('Hi')).toBeLessThan(5);
  });

  test('returns reasonable score for normal prose', () => {
    const text = 'This tool helps founders score their funding readiness. It checks your repo for key investor artifacts. You can run it locally or in CI.';
    expect(scoreReadability(text)).toBeGreaterThanOrEqual(6);
  });
});

describe('scoreSpecificity', () => {
  test('returns 0 for empty text', () => {
    expect(scoreSpecificity('')).toBe(0);
  });

  test('increases with more concrete numbers', () => {
    const low = 'We have some users and revenue.';
    const high = 'We have 500 users, $12k MRR, 3 enterprise clients, and 85% retention.';
    expect(scoreSpecificity(high)).toBeGreaterThan(scoreSpecificity(low));
  });
});

describe('scoreStructure', () => {
  test('returns low score for plain prose', () => {
    expect(scoreStructure('Just a paragraph.')).toBeLessThan(5);
  });

  test('returns higher score for well-structured markdown', () => {
    const md = '# Title\n## Section\n### Sub\n- item 1\n- item 2\n- item 3\n- item 4\n```js\ncode\n```';
    expect(scoreStructure(md)).toBeGreaterThanOrEqual(5);
  });
});

describe('scoreConsistency', () => {
  test('returns 10 for consistent text', () => {
    expect(scoreConsistency('We have 100 users on the platform.')).toBe(10);
  });

  test('deducts for contradicting numbers', () => {
    const bad = 'We have 100 users on the platform. Currently 500 users are active.';
    expect(scoreConsistency(bad)).toBeLessThan(10);
  });
});

// ---------------------------------------------------------------------------
// rubric.js
// ---------------------------------------------------------------------------
describe('runRubric', () => {
  let dir;
  afterEach(() => { if (dir) { cleanupDir(dir); dir = null; } });

  test('readme-exists check passes when README.md is present', () => {
    dir = makeTempRepo({ 'README.md': '# My App\nA great tool.\n' });
    const { findFile, readFile } = require('../src/core/loader');
    const ctx = {
      repoRoot: dir,
      files: ['README.md'],
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { checks } = runRubric(ctx);
    const readmeCheck = checks.find((c) => c.id === 'readme-exists');
    expect(readmeCheck.pass).toBe(true);
  });

  test('readme-exists check fails when no README', () => {
    dir = makeTempRepo({ 'LICENSE': 'MIT' });
    const { findFile, readFile } = require('../src/core/loader');
    const ctx = {
      repoRoot: dir,
      files: ['LICENSE'],
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { checks } = runRubric(ctx);
    const readmeCheck = checks.find((c) => c.id === 'readme-exists');
    expect(readmeCheck.pass).toBe(false);
  });

  test('license check passes when LICENSE file exists', () => {
    dir = makeTempRepo({ 'LICENSE': 'MIT License', 'README.md': '# x' });
    const { findFile, readFile } = require('../src/core/loader');
    const ctx = {
      repoRoot: dir,
      files: ['LICENSE', 'README.md'],
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { checks } = runRubric(ctx);
    expect(checks.find((c) => c.id === 'license').pass).toBe(true);
  });

  test('weight overrides are applied', () => {
    dir = makeTempRepo({ 'README.md': '# x' });
    const { findFile, readFile } = require('../src/core/loader');
    const ctx = {
      repoRoot: dir,
      files: ['README.md'],
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { checks } = runRubric(ctx, { weights: { 'readme-exists': 99 } });
    expect(checks.find((c) => c.id === 'readme-exists').weight).toBe(99);
  });

  test('coverageScore is 0 when no checks pass', () => {
    dir = makeTempRepo({});
    const { findFile, readFile, listFiles } = require('../src/core/loader');
    const ctx = {
      repoRoot: dir,
      files: listFiles(dir),
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { coverageScore } = runRubric(ctx);
    expect(coverageScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scorer.js (integration)
// ---------------------------------------------------------------------------
describe('score (integration)', () => {
  let dir;
  afterEach(() => { if (dir) { cleanupDir(dir); dir = null; } });

  test('returns a valid report object for minimal repo', () => {
    dir = makeTempRepo({ 'README.md': '# Test\n' });
    const report = score(dir);
    expect(report).toHaveProperty('scores.overallScore');
    expect(report.scores.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.scores.overallScore).toBeLessThanOrEqual(10);
    expect(report).toHaveProperty('lens');
    expect(report).toHaveProperty('coverage.checks');
    expect(report).toHaveProperty('quality.dimensions');
  });

  test('overallScore improves with more artifacts', () => {
    const minimal = makeTempRepo({ 'README.md': '# Test\n' });
    const full = makeTempRepo({
      'README.md': [
        '# My Startup',
        '',
        'We help small businesses manage invoices automatically.',
        '',
        '## Target Customers',
        'Small business owners who spend too much time on billing.',
        '',
        '## Demo',
        'https://example.com/demo',
        '',
        '## Contact',
        'Email us at hello@example.com',
        '',
        '## License',
        'MIT',
      ].join('\n'),
      'LICENSE': 'MIT License',
      'FUNDING.md': '# Funding\nSeeking $500k pre-seed SAFE. Solo founder with 3 years experience.',
      'ROADMAP.md': '# Roadmap\n- Q1: Launch\n- Q2: 100 customers',
      'SECURITY.md': '# Security\nReport issues to security@example.com',
      'package.json': JSON.stringify({ scripts: { test: 'jest' } }),
    });
    const r1 = score(minimal);
    const r2 = score(full);
    expect(r2.scores.coverageScore).toBeGreaterThan(r1.scores.coverageScore);
    cleanupDir(minimal);
    cleanupDir(full);
  });
});

// ---------------------------------------------------------------------------
// format.js
// ---------------------------------------------------------------------------
describe('toMarkdown', () => {
  let dir;
  afterEach(() => { if (dir) { cleanupDir(dir); dir = null; } });

  test('outputs a markdown string with required sections', () => {
    dir = makeTempRepo({ 'README.md': '# Test\n', 'LICENSE': 'MIT' });
    const report = score(dir);
    const md = toMarkdown(report);
    expect(typeof md).toBe('string');
    expect(md).toMatch(/Fundscore/);
    expect(md).toMatch(/Overall Score/);
    expect(md).toMatch(/Coverage/);
    expect(md).toMatch(/Quality/);
  });
});

describe('toSummary', () => {
  let dir;
  afterEach(() => { if (dir) { cleanupDir(dir); dir = null; } });

  test('outputs a summary string', () => {
    dir = makeTempRepo({ 'README.md': '# Test\n' });
    const report = score(dir);
    const summary = toSummary(report);
    expect(typeof summary).toBe('string');
    expect(summary).toMatch(/fundscore/i);
    expect(summary).toMatch(/Overall/);
  });
});
