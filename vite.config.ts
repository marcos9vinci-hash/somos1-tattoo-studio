import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function apiDevPlugin() {
  return {
    name: 'api-dev-server',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url.startsWith('/api')) {
          return next();
        }

        try {
          if (!res.status) {
            res.status = function(code: number) {
              this.statusCode = code;
              return this;
            };
          }
          if (!res.json) {
            res.json = function(data: any) {
              this.setHeader('Content-Type', 'application/json');
              this.end(JSON.stringify(data));
              return this;
            };
          }
          if (!res.redirect) {
            res.redirect = function(url: string) {
              this.statusCode = 302;
              this.setHeader('Location', url);
              this.end();
              return this;
            };
          }

          const apiHandler = (await import('./api/index.js')).default;
          const fullUrl = new URL(req.url, `http://${req.headers.host}`);
          req.query = Object.fromEntries(fullUrl.searchParams.entries());

          if (req.method === 'POST' || req.method === 'PUT') {
            let bodyStr = '';
            req.on('data', (chunk: any) => { bodyStr += chunk; });
            req.on('end', async () => {
              try {
                req.body = JSON.parse(bodyStr);
              } catch {
                req.body = {};
              }
              await apiHandler(req, res);
            });
          } else {
            req.body = {};
            await apiHandler(req, res);
          }
        } catch (err) {
          console.error('Dev API Server error:', err);
          res.status(500).json({ error: String(err) });
        }
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [apiDevPlugin(), react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 4000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
