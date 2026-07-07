'use strict';

/**
 * fundscore MCP server — exposes the scoring engine as MCP tools
 * for AI agents (Claude Code, Cursor, Windsurf, etc.).
 *
 * Three tools:
 *   score_repo    — score a repo, return agent-optimized report
 *   get_fix_plan  — get scaffold plan for missing docs
 *   apply_fixes   — create template files for missing docs (dryRun supported)
 *
 * The score_repo tool auto-saves a snapshot to .fundscore-history/
 * on every call (configurable via .fundscore.yml: history.autoSave).
 * This passively builds the score trajectory — the moat.
 */

const path = require('path');
const fs = require('fs');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} = require('@modelcontextprotocol/sdk/types.js');

const { score } = require('../core/index');
const { getFixPlan, TEMPLATES } = require('../core/templates');

// --- Tool definitions ---

const TOOLS = [
  {
    name: 'score_repo',
    description: [
      'Score a GitHub repository for investor readiness (0-100 scale).',
      'Returns three dimension scores (artifacts, business viability, quality),',
      'a round-specific gap analysis, top fixes with score deltas, and missing checks.',
      'The score is a snapshot of repo-readiness signals, not a business valuation.',
      'Auto-saves a snapshot to .fundscore-history/ to build score trajectory over time.',
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        repoPath: {
          type: 'string',
          description: 'Absolute or relative path to the repository root. Defaults to current working directory.',
        },
      },
    },
  },
  {
    name: 'get_fix_plan',
    description: [
      'Get a scaffold plan for missing investor-readiness docs.',
      'Returns the list of template files that would be created (FUNDING.md, ROADMAP.md, RISKS.md, etc.),',
      'which checks each file would fix, and the score delta for each fix.',
      'Read-only — does not write any files.',
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        repoPath: {
          type: 'string',
          description: 'Absolute or relative path to the repository root. Defaults to current working directory.',
        },
      },
    },
  },
  {
    name: 'apply_fixes',
    description: [
      'Create template files for missing investor-readiness docs.',
      'Generates scaffold templates (FUNDING.md, ROADMAP.md, RISKS.md, SECURITY.md, etc.)',
      'that the founder can fill in. Use dryRun=true to preview without writing.',
      'Does not overwrite existing files unless force=true.',
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        repoPath: {
          type: 'string',
          description: 'Absolute or relative path to the repository root. Defaults to current working directory.',
        },
        dryRun: {
          type: 'boolean',
          description: 'If true, return what would be created without writing any files. Default: true.',
          default: true,
        },
        force: {
          type: 'boolean',
          description: 'If true, overwrite existing files. Default: false.',
          default: false,
        },
      },
    },
  },
];

// --- Helpers ---

function resolveRepoPath(repoPath) {
  return path.resolve(repoPath || process.cwd());
}

/**
 * Auto-save a score snapshot to .fundscore-history/.
 * Configurable via .fundscore.yml: history.autoSave (default: true).
 */
