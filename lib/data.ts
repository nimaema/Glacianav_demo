import type { Iceberg, LatLng } from "./types";

export { ICE_CLASSES } from "./icefield";
export { FORECAST_MAX_H } from "./drift";

export const REGION_LABEL = "NORDIC SEAS · WINTER SCENARIO";
export const MAP_CENTER: LatLng = [69.5, 8.0];
export const MAP_ZOOM = 4;

/* Tracked bergs across the Nordic seas, ordered north to south.
 * Drift regimes vary from "confident, fast, narrow" (ID-431, ID-296) to
 * "slow and could go almost anywhere" (ID-372, ID-455). */
export const ICEBERGS: Iceberg[] = [
  {
    id: "ID-263",
    sector: "Svalbard East",
    pos: [78.65, 27.4],
    meanBearing: 235,
    meanSpeedKts: 0.6,
    bearingSpreadDeg: 40,
    speedCV: 0.4,
    massT: 61000,
    waterlineM: 180,
  },
  {
    id: "ID-517",
    sector: "Fram Strait",
    pos: [78.35, -4.2],
    meanBearing: 205,
    meanSpeedKts: 0.9,
    bearingSpreadDeg: 26,
    speedCV: 0.35,
    massT: 88000,
    waterlineM: 260,
  },
  {
    id: "ID-455",
    sector: "NE Barents",
    pos: [77.85, 37.5],
    meanBearing: 250,
    meanSpeedKts: 0.5,
    bearingSpreadDeg: 58,
    speedCV: 0.45,
    massT: 23500,
    waterlineM: 120,
  },
  {
    id: "ID-431",
    sector: "Greenland Sea",
    pos: [76.75, 12.35],
    meanBearing: 42,
    meanSpeedKts: 1.1,
    bearingSpreadDeg: 16,
    speedCV: 0.25,
    massT: 156000,
    waterlineM: 340,
  },
  {
    id: "ID-372",
    sector: "Storfjorden",
    pos: [75.95, 16.85],
    meanBearing: 150,
    meanSpeedKts: 0.4,
    bearingSpreadDeg: 75,
    speedCV: 0.5,
    massT: 12400,
    waterlineM: 95,
  },
  {
    id: "ID-296",
    sector: "East Greenland",
    pos: [74.55, -15.8],
    meanBearing: 215,
    meanSpeedKts: 1.2,
    bearingSpreadDeg: 20,
    speedCV: 0.3,
    massT: 132000,
    waterlineM: 310,
  },
  {
    id: "ID-409",
    sector: "Norwegian Sea",
    pos: [73.55, 12.55],
    meanBearing: 66,
    meanSpeedKts: 0.8,
    bearingSpreadDeg: 28,
    speedCV: 0.35,
    massT: 45000,
    waterlineM: 210,
  },
  {
    id: "ID-388",
    sector: "Barents West",
    pos: [72.95, 16.95],
    meanBearing: 235,
    meanSpeedKts: 0.6,
    bearingSpreadDeg: 45,
    speedCV: 0.4,
    massT: 28700,
    waterlineM: 140,
  },
  {
    id: "ID-341",
    sector: "Denmark Strait",
    pos: [67.4, -24.8],
    meanBearing: 225,
    meanSpeedKts: 0.7,
    bearingSpreadDeg: 34,
    speedCV: 0.4,
    massT: 54000,
    waterlineM: 190,
  },
];
