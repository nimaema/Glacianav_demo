export type LatLng = [number, number];

export interface Iceberg {
  id: string;
  /** human-readable area name, e.g. "Fram Strait" */
  sector: string;
  pos: LatLng;
  /** mean drift set, degrees true */
  meanBearing: number;
  /** mean drift rate in knots */
  meanSpeedKts: number;
  /** 1-sigma directional uncertainty, degrees; large values = "could go anywhere" */
  bearingSpreadDeg: number;
  /** lognormal sigma of the speed multiplier */
  speedCV: number;
  /** estimated mass in tonnes */
  massT: number;
  /** waterline diameter in metres */
  waterlineM: number;
}

export interface IceClass {
  id: string;
  label: string;
  range: string;
  fill: string;
  stroke: string;
  fillOpacity: number;
}

export interface IceRegion {
  id: string;
  name: string;
  /** [[latMin, lngMin], [latMax, lngMax]] */
  bounds: [LatLng, LatLng];
}

export interface LayerState {
  ice: boolean;
  bergs: boolean;
  prob: boolean;
  tracks: boolean;
}
