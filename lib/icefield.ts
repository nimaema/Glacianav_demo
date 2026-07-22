import type { IceClass, IceRegion, LatLng } from "./types";

/* Continuous sea-ice thickness field — WINTER MAXIMUM scenario (March-like).
 *
 * thickness(lat, lng, t) is an analytic field: the Arctic pack reaching south
 * to Bear Island and the Pechora coast, a wide East Greenland belt down
 * through Denmark Strait, and the seasonally frozen Baltic sub-basins
 * (Bothnian Bay, Bothnian Sea, Gulf of Finland, Gulf of Riga) as explicit
 * water polygons so ice is only ever painted on SEA, never on land.
 *
 * The same function drives everything, so they can never disagree:
 *   1. the raster overlay (one image per forecast hour),
 *   2. the cursor probe,
 *   3. regional statistics and point analyses in the Sea ice tab,
 *   4. the forecast: texture drifts and the Atlantic edge creeps with t.
 */

export const ICE_CLASSES: IceClass[] = [
  { id: "new",      label: "New ice",                range: "<0.1 m",    fill: "#dbeafe", stroke: "#bfdbfe", fillOpacity: 0.3 },
  { id: "young",    label: "Young ice",              range: "0.1-0.3 m", fill: "#93c5fd", stroke: "#60a5fa", fillOpacity: 0.45 },
  { id: "fy-thin",  label: "First-year ice, thin",   range: "0.3-0.7 m", fill: "#3b82f6", stroke: "#2563eb", fillOpacity: 0.45 },
  { id: "fy-med",   label: "First-year ice, medium", range: "0.7-1.2 m", fill: "#1d4ed8", stroke: "#1e40af", fillOpacity: 0.45 },
  { id: "fy-thick", label: "First-year ice, thick",  range: "1.2-2.0 m", fill: "#3730a3", stroke: "#312e81", fillOpacity: 0.5 },
  { id: "my",       label: "Multi-year ice",         range: ">2.0 m",    fill: "#1e1b4b", stroke: "#1e1b4b", fillOpacity: 0.55 },
];

const LAT_MIN = 56.0;
const LAT_MAX = 85.5;
const LNG_MIN = -36;
const LNG_MAX = 62;

export const ICE_BOUNDS: [[number, number], [number, number]] = [
  [LAT_MIN, LNG_MIN],
  [LAT_MAX, LNG_MAX],
];

const DEG = Math.PI / 180;

/* ---------- deterministic 2-D value noise ---------- */

