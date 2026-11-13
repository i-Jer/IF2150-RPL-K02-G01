// Central configuration, read once from the environment.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Minimal .env loader for local development (Railway injects real env vars).
const envFile = path.resolve(here, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 8080),
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
  databaseUrl: process.env.DATABASE_URL,
  sessionSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  sessionDays: 30,
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION || 'auto',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  // Local fallback folder when no bucket is configured (development only).
  uploadDir: path.resolve(here, '..', 'uploads'),
  webDist: path.resolve(here, '..', '..', 'web', 'dist'),
  releaseDir: path.resolve(here, '..', 'release'),

  // Business rules taken from SKPL/DPPL.
  rules: {
    maxPhotoBytes: 5 * 1024 * 1024, // KF03
    geofenceRadius: 100, // KF14 (meters)
    geofenceTolerance: 10, // KNF06 (meters)
    claimDays: 7, // R12
    loginMaxFail: 5, // KNF09
    loginLockMinutes: 15, // KNF09
    clusterRadius: 500, // Algo-002 RADIUS_KLASTER (meters)
    heatW1: 6, // weight per report in cluster
    heatW2: 12, // weight per average severity (Sehat=1, Waspada=2, Berbahaya=3)
    heatW3: 1.5, // weight per average day unhandled
    pendingReviewHours: 24, // R09
  },
  // Indonesian territory + waters bounding box (R02, coarse first pass).
  indonesiaBox: { minLon: 94.0, maxLon: 141.5, minLat: -11.5, maxLat: 6.5 },
  userAgent: 'SeaGuard/1.0 (+https://seaguard-app-production.up.railway.app)',
};

export default config;
