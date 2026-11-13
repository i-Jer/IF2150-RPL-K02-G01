// Location search and reverse lookup. Uses OpenStreetMap Nominatim (third-party map service, SKPL 2.2)
// with an in-memory cache, a 1 request/second queue (Nominatim usage policy), and a local
// gazetteer of Indonesian coastal places as fallback when the service is unreachable.
import { config } from '../config.js';
import { insideIndonesiaBox } from '../utils/geo.js';

const GAZETTEER = [
  ['Muara Angke, Jakarta', -6.1066, 106.7738], ['Teluk Jakarta', -6.05, 106.85], ['Kepulauan Seribu', -5.75, 106.55],
  ['Pantai Ancol, Jakarta', -6.1218, 106.8443], ['Marunda, Jakarta', -6.0985, 106.9604], ['Tanjung Priok, Jakarta', -6.1045, 106.8806],
  ['Pantai Kuta, Bali', -8.7184, 115.1686], ['Pantai Sanur, Bali', -8.6783, 115.2635], ['Pantai Kedonganan, Bali', -8.7605, 115.1674],
  ['Tambak Lorok, Semarang', -6.9496, 110.4431], ['Pantai Marina, Semarang', -6.9479, 110.3893], ['Pantai Kenjeran, Surabaya', -7.2368, 112.7981],
  ['Pantai Losari, Makassar', -5.1438, 119.4073], ['Belawan, Medan', 3.7804, 98.6935], ['Pantai Padang', -0.9471, 100.3543],
  ['Pangandaran', -7.6964, 108.6534], ['Pantai Parangtritis, Yogyakarta', -8.0256, 110.3286], ['Pelabuhan Ratu', -6.9886, 106.5527],
  ['Pantai Anyer, Banten', -6.0717, 105.8833], ['Teluk Lampung', -5.4972, 105.2647], ['Pantai Manado', 1.4931, 124.8413],
  ['Teluk Ambon', -3.6954, 128.1814], ['Pantai Kupang', -10.1617, 123.5775], ['Labuan Bajo', -8.4964, 119.8877],
  ['Pantai Senggigi, Lombok', -8.4964, 116.0437], ['Balikpapan', -1.2675, 116.8289], ['Pontianak', -0.0263, 109.3425],
  ['Teluk Bintuni', -2.1, 133.5], ['Raja Ampat', -0.5, 130.5], ['Pantai Bunaken', 1.6215, 124.7627],
  ['Cirebon', -6.7063, 108.5571], ['Tegal', -6.8694, 109.1402], ['Pekalongan', -6.8886, 109.6753],
  ['Bandar Lampung', -5.4292, 105.2611], ['Batam', 1.0456, 104.0305], ['Pantai Bandengan, Jepara', -6.5562, 110.6484],
  ['Bandung', -6.9147, 107.6098], ['ITB Ganesha, Bandung', -6.8915, 107.6107],
];

const cache = new Map();
let lastCall = 0;

