import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRODUCTS, type Product } from '../data';
import { addItem } from '../store';

export default function Catalog() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>(PRODUCTS);
  const [banner, setBanner] = useState('');
  const timer = useRef<number | undefined>(undefined);

  /**
   * B16 — every keystroke schedules its own timer without cancelling the previous
   * one, so a slow-resolving earlier query can land after a newer one and
   * overwrite fresh results with stale ones.
   */
  useEffect(() => {
    const q = query;
    timer.current = window.setTimeout(
      () => {
        setResults(PRODUCTS.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())));
      },
      q.length % 2 === 0 ? 260 : 60,
    );
  }, [query]);

  /* B07 — assumes at least one match exists */
  const headline = query
    ? `Top match: ${results[0]!.name}`
    : `${PRODUCTS.length} staples in stock`;

  return (
    <section>
      <div className="search-row">
        {/* B19 — no <label>, no aria-label, no placeholder association */}
        <input
          className="search"
          data-testid="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search staples…"
        />
      </div>

      <p className="headline" data-testid="headline">
        {headline}
      </p>

      {banner && (
        <p className="banner" data-testid="banner">
          {banner}
        </p>
      )}

      <ul className="grid">
        {results.map((p) => (
          <li key={p.id} className="card">
            <img src={p.image} alt={p.name} width={240} height={240} />
            <h3>{p.name}</h3>
            {/* B20 — pale yellow text on a white card; well under 4.5:1 */}
            {p.sale && <span className="sale-badge">SALE</span>}
            <p className="price">₹{p.price}</p>

            {/*
              B22 — behaves like a button but is a plain div: no tabindex, no key
              handler, so it is unreachable by keyboard.
            */}
            <div
              role="button"
              className="btn ghost"
              onClick={() => navigate(`/product/${p.id}`)}
            >
              View details
            </div>

            <button
              className="btn"
              data-testid={`add-${p.id}`}
              onClick={async () => {
                await addItem(p.id);
                setBanner(`${p.name} added to cart`);
              }}
            >
              Add to cart
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
