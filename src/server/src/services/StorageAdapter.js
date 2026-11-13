// C26 StorageAdapter: uploads evidence photos to S3-compatible object storage (Railway bucket).
// Falls back to a local folder in development. unggahFoto retries up to 3 times (KNF01).
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';

const MAKS_PERCOBAAN = 3;

export class StorageAdapter {
  constructor() {
    const s = config.s3;
    this.urlStorage = s.endpoint && s.bucket ? `${s.endpoint}/${s.bucket}` : `file://${config.uploadDir}`;
    this.client = s.endpoint && s.bucket && s.accessKeyId
      ? new S3Client({
        endpoint: s.endpoint,
        region: s.region || 'auto',
        forcePathStyle: false,
        credentials: { accessKeyId: s.accessKeyId, secretAccessKey: s.secretAccessKey },
      })
      : null;
    this.signedCache = new Map();
  }

  get mode() { return this.client ? 's3' : 'local'; }

  /** unggahFoto(foto): stores the file under a random name and returns its key. */
  async unggahFoto(foto, folder = 'bukti') {
    const ext = foto.format === 'png' ? 'png' : 'jpg';
    const key = `${folder}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
    let lastErr;
    for (let percobaan = 1; percobaan <= MAKS_PERCOBAAN; percobaan += 1) {
      try {
        await this.#put(key, foto.buffer, ext === 'png' ? 'image/png' : 'image/jpeg');
        return key;
      } catch (e) {
        lastErr = e;
        console.warn(`[storage] upload attempt ${percobaan} failed: ${e.message}`);
        if (percobaan < MAKS_PERCOBAAN) await new Promise((r) => setTimeout(r, 300 * 2 ** percobaan));
      }
    }
    const err = new Error(`Upload failed after ${MAKS_PERCOBAAN} attempts: ${lastErr?.message}`);
    err.status = 503; err.code = 'UPLOAD_FAILED';
    throw err;
  }

  async simpanBerkas(key, buffer, contentType) {
    return this.#put(key, buffer, contentType);
  }

  async #put(key, body, contentType) {
    if (this.client) {
      await this.client.send(new PutObjectCommand({
        Bucket: config.s3.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable',
      }));
      return;
    }
    const file = path.join(config.uploadDir, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
  }

  /** Short-lived signed URL for a stored object (S3), or null in local mode. */
  async urlBaca(key) {
    if (!this.client) return null;
    const hit = this.signedCache.get(key);
    if (hit && hit.exp > Date.now() + 60_000) return hit.url;
    const url = await getSignedUrl(this.client, new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }), { expiresIn: 3600 });
    if (this.signedCache.size > 5000) this.signedCache.clear();
    this.signedCache.set(key, { url, exp: Date.now() + 3600_000 });
    return url;
  }

  /** Stream an object (used to proxy photos so the app never needs bucket credentials). */
  async baca(key) {
    if (this.client) {
      const out = await this.client.send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }));
      return { stream: out.Body, contentType: out.ContentType, length: out.ContentLength };
    }
    const file = path.join(config.uploadDir, key);
    const buf = await fs.readFile(file);
    return { buffer: buf, contentType: key.endsWith('.png') ? 'image/png' : 'image/jpeg', length: buf.length };
  }
}

export const storage = new StorageAdapter();
