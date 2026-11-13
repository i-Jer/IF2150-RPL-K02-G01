// Tiny PNG encoder used only to generate clearly synthetic demo evidence photos for seed data.
// Provenance: every demo photo is drawn procedurally by gambarDemo() below (no stock or third-party imagery);
// seed.js uploads them as the evidence for fictional demo reports.
import zlib from 'node:zlib';

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * Draws a soft, photo-like coast scene (sky, sea with swell, foam, wet and dry sand, scattered debris
 * with shadows), then softens it with a light blur so it reads like a phone photo rather than pixel art.
 * Clearly synthetic demo material. Returns a PNG buffer.
 */
export function gambarDemo({ width = 640, height = 480, seed = 1, litter = 40 } = {}) {
  const r = rng(seed);
  const sky = [[[150, 196, 220], [222, 236, 242]], [[168, 204, 226], [236, 238, 236]], [[140, 186, 214], [214, 230, 238]]][seed % 3];
  const sea = [[[34, 102, 132], [62, 150, 164]], [[24, 110, 128], [70, 160, 160]], [[30, 92, 124], [58, 138, 158]]][seed % 3];
  const sand = [[214, 196, 162], [226, 210, 178], [206, 188, 154]][seed % 3];
  const horizon = Math.floor(height * (0.3 + r() * 0.06));
  const shore = Math.floor(height * (0.54 + r() * 0.06));
  const px = new Float32Array(width * height * 3);
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const put = (x, y, c, a = 1) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 3;
    for (let k = 0; k < 3; k += 1) px[i + k] = px[i + k] * (1 - a) + c[k] * a;
  };
  const ph = r() * 10;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = shore + Math.sin(x / 53 + ph) * 7 + Math.sin(x / 17 + seed) * 2.5;
      let c;
      if (y < horizon) c = mix(sky[0], sky[1], Math.pow(y / horizon, 1.4));
      else if (y < edge) {
        const t = (y - horizon) / (edge - horizon);
        c = mix(sea[0], sea[1], Math.pow(t, 1.6));
        const swell = Math.sin(x / 41 + y / 3.2 + ph) * Math.sin(y / 9 + ph);
        c = c.map((v) => v + swell * 7 * t);
        if (y > edge - 10) c = mix(c, [236, 242, 240], Math.max(0, 1 - (edge - y) / 10) * 0.85);
      } else {
        const t = Math.min(1, (y - edge) / 46);
        c = mix(sand.map((v) => v - 46), sand, t);
        if (y - edge < 6) c = mix(c, [240, 244, 242], 1 - (y - edge) / 6);
        const grain = (r() - 0.5) * 14;
        c = c.map((v) => v + grain + ((y - shore) / height) * 10);
      }
      put(x, y, c);
    }
  }
  // Weathered litter: sun-faded plastics, foam, bottles and nets, kept muted so it reads as debris, not confetti.
  const debris = [[168, 104, 92], [226, 224, 214], [104, 132, 150], [188, 168, 120], [120, 138, 112], [78, 76, 74], [200, 208, 210], [150, 160, 168]];
  for (let i = 0; i < litter; i += 1) {
    const cy = shore + 22 + r() * (height - shore - 30);
    const cx = r() * width;
    const depth = (cy - shore) / (height - shore);
    const rx = (2.5 + r() * 7) * (0.6 + depth);
    const ry = rx * (0.22 + r() * 0.3);
    const rot = r() * Math.PI;
    const col = debris[Math.floor(r() * debris.length)];
    for (let dy = -ry - 3; dy <= ry + 4; dy += 1) {
      for (let dx = -rx - 3; dx <= rx + 3; dx += 1) {
        const u = (dx * Math.cos(rot) + dy * Math.sin(rot)) / rx;
        const v = (-dx * Math.sin(rot) + dy * Math.cos(rot)) / ry;
        const d = u * u + v * v;
        const us = (dx * Math.cos(rot) + (dy - 2.5) * Math.sin(rot)) / rx;
        const vs = (-dx * Math.sin(rot) + (dy - 2.5) * Math.cos(rot)) / ry;
        if (us * us + vs * vs < 1.2) put(cx + dx, cy + dy, [90, 78, 60], 0.18);
        if (d < 1) put(cx + dx, cy + dy, col.map((c) => c * (0.86 + 0.14 * (1 - v))), Math.min(0.92, (1 - d) * 2.4));
      }
    }
  }
  // Soften: one 3x3 box blur, like a phone lens at this size.
  const out = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let k = 0; k < 3; k += 1) {
        let sum = 0; let n = 0;
        for (let j = -1; j <= 1; j += 1) for (let q = -1; q <= 1; q += 1) {
          const xx = x + q; const yy = y + j;
          if (xx >= 0 && yy >= 0 && xx < width && yy < height) { sum += px[(yy * width + xx) * 3 + k]; n += 1; }
        }
        out[(y * width + x) * 3 + k] = Math.max(0, Math.min(255, Math.round(sum / n)));
      }
    }
  }
  const px8 = out;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 3 + 1)] = 0;
    px8.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
