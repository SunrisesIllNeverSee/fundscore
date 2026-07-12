'use strict';

/**
 * Heuristic quality scoring — no external LLM calls.
 * Scores are based on measurable text properties only.
 *
 * Dimensions:
 *   readability  - Flesch-Kincaid approximation (sentence/word length)
 *   specificity  - presence of numbers, dates, concrete terms
 *   consistency  - no obvious contradictions (repeated conflicting numbers)
 *   length       - neither too sparse nor padded
 *   structure    - use of headings, lists, code blocks in README
 */

/**
 * Approximate Flesch Reading Ease (0-100). Higher = easier.
 * Simplified: uses word count and sentence count only.
 * @param {string} text
 * @returns {number} 0-100
 */
function fleschReadingEase(text) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (sentences.length === 0 || words.length === 0) return 0;
  const avgWordsPerSentence = words.length / sentences.length;
  // Count syllables heuristic: vowel groups per word
  const syllables = words.reduce((sum, w) => {
    const matches = w.toLowerCase().match(/[aeiouy]+/g);
    return sum + (matches ? matches.length : 1);
  }, 0);
  const avgSyllablesPerWord = syllables / words.length;
  const score =
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  return Math.max(0, Math.min(100, score));
}

/**
 * Score readability of a text block. Returns 0-100.
 * @param {string} text
 */
function scoreReadability(text) {
  if (!text || text.trim().length < 50) return 20;
  const fre = fleschReadingEase(text);
  // Target range 40-70 (plain English business writing)
  if (fre >= 40 && fre <= 70) return 100;
  if (fre > 70) return 80; // too simple but fine
  if (fre >= 25) return 60;
  return 40; // very dense academic prose
}

/**
 * Score specificity: presence of concrete numbers, dates, metrics.
 * Returns 0-100.
 * @param {string} text
 */
function scoreSpecificity(text) {
  if (!text) return 0;
  const numberHits = (
    text.match(
      /\$[\d,.]+[kKmMbB]?|\b\d+[%x]\b|\b\d{4}\b|\b\d+\s*(users?|customers?|seats?|months?|days?)/gi,
    ) || []
  ).length;
  // Up to 5 concrete number hits → full score
  const raw = Math.min(numberHits, 5) / 5;
  return Math.round(raw * 100);
}

/**
 * Score structure: headings, lists, code blocks in README.
 * Returns 0-100.
 * @param {string} text
 */
function scoreStructure(text) {
  if (!text) return 0;
  const headings = (text.match(/^#{1,4}\s+/gm) || []).length;
  const lists = (text.match(/^[-*+]\s+|^\d+\.\s+/gm) || []).length;
  const codeBlocks = (text.match(/```/g) || []).length / 2;
  const raw =
    Math.min(4, headings) +
    Math.min(3, Math.floor(lists / 3)) +
    Math.min(3, codeBlocks);
  return Math.round(Math.min(10, raw) * 10);
}

/**
 * Score length: penalise sparse (<200 words) or padded (>3000 words) READMEs.
 * Returns 0-100.
 * @param {string} text
 */
function scoreLength(text) {
  if (!text) return 0;
  const wordCount = (text.match(/\S+/g) || []).length;
  if (wordCount < 50) return 10;
  if (wordCount < 200) return 40;
  if (wordCount <= 2000) return 100;
  if (wordCount <= 3000) return 80;
  return 60; // very long — probably padded
}

/**
 * Score consistency: check for obvious numeric contradictions.
 * Simple heuristic: extract all standalone numbers and look for
 * significantly different values alongside the same unit keyword.
 * Returns 0-100 (starts at 100, penalises contradictions found).
 * @param {string} combinedText
 */
function scoreConsistency(combinedText) {
  if (!combinedText) return 100;
  // Find all "N users" / "N customers" type claims
  const unitMatches = {};
  const pattern = /(\d[\d,]*)\s+(users?|customers?|seats?|clients?)/gi;
  let m;
  while ((m = pattern.exec(combinedText)) !== null) {
    const unit = m[2].toLowerCase().replace(/s$/, '');
    const val = parseInt(m[1].replace(/,/g, ''), 10);
    if (!unitMatches[unit]) unitMatches[unit] = [];
    unitMatches[unit].push(val);
  }
  let contradictions = 0;
  for (const [, vals] of Object.entries(unitMatches)) {
    if (vals.length > 1) {
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      // Flag if values differ by > 2x
      if (max > min * 2) contradictions++;
    }
  }
  return Math.max(0, 100 - contradictions * 30);
}

/**
 * Compute the heuristic qualityScore (0-100) and per-dimension breakdown.
 * @param {object} ctx - same context as rubric
 * @returns {{ qualityScore: number, dimensions: object }}
 */
function computeQuality(ctx) {
  const readme = ctx.readFile('README.md') || '';
  const funding = ctx.readFile('FUNDING.md') || '';
  const roadmap = ctx.readFile('ROADMAP.md') || '';
  const combined = [readme, funding, roadmap].join('\n');

  const dimensions = {
    readability: {
      score: scoreReadability(readme),
      weight: 3,
      label: 'Readability (README)',
    },
    specificity: {
      score: scoreSpecificity(combined),
      weight: 3,
      label: 'Specificity (concrete numbers/metrics)',
    },
    structure: {
      score: scoreStructure(readme),
      weight: 2,
      label: 'Document structure (headings/lists)',
    },
    length: { score: scoreLength(readme), weight: 1, label: 'README length' },
    consistency: {
      score: scoreConsistency(combined),
      weight: 1,
      label: 'Internal consistency',
    },
  };

  const totalWeight = Object.values(dimensions).reduce(
    (s, d) => s + d.weight,
    0,
  );
  const earned = Object.values(dimensions).reduce(
    (s, d) => s + d.score * d.weight,
    0,
  );
  const qualityScore = Math.round((earned / totalWeight) * 100) / 100;

  return { qualityScore, dimensions };
}

module.exports = {
  computeQuality,
  scoreReadability,
  scoreSpecificity,
  scoreStructure,
  scoreLength,
  scoreConsistency,
};
