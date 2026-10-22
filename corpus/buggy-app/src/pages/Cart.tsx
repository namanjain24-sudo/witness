import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  applyCoupon,
  removeAtIndex,
  setQty,
  setQtyDeferred,
  subtotal,
  total,
  useCart,
} from '../store';

export default function Cart() {
  const cart = useCart();
  const [filter, setFilter] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  const visible = cart.items.filter((l) =>
    l.name.toLowerCase().includes(filter.toLowerCase()),
  );

  if (cart.items.length === 0) {
    return (
      <section>
        <h2>Your cart is empty</h2>
        <Link to="/">Browse staples →</Link>
      </section>
    );
  }

  return (
    <section>
      <h2>Your cart</h2>

      <input
        className="search"
        aria-label="Filter cart items"
        data-testid="cart-filter"
        placeholder="Filter items…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <table className="cart-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Line total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {visible.map((line, i) => (
            <tr key={line.id} data-testid={`line-${line.id}`}>
              <td>{line.name}</td>
              <td>
                {/* B05 — decrement has no lower bound, so qty walks below zero */}
                <button
                  className="step"
                  data-testid={`dec-${line.id}`}
                  onClick={() => setQty(line.id, line.qty - 1)}
                >
                  −
                </button>
                <span data-testid={`qty-${line.id}`}>{line.qty}</span>
                <button
                  className="step"
                  data-testid={`inc-${line.id}`}
                  onClick={() => setQtyDeferred(line.id, line.qty + 1)}
                >
                  +
                </button>
              </td>
              <td data-testid={`line-total-${line.id}`}>₹{line.price * line.qty}</td>
              <td>
                {/*
                  B06 — `i` indexes the filtered view but is spliced out of the
                  full items array, so filtering makes the wrong row vanish.
                */}
                <button
                  className="btn ghost"
                  data-testid={`remove-${line.id}`}
                  onClick={() => removeAtIndex(i)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="coupon-row">
        <label htmlFor="coupon">Coupon</label>
        <input
          id="coupon"
          data-testid="coupon"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {/* B18 — no pending guard, so rapid clicks stack the discount */}
        <button
          className="btn"
          data-testid="apply-coupon"
          onClick={() => setMessage(applyCoupon(code).message)}
        >
          Apply
        </button>
        {/* B01 — wired to nothing at all */}
        <button className="btn ghost" data-testid="save-later">
          Save for later
        </button>
      </div>

      {message && <p data-testid="coupon-message">{message}</p>}

      <dl className="totals">
        <dt>Subtotal</dt>
        <dd data-testid="subtotal">₹{subtotal(cart)}</dd>
        <dt>Discount</dt>
        <dd data-testid="discount">−₹{cart.discount}</dd>
        <dt>Total</dt>
        {/*
          B12 — renders the value cached in localStorage rather than the live
          total, so a returning visitor sees a stale number.
        */}
        <dd data-testid="total">₹{cart.cachedTotal || total(cart)}</dd>
      </dl>

      <Link className="btn primary" to="/checkout" data-testid="to-checkout">
        Proceed to checkout
      </Link>
    </section>
  );
}
