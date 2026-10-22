# REPRO — Build Plan

**Vague bug report → verified, runnable reproduction. Ya honest "not reproduced". Beech me kuch nahi.**

---

## 0. The One-Liner

> Koi bhi bug report daalo — plain English/Hinglish text. REPRO asli browser chala ke
> bug ko khud reproduce karne ki koshish karta hai, aur **sirf tab report karta hai jab
> usne bug ko 3 baar trigger hote dekha ho**. Output ek chalne wala Playwright test hai
> jo engineer khud verify kar sakta hai.

**Tagline:** *We never guess. We reproduce, or we say we couldn't.*

---

## 1. Accuracy Doctrine (project ka core — isse compromise nahi)

### 1.1 Precision vs Recall — kabhi mat milao

| Metric | Definition | Target | Status |
|---|---|---|---|
| **Precision** | Jo bhi CONFIRMED bola, wo actually reproducible ho | **100%** | Non-negotiable, architecturally enforced |
| **Recall** | Total reports me se kitne reproduce hue | 60–75% | Best-effort, honestly reported |

**Public claim:** *"100% of what REPRO reports is machine-verified. It reproduces ~70% of
reports and honestly says so for the rest."*

Reference points:
- ReBL (GPT-4, Android): 90.63% of 96 reports, avg 75s — par ye curated reports the
- WebArena (real multi-step web agents): ~68–74% success — ye realistic ceiling hai
- 49% real bug reports me steps-to-reproduce hain hi nahi; 65% me expected behaviour nahi

### 1.2 Four-bucket output — binary kabhi nahi

| Bucket | Gate | Emitted |
|---|---|---|
| ✅ `CONFIRMED` | Repro script 3/3 clean runs me oracle trip karta hai | spec.ts + trace + video + RCA |
| ⚠️ `INTERMITTENT` | N/10 runs me trip hua (N ≥ 1, < 10) | spec.ts + observed rate + variance notes |
| 🔍 `NEEDS_REVIEW` | Anomaly detect hua par deterministically trigger nahi | evidence only, **no claim** |
| ❌ `NOT_REPRODUCED` | Kuch nahi mila | tried-hypotheses list + coverage map |

**Rule:** `CONFIRMED` emit karne ka code path **verifier ke bahar exist hi nahi karta.**
LLM kabhi bucket assign nahi kar sakta.

### 1.3 Agent proposes, Oracle disposes

LLM ka kaam sirf **hypothesis generate karna** hai. Truth ka faisla **deterministic oracles**
karte hain — koi LLM-judge nahi.

```
LLM  →  "shayad slow 3G pe double-click se duplicate order banta hai"
Oracle → uncaught exception? / HTTP 5xx? / DOM assertion fail? / a11y violation?
         → sirf yehi CONFIRMED decide karta hai
```

### 1.4 False positive = P0 bug

axe-core doctrine: *"false positives are treated as bugs and fixed accordingly. Uncertain
cases are flagged for manual review."*

Ek bhi false CONFIRMED = release blocker. Ye brand hai.

### 1.5 Determinism Ladder

Repro tabhi "pakka" hai jab dobara chale. Non-determinism layer-by-layer pin karo:

| Level | Pin | Tech | Phase |
|---|---|---|---|
| L0 | Actions | Playwright script | P1 |
| L1 | **Network** | HAR record/replay (`tracing.startHar()`, PW 1.60+) | P2 |
| L2 | **Time** | Playwright Clock API — fixed epoch, fake timers | P2 |
| L3 | **Randomness** | `Math.random` + `crypto.getRandomValues` seed injection via init script | P2 |
| L4 | **Races** | Fault injection — CPU throttle, latency jitter, forced reorder | P6 |

L1–L3 pin karne se zyadatar "intermittent" bugs deterministic ho jaate hain.
**Yehi technical moat hai** — competitors record karte hain, hum replay guarantee dete hain.

---

## 2. Architecture

