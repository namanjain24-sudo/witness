import { useSyncExternalStore } from 'react';
import { COUPONS, PRODUCTS } from './data';

export type CartLine = { id: string; name: string; price: number; qty: number };

export type CartState = {
  items: CartLine[];
  coupon: string | null;
  discount: number;
  /** Written to localStorage; read back on a later visit. See B12. */
  cachedTotal: number;
};

const STORAGE_KEY = 'kirana.cart.v2';

let state: CartState = load();
const listeners = new Set<() => void>();

function load(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CartState;
  } catch {
    /* ignore */
  }
  return { items: [], coupon: null, discount: 0, cachedTotal: 0 };
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function emit() {
  persist();
  for (const l of listeners) l();
}

function set(next: Partial<CartState>) {
  state = { ...state, ...next };
  emit();
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}

export function useCart() {
  return useSyncExternalStore(subscribe, getState, getState);
}

export const subtotal = (s: CartState = state) =>
  s.items.reduce((sum, l) => sum + l.price * l.qty, 0);

export const total = (s: CartState = state) => subtotal(s) - s.discount;

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

/**
 * B15 — the running total is computed from a snapshot taken before an await, so
 * two adds fired close together race and the slower one clobbers the newer total.
 */
export async function addItem(productId: string, qty = 1) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;

  const snapshot = state.items;
  await new Promise((r) => setTimeout(r, 40 + Math.random() * 90));

  const existing = snapshot.find((l) => l.id === productId);
  const items = existing
    ? snapshot.map((l) => (l.id === productId ? { ...l, qty: l.qty + qty } : l))
    : [...snapshot, { id: product.id, name: product.name, price: product.price, qty }];

  state = { ...state, items };
  state.cachedTotal = total(state);
  emit();
}

/**
 * B05 — no clamping, so the stepper walks straight past zero into negative
 * quantities and the order total goes negative.
 */
export function setQty(productId: string, qty: number) {
  set({ items: state.items.map((l) => (l.id === productId ? { ...l, qty } : l)) });
}

/**
 * B17 — `lines` is captured at call time, so a queued update written after an
 * unrelated change silently reverts that change.
 */
export function setQtyDeferred(productId: string, qty: number) {
  const lines = state.items;
  setTimeout(() => {
    state = { ...state, items: lines.map((l) => (l.id === productId ? { ...l, qty } : l)) };
    emit();
  }, 250);
}

/**
 * B06 — the index comes from a filtered view but is spliced out of the full
 * array, so the wrong line disappears whenever a filter is active.
 */
export function removeAtIndex(visibleIndex: number) {
  const items = [...state.items];
  items.splice(visibleIndex, 1);
  set({ items });
}

/**
 * B18 — no guard against re-application, so a double click stacks the discount.
 * The minimum-order rule below is correct and intentional (decoy D01).
 */
export function applyCoupon(code: string): { ok: boolean; message: string } {
  const coupon = COUPONS[code.trim().toUpperCase()];
  if (!coupon) return { ok: false, message: 'Invalid coupon code' };

  const sub = subtotal();
  if (sub < coupon.minOrder) {
    return { ok: false, message: `Coupon needs a minimum order of ₹${coupon.minOrder}` };
  }

  set({ coupon: code.trim().toUpperCase(), discount: state.discount + coupon.off });
  return { ok: true, message: `Coupon applied — ₹${coupon.off} off` };
}

export function clearCart() {
  state = { items: [], coupon: null, discount: 0, cachedTotal: 0 };
  emit();
}
