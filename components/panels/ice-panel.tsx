"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import {
  classForThickness,
  ICE_REGIONS,
  iceThicknessAt,
  pointSeries,
  regionStats,
} from "@/lib/icefield";
import { fmtCoord } from "@/lib/geo";
import type { IceRegion, LatLng } from "@/lib/types";

interface IcePanelProps {
  hour: number;
  point: LatLng | null;
  onClearPoint: () => void;
  onFocusRegion: (region: IceRegion) => void;
}

function TrendTag({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.005) {
    return (
      <span className="font-mono text-[9px] tracking-[0.08em] text-slate-500">
        Δ24H ±0.00 M
      </span>
    );
  }
  const growing = delta > 0;
  return (
    <span
      className={`flex items-center gap-1 font-mono text-[9px] tracking-[0.08em] ${
        growing ? "text-blue-700" : "text-amber-700"
      }`}
    >
      {growing ? (
        <TrendingUp className="h-2.5 w-2.5" />
      ) : (
        <TrendingDown className="h-2.5 w-2.5" />
      )}
      Δ24H {growing ? "+" : ""}
      {delta.toFixed(2)} M
    </span>
  );
}

function RegionRow({
  region,
  hour,
  onClick,
}: {
  region: IceRegion;
  hour: number;
  onClick: () => void;
}) {
  const stats = useMemo(() => regionStats(region, Math.round(hour)), [region, hour]);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Focus ${region.name} on the chart`}
      className="group flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700"
    >
      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[12.5px] font-semibold text-slate-800">
            {region.name}
          </span>
          <span className="font-mono text-[12px] font-semibold tabular-nums text-slate-900">
            {stats.meanM.toFixed(2)}
            <span className="ml-0.5 text-[9px] font-medium text-slate-500">M</span>
          </span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[9px] tracking-[0.08em] text-slate-500">
            COVER {stats.coverPct.toFixed(0)}% · MAX {stats.maxM.toFixed(1)} M
          </span>
          <TrendTag delta={stats.delta24M} />
        </span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-blue-600" />
    </button>
  );
}

function Sparkline({ series, hour }: { series: number[]; hour: number }) {
  const W = 244;
  const H = 64;
  const PAD = 6;
  const max = Math.max(...series, 0.2);
  const x = (h: number) => PAD + ((W - 2 * PAD) * h) / 24;
  const y = (v: number) => H - PAD - ((H - 2 * PAD) * v) / max;
  const path = series.map((v, h) => `${h === 0 ? "M" : "L"} ${x(h)} ${y(v)}`).join(" ");
  const area = `${path} L ${x(24)} ${H - PAD} L ${x(0)} ${H - PAD} Z`;
  const ch = Math.min(24, Math.max(0, hour));
  const cv =
    series[Math.floor(ch)] +
    (series[Math.min(24, Math.floor(ch) + 1)] - series[Math.floor(ch)]) *
      (ch - Math.floor(ch));

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Ice thickness forecast over 24 hours"
      className="block"
    >
      <path d={area} fill="#3b82f6" fillOpacity="0.12" />
      <path d={path} fill="none" stroke="#1d4ed8" strokeWidth="1.6" />
      <line
        x1={x(ch)}
        y1={PAD}
        x2={x(ch)}
        y2={H - PAD}
        stroke="#94a3b8"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      <circle cx={x(ch)} cy={y(cv)} r="3" fill="#1d4ed8" stroke="#ffffff" strokeWidth="1.2" />
    </svg>
  );
}

export default function IcePanel({
  hour,
  point,
  onClearPoint,
  onFocusRegion,
}: IcePanelProps) {
  if (point === null) {
    return (
      <div className="swap-in-l">
        <div className="flex items-baseline justify-between px-4 pb-1 pt-3">
          <h2 className="font-mono text-[10px] font-semibold tracking-[0.2em] text-slate-500">
            SEA ICE REGIONS
          </h2>
          <span className="font-mono text-[9px] font-semibold tracking-[0.12em] text-blue-700">
            WINTER · +{Math.round(hour)}H
          </span>
        </div>
        <p className="px-4 pb-2 text-[11px] leading-snug text-slate-500">
          Live properties from the forecast field. Select a region to focus it,
          or click any ice on the chart for a point analysis.
        </p>
        <div className="divide-y divide-slate-100">
          {ICE_REGIONS.map((r) => (
            <RegionRow
              key={r.id}
              region={r}
              hour={hour}
              onClick={() => onFocusRegion(r)}
            />
          ))}
        </div>
      </div>
    );
  }

  const series = pointSeries(point[0], point[1]);
  const current = iceThicknessAt(point[0], point[1], hour) ?? 0;
  const delta = series[24] - series[0];

  return (
    <div className="swap-in-r">
      <button
        type="button"
        onClick={onClearPoint}
        className="flex w-full cursor-pointer items-center gap-1 px-3 py-2.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-slate-500 transition-colors hover:text-blue-700 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        ALL REGIONS
      </button>

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[13px] font-semibold tracking-wide text-blue-800">
            ICE POINT ANALYSIS
          </span>
          <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[0.1em] text-slate-600">
            {classForThickness(current)}
          </span>
        </div>
        <div className="mt-1 font-mono text-[10px] tabular-nums leading-snug text-slate-500">
          {fmtCoord(point[0], true)} · {fmtCoord(point[1], false)}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-3xl font-semibold tabular-nums text-slate-900">
            {current.toFixed(2)}
          </span>
          <span className="font-mono text-[11px] font-medium text-slate-500">
            M AT +{hour.toFixed(1)}H
          </span>
        </div>

        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50/80 px-3 pb-1 pt-2">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[9px] font-semibold tracking-[0.18em] text-slate-500">
              24 H THICKNESS FORECAST
            </span>
            <TrendTag delta={delta} />
          </div>
          <Sparkline series={series} hour={hour} />
          <div className="flex justify-between font-mono text-[8.5px] tracking-[0.12em] text-slate-500">
            <span>NOW</span>
            <span>+12H</span>
            <span>+24H</span>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200">
          <div className="bg-white px-3 py-2">
            <div className="font-mono text-[8.5px] tracking-[0.18em] text-slate-500">
              MIN / 24H
            </div>
            <div className="font-mono text-[15px] font-semibold tabular-nums text-slate-900">
              {Math.min(...series).toFixed(2)}
              <span className="ml-1 text-[9px] font-medium text-slate-500">M</span>
            </div>
          </div>
          <div className="bg-white px-3 py-2">
            <div className="font-mono text-[8.5px] tracking-[0.18em] text-slate-500">
              MAX / 24H
            </div>
            <div className="font-mono text-[15px] font-semibold tabular-nums text-slate-900">
              {Math.max(...series).toFixed(2)}
              <span className="ml-1 text-[9px] font-medium text-slate-500">M</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