```
┌── INTAKE ──────────────────────────────────────────────┐
│  text report │ url │ screenshot │ console error        │
│  optional: rrweb session, storageState (auth)          │
└────────────────────────┬───────────────────────────────┘
                         ↓
┌── HYPOTHESIS ENGINE (LLM) ─────────────────────────────┐
│  report → structured intent (JSON)                     │
│  → N candidate repro paths                             │
│  → MCTS planner: select / expand / simulate / backprop │
└────────────────────────┬───────────────────────────────┘
                         ↓
┌── DETERMINISM HARNESS ─────────────────────────────────┐
│  HAR pin │ clock pin │ RNG seed │ (P6) fault injection  │
└────────────────────────┬───────────────────────────────┘
                         ↓
┌── EXECUTOR (Playwright + CDP) ─────────────────────────┐
│  matrix: viewport × browser × network × locale         │
│  full trace on every run                               │
└────────────────────────┬───────────────────────────────┘
                         ↓
┌── ORACLE BANK (deterministic, ZERO LLM) ───────────────┐
│  uncaught exception │ unhandled rejection │ http 4xx/5xx│
│  console.error │ axe-core violation │ layout overflow  │
│  element-not-clickable │ nav timeout │ infinite spinner│
│  custom user assertion                                 │
└────────────────────────┬───────────────────────────────┘
                         ↓
┌── VERIFIER ────────────────────────────────────────────┐
│  3× clean-context re-run → bucket assignment           │
│  10× for intermittent rate                             │
│  delta-debug minimizer (ddmin)                         │
└────────────────────────┬───────────────────────────────┘
                         ↓
┌── REPORT ──────────────────────────────────────────────┐
│  spec.ts │ trace.zip │ video │ source-mapped RCA │      │
│  bucket + evidence links + tried-hypotheses             │
└────────────────────────────────────────────────────────┘
```

**Design rule:** har layer neeche wali pe depend karti hai, ulta nahi.
Oracle Bank ko LLM ka pata bhi nahi hona chahiye.

---

## 3. Tech Stack (sab free / OSS)

| Layer | Choice | License | Kyun |
|---|---|---|---|
| Runtime | Node 20 + TypeScript | — | Playwright first-class |
| Browser | **Playwright** | Apache-2.0 | trace viewer, HAR, clock, 3 engines |
| Low-level | **CDP** | — | exceptions, network, coverage, source maps |
| a11y oracle | **axe-core** | MPL-2.0 | zero-false-positive rules |
| Session ingest | **rrweb** (optional) | MIT | user session → seed |
| LLM | any chat LLM (small model by default, larger one for hard cases) | — | hypothesis only |
| Storage | SQLite (local) | — | runs, hypotheses, verdicts |
| CLI | commander + ink | MIT | demo surface |
| Report UI | static HTML, self-contained | — | free hosting |
| CI | GitHub Actions | free tier | **executor user ke CI pe chalta hai — hum browser host nahi karte** |

**Hosting cost: ₹0.** Control plane static hai; heavy compute user ke CI/local pe.

---

## 4. Repo Structure

```
repro/
├── packages/
│   ├── core/
│   │   ├── intake/          # report → structured intent
│   │   ├── hypothesis/      # LLM + MCTS planner
│   │   ├── determinism/     # HAR, clock, RNG, faults
│   │   ├── executor/        # Playwright driver + matrix
│   │   ├── oracles/         # ⚠️ NO LLM IMPORTS ALLOWED (lint-enforced)
│   │   ├── verifier/        # re-run gate + bucket assignment
│   │   ├── minimizer/       # ddmin
│   │   └── report/          # spec.ts codegen + html
│   └── cli/                 # `repro run "<bug text>" --url <url>`
├── corpus/
│   ├── buggy-app/           # seeded-bug demo app (ground truth)
│   └── cases/               # 25 bug reports + known-answer labels
├── eval/
│   ├── harness.ts           # precision/recall runner
│   └── results/             # versioned scorecards
└── PLAN.md
```

**Lint rule (CI-enforced):** `packages/core/oracles/**` me `anthropic|openai|llm` import
mana hai. Ye accuracy doctrine ko code me lock karta hai.

