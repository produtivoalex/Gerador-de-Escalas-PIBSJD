import type { Plugin, Connect } from 'vite';
import { handleAIRequest, MAX_REQUEST_BYTES } from './api';
import type { ServerEnv } from './api';

export function aiApiPlugin(env: ServerEnv): Plugin {
  const middleware: Connect.NextHandleFunction = async (req, res, next) => {
    if (req.url === '/api/session') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ enabled: false })); return;
    }
    if (req.url?.split('?')[0] !== '/api/generate') return next();
    try {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_REQUEST_BYTES) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Pedido muito grande.' })); return;
        }
        chunks.push(Buffer.from(chunk));
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value);
      const request = new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method, headers,
        ...(!['GET', 'HEAD'].includes(req.method || 'GET') ? { body: Buffer.concat(chunks) } : {})
      });
      const response = await handleAIRequest(request, env);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro no servidor da IA. Tente novamente.' }));
    }
  };
  return {
    name: 'cultogen-api',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); }
  };
}
