// Coordinate helpers. Coordinates travel as WKT `POINT(lon lat)` (DPPL 5.0) and as {lat, lon}.
import { config } from '../config.js';
import { bad } from './errors.js';

export function parseLatLon(lat, lon, field = 'coordinates') {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || la < -90 || la > 90 || lo < -180 || lo > 180) {
    throw bad('COORD_INVALID', `Invalid ${field}.`);
  }
  return { lat: Math.round(la * 1e6) / 1e6, lon: Math.round(lo * 1e6) / 1e6 };
}

export const toWKT = ({ lat, lon }) => `POINT(${lon} ${lat})`;

export function parseWKT(wkt) {
  const m = /POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i.exec(wkt || '');
  return m ? { lon: Number(m[1]), lat: Number(m[2]) } : null;
}

/** Great-circle distance in meters (used for client previews and tests; the DB uses PostGIS). */
export function haversine(a, b) {
  const R = 6371008.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function insideIndonesiaBox({ lat, lon }) {
  const b = config.indonesiaBox;
  return lon >= b.minLon && lon <= b.maxLon && lat >= b.minLat && lat <= b.maxLat;
}

/** SQL fragment that builds a geography point from two numeric params ($lon, $lat). */
export const pointSql = (lonParam, latParam) =>
  `ST_SetSRID(ST_MakePoint(${lonParam}, ${latParam}), 4326)::geography`;
