#!/usr/bin/env node
/**
 * Doctrine guard — enforces the accuracy rules in code, not just in docs.
 *
 * Rule 1: The Evidence Bank (oracles) must never touch an LLM. Truth is decided by
 *         deterministic checks only. If an oracle can hallucinate, the whole
 *         100%-precision claim collapses.
 * Rule 2: The `CONFIRMED` verdict may only be constructed inside the verifier.
 *         Any other module that emits it is bypassing corroboration.
 *
 * Run: npm run lint:doctrine   (also wired into CI)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const RULES = [
  {
    id: 'oracles-are-llm-free',
    dir: 'packages/core/src/oracles',
    pattern: /\b(anthropic|openai|@ai-sdk|langchain|\bllm\b|generateText|createMessage)/i,
    message:
      'Evidence Bank must stay deterministic — no LLM imports or calls inside oracles/.',
  },
  {
    id: 'confirmed-only-from-verifier',
    dir: 'packages/core/src',
    exclude: ['verifier', 'report'],
    pattern: /verdict\s*:\s*['"`]CONFIRMED['"`]|makeConfirmed\s*\(/,
    message:
      "Only the verifier may construct a CONFIRMED verdict — it is the only module that runs corroboration.",
  },
];

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  let out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

let violations = 0;
let scanned = 0;

for (const rule of RULES) {
  const base = join(ROOT, rule.dir);
  const files = walk(base);

  // A guard that silently scans nothing is worse than no guard at all: it reports
  // "intact" forever while the rule it claims to enforce goes unchecked.
  if (files.length === 0) {
    console.error(`\n✗ [${rule.id}] scanned 0 files under ${rule.dir}`);
    console.error('  → The guard is not actually running. Fix the path before trusting it.');
    violations++;
    continue;
  }

  for (const file of files) {
    scanned++;
    const rel = relative(ROOT, file);
    if (rule.exclude?.some((seg) => rel.includes(`/${seg}/`))) continue;
    if (rel.includes('.test.')) continue;

    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;
      if (rule.pattern.test(line)) {
        violations++;
        console.error(`\n✗ [${rule.id}] ${rel}:${i + 1}`);
        console.error(`  ${line.trim()}`);
        console.error(`  → ${rule.message}`);
      }
    });
  }
}

if (violations > 0) {
  console.error(`\n${violations} doctrine violation(s). Accuracy rules are not negotiable.\n`);
  process.exit(1);
}

console.log(
  `✓ Doctrine intact across ${scanned} file(s) — oracles are deterministic, CONFIRMED is verifier-only.`,
);