function autoSaveSnapshot(repoRoot, report) {
  try {
    const { loadOverrides } = require('../core/loader');
    const overrides = loadOverrides(repoRoot);
    const autoSave = overrides?.history?.autoSave !== false; // default true
    if (!autoSave) return false;

    const historyDir = path.join(repoRoot, '.fundscore-history');
    fs.mkdirSync(historyDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const historyFile = path.join(historyDir, `fundscore-${ts}.json`);
    fs.writeFileSync(historyFile, JSON.stringify(report, null, 2));
    return true;
  } catch {
    return false;
  }
}

/**
 * Build an agent-optimized report from the full score() output.
 * Structured for agents to weave into natural language.
 */
function buildAgentReport(report) {
  const { scores, lens, lensReport, coverage, business, quality, fixDeltas, status, thresholds } = report;

  const missingChecks = [...coverage.checks, ...business.checks]
    .filter((c) => !c.pass)
    .map((c) => ({
      id: c.id,
      label: c.label,
      dimension: coverage.checks.includes(c) ? 'artifacts' : 'business',
      reason: c.reason,
    }));

  const roundMissing = lensReport ? {
    required: lensReport.missing.filter((m) => m.category === 'required').map((m) => m.id),
    expected: lensReport.missing.filter((m) => m.category === 'expected').map((m) => m.id),
    bonus: lensReport.missing.filter((m) => m.category === 'bonus').map((m) => m.id),
  } : null;

  return {
    overallScore: scores.overallScore,
    status,
    scale: '0-100',
    thresholds,
    asterisk: 'Snapshot of repo-readiness signals, not a business valuation. The score reflects what your repo communicates, not what your business is.',
    dimensions: {
      artifacts: {
        score: scores.artifactsScore,
        passed: coverage.checks.filter((c) => c.pass).length,
        total: coverage.checks.length,
      },
      business: {
        score: scores.businessScore,
        passed: business.checks.filter((c) => c.pass).length,
        total: business.checks.length,
      },
      quality: {
        score: scores.qualityScore,
      },
    },
    round: lensReport ? {
      inferred: lens.round,
      label: lensReport.round,
      checkSize: lensReport.checkSize,
      roundScore: lensReport.roundScore,
      description: lensReport.description,
      missingRequired: roundMissing.required,
      missingExpected: roundMissing.expected,
      missingBonus: roundMissing.bonus,
    } : null,
    lens: {
      round: lens.round,
      checkSize: lens.checkSize,
      teamMode: lens.teamMode,
      naics: lens.naics,
    },
    topFixes: (fixDeltas || []).slice(0, 10).map((f) => ({
      label: f.label,
      delta: f.delta,
      reason: f.reason,
    })),
    missingChecks,
    snapshotSaved: false, // updated by caller
  };
}

// --- Tool handlers ---

function handleScoreRepo(args) {
  const repoRoot = resolveRepoPath(args?.repoPath);
  const report = score(repoRoot);
  const snapshotSaved = autoSaveSnapshot(repoRoot, report);
  const agentReport = buildAgentReport(report);
  agentReport.snapshotSaved = snapshotSaved;
  return agentReport;
}

function handleGetFixPlan(args) {
  const repoRoot = resolveRepoPath(args?.repoPath);
  const report = score(repoRoot);
  const allChecks = [...report.coverage.checks, ...report.business.checks];
  const missing = allChecks.filter((c) => !c.pass);
  const fixPlan = getFixPlan(missing);

  return {
    repoPath: repoRoot,
    currentScore: report.scores.overallScore,
    files: fixPlan.map((item) => ({
      file: item.file,
      fixes: item.checks,
      // Include the score deltas for the checks this file fixes
      scoreDeltas: item.checks.map((id) => {
        const fd = report.fixDeltas.find((f) => f.id === id);
        return fd ? { id, delta: fd.delta, label: fd.label } : { id, delta: 0, label: '' };
      }),
    })),
    totalPotentialGain: fixPlan.reduce((sum, item) => {
      return sum + item.checks.reduce((s, id) => {
        const fd = report.fixDeltas.find((f) => f.id === id);
        return s + (fd?.delta || 0);
      }, 0);
    }, 0),
    note: 'Read-only. Use apply_fixes to create the files.',
  };
}

function handleApplyFixes(args) {
  const repoRoot = resolveRepoPath(args?.repoPath);
  const dryRun = args?.dryRun !== false; // default: true
  const force = args?.force === true;

  const report = score(repoRoot);
  const allChecks = [...report.coverage.checks, ...report.business.checks];
  const missing = allChecks.filter((c) => !c.pass);
  const fixPlan = getFixPlan(missing);

  if (fixPlan.length === 0) {
    return {
      repoPath: repoRoot,
      dryRun,
      message: 'Nothing to scaffold. All templateable checks are passing.',
      files: [],
    };
  }

  if (dryRun) {
    return {
      repoPath: repoRoot,
      dryRun: true,
      message: 'Dry run — no files written. Set dryRun=false to create the files.',
      files: fixPlan.map((item) => ({
        file: item.file,
        fixes: item.checks,
        preview: item.template(repoRoot).split('\n').slice(0, 10).join('\n') + '\n...',
      })),
    };
  }

  // Write files
  const results = [];
  let written = 0;
  let skipped = 0;

  for (const item of fixPlan) {
    const fullPath = path.join(repoRoot, item.file);
    if (fs.existsSync(fullPath) && !force) {
      results.push({ file: item.file, status: 'skipped', reason: 'already exists (use force=true to overwrite)' });
      skipped++;
      continue;
    }
    const content = item.template(repoRoot);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    results.push({ file: item.file, status: 'created', fixes: item.checks });
    written++;
  }

  // Re-score to show the new score
  const newReport = score(repoRoot);
  const scoreDelta = newReport.scores.overallScore - report.scores.overallScore;

  return {
    repoPath: repoRoot,
    dryRun: false,
    written,
    skipped,
    files: results,
    previousScore: report.scores.overallScore,
    newScore: newReport.scores.overallScore,
    scoreDelta: Math.round(scoreDelta * 100) / 100,
    message: `Created ${written} file(s), skipped ${skipped}. Score ${report.scores.overallScore} → ${newReport.scores.overallScore} (${scoreDelta >= 0 ? '+' : ''}${scoreDelta.toFixed(2)} pts). Edit the templates and re-run score_repo to see the full impact.`,
  };
}

// --- Tool dispatcher ---

function callTool(name, args) {
  switch (name) {
    case 'score_repo': return handleScoreRepo(args);
    case 'get_fix_plan': return handleGetFixPlan(args);
    case 'apply_fixes': return handleApplyFixes(args);
    default: throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${name}`);
  }
}

// --- Server startup ---

function serverVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function startMcpServer() {
  const server = new Server(
    { name: 'fundscore', version: serverVersion() },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const toolName = req.params.name;
    if (!TOOLS.some((t) => t.name === toolName)) {
      throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${toolName}`);
    }
    try {
      const out = await callTool(toolName, req.params.arguments);
      return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  });

  await server.connect(new StdioServerTransport());
}

module.exports = { startMcpServer, TOOLS, callTool, buildAgentReport };
