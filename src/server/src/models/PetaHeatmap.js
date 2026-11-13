// C10 PetaHeatmap: clusters of verified reports and their heat intensity (Algo-002, KF06-KF08, KNF03).
import { db, withTransaction } from '../db/pool.js';
import { config } from '../config.js';
import { pointSql } from '../utils/geo.js';
import { cariLokasi as geocode } from '../services/Geocoder.js';

export const KATEGORI = ['Sehat', 'Waspada', 'Berbahaya'];
const BOBOT = { Sehat: 1, Waspada: 2, Berbahaya: 3 };

const toKlaster = (r) => ({
  idKlaster: r.id_klaster,
  lat: r.lat,
  lon: r.lon,
  koordinatPusat: r.wkt,
  heatIntensity: Number(r.heat_intensity),
  kategoriKualitas: r.kategori_kualitas,
  jumlahLaporan: r.jumlah_laporan,
  rataRataKeparahan: Number(r.rata_rata_keparahan),
  rataRataHari: Number(r.rata_rata_hari),
});

/** Bounding box "minLon,minLat,maxLon,maxLat" -> SQL predicate on a geography column. */
function bboxFilter(areaPeta, col, params) {
  if (!areaPeta) return '';
  const p = String(areaPeta).split(',').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) return '';
  params.push(p[0], p[1], p[2], p[3]);
  const n = params.length;
  return ` AND ${col}::geometry && ST_MakeEnvelope($${n - 3}, $${n - 2}, $${n - 1}, $${n}, 4326)`;
}