---

## 5. Phases

> **Ordering principle:** Truth layer pehle, agent baad me.
> Verification ke bina agent banane ka matlab hai ek confident jhoothe machine banana.

---

### 🔹 Phase 0 — Skeleton + Ground Truth Corpus
**Kyun pehle:** accuracy prove karne ke liye **known-answer bugs** chahiye. Bina ground
truth ke "100% precision" sirf ek claim hai, measurement nahi.

**Deliverables**
- [ ] Monorepo skeleton, TS strict, vitest
- [ ] `corpus/buggy-app` — chhota React/Vite e-commerce app with **25 deliberately seeded bugs**:
  - 8 deterministic (button no-op, 500 on submit, broken validation, null crash)
  - 6 conditional (sirf mobile viewport, sirf slow 3G, sirf empty cart, sirf 2nd visit)
  - 4 intermittent (race condition, debounce bug, stale closure, double-submit)
  - 4 a11y (missing label, contrast, focus trap, aria misuse)
  - 3 **non-bugs** (decoys — tool ko inhe NOT_REPRODUCED bolna chahiye) ← precision test
- [ ] `corpus/cases/*.json` — har bug ka **vague, human-style report** + hidden ground truth
- [ ] Eval harness skeleton: precision / recall / MTTR print kare

**Acceptance:** `npm run eval` chale aur 0% score de (kuch bana nahi abhi) — pipeline wired hai.
**Est:** 3–4 din

---

### 🔹 Phase 1 — Executor + Oracle Bank (The Truth Layer)
**Kyun:** yehi wo cheez hai jo "accurate" banati hai. Sab isi pe khada hai.

**Deliverables**
- [ ] Playwright driver: launch, storageState seed, full trace on
- [ ] Environment matrix: viewport × browser × network profile × locale
- [ ] **Oracle Bank** (har oracle pure function: `(runArtifacts) => OracleHit | null`)
  - [ ] `uncaughtException` (CDP `Runtime.exceptionThrown`)
  - [ ] `unhandledRejection`
  - [ ] `httpError` (4xx/5xx, filterable)
  - [ ] `consoleError`
  - [ ] `navigationTimeout` / `infiniteLoading`
  - [ ] `axeViolation` (axe-core inject)
  - [ ] `layoutOverflow` (scrollWidth > clientWidth)
  - [ ] `elementNotInteractable` (hit-test occlusion)
  - [ ] `userAssertion` (optional expected-behaviour check)
- [ ] Every oracle hit → structured evidence (timestamp, selector, stack, network entry)
- [ ] Unit tests: har oracle ko corpus ke known bug pe fire hona chahiye, decoys pe **nahi**

**Acceptance:** manually-written repro scripts corpus ke 8 deterministic bugs pe chalao →
sab 8 pe sahi oracle fire ho, 3 decoys pe **zero** fire ho.
**Est:** 5–6 din

---

### 🔹 Phase 2 — Determinism Harness (L1–L3)
**Deliverables**
- [ ] HAR record mode + HAR replay mode (`tracing.startHar` / `routeFromHAR`)
- [ ] Clock pin — fixed epoch, controllable tick
- [ ] RNG seed injection via `addInitScript` (Math.random + crypto)
- [ ] `DeterminismProfile` config object, per-run serialized into artifact
- [ ] Flakiness probe: same script 10× → variance report

**Acceptance:** corpus ke 4 intermittent bugs me se **kam se kam 3** L1–L3 pin karne ke baad
10/10 deterministic ho jaayein.
**Est:** 4–5 din

---

### 🔹 Phase 3 — Verifier + Minimizer
**Deliverables**
- [ ] Verifier: clean-context 3× re-run gate → `CONFIRMED`
- [ ] 10× sampling → `INTERMITTENT` with rate
- [ ] `NEEDS_REVIEW` / `NOT_REPRODUCED` paths
- [ ] **ddmin minimizer** — steps ghatao jab tak oracle fire hota rahe
- [ ] Type system: `CONFIRMED` sirf `Verifier` module se construct ho sake (branded type)
- [ ] Tried-hypotheses ledger (NOT_REPRODUCED reports ke liye)

