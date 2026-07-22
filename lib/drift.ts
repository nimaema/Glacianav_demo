import type { Iceberg, LatLng } from "./types";

/* Monte Carlo iceberg drift ensemble.
 *
 * Each berg gets N simulated trajectories. A particle draws a heading from
 * the berg's directional distribution, a speed from a lognormal distribution,
 * plus per-hour curvature and diffusion noise. The cloud of particles at a
 * given forecast hour IS the drift probability: it is summarised on the map
 * as 50% / 90% containment ellipses, a probability heat grid, ensemble
 * spaghetti tracks, and in the inspector as a directional probability rose.
 *
 * Everything is seeded, so results are stable across renders and reloads. */

export const FORECAST_MAX_H = 24;
export const N_PARTICLES = 320;
export const N_SAMPLE_TRACKS = 22;

const KM_PER_DEG_LAT = 111.32;
const KTS_TO_KMH = 1.852;
const DEG = Math.PI / 180;

/* containment scale factors for a bivariate normal: sqrt(-2 ln(1-p)) */
const K50 = 1.1774;
const K90 = 2.146;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

interface Ensemble {
  /** [particle][hour] east/north offsets from the berg, in km */
  xs: number[][];
  ys: number[][];
  /** per-hour ensemble mean offsets, in km */
  meanX: number[];
  meanY: number[];
}

function simulate(berg: Iceberg, seed: number): Ensemble {
  const rng = mulberry32(seed);
  const xs: number[][] = [];
  const ys: number[][] = [];
  for (let p = 0; p < N_PARTICLES; p++) {
    let brg = berg.meanBearing + gauss(rng) * berg.bearingSpreadDeg;
    const speed = Math.min(
      3,
      Math.max(0.05, berg.meanSpeedKts * Math.exp(gauss(rng) * berg.speedCV)),
    );
    const turn = gauss(rng) * 3.2;
    let x = 0;
    let y = 0;
    const px = [0];
    const py = [0];
    for (let h = 1; h <= FORECAST_MAX_H; h++) {
      brg += turn + gauss(rng) * 2.6;
      const step = speed * KTS_TO_KMH;
      x += Math.sin(brg * DEG) * step + gauss(rng) * 0.55;
      y += Math.cos(brg * DEG) * step + gauss(rng) * 0.55;
      px.push(x);
      py.push(y);
    }
    xs.push(px);
    ys.push(py);
  }
  const meanX: number[] = [];
  const meanY: number[] = [];
  for (let h = 0; h <= FORECAST_MAX_H; h++) {
    let sx = 0;
    let sy = 0;
    for (let p = 0; p < N_PARTICLES; p++) {
      sx += xs[p][h];
      sy += ys[p][h];
    }
    meanX.push(sx / N_PARTICLES);
    meanY.push(sy / N_PARTICLES);
  }
  return { xs, ys, meanX, meanY };
}

const cache = new Map<string, Ensemble>();

function ensemble(berg: Iceberg): Ensemble {
  let e = cache.get(berg.id);
  if (!e) {
    let seed = 0x2f6e2b1;
    for (const ch of berg.id) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    e = simulate(berg, seed);
    cache.set(berg.id, e);
  }
  return e;
}

function toLatLng(berg: Iceberg, xKm: number, yKm: number): LatLng {
  return [
    berg.pos[0] + yKm / KM_PER_DEG_LAT,
    berg.pos[1] + xKm / (KM_PER_DEG_LAT * Math.cos(berg.pos[0] * DEG)),
  ];
}

/** particle offsets (km) at a fractional forecast hour */
function offsetsAt(berg: Iceberg, t: number): { x: number[]; y: number[] } {
  const e = ensemble(berg);
  const h0 = Math.min(FORECAST_MAX_H, Math.max(0, Math.floor(t)));
  const h1 = Math.min(FORECAST_MAX_H, h0 + 1);
  const f = Math.min(1, Math.max(0, t - h0));
  const x: number[] = new Array(N_PARTICLES);
  const y: number[] = new Array(N_PARTICLES);
  for (let p = 0; p < N_PARTICLES; p++) {
    x[p] = e.xs[p][h0] + (e.xs[p][h1] - e.xs[p][h0]) * f;
    y[p] = e.ys[p][h0] + (e.ys[p][h1] - e.ys[p][h0]) * f;
  }
  return { x, y };
}

interface Gaussian2 {
  mx: number;
  my: number;
  r1: number;
  r2: number;
  v1x: number;
  v1y: number;
}

function fitGaussian(x: number[], y: number[]): Gaussian2 {
  const n = x.length;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += x[i];
    my += y[i];
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  sxx /= n;
  sxy /= n;
  syy /= n;
  const tr = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = Math.max(0.35, tr / 2 + disc);
  const l2 = Math.max(0.35, tr / 2 - disc);
  let v1x = sxy;
  let v1y = l1 - sxx;
  const len = Math.hypot(v1x, v1y);
  if (len < 1e-9) {
    v1x = sxx >= syy ? 1 : 0;
    v1y = sxx >= syy ? 0 : 1;
  } else {
    v1x /= len;
    v1y /= len;
  }
  return { mx, my, r1: Math.sqrt(l1), r2: Math.sqrt(l2), v1x, v1y };
}

/** 50% or 90% containment ellipse as a lat/lng ring */
export function containmentEllipse(
  berg: Iceberg,
  t: number,
  p: 0.5 | 0.9,
): LatLng[] {
  const { x, y } = offsetsAt(berg, t);
  const g = fitGaussian(x, y);
  const k = p === 0.5 ? K50 : K90;
  const ring: LatLng[] = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const ex = Math.cos(a) * g.r1 * k;
    const ey = Math.sin(a) * g.r2 * k;
    ring.push(
      toLatLng(
        berg,
        g.mx + ex * g.v1x - ey * g.v1y,
        g.my + ex * g.v1y + ey * g.v1x,
      ),
    );
  }
  return ring;
}

