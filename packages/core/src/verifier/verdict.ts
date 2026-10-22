import type {
  Corroborated,
  Environment,
  Evidence,
  ReproAttempt,
  Verdict,
} from '../types';

/**
 * The only place in the codebase allowed to mint a CONFIRMED verdict.
 *
 * Corroboration rule: an attempt is CONFIRMED only when a clean-context re-run
 * tripped the same oracle on *every* attempt. Anything short of that degrades to
 * INTERMITTENT, and zero trips degrades to NOT_REPRODUCED. There is deliberately
 * no argument that lets a caller override this.
 */
export const CORROBORATION_RUNS = 3;
export const INTERMITTENT_SAMPLE_RUNS = 10;

export function corroborate(
  attempt: ReproAttempt,
  trips: boolean[],
): Extract<Verdict, { kind: 'CONFIRMED' | 'INTERMITTENT' | 'NOT_REPRODUCED' }> {
  const total = trips.length;
  const tripped = trips.filter(Boolean).length;

  if (total === 0 || tripped === 0) {
    return {
      kind: 'NOT_REPRODUCED',
      triedHypotheses: [],
      environmentsCovered: [attempt.environment],
      stepsExecuted: attempt.steps.length,
    };
  }

  if (tripped === total && total >= CORROBORATION_RUNS) {
    return {
      kind: 'CONFIRMED',
      attempt,
      runs: { total, tripped },
    } as Extract<Verdict, { kind: 'CONFIRMED' }> & Corroborated;
  }

  return {
    kind: 'INTERMITTENT',
    attempt,
    runs: { total, tripped },
    rate: tripped / total,
  };
}

/** Anomalies were seen but never triggered on demand. State that, claim nothing. */
export function needsReview(anomalies: Evidence[], note: string): Verdict {
  return { kind: 'NEEDS_REVIEW', anomalies, note };
}

/** The honest failure. This is a first-class result, not an error path. */
export function notReproduced(
  triedHypotheses: string[],
  environmentsCovered: Environment[],
  stepsExecuted: number,
): Verdict {
  return {
    kind: 'NOT_REPRODUCED',
    triedHypotheses,
    environmentsCovered,
    stepsExecuted,
  };
}
