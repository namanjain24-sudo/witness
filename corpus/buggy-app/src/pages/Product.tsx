import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PRODUCTS } from '../data';
import { addItem } from '../store';
import Modal from '../components/Modal';

export default function Product() {
  const { id } = useParams();
  const product = PRODUCTS.find((p) => p.id === id);
  const [bulkQty, setBulkQty] = useState(3);
  const [showDelivery, setShowDelivery] = useState(false);

  if (!product) return <p>Product not found.</p>;

  /**
   * B13 — the bulk total is formatted for display and then parsed back out of that
   * formatted string. Under a locale that uses "." as the thousands separator the
   * round trip silently truncates the amount.
   */
  const rawBulk = product.price * bulkQty;
  const formatted = rawBulk.toLocaleString(undefined, { minimumFractionDigits: 2 });
  const bulkTotal = parseFloat(formatted);

  return (
    <article className="product">
      <img src={product.image} alt={product.name} width={240} height={240} />
      <h2>{product.name}</h2>
      <p className="price">
        ₹{product.price} / {product.unit}
      </p>

      <div className="bulk">
        <label htmlFor="bulk">Bulk quantity</label>
        <input
          id="bulk"
          type="number"
          value={bulkQty}
          onChange={(e) => setBulkQty(Number(e.target.value))}
        />
        <p data-testid="bulk-total">Bulk total: ₹{bulkTotal.toFixed(2)}</p>
      </div>

      <button className="btn" data-testid="add" onClick={() => addItem(product.id)}>
        Add to cart
      </button>

      <button className="btn ghost" onClick={() => setShowDelivery(true)}>
        Delivery info
      </button>

      <h3>Reviews</h3>
      {/* B04 — this product has no `reviews` key, so `.length` throws */}
      <p data-testid="review-count">{product.reviews!.length} verified reviews</p>
      <ul>
        {product.reviews!.map((r) => (
          <li key={r.author}>
            <strong>{r.author}</strong> — {'★'.repeat(r.stars)} {r.text}
          </li>
        ))}
      </ul>

      <Link to="/">← Back to shop</Link>

      {showDelivery && (
        <Modal onClose={() => setShowDelivery(false)}>
          <h3>Delivery</h3>
          <p>Same-day delivery on orders placed before 4pm.</p>
        </Modal>
      )}
    </article>
  );
}
