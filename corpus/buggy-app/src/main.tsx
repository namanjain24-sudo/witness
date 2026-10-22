import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

/* B08 — a stray deprecation notice fires on every single page load */
console.error(
  '[kirana] deprecated: `legacyCartAdapter` will be removed in v3. Migrate to `cartStore`.',
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
