// Small in-memory cache for public, read-only API responses (heatmap, rankings, communities).
// Any successful write to the API (POST/PUT/PATCH/DELETE) invalidates everything, so cached data is
// never older than the last change; the TTL only bounds time-based drift.
const entri = new Map(); // key -> { gen, exp, body }
const MAKS_ENTRI = 200;
let gen = 0;

export class CacheRespons {
  static batalkan() { gen += 1; entri.clear(); }

  /** Middleware for a GET route. The key is the full URL (path + query). */
  static untuk(ttlMs) {
    return (req, res, next) => {
      const key = req.originalUrl;
      const hit = entri.get(key);
      if (hit && hit.gen === gen && hit.exp > Date.now()) {
        res.set('X-Cache', 'HIT');
        return res.json(hit.body);
      }
      const genAwal = gen; // a write that lands while this request runs makes the result unusable
      const json = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode < 400 && genAwal === gen) {
          if (entri.size >= MAKS_ENTRI) entri.delete(entri.keys().next().value);
          entri.set(key, { gen: genAwal, exp: Date.now() + ttlMs, body });
        }
        res.set('X-Cache', 'MISS');
        return json(body);
      };
      return next();
    };
  }

  /** Middleware for the whole API: writes invalidate the cache when they start and when they finish. */
  static penjagaTulis(req, res, next) {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    CacheRespons.batalkan();
    res.on('finish', () => { if (res.statusCode < 400) CacheRespons.batalkan(); });
    return next();
  }
}
