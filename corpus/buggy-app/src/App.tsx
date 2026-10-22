import { Link, Route, Routes } from 'react-router-dom';
import { useCart } from './store';
import Catalog from './pages/Catalog';
import Product from './pages/Product';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Confirm from './pages/Confirm';

export default function App() {
  const cart = useCart();
  const count = cart.items.reduce((n, l) => n + l.qty, 0);

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          Kirana Cart
        </Link>
        <nav>
          <Link to="/">Shop</Link>
          <Link to="/cart" data-testid="nav-cart">
            Cart ({count})
          </Link>
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/confirm/:orderId" element={<Confirm />} />
        </Routes>
      </main>

      {/*
        B09 — this promo bar is fixed to the bottom with a large z-index. On narrow
        viewports it grows tall enough to sit on top of the primary action button,
        which then cannot be clicked at all.
      */}
      <div className="promo-bar">
        <span>🎉 Monsoon sale — free delivery on every staples order over ₹999 today!</span>
        <span className="promo-sub">
          Use code FIRST10 at checkout · Offer ends midnight · T&amp;C apply
        </span>
      </div>
    </div>
  );
}
