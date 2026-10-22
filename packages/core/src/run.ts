import type { BugReport, WitnessResult } from './types';
import { notReproduced } from './verifier/verdict';

/**
 * Pipeline entry point.
 *
 * Phase 0 stub: the wiring is real, the reasoning is not. Every report returns
 * NOT_REPRODUCED, which is the correct default — Witness makes no claim until a
 * verified path exists. Baseline eval therefore scores precision 1.00 (nothing
 * false was asserted) and recall 0.00 (nothing was found), which is exactly the
 * shape the scorecard should start in.
 *
 * Phases 1-4 replace the body: executor + evidence bank, determinism harness,
 * verifier, then the hypothesis engine.
 */
export async function witness(report: BugReport): Promise<WitnessResult> {
  const startedAt = Date.now();

  const verdict = notReproduced(
    [],
    [],
    0,
  );

  return {
    reportId: report.id,
    verdict,
    startedAt,
    durationMs: Date.now() - startedAt,
    llmCostUsd: 0,
  };
}
