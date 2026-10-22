import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export default function Confirm() {
  const { orderId } = useParams();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then((d: { orders: unknown[] }) => setCount(d.orders.length));
  }, []);

  return (
    <section>
      <h2>Order confirmed 🎉</h2>
      <p data-testid="order-id">Order {orderId}</p>
      {count !== null && (
        <p data-testid="order-count">Orders placed this session: {count}</p>
      )}
      <Link to="/">Continue shopping →</Link>
    </section>
  );
}
