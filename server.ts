import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const PROFILES_FILE = path.join(DATA_DIR, 'cloud-profiles.json');

export interface CloudProfileRecord {
  pin: string;
  payload: Record<string, unknown>;
  updatedAt: number;
}

const memoryProfiles: Record<string, CloudProfileRecord> = {};

function readProfiles(): Record<string, CloudProfileRecord> {
  try {
    if (!fs.existsSync(PROFILES_FILE)) {
      return memoryProfiles;
    }
    const raw = fs.readFileSync(PROFILES_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, CloudProfileRecord>;
    Object.assign(memoryProfiles, parsed);
    return memoryProfiles;
  } catch {
    return memoryProfiles;
  }
}

function writeProfiles(profiles: Record<string, CloudProfileRecord>): void {
  Object.assign(memoryProfiles, profiles);
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf-8');
  } catch {
    // Ignore write failures in read-only environments; in-memory cache remains active
  }
}

function normalizePin(rawPin: string): string {
  return String(rawPin || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-ZА-ЯЁ0-9_-]/g, '')
    .slice(0, 32);
}

// Pre-load on startup
readProfiles();

async function startServer() {
  const app = express();

  // 1. CORS headers for Google AI Studio webview iframes, cloud workstation proxies and multi-device access
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, If-Modified-Since, Cache-Control, Pragma'
    );
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // 2. Support both application/json and text/plain (for beacon unloads)
  app.use(express.json({ limit: '4mb' }));
  app.use(express.text({ limit: '4mb', type: ['text/*', 'application/x-www-form-urlencoded'] }));

  app.get('/api/sync/:pin', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const pin = normalizePin(req.params.pin);
    if (!pin || pin.length < 2) {
      res.status(400).json({ error: 'Код профиля должен содержать минимум 2 символа.' });
      return;
    }
    const profiles = readProfiles();
    const record = profiles[pin];
    if (!record) {
      res.status(200).json({ found: false, pin });
      return;
    }

    const since = Number(req.query.since || 0);
    if (since > 0 && record.updatedAt <= since) {
      res.json({
        notModified: true,
        found: true,
        pin: record.pin,
        updatedAt: record.updatedAt,
      });
      return;
    }

    res.json({
      found: true,
      pin: record.pin,
      payload: record.payload,
      updatedAt: record.updatedAt,
    });
  });

  app.post('/api/sync/:pin', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    const pin = normalizePin(req.params.pin);
    if (!pin || pin.length < 2) {
      res.status(400).json({ error: 'Код профиля должен содержать минимум 2 символа.' });
      return;
    }

    let payload = req.body?.payload;
    if (!payload && typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        payload = parsed.payload || parsed;
      } catch {
        // invalid string body
      }
    } else if (!payload && req.body && typeof req.body === 'object') {
      payload = req.body;
    }

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Некорректные данные синхронизации.' });
      return;
    }

    const profiles = readProfiles();
    const record: CloudProfileRecord = {
      pin,
      payload: payload as Record<string, unknown>,
      updatedAt: Date.now(),
    };
    profiles[pin] = record;
    writeProfiles(profiles);
    res.json({ ok: true, pin, updatedAt: record.updatedAt });
  });

  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV === 'production' && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} [mode: ${process.env.NODE_ENV || 'development'}, dist: ${hasDist}]`);
  });
}

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection:', reason);
});

startServer();
