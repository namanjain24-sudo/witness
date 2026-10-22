# Witness

**Bug report in, verified reproduction out.**
We don't guess — we witnessed it.

Witness takes a vague, human-written bug report ("phone pe checkout ka button dabta hi
nahi") and drives a real browser to reproduce it. It reports a bug **only after
deterministic checks tripped on three clean re-runs**. When it can't reproduce
something, it says so and shows its work.

## The one rule

> Precision is 100%. Recall is not, and we never pretend otherwise.

| Metric | Meaning | Target |
|---|---|---|
| **Precision** | Every claim is machine-verified | **100% — gates the build** |
| Recall | Share of reports reproduced | ≥ 68%, reported honestly |

An LLM proposes hypotheses. It never decides what is true. Truth comes from the
Evidence Bank — deterministic oracles over what the browser actually did. A lint rule
fails the build if a model import appears anywhere near them.

Four verdicts, never a binary:

- `CONFIRMED` — tripped on 3/3 clean re-runs
- `INTERMITTENT` — tripped N/10, rate reported verbatim
- `NEEDS_REVIEW` — anomaly seen, never triggered on demand, **no claim made**
- `NOT_REPRODUCED` — with the full list of what was tried

## Status — Phase 0 complete

Ground truth and scoring exist before any reasoning does, so accuracy is measured
rather than asserted.

- ✅ Monorepo, core contracts, verdict types with a corroboration brand
- ✅ **Kirana Cart** — a deliberately broken storefront: 22 seeded bugs + 3 decoys
- ✅ Corpus self-check: 9/9 spot-checked bugs verified in a real browser
- ✅ Eval harness with answer-key isolation, precision-gated
- ✅ Doctrine lint (and it fails loudly if it ever scans zero files)
- ⬜ Phase 1 — Executor + Evidence Bank
- ⬜ Phase 2 — Determinism harness (HAR / clock / RNG)
- ⬜ Phase 3 — Verifier + minimizer
- ⬜ Phase 4 — Hypothesis engine
- ⬜ Phases 5–7 — Testimony artifact, hardening, demo

Baseline scorecard: precision 100%, recall 0%, decoy rejection 3/3. The stub claims
nothing, which is the correct place to start from.

## Run it

```bash
npm install
npx playwright install chromium

npm run app            # Kirana Cart on :5178
npm run corpus:verify  # confirm the seeded bugs still misbehave
npm run eval           # accuracy scorecard
npm run lint:doctrine  # accuracy rules, enforced in code
```

## Layout

```
packages/core/     contracts, oracles (Evidence Bank), verifier
packages/cli/      `witness run "<report>"`
corpus/            Kirana Cart, the answer key, cases, self-check
eval/              scorecard harness + versioned results
PLAN.md            full phase plan and accuracy doctrine
```

`corpus/BUGS.md` is the answer key. It never reaches the agent — the harness rebuilds
each report field by field so labels cannot ride along.
