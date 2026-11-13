import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

// MapLibre 6 resolves its worker next to its own module; after bundling that path no longer exists.
maplibregl.setWorkerUrl(workerUrl);

const STYLE = 'https://tiles.openfreemap.org/styles/positron';
const INDONESIA = [[94.5, -11.2], [141.2, 6.2]];
const KAT_COLOR = ['match', ['get', 'kategori'], 'Sehat', '#2f9e6e', 'Waspada', '#e8a33d', 'Berbahaya', '#c2453b', '#2e7d8c'];

/** Re-tint the basemap into the pearl world: pale nacre land, soft sea-glass water, quiet labels. */
function tintBasemap(map) {
  for (const layer of map.getStyle().layers) {
    const id = layer.id.toLowerCase();
    try {
      if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', '#f2f5f6');
      else if (layer.type === 'fill' && id.includes('water')) map.setPaintProperty(layer.id, 'fill-color', '#d3e4ea');
      else if (layer.type === 'line' && id.includes('waterway')) map.setPaintProperty(layer.id, 'line-color', '#bcd6df');
      else if (layer.type === 'fill' && (id.includes('park') || id.includes('landcover') || id.includes('wood'))) map.setPaintProperty(layer.id, 'fill-color', '#e7ede9');
      else if (layer.type === 'symbol' && id.includes('water')) map.setPaintProperty(layer.id, 'text-color', '#557a8a');
    } catch { /* layer without that property */ }
  }
}

/**
 * Map with: severity-weighted heat layer from verified points, one bloom per cluster coloured by
 * category and sized by heat, hollow markers for unverified reports (R09), and selection glow.
 */
