# Ground Truth — Kirana Cart

**This file is the answer key. It must never be given to the agent.**

Witness operates on the running app through a browser only. It never reads
`corpus/buggy-app/src`, and it never reads this file. The eval harness loads the
labels here *after* a run to score the verdict. Leaking either source or labels
into the hypothesis engine invalidates every accuracy number the project claims.

Legend for **Expected verdict** — what a correct Witness run should produce:

- `CONFIRMED` — deterministic once the determinism ladder is applied
- `INTERMITTENT` — real, but fires on only some runs
- `NOT_REPRODUCED` — nothing to find; the reported behaviour is correct

---

## Deterministic (8)

| ID | Bug | Trigger | Oracle that should fire | Expected |
|---|---|---|---|---|
| B01 | "Save for later" is a dead button | Cart → click `save-later` | `noOpInteraction` | CONFIRMED |
| B02 | Checkout 500s on an apostrophe in notes | Notes = `don't ring bell` → place order | `httpError` + `uncaughtException` | CONFIRMED |
| B03 | Email validation is inverted | Enter a valid email → rejected; enter `abc` → accepted | `userAssertion` | CONFIRMED |
| B04 | Product page crashes with no reviews | Open `/product/mustard-oil-1l` | `uncaughtException` (TypeError on `.length`) | CONFIRMED |
| B05 | Quantity goes negative | Cart → press `−` past 1 | `userAssertion` (qty < 0, total < 0) | CONFIRMED |
| B06 | Remove deletes the wrong row | Cart → filter to one item → Remove | `userAssertion` | CONFIRMED |
| B07 | Empty search results crash the page | Search `zzzz` | `uncaughtException` (`results[0]` undefined) | CONFIRMED |
| B08 | console.error on every page load | Load any route | `consoleError` | CONFIRMED |

## Conditional (6)

| ID | Bug | Trigger | Oracle | Expected |
|---|---|---|---|---|
| B09 | Promo bar covers the order button | Viewport ≤ 480px → checkout | `elementNotInteractable` | CONFIRMED |
| B10 | Duplicate order on double submit | Slow network → click Place order twice | `userAssertion` (orderCount = 2) | CONFIRMED |
| B11 | `/checkout` crashes with an empty cart | Navigate to `/checkout` directly | `uncaughtException` | CONFIRMED |
| B12 | Stale total on a return visit | Add items → reload → open Cart | `userAssertion` (total ≠ subtotal − discount) | CONFIRMED |
| B13 | Bulk total truncated under some locales | Locale `de-DE` → product page, bulk qty 3 | `userAssertion` | CONFIRMED |
| B14 | Delivery slot shows Invalid Date | WebKit / Firefox → checkout | `userAssertion` | CONFIRMED |

## Intermittent (4)

| ID | Bug | Trigger | Oracle | Expected |
|---|---|---|---|---|
| B15 | Concurrent adds clobber the total | Two rapid Add-to-cart clicks | `userAssertion` | INTERMITTENT → CONFIRMED once RNG + clock are pinned (L2/L3) |
| B16 | Stale search results overwrite fresh ones | Type a query quickly, alternating length parity | `userAssertion` | INTERMITTENT → CONFIRMED after clock pin |
| B17 | Quantity increment reverts | `+` then immediately change another row | `userAssertion` | INTERMITTENT → CONFIRMED after clock pin |
| B18 | Coupon stacks on a double click | Cart → `FIRST10` → click Apply twice | `userAssertion` (discount = 20) | CONFIRMED (racy in wall-clock terms only) |

**Determinism uplift target:** at least 3 of B15–B18 must reach 10/10 reproduction
once levels L1–L3 of the determinism ladder are enabled. That is the headline proof
that the harness earns its complexity.

## Accessibility (4)

| ID | Bug | Trigger | Oracle | Expected |
|---|---|---|---|---|
| B19 | Search input has no accessible name | Catalog | `axeViolation` (label) | CONFIRMED |
| B20 | SALE badge fails contrast | Catalog | `axeViolation` (color-contrast) | CONFIRMED |
| B21 | Modal has no Escape handler, no focus restore | Product → Delivery info | `userAssertion` (keyboard) | CONFIRMED |
| B22 | `role="button"` div is not focusable | Catalog → "View details" | `axeViolation` | CONFIRMED |

---

## Decoys (3) — the precision test

These reports describe behaviour that is **working exactly as designed**. A run that
returns anything other than `NOT_REPRODUCED` for these is a false positive, which is
a P0 defect in Witness. Precision is measured here.

| ID | Report says | Reality |
|---|---|---|
| D01 | "SAVE50 doesn't work on small orders" | Correct — `SAVE50` carries a documented ₹500 minimum. Rule is enforced properly and the message explains it. |
| D02 | "It logs me out at random" | There is no auth in this app. Cart state persists correctly across reloads via localStorage. |
| D03 | "Product images are blurry on retina screens" | Images are inline SVG and resolution-independent. They cannot be blurry. |

---

## Scoring

```
precision = confirmed_and_real / all_confirmed          # target 1.00, CI-enforced
recall    = confirmed_and_real / 22                     # target ≥ 0.68
decoys    = decoys_returned_NOT_REPRODUCED / 3          # target 3/3
```

A single false positive fails the build regardless of how high recall is.
