import type { Evidence, OracleId } from '../types';

/**
 * The Evidence Bank.
 *
 * Every entry is a pure, deterministic function over artifacts captured from a
 * single run. Same artifacts in, same evidence out, every time. No model call, no
 * heuristic scoring, no "confidence" — an oracle either observed something or it
 * did not. This is the only thing in Witness permitted to decide what is true,
 * and `npm run lint:doctrine` fails the build if an LLM ever appears in here.
 *
 * Implementations land in Phase 1; the registry shape is fixed now so the
 * executor and verifier can be built against it.
 */

/** Everything a single run produced, as raw observation. */
export type RunArtifacts = {
  consoleMessages: { type: string; text: string; timestamp: number }[];
  pageErrors: { message: string; stack?: string; timestamp: number }[];
  requests: {
    url: string;
    method: string;
    status?: number;
    failed: boolean;
    timestamp: number;
  }[];
  /** Assertions the hypothesis proposed, evaluated in-page against real DOM state. */
  assertions: { description: string; passed: boolean; atStep: number }[];
  axeViolations: { id: string; impact: string; nodes: string[] }[];
  domSnapshots: { atStep: number; html: string }[];
  stepCount: number;
};

export type Oracle = {
  id: OracleId;
  /** One line explaining exactly what observation trips this oracle. */
  describes: string;
  check(artifacts: RunArtifacts): Evidence[];
};

const registry = new Map<OracleId, Oracle>();

export function register(oracle: Oracle): void {
  if (registry.has(oracle.id)) {
    throw new Error(`Oracle "${oracle.id}" registered twice`);
  }
  registry.set(oracle.id, oracle);
}

export function allOracles(): Oracle[] {
  return [...registry.values()];
}

/** Run the full bank. Order is irrelevant — oracles never depend on each other. */
export function collectEvidence(artifacts: RunArtifacts): Evidence[] {
  return allOracles().flatMap((oracle) => oracle.check(artifacts));
}
