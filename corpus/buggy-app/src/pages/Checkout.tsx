import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearCart, total, useCart } from '../store';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

export default function Checkout() {
  const cart = useCart();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [slotDate, setSlotDate] = useState('2026-07-25');
  const [slotTime, setSlotTime] = useState('14:00');
  const [error, setError] = useState('');

  /*
    B11 — reads the first line unconditionally. Landing here with an empty cart
    (direct URL, or after clearing it in another tab) throws immediately.
  */
  const leadItem = cart.items[0]!.name;

  /*
    B14 — "YYYY-MM-DD HH:mm" is not a format the Date constructor is required to
    accept. Chromium parses it; WebKit and older Firefox return Invalid Date.
  */
  const slot = new Date(`${slotDate} ${slotTime}`);
  const slotLabel = slot.toLocaleString();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    /* B03 — the condition is inverted: valid addresses are rejected and
       malformed ones sail through */
    if (EMAIL_RE.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    /* B10 — no pending flag and no idempotency key, so a second click while the
       first request is still open books a duplicate order */
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ total: total(cart), notes, email }),
    });

    if (!res.ok) {
      const body = await res.json();
      throw new Error(`Checkout failed: ${body.error}`);
    }

    const order = await res.json();
    clearCart();
    navigate(`/confirm/${order.id}`);
  }

  return (
    <section className="checkout">
      <h2>Checkout</h2>
      <p>
        Ordering <strong>{leadItem}</strong> and {cart.items.length - 1} other item(s).
      </p>

      <form onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          data-testid="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="notes">Delivery notes</label>
        <input
          id="notes"
          data-testid="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <label htmlFor="slot-date">Delivery date</label>
        <input
          id="slot-date"
          type="date"
          data-testid="slot-date"
          value={slotDate}
          onChange={(e) => setSlotDate(e.target.value)}
        />

        <label htmlFor="slot-time">Delivery time</label>
        <input
          id="slot-time"
          type="time"
          data-testid="slot-time"
          value={slotTime}
          onChange={(e) => setSlotTime(e.target.value)}
        />

        <p data-testid="slot-label">Arriving: {slotLabel}</p>

        {error && (
          <p className="error" data-testid="error">
            {error}
          </p>
        )}

        <p className="grand" data-testid="grand-total">
          Pay ₹{total(cart)}
        </p>

        <button className="btn primary" type="submit" data-testid="place-order">
          Place order
        </button>
      </form>
    </section>
  );
}
