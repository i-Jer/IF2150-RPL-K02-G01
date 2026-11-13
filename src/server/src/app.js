// Express application: security headers, API, release files and the built web client.
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { api } from './routes/api.js';
import { AppError } from './utils/errors.js';

export function buatApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'wasm-unsafe-eval'"],
        'worker-src': ["'self'", 'blob:'],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'connect-src': ["'self'", 'https://tiles.openfreemap.org', 'https://*.openfreemap.org', 'https:'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'frame-ancestors': ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  // Compress everything except the SSE stream.
  app.use(compression({ filter: (req, res) => !req.path.endsWith('/stream') && compression.filter(req, res) }));
  app.use(cookieParser());
  app.use(express.json({ limit: '200kb' }));

  // The Android app (Capacitor) runs on https://localhost and calls the API cross-origin with a Bearer token.
  const asalApp = ['https://localhost', 'capacitor://localhost', 'http://localhost', 'http://localhost:5173'];
  app.use('/api', (req, res, next) => {
    const origin = req.get('origin');
    if (origin && asalApp.includes(origin)) {
      res.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-SeaGuard-Client',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
      });
      if (req.method === 'OPTIONS') return res.sendStatus(204);
    }
    next();
  });

  app.use('/api', api);
  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }));

  // Release files (OTA bundle zips and APKs).
  app.use('/release', express.static(config.releaseDir, {
    setHeaders: (res, file) => {
      if (file.endsWith('.apk')) {
        res.set('Content-Type', 'application/vnd.android.package-archive');
        res.set('Content-Disposition', `attachment; filename="${path.basename(file)}"`);
      }
      res.set('Cache-Control', 'public, max-age=300');
    },
  }));
  app.get('/download/android', (req, res) => {
    try {
      const n = JSON.parse(fs.readFileSync(path.join(config.releaseDir, 'native.json'), 'utf8'));
      return res.redirect(302, `/release/${n.file}`);
    } catch {
      return res.status(404).send('APK not published yet.');
    }
  });

  // Web client (SPA).
  if (fs.existsSync(config.webDist)) {
    app.use(express.static(config.webDist, {
      index: false,
      setHeaders: (res, file) => {
        res.set('Cache-Control', /[\\/]assets[\\/]/.test(file) ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    }));
    app.get(/^(?!\/api\/|\/release\/).*/, (_req, res) => res.set('Cache-Control', 'no-cache').sendFile(path.join(config.webDist, 'index.html')));
  }

  // Errors -> {error: {code, message, details}}
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    if (err instanceof AppError || (err.status && err.code && typeof err.code === 'string' && err.status < 600)) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Malformed request.' } });
    console.error('[error]', req.method, req.path, err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Something went wrong on our side. Please try again.' } });
  });
  return app;
}