async function nominatim(path) {
  if (cache.has(path)) return cache.get(path);
  const wait = Math.max(0, lastCall + 1100 - Date.now());
  lastCall = Date.now() + wait;
  if (wait) await new Promise((r) => setTimeout(r, wait));
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/${path}`, {
      headers: { 'User-Agent': config.userAgent, 'Accept-Language': 'id,en' },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const json = await res.json();
    if (cache.size > 2000) cache.clear();
    cache.set(path, json);
    return json;
  } finally {
    clearTimeout(t);
  }
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

function cariGazetteer(q) {
  const n = norm(q);
  if (!n) return null;
  const hit = GAZETTEER.find(([nama]) => norm(nama).includes(n)) || GAZETTEER.find(([nama]) => n.split(' ').every((w) => norm(nama).includes(w)));
  return hit ? { nama: hit[0], lat: hit[1], lon: hit[2], bbox: null, sumber: 'lokal' } : null;
}

// Abbreviations and nicknames Indonesians type instead of the official name. The search expands them
// before asking the map service, and the suggestion shows the long form so people learn it.
const SINGKATAN = {
  bsd: ['BSD City', 'Bumi Serpong Damai'], pik: ['Pantai Indah Kapuk', 'PIK'], pik2: ['Pantai Indah Kapuk 2', 'PIK 2'],
  tmii: ['Taman Mini Indonesia Indah', 'TMII'], gbk: ['Gelora Bung Karno', 'GBK'],
  jakut: ['Jakarta Utara', 'Jakut'], jaksel: ['Jakarta Selatan', 'Jaksel'], jakbar: ['Jakarta Barat', 'Jakbar'],
  jaktim: ['Jakarta Timur', 'Jaktim'], jakpus: ['Jakarta Pusat', 'Jakpus'], tangsel: ['Tangerang Selatan', 'Tangsel'],
  jogja: ['Yogyakarta', 'Jogja'], jogjakarta: ['Yogyakarta', 'Jogja'], yogya: ['Yogyakarta', 'Yogya'], diy: ['Yogyakarta', 'DIY'],
  ntt: ['Nusa Tenggara Timur', 'NTT'], ntb: ['Nusa Tenggara Barat', 'NTB'],
  jabar: ['Jawa Barat', 'Jabar'], jateng: ['Jawa Tengah', 'Jateng'], jatim: ['Jawa Timur', 'Jatim'],
  sumut: ['Sumatera Utara', 'Sumut'], sumbar: ['Sumatera Barat', 'Sumbar'], sumsel: ['Sumatera Selatan', 'Sumsel'],
  sulsel: ['Sulawesi Selatan', 'Sulsel'], sulut: ['Sulawesi Utara', 'Sulut'], kalbar: ['Kalimantan Barat', 'Kalbar'],
  kaltim: ['Kalimantan Timur', 'Kaltim'], kalsel: ['Kalimantan Selatan', 'Kalsel'], babel: ['Kepulauan Bangka Belitung', 'Babel'],
  kepri: ['Kepulauan Riau', 'Kepri'], kepseribu: ['Kepulauan Seribu', 'Kep. Seribu'], pulauseribu: ['Kepulauan Seribu', 'Pulau Seribu'],
  itb: ['Institut Teknologi Bandung', 'ITB'], ui: ['Universitas Indonesia', 'UI'], ugm: ['Universitas Gadjah Mada', 'UGM'],
  jkt: ['Jakarta', 'JKT'], bdg: ['Bandung', 'BDG'], sby: ['Surabaya', 'SBY'], smg: ['Semarang', 'SMG'], mks: ['Makassar', 'MKS'],
};

// Rank real places (cities, neighbourhoods, villages, beaches, islands) above shops, kiosks, roads and bus stops.
function bobotJenis(key, value) {
  if (key === 'place') {
    return { city: 100, town: 95, municipality: 95, county: 90, district: 88, suburb: 90, quarter: 85, village: 85, neighbourhood: 80, hamlet: 70, island: 90, islet: 80, state: 75, region: 70, locality: 65 }[value] ?? 60;
  }
  if (key === 'natural') return { beach: 95, bay: 90, coastline: 85, cape: 80, water: 70 }[value] ?? 60;
  if (key === 'boundary') return 70;
  if (key === 'landuse' && value === 'residential') return 60;
  if (key === 'tourism' || key === 'leisure') return 50;
  if (key === 'amenity' || key === 'building') return 30;
  if (key === 'highway' || key === 'railway' || key === 'public_transport') return 15;
  if (key === 'shop' || key === 'office') return 10;
  return 35;
}

/** Photon (OSM search built for type-ahead), limited to Indonesia. */
async function photon(q) {
  const key = `photon:${q}`;
  if (cache.has(key)) return cache.get(key);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=12&bbox=94.5,-11.2,141.2,6.2`, {
      headers: { 'User-Agent': config.userAgent }, signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`photon ${res.status}`);
    const json = await res.json();
    const out = (json.features || []).filter((f) => !f.properties.countrycode || f.properties.countrycode === 'ID').map((f) => {
      const p = f.properties;
      const area = [p.district || p.locality, p.city || p.county, p.state].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i && v !== p.name);
      const bb = p.extent ? [p.extent[0], p.extent[3], p.extent[2], p.extent[1]] : null;
      return { nama: p.name || area[0] || q, detail: area.slice(0, 2).join(', '), lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], bbox: bb, bobot: bobotJenis(p.osm_key, p.osm_value), sumber: 'osm' };
    });
    if (cache.size > 2000) cache.clear();
    cache.set(key, out);
    return out;
  } finally { clearTimeout(t); }
}