export function MapView({ data, showPending, selectedKlaster, onSelect, focus, onReady, label, posisiSaya }) {
  const el = useRef(null);
  const map = useRef(null);
  const ready = useRef(false);
  const fitted = useRef(false);
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const cbSelect = useRef(onSelect);
  cbSelect.current = onSelect;

  useEffect(() => {
    const m = new maplibregl.Map({
      container: el.current,
      style: STYLE,
      bounds: INDONESIA,
      fitBoundsOptions: { padding: 24 },
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      maxZoom: 18,
    });
    m.touchZoomRotate.disableRotation();
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.current = m;
    if (location.hostname === 'localhost') window.__sgMap = m; // local debugging only
    m.on('load', () => {
      tintBasemap(m);
      m.addSource('titik', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('klaster', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('menunggu', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({
        id: 'heat', type: 'heatmap', source: 'titik', maxzoom: 15,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'bobot'], 1, 0.35, 3, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 12, 2.2],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 3, 14, 8, 26, 13, 40],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.75, 14, 0.45],
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(47,158,110,0)', 0.2, 'rgba(47,158,110,0.45)', 0.45, 'rgba(232,163,61,0.65)', 0.75, 'rgba(214,112,62,0.78)', 1, 'rgba(194,69,59,0.9)'],
        },
      });
      m.addLayer({
        id: 'klaster-glow', type: 'circle', source: 'klaster',
        paint: {
          'circle-color': KAT_COLOR,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, ['+', 6, ['/', ['get', 'heat'], 9]], 12, ['+', 16, ['/', ['get', 'heat'], 3]]],
          'circle-blur': 0.6,
          'circle-opacity': 0.35,
        },
      });
      m.addLayer({
        id: 'klaster', type: 'circle', source: 'klaster',
        paint: {
          'circle-color': KAT_COLOR,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 5, 12, 9],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.5,
          'circle-opacity': 1,
        },
      });
      m.addLayer({
        id: 'menunggu', type: 'circle', source: 'menunggu',
        layout: { visibility: 'none' },
        paint: { 'circle-radius': 6, 'circle-color': 'rgba(255,255,255,0.6)', 'circle-stroke-color': '#2e7d8c', 'circle-stroke-width': 2 },
      });
      m.on('click', 'klaster', (e) => cbSelect.current?.(e.features[0].properties.id));
      m.on('mouseenter', 'klaster', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'klaster', () => { m.getCanvas().style.cursor = ''; });
      ready.current = true;
      onReady?.(m);
      m.fire('sg:data');
    });
    return () => { ready.current = false; m.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Data -> sources
  useEffect(() => {
    const m = map.current;
    if (!m || !data) return undefined;
    const apply = () => {
      if (!ready.current) return;
      m.getSource('titik').setData({
        type: 'FeatureCollection',
        features: data.titik.map((t) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [t.lon, t.lat] }, properties: { bobot: t.bobot, kategori: t.kategoriKualitas } })),
      });
      m.getSource('klaster').setData({
        type: 'FeatureCollection',
        features: data.klaster.map((k) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [k.lon, k.lat] }, properties: { id: k.idKlaster, heat: k.heatIntensity, kategori: k.kategoriKualitas } })),
      });
      m.getSource('menunggu').setData({
        type: 'FeatureCollection',
        features: (data.menunggu || []).map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: {} })),
      });
      // First data: frame the hotspots themselves (unless a deep link already focused a lot).
      if (!fitted.current && data.klaster.length && !focusRef.current) {
        fitted.current = true;
        const lons = data.klaster.map((k) => k.lon); const lats = data.klaster.map((k) => k.lat);
        const narrow = m.getContainer().clientWidth < 600;
        m.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
          { padding: narrow ? { top: 90, bottom: 130, left: 30, right: 30 } : { top: 110, bottom: 60, left: 450, right: 60 }, maxZoom: 9, duration: 0 });
      }
    };
    if (ready.current) apply(); else m.once('sg:data', apply);
    return undefined;
  }, [data]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    m.setLayoutProperty('menunggu', 'visibility', showPending ? 'visible' : 'none');
  }, [showPending, data]);

  // Selection: the chosen lot burns brightest, every other bloom dims.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    const sel = selectedKlaster ?? -1;
    const has = selectedKlaster != null;
    m.setPaintProperty('klaster-glow', 'circle-opacity', has ? ['case', ['==', ['get', 'id'], sel], 0.7, 0.12] : 0.35);
    m.setPaintProperty('klaster', 'circle-opacity', has ? ['case', ['==', ['get', 'id'], sel], 1, 0.35] : 1);
    m.setPaintProperty('klaster', 'circle-stroke-width', has ? ['case', ['==', ['get', 'id'], sel], 4, 1.5] : 2.5);
    m.setPaintProperty('klaster', 'circle-stroke-color', has ? ['case', ['==', ['get', 'id'], sel], '#0a2233', '#ffffff'] : '#ffffff');
    m.setPaintProperty('heat', 'heatmap-opacity', has ? 0.35 : ['interpolate', ['linear'], ['zoom'], 3, 0.75, 14, 0.45]);
  }, [selectedKlaster, data]);

  // "You are here": a navy dot with a soft accuracy halo, shown after "locate me".
  const saya = useRef(null);
  useEffect(() => {
    const m = map.current;
    if (!m || !posisiSaya) return;
    if (!saya.current) {
      const el = document.createElement('div');
      el.className = 'you-here';
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', posisiSaya.label || '');
      saya.current = new maplibregl.Marker({ element: el }).setLngLat([posisiSaya.lon, posisiSaya.lat]).addTo(m);
    } else saya.current.setLngLat([posisiSaya.lon, posisiSaya.lat]);
  }, [posisiSaya]);

  // Focus requests: {lat, lon, zoom} or {bbox}
  useEffect(() => {
    const m = map.current;
    if (!m || !focus) return;
    fitted.current = true; // an explicit focus wins over the first-load framing
    // On desktop the hotspot panel floats over the left of the map and the hotspot card over the right.
    const wide = m.getContainer().clientWidth >= 860;
    const pad = wide ? { top: 100, bottom: 40, left: 440, right: 420 } : { top: 80, bottom: 120, left: 20, right: 20 };
    if (focus.bbox) m.fitBounds([[focus.bbox[0], focus.bbox[1]], [focus.bbox[2], focus.bbox[3]]], { padding: pad, maxZoom: 15, duration: 900 });
    else m.flyTo({ center: [focus.lon, focus.lat], zoom: focus.zoom ?? Math.max(m.getZoom(), 13), duration: 900, padding: focus.padding || (wide ? { top: 80, bottom: 0, left: 410, right: 400 } : { top: 0, bottom: 200, left: 0, right: 0 }) });
  }, [focus]);

  return <div ref={el} className="mapview" role="region" aria-label={label} />;
}
