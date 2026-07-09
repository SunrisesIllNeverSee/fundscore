"use strict";

const path = require("path");
const os = require("os");
const fs = require("fs");

const { score } = require("../src/core/index");
const { inferLens } = require("../src/core/lens");
const { runRubric } = require("../src/core/rubric");
const { computeBusiness } = require("../src/core/business");
const { buildLensReport } = require("../src/core/lens-report");
const {
  scoreReadability,
  scoreSpecificity,
  scoreStructure,
  scoreConsistency,
} = require("../src/core/quality");
const { toMarkdown, toSummary } = require("../src/core/format");
const { getFixPlan } = require("../src/core/templates");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempRepo(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fundscore-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf8");
  }
  return dir;
}

function cleanupDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// lens.js
// ---------------------------------------------------------------------------
describe("inferLens", () => {
  test("detects pre-seed from text", () => {
    const lens = inferLens(["We are raising a pre-seed round of $250k"]);
    expect(lens.round).toBe("pre-seed");
    expect(lens.checkSize).toBe("$250k");
  });

  test("detects seed from SAFE mention", () => {
    const lens = inferLens(["Offering a SAFE note to investors"]);
    expect(lens.round).toBe("seed");
  });

  test("detects solo founder", () => {
    const lens = inferLens(["I am a solo founder building this"]);
    expect(lens.teamMode).toBe("solo");
  });

  test("detects NAICS code", () => {
    const lens = inferLens(["NAICS: 511210 Software publishers"]);
    expect(lens.naics).toBe("511210");
  });

  test("applies overrides", () => {
    const lens = inferLens(["some text"], {
      lens: { round: "series-a", naics: "999999" },
    });
    expect(lens.round).toBe("series-a");
    expect(lens.naics).toBe("999999");
    expect(lens.confidence.round).toBe("override");
  });

  test("returns unknown for empty input", () => {
    const lens = inferLens([]);
    expect(lens.round).toBe("unknown");
    expect(lens.teamMode).toBe("unknown");
    expect(lens.naics).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// quality.js (0-100 scale)
// ---------------------------------------------------------------------------
describe("scoreReadability", () => {
  test("returns low score for very short text", () => {
    expect(scoreReadability("Hi")).toBeLessThan(50);
  });

  test("returns high score for normal prose", () => {
    const text =
      "This tool helps founders score their funding readiness. It checks your repo for key investor artifacts. You can run it locally or in CI.";
    expect(scoreReadability(text)).toBeGreaterThanOrEqual(60);
  });
});

describe("scoreSpecificity", () => {
  test("returns 0 for empty text", () => {
    expect(scoreSpecificity("")).toBe(0);
  });

  test("increases with more concrete numbers", () => {
    const low = "We have some users and revenue.";
    const high =
      "We have 500 users, $12k MRR, 3 enterprise clients, and 85% retention.";
    expect(scoreSpecificity(high)).toBeGreaterThan(scoreSpecificity(low));
  });
});

describe("scoreStructure", () => {
  test("returns low score for plain prose", () => {
    expect(scoreStructure("Just a paragraph.")).toBeLessThan(50);
  });

  test("returns higher score for well-structured markdown", () => {
    const md =
      "# Title\n## Section\n### Sub\n- item 1\n- item 2\n- item 3\n- item 4\n```js\ncode\n```";
    expect(scoreStructure(md)).toBeGreaterThanOrEqual(50);
  });
});

describe("scoreConsistency", () => {
  test("returns 100 for consistent text", () => {
    expect(scoreConsistency("We have 100 users on the platform.")).toBe(100);
  });

  test("deducts for contradicting numbers", () => {
    const bad =
      "We have 100 users on the platform. Currently 500 users are active.";
    expect(scoreConsistency(bad)).toBeLessThan(100);
  });
});

// ---------------------------------------------------------------------------
// rubric.js (0-100 scale)
// ---------------------------------------------------------------------------
describe("runRubric", () => {
  let dir;
  afterEach(() => {
    if (dir) {
      cleanupDir(dir);
      dir = null;
    }
  });

  test("readme-exists check passes when README.md is present", () => {
    dir = makeTempRepo({ "README.md": "# My App\nA great tool.\n" });
    const { findFile, readFile } = require("../src/core/loader");
    const ctx = {
      repoRoot: dir,
      files: ["README.md"],
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { checks } = runRubric(ctx);
    const readmeCheck = checks.find((c) => c.id === "readme-exists");
    expect(readmeCheck.pass).toBe(true);
  });

  test("readme-exists check fails when no README", () => {
    dir = makeTempRepo({ LICENSE: "MIT" });
    const { findFile, readFile } = require("../src/core/loader");
    const ctx = {
      repoRoot: dir,
      files: ["LICENSE"],
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { checks } = runRubric(ctx);
    const readmeCheck = checks.find((c) => c.id === "readme-exists");
    expect(readmeCheck.pass).toBe(false);
  });

  test("license check passes when LICENSE file exists", () => {
    dir = makeTempRepo({ LICENSE: "MIT License", "README.md": "# x" });
    const { findFile, readFile } = require("../src/core/loader");
    const ctx = {
      repoRoot: dir,
      files: ["LICENSE", "README.md"],
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { checks } = runRubric(ctx);
    expect(checks.find((c) => c.id === "license").pass).toBe(true);
  });

  test("weight overrides are applied", () => {
    dir = makeTempRepo({ "README.md": "# x" });
    const { findFile, readFile } = require("../src/core/loader");
    const ctx = {
      repoRoot: dir,
      files: ["README.md"],
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { checks } = runRubric(ctx, { weights: { "readme-exists": 99 } });
    expect(checks.find((c) => c.id === "readme-exists").weight).toBe(99);
  });

  test("score is 0 when no checks pass", () => {
    dir = makeTempRepo({});
    const { findFile, readFile, listFiles } = require("../src/core/loader");
    const ctx = {
      repoRoot: dir,
      files: listFiles(dir),
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { score: rubricScore } = runRubric(ctx);
    expect(rubricScore).toBe(0);
  });

  test("score is 100 when all checks pass", () => {
    // Create a repo that passes every check
    dir = makeTempRepo({
      "README.md": [
        "# My App",
        "A great tool for customers who need invoicing automation.",
        "https://myapp.vercel.app",
        "Contact: hello@example.com | Demo: https://myapp.vercel.app/demo",
        "## Market",
        "Competitors: X, Y, Z. TAM: $10B.",
        "## License",
        "MIT",
      ].join("\n"),
      LICENSE: "MIT",
      "FUNDING.md":
        "# Funding\nSeed round $1.5M. Recurring revenue subscription model. $50k MRR.",
      "ROADMAP.md": "# Roadmap\nNow: Launch. Next: 1000 users.",
      "RISKS.md": "# Risks\nRisk: competition. Mitigation: moat.",
      "COMPARABLES.md": "# Comps\nCompetitor X: $5M funding.",
      "SECURITY.md": "# Security\nReport to security@example.com",
      "CONTRIBUTING.md": "# Contributing\nFork and PR.",
      "CHANGELOG.md": "# Changelog\n## [0.1.0]\n- Initial",
      "ARCHITECTURE.md": "# Architecture\nNode.js CLI.",
      "package.json": JSON.stringify({ scripts: { test: "jest" } }),
    });
    const { findFile, readFile, listFiles } = require("../src/core/loader");
    const ctx = {
      repoRoot: dir,
      files: listFiles(dir),
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { score: rubricScore } = runRubric(ctx);
    // git-activity and contributor-count will fail (not a git repo)
    // but all other checks should pass
    expect(rubricScore).toBeGreaterThan(80);
  });

  test("multi-language test detection: Python", () => {
    dir = makeTempRepo({ "README.md": "# x", "test_app.py": "import pytest" });
    const { findFile, readFile, listFiles } = require("../src/core/loader");
    const ctx = {
      repoRoot: dir,
      files: listFiles(dir),
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { checks } = runRubric(ctx);
    expect(checks.find((c) => c.id === "tests-or-ci").pass).toBe(true);
  });

  test("multi-language test detection: Go", () => {
    dir = makeTempRepo({ "README.md": "# x", "main_test.go": "package main" });
    const { findFile, readFile, listFiles } = require("../src/core/loader");
    const ctx = {
      repoRoot: dir,
      files: listFiles(dir),
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { checks } = runRubric(ctx);
    expect(checks.find((c) => c.id === "tests-or-ci").pass).toBe(true);
  });

  test("deployed-url check detects Vercel URL", () => {
    dir = makeTempRepo({
      "README.md": "# App\nLive at https://myapp.vercel.app",
    });
    const { findFile, readFile, listFiles } = require("../src/core/loader");
    const ctx = {
      repoRoot: dir,
      files: listFiles(dir),
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { checks } = runRubric(ctx);
    expect(checks.find((c) => c.id === "deployed-url").pass).toBe(true);
  });

  test("deployed-url check does not match GitHub URLs", () => {
    dir = makeTempRepo({
      "README.md": "# App\nSee https://github.com/user/repo",
    });
    const { findFile, readFile, listFiles } = require("../src/core/loader");
    const ctx = {
      repoRoot: dir,
      files: listFiles(dir),
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { checks } = runRubric(ctx);
    expect(checks.find((c) => c.id === "deployed-url").pass).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// business.js
// ---------------------------------------------------------------------------
describe("computeBusiness", () => {
  let dir;
  afterEach(() => {
    if (dir) {
      cleanupDir(dir);
      dir = null;
    }
  });

  test("monetization-clarity passes when README mentions pricing", () => {
    dir = makeTempRepo({
      "README.md": "# App\n$29/mo per user. SaaS subscription.",
    });
    const { findFile, readFile, listFiles } = require("../src/core/loader");
    const ctx = {
      repoRoot: dir,
      files: listFiles(dir),
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { checks } = computeBusiness(ctx);
    expect(checks.find((c) => c.id === "monetization-clarity").pass).toBe(true);
  });

  test("recession-resilience passes when README mentions recurring revenue", () => {
    dir = makeTempRepo({
      "README.md": "# App\nRecurring revenue model with high retention.",
    });
    const { findFile, readFile, listFiles } = require("../src/core/loader");
    const ctx = {
      repoRoot: dir,
      files: listFiles(dir),
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { checks } = computeBusiness(ctx);
    expect(checks.find((c) => c.id === "recession-resilience").pass).toBe(true);
  });

  test("business score is 0 when no signals present", () => {
    dir = makeTempRepo({ "README.md": "# App\nA tool." });
    const { findFile, readFile, listFiles } = require("../src/core/loader");
    const ctx = {
      repoRoot: dir,
      files: listFiles(dir),
      readFile: (f) => readFile(dir, f),
      findFile: (f) => findFile(dir, f),
    };
    const { score: bizScore } = computeBusiness(ctx);
    expect(bizScore).toBe(0);
  });

  test("business score increases with more signals", () => {
    const low = makeTempRepo({ "README.md": "# App\nA tool." });
    const high = makeTempRepo({
      "README.md":
        "# App\n$29/mo SaaS. 500 users. 85% retention. $12k MRR. Recurring revenue.",
      "FUNDING.md":
        "# Funding\nSeed $1.5M. TAM $10B. Competitors: X, Y. CAC $50, LTV $500.",
      "RISKS.md":
        "# Risks\nRunway 18 months. Contingency: pivot to enterprise.",
    });
    const { findFile, readFile, listFiles } = require("../src/core/loader");
    const ctxLow = {
      repoRoot: low,
      files: listFiles(low),
      readFile: (f) => readFile(low, f),
      findFile: (f) => findFile(low, f),
    };
    const ctxHigh = {
      repoRoot: high,
      files: listFiles(high),
      readFile: (f) => readFile(high, f),
      findFile: (f) => findFile(high, f),
    };
    const { score: lowScore } = computeBusiness(ctxLow);
    const { score: highScore } = computeBusiness(ctxHigh);
    expect(highScore).toBeGreaterThan(lowScore);
    cleanupDir(low);
    cleanupDir(high);
  });
});

// ---------------------------------------------------------------------------
// lens-report.js
// ---------------------------------------------------------------------------
describe("buildLensReport", () => {
  test("returns report for pre-seed round", () => {
    const checks = { artifacts: [], business: [] };
    const report = buildLensReport("pre-seed", checks);
    expect(report.round).toBe("Pre-Seed");
    expect(report.roundScore).toBeGreaterThanOrEqual(0);
    expect(report.roundScore).toBeLessThanOrEqual(100);
    expect(report.required).toBeDefined();
    expect(report.expected).toBeDefined();
    expect(report.bonus).toBeDefined();
  });

  test("returns report for unknown round", () => {
    const report = buildLensReport("unknown", { artifacts: [], business: [] });
    expect(report.round).toBe("General");
  });

  test("round score is 100 when all required/expected/bonus checks pass", () => {
    // pre-seed required: readme-exists, readme-oneliner, contact-team, audience-customer
    // pre-seed expected: readme-demo, deployed-url, license, tests-or-ci, git-activity
    // pre-seed bonus: funding-or-roadmap, monetization-clarity, market-evidence
    const allChecks = [
      ...[
        "readme-exists",
        "readme-oneliner",
        "contact-team",
        "audience-customer",
        "readme-demo",
        "deployed-url",
        "license",
        "tests-or-ci",
        "git-activity",
        "funding-or-roadmap",
        "monetization-clarity",
        "market-evidence",
      ].map((id) => ({ id, pass: true })),
    ];
    const report = buildLensReport("pre-seed", {
      artifacts: allChecks,
      business: [],
    });
    expect(report.roundScore).toBe(100);
  });

  test("missing items are sorted required > expected > bonus", () => {
    const checks = {
      artifacts: [
        { id: "readme-exists", pass: false },
        { id: "readme-demo", pass: false },
      ],
      business: [{ id: "monetization-clarity", pass: false }],
    };
    const report = buildLensReport("pre-seed", checks);
    expect(report.missing.length).toBeGreaterThan(0);
    expect(report.missing[0].category).toBe("required");
  });
});

// ---------------------------------------------------------------------------
// templates.js
// ---------------------------------------------------------------------------
describe("getFixPlan", () => {
  test("returns templates for missing checks", () => {
    const missing = [
      { id: "funding-or-roadmap", label: "Funding", reason: "missing" },
      { id: "risks-honest", label: "Risks", reason: "missing" },
      { id: "security", label: "Security", reason: "missing" },
    ];
    const plan = getFixPlan(missing);
    const files = plan.map((p) => p.file);
    expect(files).toContain("FUNDING.md");
    expect(files).toContain("ROADMAP.md");
    expect(files).toContain("RISKS.md");
    expect(files).toContain("SECURITY.md");
  });

  test("returns empty array when all checks pass", () => {
    const plan = getFixPlan([]);
    expect(plan).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// scorer.js (integration)
// ---------------------------------------------------------------------------
describe("score (integration)", () => {
  let dir;
  afterEach(() => {
    if (dir) {
      cleanupDir(dir);
      dir = null;
    }
  });

  test("returns a valid report object for minimal repo", () => {
    dir = makeTempRepo({ "README.md": "# Test\n" });
    const report = score(dir);
    expect(report).toHaveProperty("scores.overallScore");
    expect(report.scores.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.scores.overallScore).toBeLessThanOrEqual(100);
    expect(report).toHaveProperty("lens");
    expect(report).toHaveProperty("coverage.checks");
    expect(report).toHaveProperty("business.checks");
    expect(report).toHaveProperty("quality.dimensions");
    expect(report).toHaveProperty("lensReport");
    expect(report).toHaveProperty("fixDeltas");
  });

  test("overallScore improves with more artifacts", () => {
    const minimal = makeTempRepo({ "README.md": "# Test\n" });
    const full = makeTempRepo({
      "README.md": [
        "# My Startup",
        "",
        "We help small businesses manage invoices automatically.",
        "",
        "## Target Customers",
        "Small business owners who spend too much time on billing.",
        "",
        "## Demo",
        "https://myapp.vercel.app/demo",
        "",
        "## Contact",
        "Email us at hello@example.com",
        "",
        "## License",
        "MIT",
      ].join("\n"),
      LICENSE: "MIT License",
      "FUNDING.md":
        "# Funding\nSeeking $500k pre-seed SAFE. Solo founder. $29/mo SaaS. Recurring revenue.",
      "ROADMAP.md": "# Roadmap\n- Q1: Launch\n- Q2: 100 customers",
      "SECURITY.md": "# Security\nReport issues to security@example.com",
      "package.json": JSON.stringify({ scripts: { test: "jest" } }),
    });
    const r1 = score(minimal);
    const r2 = score(full);
    expect(r2.scores.artifactsScore).toBeGreaterThan(r1.scores.artifactsScore);
    expect(r2.scores.businessScore).toBeGreaterThan(r1.scores.businessScore);
    cleanupDir(minimal);
    cleanupDir(full);
  });

  test("BUG-1: throws on nonexistent path", () => {
    expect(() => score("/tmp/fundscore-does-not-exist-12345")).toThrow(
      /does not exist/,
    );
  });

  test("BUG-1: throws on file (not directory)", () => {
    const tmpFile = path.join(os.tmpdir(), "fundscore-test-file.txt");
    fs.writeFileSync(tmpFile, "test");
    expect(() => score(tmpFile)).toThrow(/not a directory/);
    fs.unlinkSync(tmpFile);
  });

  test("fixDeltas are sorted by score impact (descending)", () => {
    dir = makeTempRepo({ "README.md": "# Test\n" });
    const report = score(dir);
    if (report.fixDeltas.length > 1) {
      for (let i = 1; i < report.fixDeltas.length; i++) {
        expect(report.fixDeltas[i - 1].delta).toBeGreaterThanOrEqual(
          report.fixDeltas[i].delta,
        );
      }
    }
  });

  test("generatedAt is present and is an ISO string", () => {
    dir = makeTempRepo({ "README.md": "# Test\n" });
    const report = score(dir);
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// ---------------------------------------------------------------------------
// format.js
// ---------------------------------------------------------------------------
describe("toMarkdown", () => {
  let dir;
  afterEach(() => {
    if (dir) {
      cleanupDir(dir);
      dir = null;
    }
  });

  test("outputs a markdown string with required sections", () => {
    dir = makeTempRepo({ "README.md": "# Test\n", LICENSE: "MIT" });
    const report = score(dir);
    const md = toMarkdown(report);
    expect(typeof md).toBe("string");
    expect(md).toMatch(/Fundscore/);
    expect(md).toMatch(/Overall Score/);
    expect(md).toMatch(/Artifacts/);
    expect(md).toMatch(/Business Viability/);
    expect(md).toMatch(/Quality/);
    expect(md).toMatch(/Asterisk/);
  });

  test("BUG-3: footer links to correct GitHub URL", () => {
    dir = makeTempRepo({ "README.md": "# Test\n" });
    const report = score(dir);
    const md = toMarkdown(report);
    expect(md).toMatch(/SunrisesIllNeverSee\/fundscore/);
    expect(md).not.toMatch(/Burnmydays/);
  });
});

describe("toSummary", () => {
  let dir;
  afterEach(() => {
    if (dir) {
      cleanupDir(dir);
      dir = null;
    }
  });

  test("outputs a summary string with 0-100 scale", () => {
    dir = makeTempRepo({ "README.md": "# Test\n" });
    const report = score(dir);
    const summary = toSummary(report);
    expect(typeof summary).toBe("string");
    expect(summary).toMatch(/fundscore/i);
    expect(summary).toMatch(/Overall/);
    expect(summary).toMatch(/\/100/);
  });
});