async function nominatimDaftar(q) {
  const json = await nominatim(`search?format=jsonv2&limit=8&countrycodes=id&q=${encodeURIComponent(q)}`);
  return (Array.isArray(json) ? json : []).map((r) => {
    const parts = String(r.display_name || '').split(',').map((x) => x.trim());
    const bb = r.boundingbox ? [Number(r.boundingbox[2]), Number(r.boundingbox[0]), Number(r.boundingbox[3]), Number(r.boundingbox[1])] : null;
    return { nama: r.name || parts[0], detail: parts.slice(1, 3).join(', '), lat: Number(r.lat), lon: Number(r.lon), bbox: bb, bobot: bobotJenis(r.category, r.type), sumber: 'osm' };
  });
}

/**
 * Suggestions for the place search as the user types: up to 6 places, real places first.
 * Expands common abbreviations (BSD -> BSD City, "Bumi Serpong Damai"), asks Photon, falls back to
 * Nominatim, and always mixes in the local gazetteer of coastal places.
 */
export async function saranLokasi(kataKunci) {
  const q = String(kataKunci || '').trim().slice(0, 120);
  if (q.length < 2) return [];
  const coord = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (coord) {
    const lat = Number(coord[1]); const lon = Number(coord[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return [{ nama: `${lat}, ${lon}`, detail: '', lat, lon, bbox: null, sumber: 'koordinat' }];
  }
  const n = norm(q);
  const alias = SINGKATAN[n.replace(/\s+/g, '')];
  const queries = alias ? [alias[0], q] : [q];
  let hasil = [];
  for (const qq of queries) {
    let r = [];
    try { r = await photon(qq); } catch { try { r = await nominatimDaftar(qq); } catch { r = []; } }
    hasil.push(...r);
  }
  hasil.push(...GAZETTEER.filter(([nama]) => norm(nama).includes(n) || n.split(' ').every((w) => norm(nama).includes(w)))
    .map(([nama, lat, lon]) => ({ nama, detail: '', lat, lon, bbox: null, bobot: 92, sumber: 'lokal' })));
  // Score: kind of place, plus a bonus when the name starts with what was typed, and more for the expansion itself.
  const awal = [n, alias ? norm(alias[0]) : null].filter(Boolean);
  hasil = hasil.map((h) => ({
    ...h,
    skor: h.bobot + (awal.some((a) => norm(h.nama).startsWith(a)) ? 25 : 0) + (alias && norm(h.nama) === norm(alias[0]) ? 30 : 0),
  }));
  hasil.sort((a, b) => b.skor - a.skor);
  const seen = new Set();
  const out = [];
  for (const h of hasil) {
    const key = `${norm(h.nama)}|${h.lat.toFixed(2)}|${h.lon.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const dikenal = alias && norm(h.nama) === norm(alias[0]) && norm(alias[1]) !== n ? alias[1] : '';
    out.push({ nama: h.nama, detail: [dikenal, h.detail].filter(Boolean).join(' · '), lat: h.lat, lon: h.lon, bbox: h.bbox, sumber: h.sumber });
    if (out.length >= 6) break;
  }
  return out;
}

/** PetaHeatmap.cariLokasi: the best match {nama, lat, lon, bbox} or null ("Lokasi tidak ditemukan"). */
export async function cariLokasi(kataKunci) {
  const [top] = await saranLokasi(kataKunci);
  return top || null;
}

/**
 * Reverse lookup used by R02 (reject reports outside Indonesian coast/waters) and to name the place.
 * Returns {negara, nama, diLaut}. Sea points have no address and resolve to diLaut = true.
 */
export async function lokasiTerbalik({ lat, lon }) {
  if (!insideIndonesiaBox({ lat, lon })) return { negara: null, nama: '', diLaut: false, diLuarKotak: true };
  try {
    const json = await nominatim(`reverse?format=jsonv2&zoom=14&lat=${lat}&lon=${lon}`);
    if (!json || json.error) return { negara: 'id', nama: '', diLaut: true };
    const a = json.address || {};
    const nama = [a.beach || a.village || a.suburb || a.hamlet || a.neighbourhood || a.town, a.city || a.county || a.regency, a.state]
      .filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 2).join(', ');
    return { negara: (a.country_code || '').toLowerCase() || null, nama: nama || json.name || '', diLaut: false };
  } catch {
    return { negara: null, nama: '', diLaut: false, gagal: true };
  }
}
