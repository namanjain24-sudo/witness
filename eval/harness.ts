/**
 * Accuracy scorecard.
 *
 * The integrity rule this file exists to enforce: the answer key never reaches the
 * pipeline. Reports are rebuilt field by field into a BugReport before `witness()`
 * sees them, so a stray `truth` key cannot ride along. Labels are only consulted
 * afterwards, for scoring.
 *
 * Precision is the metric that can fail the build. Recall is reported, not gated.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { witness, type BugReport, type Verdict, type VerdictKind } from '@witness/core';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CASES_PATH = join(ROOT, 'corpus/cases/cases.json');
const RESULTS_DIR = join(ROOT, 'eval/results');

type Truth = { bug: string | null; verdict: VerdictKind; class: string };
type Case = { id: string; report: string; truth: Truth };
type CasesFile = { app: { baseUrl: string }; cases: Case[] };

/** A verdict counts as a claim only when Witness asserts a bug exists. */
const isClaim = (v: Verdict) => v.kind === 'CONFIRMED' || v.kind === 'INTERMITTENT';

function gitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  } catch {
    return 'nogit';
  }
}

async function main() {
  const file = JSON.parse(readFileSync(CASES_PATH, 'utf8')) as CasesFile;
  const { cases } = file;

  const rows: {
    id: string;
    class: string;
    expected: VerdictKind;
    got: VerdictKind;
    claimed: boolean;
    correct: boolean;
    falsePositive: boolean;
    ms: number;
    cost: number;
  }[] = [];

  for (const c of cases) {
    // Deliberate field-by-field construction — `truth` cannot leak into the pipeline.
    const report: BugReport = {
      id: c.id,
      report: c.report,
      baseUrl: file.app.baseUrl,
    };

    const result = await witness(report);
    const claimed = isClaim(result.verdict);
    const isReal = c.truth.bug !== null;

    rows.push({
      id: c.id,
      class: c.truth.class,
      expected: c.truth.verdict,
      got: result.verdict.kind,
      claimed,
      correct: claimed && isReal,
      falsePositive: claimed && !isReal,
      ms: result.durationMs,
      cost: result.llmCostUsd,
    });
  }

  const claims = rows.filter((r) => r.claimed);
  const realCases = cases.filter((c) => c.truth.bug !== null).length;
  const decoys = rows.filter((r) => r.class === 'decoy');

  const precision = claims.length === 0 ? 1 : claims.filter((r) => r.correct).length / claims.length;
  const recall = rows.filter((r) => r.correct).length / realCases;
  const decoyRejection = decoys.filter((r) => !r.claimed).length / decoys.length;
  const exactVerdict = rows.filter((r) => r.got === r.expected).length / rows.length;
  const medianMs = [...rows].sort((a, b) => a.ms - b.ms)[Math.floor(rows.length / 2)]?.ms ?? 0;
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  console.log('\n  WITNESS — accuracy scorecard');
  console.log(`  ${gitSha()} · ${cases.length} cases · ${realCases} real · ${decoys.length} decoys\n`);

  console.log('  id    class          expected          got               ');
  console.log('  ───── ────────────── ───────────────── ──────────────────');
  for (const r of rows) {
    const flag = r.falsePositive ? ' ✗ FALSE POSITIVE' : r.correct ? ' ✓' : '';
    console.log(
      `  ${r.id.padEnd(5)} ${r.class.padEnd(14)} ${r.expected.padEnd(17)} ${r.got.padEnd(17)}${flag}`,
    );
  }

  console.log('\n  ── metrics ──────────────────────────────────────────────');
  console.log(`  precision        ${pct(precision).padStart(7)}   target 100%   ${precision === 1 ? '✓' : '✗ BUILD FAILS'}`);
  console.log(`  recall           ${pct(recall).padStart(7)}   target ≥68%   ${recall >= 0.68 ? '✓' : '·'}`);
  console.log(`  decoy rejection  ${pct(decoyRejection).padStart(7)}   target 100%   ${decoyRejection === 1 ? '✓' : '✗'}`);
  console.log(`  exact verdict    ${pct(exactVerdict).padStart(7)}`);
  console.log(`  median time      ${String(medianMs).padStart(6)}ms`);
  console.log(`  llm cost         ${('$' + totalCost.toFixed(3)).padStart(7)}   for ${cases.length} reports\n`);

  mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = join(RESULTS_DIR, `${stamp}-${gitSha()}.json`);
  writeFileSync(
    out,
    JSON.stringify(
      { sha: gitSha(), at: new Date().toISOString(), metrics: { precision, recall, decoyRejection, exactVerdict, medianMs, totalCost }, rows },
      null,
      2,
    ),
  );
  console.log(`  scorecard → ${out.replace(ROOT, '')}\n`);

  // Precision is the one metric that gates the build. A single false positive is a P0.
  if (precision < 1 || decoyRejection < 1) {
    console.error('  Doctrine violated: Witness asserted something it had not verified.\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
