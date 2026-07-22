export function fmtCoord(value: number, isLat: boolean): string {
  const hemi = isLat ? (value >= 0 ? "N" : "S") : (value >= 0 ? "E" : "W");
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  const degStr = String(deg).padStart(isLat ? 2 : 3, "0");
  return `${degStr}°${min.toFixed(1).padStart(4, "0")}′ ${hemi}`;
}