function hash2(ix: number, iy: number, seed: number): number {
  const n = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function vnoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm2(x: number, y: number, seed: number): number {
  return (
    0.5 * vnoise(x, y, seed) +
    0.3 * vnoise(x * 2.1, y * 2.1, seed + 7) +
    0.2 * vnoise(x * 4.3, y * 4.3, seed + 13)
  );
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function interp(pts: [number, number][], x: number): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
}

function inPoly(lat: number, lng: number, poly: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/* ---------- geography ---------- */

/* Winter-maximum southern limit of the Atlantic/Barents pack by longitude. */
const EDGE_PTS: [number, number][] = [
  [-36, 64.0], [-30, 64.8], [-24, 66.0], [-18, 68.0], [-12, 70.0],
  [-6, 72.0], [0, 73.2], [6, 74.0], [12, 74.4], [18, 74.4],
  [24, 74.8], [30, 75.2], [36, 74.0], [42, 72.0], [48, 70.4],
  [54, 69.6], [62, 69.2],
];

/* Rough East Greenland coastline (east coast longitude by latitude). */
const COAST_PTS: [number, number][] = [
  [56, -38], [64, -36], [66, -33.5], [68, -29.5], [70, -26.5], [72, -24],
  [74, -21.5], [76, -19], [78, -17], [80, -15], [82, -12], [84, -10], [85.5, -9],
];

/* Russian mainland coast (latitude by longitude) east of the White Sea. */
const RU_COAST_PTS: [number, number][] = [
  [35, 68.9], [40, 67.0], [44, 68.2], [48, 68.6], [52, 68.5],
  [56, 68.6], [60, 69.0], [62, 69.2],
];

/* Baltic sub-basins as water polygons ([lat, lng] rings). */
const BOTHNIAN_BAY: LatLng[] = [
  [65.85, 24.7], [65.7, 25.4], [65.0, 25.3], [64.4, 24.5], [63.6, 22.5],
  [63.3, 21.2], [63.5, 20.0], [64.3, 20.8], [65.0, 21.8], [65.5, 22.3], [65.8, 23.4],
];
const BOTHNIAN_SEA: LatLng[] = [
  [63.3, 21.0], [62.6, 21.3], [61.5, 21.5], [60.7, 21.2], [60.2, 19.5],
  [60.4, 18.4], [61.2, 17.2], [62.2, 17.5], [63.0, 19.0], [63.4, 20.2],
];
const GULF_OF_FINLAND: LatLng[] = [
  [60.55, 26.0], [60.4, 28.0], [60.1, 29.9], [59.7, 30.2], [59.4, 28.2],
  [59.4, 26.5], [59.5, 24.5], [59.8, 23.0], [60.2, 22.9], [60.4, 24.5],
];
const GULF_OF_RIGA: LatLng[] = [
  [58.6, 23.4], [58.0, 24.4], [57.3, 24.3], [56.9, 23.6], [57.4, 22.7], [58.2, 22.6],
];

function balticThickness(lat: number, lng: number, t: number): number | null {
  let base: number | null = null;
  if (inPoly(lat, lng, BOTHNIAN_BAY)) {
    base = 0.35 + 0.35 * smoothstep(63.5, 65.8, lat);
  } else if (inPoly(lat, lng, BOTHNIAN_SEA)) {
    base = 0.16;
  } else if (inPoly(lat, lng, GULF_OF_FINLAND)) {
    base = 0.1 + 0.4 * smoothstep(24, 29.8, lng);
  } else if (inPoly(lat, lng, GULF_OF_RIGA)) {
    base = 0.22;
  }
  if (base === null) return null;
  const tex = 0.75 + (fbm2(lng * 0.9 + t * 0.012, lat * 1.4, 21) - 0.5) * 1.0;
  return Math.max(0, base * tex * (1 + 0.003 * t));
}

/**
 * Sea-ice thickness in metres at a point and forecast hour.
 * Returns null over land / masked ground, 0 for ice-free sea.
 */
export function iceThicknessAt(lat: number, lng: number, t: number): number | null {
  if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) return 0;

  /* Baltic zone: only the defined water basins carry ice; the surrounding
   * Fennoscandian ground is masked so nothing paints on land. */
  if (lat < 66.3 && lng > 15.5 && lng < 31) {
    return balticThickness(lat, lng, t);
  }

  const coast = interp(COAST_PTS, lat);
  if (lng < coast) return null; // Greenland
  if (lat > 63.2 && lat < 66.6 && lng > -24.5 && lng < -13) return null; // Iceland
  if (lng > 35 && lat < interp(RU_COAST_PTS, lng)) return null; // Russian mainland

  /* forecast: the Atlantic edge creeps slightly over the 24 h horizon */
  const edge =
    interp(EDGE_PTS, lng) +
    (vnoise(lng * 0.45, 3.7, 9) - 0.5) * 1.6 +
    0.012 * t;

  const pack =
    smoothstep(0, 2.2, lat - edge) * 2.2 +
    smoothstep(0, 2.4, lat - (edge + 3.0)) * 1.6;

  const coastDistKm = (lng - coast) * 60 * Math.cos(lat * DEG);
  const egBelt =
    lat < 81.5
      ? smoothstep(64.6, 66.0, lat) * Math.max(0, 2.0 - coastDistKm / 140)
      : 0;

  const raw = pack + egBelt;
  if (raw <= 0) return 0;

  const tex = 0.72 + (fbm2(lng * 0.3 + t * 0.02, lat * 0.55 - t * 0.01, 5) - 0.5) * 1.05;
  const opening = Math.max(0, fbm2(lng * 0.55 - t * 0.016, lat * 0.95, 11) - 0.62) * 3.0;

  const thickness = (raw * tex - opening - 0.04) * (1 - 0.002 * t);
  return Math.max(0, thickness);
}

export function classForThickness(t: number): string {
  if (t < 0.1) return "NEW ICE";
  if (t < 0.3) return "YOUNG ICE";
  if (t < 0.7) return "FIRST-YEAR THIN";
  if (t < 1.2) return "FIRST-YEAR MEDIUM";
  if (t < 2.0) return "FIRST-YEAR THICK";
  return "MULTI-YEAR";
}

/* ---------- sea-ice properties: regions and point series ---------- */

export const ICE_REGIONS: IceRegion[] = [
  { id: "bothnian-bay",   name: "Bothnian Bay",         bounds: [[63.2, 19.5], [66.0, 25.8]] },
  { id: "gulf-finland",   name: "Gulf of Finland",      bounds: [[59.2, 22.5], [60.7, 30.2]] },
  { id: "bothnian-sea",   name: "Bothnian Sea",         bounds: [[60.2, 16.8], [63.4, 22.0]] },
  { id: "gulf-riga",      name: "Gulf of Riga",         bounds: [[56.8, 22.3], [58.7, 24.7]] },
  { id: "bear-island",    name: "Bear Island · Barents", bounds: [[73.0, 14.0], [76.5, 26.0]] },
  { id: "fram",           name: "Fram Strait",          bounds: [[75.5, -12.0], [80.5, 6.0]] },
  { id: "east-greenland", name: "East Greenland",       bounds: [[66.5, -30.0], [75.5, -12.0]] },
  { id: "pechora",        name: "SE Barents · Pechora", bounds: [[68.5, 42.0], [72.5, 60.0]] },
];

export interface RegionStats {
  meanM: number;
  maxM: number;
  coverPct: number;
  delta24M: number;
}

function sampleRegion(region: IceRegion, hour: number) {
  const [[lat0, lng0], [lat1, lng1]] = region.bounds;
  const N = 9;
  let water = 0;
  let icy = 0;
  let sum = 0;
  let max = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const lat = lat0 + ((lat1 - lat0) * (i + 0.5)) / N;
      const lng = lng0 + ((lng1 - lng0) * (j + 0.5)) / N;
      const t = iceThicknessAt(lat, lng, hour);
      if (t === null) continue;
      water++;
      if (t > 0.02) {
        icy++;
        sum += t;
        if (t > max) max = t;
      }
    }
  }
  return { water, icy, sum, max };
}