export class PetaHeatmap {
  /**
   * Algo-002 hitungHeatIntensity(): Q-001 groups verified reports with ST_ClusterDBSCAN
   * (eps = RADIUS_KLASTER, minpoints = 1) on a metric projection, then
   * heat = w1 * jumlahLaporan + w2 * rataRataKeparahan + w3 * rataRataHariBelumDitangani.
   * kategoriKualitas = the most severe indicator in the cluster. Results are cached in peta_heatmap.
   */
  static async hitungHeatIntensity() {
    const { clusterRadius: r, heatW1: w1, heatW2: w2, heatW3: w3 } = config.rules;
    return withTransaction(async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(777001)');
      await c.query('DELETE FROM peta_heatmap');
      await c.query(`UPDATE laporan_pencemaran SET id_klaster = NULL WHERE id_klaster IS NOT NULL`);
      const { rows } = await c.query(
        `WITH k AS (
           SELECT id_laporan, koordinat_gps, indikator_tingkat, tanggal_laporan,
             ST_ClusterDBSCAN(ST_Transform(koordinat_gps::geometry, 3857), eps := $1, minpoints := 1) OVER () AS cid
           FROM laporan_pencemaran WHERE status_laporan IN ('Disetujui', 'Diklaim')
         ), agg AS (
           SELECT cid, count(*)::int AS jumlah_laporan,
             avg(CASE indikator_tingkat WHEN 'Sehat' THEN 1 WHEN 'Waspada' THEN 2 ELSE 3 END) AS rata_rata_keparahan,
             max(CASE indikator_tingkat WHEN 'Sehat' THEN 1 WHEN 'Waspada' THEN 2 ELSE 3 END) AS keparahan_maks,
             avg(EXTRACT(EPOCH FROM (now() - tanggal_laporan)) / 86400.0) AS rata_rata_hari,
             ST_Centroid(ST_Collect(koordinat_gps::geometry)) AS pusat,
             array_agg(id_laporan) AS ids
           FROM k GROUP BY cid
         ), ins AS (
           INSERT INTO peta_heatmap (id_klaster, koordinat_pusat, heat_intensity, kategori_kualitas, jumlah_laporan, rata_rata_keparahan, rata_rata_hari)
           SELECT cid + 1, pusat::geography,
             round(($2 * jumlah_laporan + $3 * rata_rata_keparahan + $4 * rata_rata_hari)::numeric, 2),
             CASE keparahan_maks WHEN 1 THEN 'Sehat' WHEN 2 THEN 'Waspada' ELSE 'Berbahaya' END,
             jumlah_laporan, round(rata_rata_keparahan::numeric, 2), round(rata_rata_hari::numeric, 2)
           FROM agg RETURNING id_klaster
         )
         UPDATE laporan_pencemaran l SET id_klaster = agg.cid + 1 FROM agg WHERE l.id_laporan = ANY(agg.ids)
         RETURNING l.id_laporan`,
        [r * 1.01, w1, w2, w3]);
      const n = await c.query('SELECT count(*)::int AS n FROM peta_heatmap');
      return { klaster: n.rows[0].n, laporan: rows.length };
    });
  }

  /**
   * tampilkanHeatmap(): JSON layer for the map: points (weighted by severity) and clusters.
   * Optional kategori filter (array) and areaPeta bbox.
   */
  static async tampilkanHeatmap({ kategori = KATEGORI, areaPeta = null } = {}, client) {
    const kat = kategori.filter((k) => KATEGORI.includes(k));
    if (!kat.length) return { klaster: [], titik: [] };
    const params = [kat.length ? kat : KATEGORI];
    const bboxK = bboxFilter(areaPeta, 'p.koordinat_pusat', params);
    const params2 = [kat.length ? kat : KATEGORI];
    const bboxL = bboxFilter(areaPeta, 'l.koordinat_gps', params2);
    // Both queries run in parallel (separate pool connections) to keep the layer well under 3 s (KNF03).
    const [klaster, titik] = await Promise.all([
      db(client).query(
        `SELECT p.id_klaster, ST_Y(p.koordinat_pusat::geometry) AS lat, ST_X(p.koordinat_pusat::geometry) AS lon,
           ST_AsText(p.koordinat_pusat) AS wkt, p.heat_intensity, p.kategori_kualitas, p.jumlah_laporan, p.rata_rata_keparahan, p.rata_rata_hari
         FROM peta_heatmap p WHERE p.kategori_kualitas = ANY($1) ${bboxK} ORDER BY p.heat_intensity DESC`, params),
      db(client).query(
        `SELECT l.id_laporan, l.kode, round(ST_Y(l.koordinat_gps::geometry)::numeric, 6) AS lat, round(ST_X(l.koordinat_gps::geometry)::numeric, 6) AS lon,
           l.indikator_tingkat, l.status_laporan, l.lokasi_nama, l.tanggal_laporan, l.id_klaster, p.heat_intensity, p.kategori_kualitas
         FROM laporan_pencemaran l LEFT JOIN peta_heatmap p ON p.id_klaster = l.id_klaster
         WHERE l.status_laporan IN ('Disetujui','Diklaim') AND p.kategori_kualitas = ANY($1) ${bboxL}`, params2),
    ]);
    return {
      klaster: klaster.rows.map(toKlaster),
      titik: titik.rows.map((r) => ({
        idLaporan: r.id_laporan,
        kode: r.kode,
        lat: r.lat,
        lon: r.lon,
        indikatorTingkat: r.indikator_tingkat,
        statusLaporan: r.status_laporan,
        lokasiNama: r.lokasi_nama,
        tanggalLaporan: r.tanggal_laporan,
        idKlaster: r.id_klaster,
        heatIntensity: r.heat_intensity != null ? Number(r.heat_intensity) : null,
        kategoriKualitas: r.kategori_kualitas,
        bobot: BOBOT[r.indikator_tingkat] || 1,
      })),
    };
  }

  /** filterBerdasarkanKategori(kategori, areaPeta) */
  static async filterBerdasarkanKategori(kategori, areaPeta, client) {
    return PetaHeatmap.tampilkanHeatmap({ kategori, areaPeta }, client);
  }

  /** cariLokasi(kataKunci): {lat, lon, nama, bbox} or null when not found. */
  static async cariLokasi(kataKunci) {
    return geocode(kataKunci);
  }

  /** getDetailKlaster(koordinatTitik): cluster containing (or nearest within radius of) a point. */
  static async getDetailKlaster({ lat, lon }, client) {
    const { rows } = await db(client).query(
      `SELECT p.id_klaster, ST_Y(p.koordinat_pusat::geometry) AS lat, ST_X(p.koordinat_pusat::geometry) AS lon,
         ST_AsText(p.koordinat_pusat) AS wkt, p.heat_intensity, p.kategori_kualitas, p.jumlah_laporan, p.rata_rata_keparahan, p.rata_rata_hari
       FROM peta_heatmap p WHERE ST_DWithin(p.koordinat_pusat, ${pointSql('$1', '$2')}, $3)
       ORDER BY ST_Distance(p.koordinat_pusat, ${pointSql('$1', '$2')}) LIMIT 1`,
      [lon, lat, config.rules.clusterRadius * 2]);
    return rows[0] ? toKlaster(rows[0]) : null;
  }

  /**
   * Board view: ranked lots, one row per cluster. The lot code is stable: a claimed report keeps
   * representing its cluster (so claiming LP-0001 keeps LP-0001 on the board, now marked held);
   * otherwise the most severe, oldest report represents it.
   */
  static async getPapanHotspot({ kategori = KATEGORI, limit = 50 } = {}, client) {
    if (!kategori.length) return [];
    const { rows } = await db(client).query(
      `SELECT DISTINCT ON (p.id_klaster) p.id_klaster, p.heat_intensity, p.kategori_kualitas, p.jumlah_laporan, p.rata_rata_hari,
         l.id_laporan, l.kode, l.lokasi_nama, l.status_laporan, ST_Y(l.koordinat_gps::geometry) AS lat, ST_X(l.koordinat_gps::geometry) AS lon,
         l.tanggal_laporan
       FROM peta_heatmap p JOIN laporan_pencemaran l ON l.id_klaster = p.id_klaster
       WHERE p.kategori_kualitas = ANY($1)
       ORDER BY p.id_klaster, (l.status_laporan = 'Diklaim') DESC,
         CASE l.indikator_tingkat WHEN 'Berbahaya' THEN 3 WHEN 'Waspada' THEN 2 ELSE 1 END DESC, l.tanggal_laporan ASC, l.kode ASC`,
      [kategori.length ? kategori : KATEGORI]);
    return rows
      .map((r) => ({
        idKlaster: r.id_klaster, heatIntensity: Number(r.heat_intensity), kategoriKualitas: r.kategori_kualitas,
        jumlahLaporan: r.jumlah_laporan, rataRataHari: Number(r.rata_rata_hari), idLaporan: r.id_laporan, kode: r.kode,
        lokasiNama: r.lokasi_nama, statusLaporan: r.status_laporan, lat: r.lat, lon: r.lon, tanggalLaporan: r.tanggal_laporan,
      }))
      .sort((a, b) => b.heatIntensity - a.heatIntensity)
      .slice(0, limit);
  }
}
