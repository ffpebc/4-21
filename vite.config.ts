import 'dotenv/config';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {handleNodeExplainMiddleware} from './server/geminiExplainHandler';

const DATA_DIR = path.resolve(import.meta.dirname, '.data');
const PROFILES_FILE = path.join(DATA_DIR, 'cloud-profiles.json');
const memoryProfiles: Record<string, any> = {};

function readProfiles(): Record<string, any> {
  try {
    if (!fs.existsSync(PROFILES_FILE)) return memoryProfiles;
    const raw = fs.readFileSync(PROFILES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    Object.assign(memoryProfiles, parsed);
    return memoryProfiles;
  } catch {
    return memoryProfiles;
  }
}

function writeProfiles(profiles: Record<string, any>): void {
  Object.assign(memoryProfiles, profiles);
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf-8');
  } catch {
    // Ignore in read-only environments
  }
}

function normalizePin(rawPin: string): string {
  let pin = String(rawPin || '')
    .trim()
    .toUpperCase();
  if (pin === 'ФФПЕБК') pin = 'FFPEBC';
  return pin
    .replace(/[^A-ZА-ЯЁ0-9_-]/g, '')
    .slice(0, 32);
}

function apiSyncPlugin(): Plugin {
  const handleSync = (req: any, res: any, next: any) => {
    const rawUrl = req.url || '';
    const match = rawUrl.match(/\/api\/sync\/([^?#]+)/);
    if (!match) return next();

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, If-Modified-Since, Cache-Control, Pragma, X-Gemini-Api-Key');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const pin = normalizePin(decodeURIComponent(match[1]));
    if (!pin || pin.length < 2) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Код профиля должен содержать минимум 2 символа.' }));
      return;
    }

    if (req.method === 'GET') {
      const profiles = readProfiles();
      const record = profiles[pin];
      if (!record) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ found: false, pin }));
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        found: true,
        pin: record.pin,
        payload: record.payload,
        updatedAt: record.updatedAt,
      }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const payload = parsed.payload || parsed;
          const profiles = readProfiles();
          const record = {
            pin,
            payload,
            updatedAt: Date.now(),
          };
          profiles[pin] = record;
          writeProfiles(profiles);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, pin, updatedAt: record.updatedAt }));
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Некорректные данные синхронизации.' }));
        }
      });
      return;
    }

    next();
  };

  const handleExplain = (req: any, res: any, next: any) => {
    const rawUrl = (req.url || '').split('?')[0];
    if (
      rawUrl !== '/api/explain' &&
      rawUrl !== '/api/explain/stream' &&
      rawUrl !== '/api/explain/status'
    ) {
      return next();
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, If-Modified-Since, Cache-Control, Pragma, X-Gemini-Api-Key');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    handleNodeExplainMiddleware(req, res).catch((err) => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: String(err?.message || 'Internal error') }));
    });
  };

  return {
    name: 'api-cloud-sync-plugin',
    configureServer(server) {
      server.middlewares.use(handleSync);
      server.middlewares.use(handleExplain);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleSync);
      server.middlewares.use(handleExplain);
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      apiSyncPlugin(),
      {
        name: 'purge-huge-dist-data',
        closeBundle() {
          const distData = path.resolve(import.meta.dirname, 'dist/data');
          if (fs.existsSync(distData)) {
            fs.rmSync(distData, { recursive: true, force: true });
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
            if (id.includes('tasksBankData')) {
              return 'task-bank';
            }
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 3000,
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 3000,
      allowedHosts: true,
    },
  };
});