/** ensemble-mean drift path from the berg up to hour t */
export function meanTrack(berg: Iceberg, t: number): LatLng[] {
  const e = ensemble(berg);
  const h0 = Math.min(FORECAST_MAX_H, Math.floor(t));
  const pts: LatLng[] = [];
  for (let h = 0; h <= h0; h++) pts.push(toLatLng(berg, e.meanX[h], e.meanY[h]));
  if (t > h0 && h0 < FORECAST_MAX_H) {
    const f = t - h0;
    pts.push(
      toLatLng(
        berg,
        e.meanX[h0] + (e.meanX[h0 + 1] - e.meanX[h0]) * f,
        e.meanY[h0] + (e.meanY[h0 + 1] - e.meanY[h0]) * f,
      ),
    );
  }
  return pts;
}

/** a handful of raw ensemble trajectories up to hour t (spaghetti plot) */
export function sampleTracks(berg: Iceberg, t: number): LatLng[][] {
  const e = ensemble(berg);
  const h0 = Math.min(FORECAST_MAX_H, Math.floor(t));
  const f = Math.min(1, t - h0);
  const out: LatLng[][] = [];
  const stride = Math.floor(N_PARTICLES / N_SAMPLE_TRACKS);
  for (let s = 0; s < N_SAMPLE_TRACKS; s++) {
    const p = s * stride;
    const line: LatLng[] = [];
    for (let h = 0; h <= h0; h++) line.push(toLatLng(berg, e.xs[p][h], e.ys[p][h]));
    if (f > 0 && h0 < FORECAST_MAX_H) {
      line.push(
        toLatLng(
          berg,
          e.xs[p][h0] + (e.xs[p][h0 + 1] - e.xs[p][h0]) * f,
          e.ys[p][h0] + (e.ys[p][h0 + 1] - e.ys[p][h0]) * f,
        ),
      );
    }
    out.push(line);
  }
  return out;
}

export interface HeatCell {
  ring: LatLng[];
  /** normalised probability weight 0..1 */
  w: number;
}

/** binned particle density at hour t: the drift probability field */
export function heatCells(berg: Iceberg, t: number): HeatCell[] {
  if (t < 1.5) return [];
  const { x, y } = offsetsAt(berg, t);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < N_PARTICLES; i++) {
    if (x[i] < minX) minX = x[i];
    if (x[i] > maxX) maxX = x[i];
    if (y[i] < minY) minY = y[i];
    if (y[i] > maxY) maxY = y[i];
  }
  const GRID = 13;
  const cw = Math.max(0.8, (maxX - minX) / GRID);
  const ch = Math.max(0.8, (maxY - minY) / GRID);
  const counts = new Map<number, number>();
  for (let i = 0; i < N_PARTICLES; i++) {
    const cx = Math.min(GRID - 1, Math.floor((x[i] - minX) / cw));
    const cy = Math.min(GRID - 1, Math.floor((y[i] - minY) / ch));
    const key = cy * GRID + cx;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let max = 0;
  counts.forEach((c) => {
    if (c > max) max = c;
  });
  const cells: HeatCell[] = [];
  counts.forEach((c, key) => {
    if (c < 2) return;
    const cx = key % GRID;
    const cy = Math.floor(key / GRID);
    const x0 = minX + cx * cw;
    const y0 = minY + cy * ch;
    cells.push({
      ring: [
        toLatLng(berg, x0, y0),
        toLatLng(berg, x0 + cw, y0),
        toLatLng(berg, x0 + cw, y0 + ch),
        toLatLng(berg, x0, y0 + ch),
      ],
      w: Math.pow(c / max, 0.7),
    });
  });
  return cells;
}

export const SECTOR_NAMES = [
  "N", "NNE", "ENE", "E", "ESE", "SSE", "S", "SSW", "WSW", "W", "WNW", "NNW",
];

/** probability by 30-degree drift-direction sector at hour t */
export function bearingHistogram(berg: Iceberg, t: number): number[] {
  const { x, y } = offsetsAt(berg, t);
  const hist = new Array(12).fill(0);
  let counted = 0;
  for (let i = 0; i < N_PARTICLES; i++) {
    const d = Math.hypot(x[i], y[i]);
    if (d < 0.3) continue; // no meaningful direction yet
    const brg = (Math.atan2(x[i], y[i]) / DEG + 360) % 360;
    hist[Math.floor(((brg + 15) % 360) / 30)] += 1;
    counted++;
  }
  return hist.map((c) => (counted > 0 ? c / counted : 0));
}

export function bearingToCompass(brg: number): string {
  return SECTOR_NAMES[Math.floor((((brg % 360) + 375) % 360) / 30)];
}

export interface DriftStats {
  meanBearing: number;
  meanDistNm: number;
  r90Km: number;
  topSector: string;
  topSectorPct: number;
}

export function driftStats(berg: Iceberg, t: number): DriftStats {
  const { x, y } = offsetsAt(berg, t);
  const g = fitGaussian(x, y);
  const hist = bearingHistogram(berg, t);
  let top = 0;
  for (let i = 1; i < 12; i++) if (hist[i] > hist[top]) top = i;
  return {
    meanBearing: (Math.atan2(g.mx, g.my) / DEG + 360) % 360,
    meanDistNm: Math.hypot(g.mx, g.my) / KTS_TO_KMH,
    r90Km: Math.max(g.r1, g.r2) * K90,
    topSector: SECTOR_NAMES[top],
    topSectorPct: Math.round(hist[top] * 100),
  };
}