**Acceptance:** 23-step script automatically ≤5 steps pe minimize ho aur oracle abhi bhi fire kare.
Decoys hamesha `NOT_REPRODUCED` aayein.
**Est:** 4 din

---

### 🔹 Phase 4 — Hypothesis Engine (LLM + MCTS)
**Ab agent banega — kyunki ab jhooth bol nahi sakta.**

**Deliverables**
- [ ] Intake: vague text (+ Hinglish) → structured `BugIntent` JSON
  (target flow, symptom, suspected conditions, expected vs actual)
- [ ] Hypothesis generator: `BugIntent` → N ranked candidate paths
- [ ] Page model builder: DOM → compact interactive-element graph (token-efficient)
- [ ] **MCTS planner** (TreeMind-style): select → expand → execute → backprop
  - reward = oracle proximity signals (partial: console warn, slow request, aria anomaly)
  - pruning: repeated states, budget caps
- [ ] Budget controls: max steps, max LLM calls, max wall-clock
- [ ] Fallback: hypothesis exhaust ho gaye → `NOT_REPRODUCED` + ledger

**Acceptance:** end-to-end — vague text se corpus ke **≥15/22 real bugs** auto-reproduce hon,
**aur teeno decoys pe NOT_REPRODUCED aaye (precision 100%)**.
**Est:** 7–8 din

---

### 🔹 Phase 5 — Report Artifact (the deliverable)
**Deliverables**
- [ ] **Playwright `.spec.ts` codegen** — clean, readable, runnable standalone
- [ ] `trace.zip` bundle + video + before/after screenshots
- [ ] **Source-mapped root cause** — minified stack → original file:line
- [ ] Self-contained HTML report: bucket badge, steps, evidence links, embedded video
- [ ] `NOT_REPRODUCED` report bhi first-class ho (tried list + coverage map)
- [ ] CLI: `repro run "<text>" --url <url>` → artifacts folder

**Acceptance:** engineer artifact folder le, `npx playwright test` chalaye, bug apni aankho se dekhe.
**Est:** 4 din

---

### 🔹 Phase 6 — Eval + Hardening (accuracy ko PROVE karo)
**Ye phase hi product ko credible banata hai. Skip mat karna.**

**Deliverables**
- [ ] Full eval harness: precision, recall, MTTR, cost-per-report, minimization ratio
- [ ] **Versioned scorecard** — har commit pe regression track
- [ ] L4 fault injection (CPU throttle, latency jitter) → race bugs
- [ ] Auth flows: storageState seeding + credential vault
- [ ] Safety: destructive-action guard, staging-only default, prod opt-in read-only
- [ ] Cost guard: per-report LLM budget cap
- [ ] **Precision regression test in CI** — precision < 100% → build fails

**Acceptance:** published scorecard with real numbers. Precision 100%, recall ≥ 68%.
**Est:** 5 din

---

### 🔹 Phase 7 — Shippable Demo
**Deliverables**
- [ ] 90-second demo video: vague Hinglish report → verified repro
- [ ] Hosted static report gallery (3 CONFIRMED, 1 INTERMITTENT, 1 NOT_REPRODUCED)
      — **NOT_REPRODUCED ko proudly dikhao, ye honesty proof hai**
- [ ] GitHub Action: `on: issues.opened` → repro attempt → comment with verdict
- [ ] README with scorecard front-and-center
- [ ] Landing page: "We never guess"

**Acceptance:** koi ajnabi repo clone kare, apni site pe chalaye, artifact mile.
**Est:** 3–4 din

---

**Total: ~5 weeks solo.** Har phase independently demo-able hai.

---

## 6. Success Metrics (ye track karo)

| Metric | Target | Kyun |
|---|---|---|
| **Precision** | **100%** | Non-negotiable, CI-enforced |
| Recall | ≥ 68% | WebArena-realistic |
| Decoy rejection | 3/3 | False positive ka direct test |
| Median time-to-repro | < 4 min | Human se tez |
| Minimization ratio | ≥ 4× | Steps 20 → 5 |
| LLM cost / report | < $0.15 | Unit economics |
| Determinism uplift | ≥ 75% intermittent → deterministic | L1–L3 ka value proof |

