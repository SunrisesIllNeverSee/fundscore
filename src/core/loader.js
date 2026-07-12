'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Read a file from the workspace root. Returns null if not found.
 * @param {string} repoRoot - absolute path to repo
 * @param {string} filePath - relative path within repo
 * @returns {string|null}
 */
function readFile(repoRoot, filePath) {
  const full = path.resolve(repoRoot, filePath);
  try {
    return fs.readFileSync(full, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Check if a file exists (case-insensitive match within a directory level).
 * Returns the actual matched path (relative) or null.
 * @param {string} repoRoot
 * @param {string} filePath - relative path with filename to find
 * @returns {string|null}
 */
function findFile(repoRoot, filePath) {
  const dir = path.resolve(repoRoot, path.dirname(filePath));
  const target = path.basename(filePath).toLowerCase();
  try {
    const entries = fs.readdirSync(dir);
    const match = entries.find((e) => e.toLowerCase() === target);
    if (match) return path.join(path.dirname(filePath), match);
    return null;
  } catch {
    return null;
  }
}

/**
 * Recursively list all files in a directory, up to maxDepth.
 * Returns relative paths.
 * @param {string} repoRoot
 * @param {number} maxDepth
 * @returns {string[]}
 */
function listFiles(repoRoot, maxDepth = 4) {
  const results = [];
  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.fundscore.yml')
        continue;
      const rel = path.relative(repoRoot, path.join(dir, entry.name));
      if (entry.isDirectory()) {
        const skip = [
          'node_modules',
          'dist',
          'build',
          '.git',
          'coverage',
          '.nyc_output',
        ];
        if (skip.includes(entry.name)) continue;
        walk(path.join(dir, entry.name), depth + 1);
      } else {
        results.push(rel);
      }
    }
  }
  walk(repoRoot, 0);
  return results;
}

/**
 * Load the optional .fundscore.yml override file.
 * Returns a plain object or {} if not present/parseable.
 * @param {string} repoRoot
 * @returns {object}
 */
function loadOverrides(repoRoot) {
  const yaml = require('js-yaml');
  const raw = readFile(repoRoot, '.fundscore.yml');
  if (!raw) return {};
  try {
    return yaml.load(raw) || {};
  } catch {
    return {};
  }
}

module.exports = { readFile, findFile, listFiles, loadOverrides };