export function regionStats(region: IceRegion, hour: number): RegionStats {
  const now = sampleRegion(region, hour);
  const start = sampleRegion(region, 0);
  const end = sampleRegion(region, 24);
  const meanM = now.icy ? now.sum / now.icy : 0;
  const mean0 = start.icy ? start.sum / start.icy : 0;
  const mean24 = end.icy ? end.sum / end.icy : 0;
  return {
    meanM,
    maxM: now.max,
    coverPct: now.water ? (now.icy / now.water) * 100 : 0,
    delta24M: mean24 - mean0,
  };
}

/** Thickness at one point for every forecast hour 0..24. */
export function pointSeries(lat: number, lng: number): number[] {
  const out: number[] = [];
  for (let h = 0; h <= 24; h++) {
    out.push(iceThicknessAt(lat, lng, h) ?? 0);
  }
  return out;
}

/* ---------- colour ramp (continuous, matches ICE_CLASSES) ---------- */

type Rgba = [number, number, number, number];

/* Alphas kept low so the basemap stays readable underneath. */
const STOPS: [number, Rgba][] = [
  [0.02, [219, 234, 254, 0.0]],
  [0.08, [219, 234, 254, 0.26]],
  [0.3, [147, 197, 253, 0.36]],
  [0.7, [59, 130, 246, 0.4]],
  [1.2, [29, 78, 216, 0.44]],
  [2.0, [55, 48, 163, 0.5]],
  [3.0, [30, 27, 75, 0.55]],
  [4.0, [13, 11, 40, 0.58]],
];

function colorFor(t: number): Rgba {
  if (t < STOPS[0][0]) return [0, 0, 0, 0];
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [t0, c0] = STOPS[i - 1];
      const [t1, c1] = STOPS[i];
      const f = (t - t0) / (t1 - t0);
      return [
        c0[0] + (c1[0] - c0[0]) * f,
        c0[1] + (c1[1] - c0[1]) * f,
        c0[2] + (c1[2] - c0[2]) * f,
        c0[3] + (c1[3] - c0[3]) * f,
      ];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

/* ---------- raster generation (one image per forecast hour) ---------- */

const IMG_W = 880;
const IMG_H = 640;

function mercY(lat: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (lat * DEG) / 2));
}

function invMercLat(y: number): number {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / DEG;
}

const imageCache = new Map<number, string>();

/** Data-URL PNG of the thickness field at (rounded) forecast hour. */
export function iceFieldImage(hour: number): string {
  const h = Math.max(0, Math.min(24, Math.round(hour)));
  const cached = imageCache.get(h);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = IMG_W;
  canvas.height = IMG_H;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(IMG_W, IMG_H);
  const data = img.data;

  const yTop = mercY(LAT_MAX);
  const yBot = mercY(LAT_MIN);
  const lats: number[] = new Array(IMG_H);
  for (let py = 0; py < IMG_H; py++) {
    lats[py] = invMercLat(yTop + ((yBot - yTop) * (py + 0.5)) / IMG_H);
  }

  for (let py = 0; py < IMG_H; py++) {
    const lat = lats[py];
    for (let px = 0; px < IMG_W; px++) {
      const lng = LNG_MIN + ((LNG_MAX - LNG_MIN) * (px + 0.5)) / IMG_W;
      const t = iceThicknessAt(lat, lng, h);
      if (t === null || t <= 0.02) continue;
      const [r, g, b, a] = colorFor(t);
      const i = (py * IMG_W + px) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = Math.round(a * 255);
    }
  }

  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL();
  imageCache.set(h, url);
  return url;
}
