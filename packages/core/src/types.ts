/** Core contracts. Everything downstream depends on these and nothing else. */

export type VerdictKind =
  | 'CONFIRMED'
  | 'INTERMITTENT'
  | 'NEEDS_REVIEW'
  | 'NOT_REPRODUCED';

/** Names of the deterministic checks in the Evidence Bank. No LLM ever appears here. */
export type OracleId =
  | 'uncaughtException'
  | 'unhandledRejection'
  | 'httpError'
  | 'consoleError'
  | 'navigationTimeout'
  | 'infiniteLoading'
  | 'axeViolation'
  | 'layoutOverflow'
  | 'elementNotInteractable'
  | 'noOpInteraction'
  | 'userAssertion';

export type Evidence = {
  oracle: OracleId;
  /** Human-readable statement of what was observed — never what was inferred. */
  observed: string;
  atStep: number;
  timestamp: number;
  selector?: string;
  stack?: string;
  requestUrl?: string;
  statusCode?: number;
};

export type Step = {
  action: 'goto' | 'click' | 'fill' | 'press' | 'wait' | 'setViewport' | 'assert';
  target?: string;
  value?: string;
  note?: string;
};

export type DeterminismProfile = {
  /** L1 — replay network from a recorded HAR instead of hitting the live server. */
  har?: string;
  /** L2 — pin the clock to a fixed epoch (ms). */
  clockEpoch?: number;
  /** L3 — seed Math.random and crypto.getRandomValues. */
  rngSeed?: number;
  /** L4 — fault injection, Phase 6. */
  cpuThrottle?: number;
  networkLatencyMs?: number;
};

export type Environment = {
  browser: 'chromium' | 'firefox' | 'webkit';
  viewport: { width: number; height: number };
  network?: 'fast' | 'slow-3g' | 'offline';
  locale?: string;
  timezone?: string;
};

/**
 * Brand carried only by verdicts that survived corroboration. The type cannot be
 * produced outside the verifier without an explicit cast, and the doctrine lint
 * rejects any literal `verdict: 'CONFIRMED'` written elsewhere.
 */
declare const corroborated: unique symbol;
export type Corroborated = { readonly [corroborated]: true };

export type ReproAttempt = {
  steps: Step[];
  environment: Environment;
  determinism: DeterminismProfile;
  evidence: Evidence[];
  tracePath?: string;
  videoPath?: string;
};

export type Verdict =
  | ({
      kind: 'CONFIRMED';
      attempt: ReproAttempt;
      /** Corroboration record — how many clean re-runs tripped the oracle. */
      runs: { total: number; tripped: number };
    } & Corroborated)
  | {
      kind: 'INTERMITTENT';
      attempt: ReproAttempt;
      runs: { total: number; tripped: number };
      /** tripped / total, reported verbatim rather than rounded up. */
      rate: number;
    }
  | {
      kind: 'NEEDS_REVIEW';
      /** Anomalies seen but never deterministically triggered. No claim is made. */
      anomalies: Evidence[];
      note: string;
    }
  | {
      kind: 'NOT_REPRODUCED';
      /** The honest failure payload: everything that was tried, so a human can resume. */
      triedHypotheses: string[];
      environmentsCovered: Environment[];
      stepsExecuted: number;
    };

export type BugReport = {
  id: string;
  /** Raw user text. Hinglish and half-sentences are expected. */
  report: string;
  baseUrl: string;
  storageStatePath?: string;
};

export type WitnessResult = {
  reportId: string;
  verdict: Verdict;
  startedAt: number;
  durationMs: number;
  llmCostUsd: number;
};
