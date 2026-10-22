import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Connect } from 'vite';

/**
 * Fake backend. Kept in-process so the corpus app needs no separate server.
 * Two seeded server-side faults live here — see corpus/BUGS.md (B02, B10).
 */
function fakeApi() {
  const orders: { id: string; total: number; notes: string }[] = [];

  const handler: Connect.NextHandleFunction = (req, res, next) => {
    if (!req.url?.startsWith('/api/')) return next();

    const json = (status: number, body: unknown) => {
      res.statusCode = status;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(body));
    };

    if (req.url === '/api/checkout' && req.method === 'POST') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        let body: { total?: number; notes?: string } = {};
        try {
          body = JSON.parse(raw || '{}');
        } catch {
          return json(400, { error: 'bad json' });
        }
        const notes = body.notes ?? '';

        /* B02 — unescaped apostrophe blows up the "query builder" */
        if (notes.includes("'")) {
          return json(500, {
            error: "SequelizeDatabaseError: syntax error at or near \"s\"",
            query: `INSERT INTO orders (notes) VALUES ('${notes}')`,
          });
        }

        /* B10 — no idempotency key, so a re-submit creates a second order */
        const order = {
          id: `ORD-${1000 + orders.length}`,
          total: body.total ?? 0,
          notes,
        };
        orders.push(order);
        setTimeout(() => json(200, { ...order, orderCount: orders.length }), 350);
      });
      return;
    }

    if (req.url === '/api/orders') return json(200, { orders });
    if (req.url === '/api/reset' && req.method === 'POST') {
      orders.length = 0;
      return json(200, { ok: true });
    }
    return json(404, { error: 'not found' });
  };

  return {
    name: 'fake-api',
    configureServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [react(), fakeApi()],
});
