"use strict";

/**
 * Infer an "Investor Lens" from repo artifacts and optional overrides.
 *
 * Lens fields:
 *  - round:     'pre-seed' | 'seed' | 'series-a' | 'grant' | 'unknown'
 *  - checkSize: string (e.g. '$250k', '$1.5M', 'unknown')
 *  - teamMode:  'solo' | 'small-team' | 'operating-team' | 'unknown'
 *  - naics:     string (e.g. '511210') or 'unknown'
 */

const ROUND_PATTERNS = [
  { pattern: /\bpre[- ]seed\b/i, round: "pre-seed", checkSize: "$250k" },
  { pattern: /\bseries[- ]?a\b/i, round: "series-a", checkSize: "$5M" },
  { pattern: /\bseed\b/i, round: "seed", checkSize: "$1.5M" },
  { pattern: /\bgrant\b/i, round: "grant", checkSize: "varies" },
  { pattern: /\bsafe\b/i, round: "seed", checkSize: "$1.5M" },
];

const TEAM_PATTERNS = [
  {
    pattern: /\bsolo\s+founder\b|\bsole\s+founder\b|\bsingle\s+founder\b/i,
    teamMode: "solo",
  },
  { pattern: /\bco[- ]?founder|founding\s+team\b/i, teamMode: "small-team" },
  {
    pattern: /\boperating\s+team\b|\bfull\s+team\b|\bstaff\b/i,
    teamMode: "operating-team",
  },
];

const NAICS_PATTERN = /naics[:\s#*_]+(\d{4,6})/i;

/**
 * Scan text blobs to infer lens values.
 * @param {string[]} textBlobs - array of file contents to scan
 * @param {object} overrides - user overrides from .fundscore.yml
 * @returns {{ round: string, checkSize: string, teamMode: string, naics: string, confidence: object }}
 */
function inferLens(textBlobs, overrides = {}) {
  const combined = textBlobs.filter(Boolean).join("\n");

  // Round
  let round = "unknown";
  let checkSize = "unknown";
  for (const { pattern, round: r, checkSize: c } of ROUND_PATTERNS) {
    if (pattern.test(combined)) {
      round = r;
      checkSize = c;
      break;
    }
  }

  // Team mode
  let teamMode = "unknown";
  for (const { pattern, teamMode: t } of TEAM_PATTERNS) {
    if (pattern.test(combined)) {
      teamMode = t;
      break;
    }
  }

  // NAICS
  let naics = "unknown";
  const naicsMatch = combined.match(NAICS_PATTERN);
  if (naicsMatch) naics = naicsMatch[1];

  // Apply overrides (lens section)
  const lensOverrides = overrides.lens || {};
  return {
    round: lensOverrides.round || round,
    checkSize: lensOverrides.checkSize || checkSize,
    teamMode: lensOverrides.teamMode || teamMode,
    naics: lensOverrides.naics || naics,
    confidence: {
      round: lensOverrides.round
        ? "override"
        : round !== "unknown"
          ? "inferred"
          : "default",
      teamMode: lensOverrides.teamMode
        ? "override"
        : teamMode !== "unknown"
          ? "inferred"
          : "default",
      naics: lensOverrides.naics
        ? "override"
        : naics !== "unknown"
          ? "inferred"
          : "default",
    },
  };
}

module.exports = { inferLens };
