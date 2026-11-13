// C05 BuktiPembersihan: before/after photos and the geofence check (Algo-004, KF14, KNF06).
import { db } from '../db/pool.js';
import { config } from '../config.js';
import { pointSql } from '../utils/geo.js';

export class BuktiPembersihan {
  /**
   * Algo-004 validasiGeofencingRadius(gpsBefore, gpsAfter, koordinatKlaim).
   * Q-004 measures geodesic distance with PostGIS ST_Distance on geography.
   * Accepts up to 100 m plus the 10 m tolerance from KNF06.
   */
  static async validasiGeofencingRadius(gpsBefore, gpsAfter, koordinatKlaim, client) {
    if (!gpsBefore || !gpsAfter || !koordinatKlaim) return { valid: false, code: 'GPS_MISSING' };
    const { rows } = await db(client).query(
      `SELECT ST_Distance(${pointSql('$1', '$2')}, ${pointSql('$5', '$6')}) AS jarak_before,
              ST_Distance(${pointSql('$3', '$4')}, ${pointSql('$5', '$6')}) AS jarak_after`,
      [gpsBefore.lon, gpsBefore.lat, gpsAfter.lon, gpsAfter.lat, koordinatKlaim.lon, koordinatKlaim.lat]);
    const batas = config.rules.geofenceRadius + config.rules.geofenceTolerance;
    const jarakBefore = Math.round(rows[0].jarak_before * 10) / 10;
    const jarakAfter = Math.round(rows[0].jarak_after * 10) / 10;
    return {
      valid: jarakBefore <= batas && jarakAfter <= batas,
      jarakBefore,
      jarakAfter,
      radius: config.rules.geofenceRadius,
      toleransi: config.rules.geofenceTolerance,
      code: jarakBefore <= batas && jarakAfter <= batas ? null : 'GEOFENCE_OUTSIDE',
    };
  }

  /** tampilkanPerbandinganFoto(idPembersihan): before/after URLs plus where each was taken. */
  static async tampilkanPerbandinganFoto(idPembersihan, client) {
    const { rows } = await db(client).query(
      `SELECT foto_before_url, foto_after_url, ST_Y(gps_before::geometry) AS lat_b, ST_X(gps_before::geometry) AS lon_b,
         ST_Y(gps_after::geometry) AS lat_a, ST_X(gps_after::geometry) AS lon_a, sumber_gps_before, sumber_gps_after,
         jarak_before_m, jarak_after_m FROM bukti_pembersihan WHERE id_pembersihan = $1`, [idPembersihan]);
    const r = rows[0];
    if (!r) return null;
    return {
      before: { url: `/api/foto/${r.foto_before_url}`, lat: r.lat_b, lon: r.lon_b, sumber: r.sumber_gps_before, jarakM: r.jarak_before_m },
      after: { url: `/api/foto/${r.foto_after_url}`, lat: r.lat_a, lon: r.lon_a, sumber: r.sumber_gps_after, jarakM: r.jarak_after_m },
    };
  }
}