---

## 7. Roadmap (V1 ke baad)

| Feature | Value |
|---|---|
| **Bisect mode** — repro ko git commits pe chala ke breaking commit pinpoint | Killer feature |
| **Regression suite auto-build** — har CONFIRMED permanent test ban jaaye | Retention hook |
| Coding-agent handoff (MCP) — repro → coding agent → fix + green test | Loop close |
| Sentry / Linear / Jira / GitHub 2-way | Distribution |
| rrweb session ingest → hypothesis seed | Recall boost |
| Cross-browser diff ("Chrome ok, Safari tuta") | Differentiator |
| **Proactive mode** — engine khud ghoom ke verified bugs dhoonde | Synthetic-UAT idea, objective-only |
| Repro corpus flywheel — jitne repro, utna smart planner | Compounding moat |

---

## 8. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Auth-walled flows | High | storageState seeding (P6), V1 me public/staging scope |
| Backend-state-dependent bugs | High | Honestly bucket: "frontend repro nahi, backend state suspect" + evidence |
| Third-party/payment sandboxes | Med | HAR replay se external calls stub — P2 me already solved |
| Agent nav ceiling ~70% | Med | Verifier gate — fail hoga to NOT_REPRODUCED, jhooth nahi |
| LLM cost blowup | Med | MCTS pruning, oracles free hain, per-report budget cap |
| Destructive actions on live site | High | Staging-only default, prod opt-in + read-only mode, action allowlist |
| Scope creep into full QA platform | High | V1 me sirf repro. Proactive mode P7+ tak nahi. |

---

## 9. Non-Goals (V1)

- ❌ Subjective UX opinions ("ye button confusing hai") — unfalsifiable, never ship
- ❌ Auto-fixing bugs — repro pe focus, fix baad me
- ❌ Native mobile apps — web only
- ❌ Load/performance testing
- ❌ Hosted browser infra — user ke CI pe chalega

---

## 10. Competitive Position

| Tool | Approach | Gap |
|---|---|---|
| Jam, BetterBugs, BugReel, FlowLens | **Capture-first** — user record kare, AI describe kare | Text-only report se shuru nahi kar sakte |
| Sentry Seer | Telemetry-first — error already captured ho | Vague human sentence se repro nahi banata |
| Momentic, QA Wolf, Checksum | Test authoring/generation | Existing report reproduce karna scope me nahi |
| Replay.io | Deterministic record-replay | Manual record chahiye |
| **REPRO** | **Repro-first, capture-free, verification-gated** | — |

**Wedge:** text-only vague report → machine-verified deterministic repro. Ye jagah khaali hai.

---

## References

- [Why are Some Bugs Non-Reproducible? (arXiv)](https://arxiv.org/pdf/2108.05316)
- [Works For Me! Non-reproducible bug reports (UBC)](https://people.ece.ubc.ca/amesbah/resources/papers/mona-msr14.pdf)
- [ReBL: Feedback-Driven Whole Bug Report Reproduction (ISSTA'24)](https://dl.acm.org/doi/10.1145/3650212.3680341)
- [TreeMind: LLM + MCTS bug reproduction](https://arxiv.org/html/2509.22431v1)
- [axe-core (zero-false-positive design)](https://github.com/dequelabs/axe-core)
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer) / [Tracing API](https://playwright.dev/docs/api/class-tracing)
- [Antithesis: Deterministic Simulation Testing](https://antithesis.com/docs/resources/deterministic_simulation_testing/)
- [Evaluating Browser-Use Agents: Six Failure Modes](https://futureagi.com/blog/evaluating-browser-use-agents-2026/)
- [Web Agent Benchmarks Leaderboard](https://awesomeagents.ai/leaderboards/web-agent-benchmarks-leaderboard/)
- [rrweb](https://github.com/rrweb-io/rrweb)
