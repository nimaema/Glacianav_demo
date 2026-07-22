"use client";

import { bearingToCompass, bearingHistogram, driftStats } from "@/lib/drift";
import { fmtCoord } from "@/lib/geo";
import type { Iceberg } from "@/lib/types";

const DEG = Math.PI / 180;

/** Polar histogram of drift-direction probability at the current forecast hour. */
function DriftRose({ hist }: { hist: number[] }) {
  const size = 168;
  const c = size / 2;
  const R = c - 22;
  const max = Math.max(...hist, 0.001);
  const top = hist.indexOf(Math.max(...hist));

  const pt = (bearing: number, r: number) => ({
    x: c + r * Math.sin(bearing * DEG),
    y: c - r * Math.cos(bearing * DEG),
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Drift direction probability rose"
      className="mx-auto block"
    >
      {[R, R / 2].map((r) => (
        <circle
          key={r}
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}
      <line x1={c} y1={c - R} x2={c} y2={c + R} stroke="#e2e8f0" strokeWidth="1" />
      <line x1={c - R} y1={c} x2={c + R} y2={c} stroke="#e2e8f0" strokeWidth="1" />

      {hist.map((v, i) => {
        if (v <= 0) return null;
        const r = 7 + (v / max) * (R - 7);
        const a0 = i * 30 - 14;
        const a1 = i * 30 + 14;
        const p0 = pt(a0, r);
        const p1 = pt(a1, r);
        return (
          <path
            key={i}
            d={`M ${c} ${c} L ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y} Z`}
            fill={i === top ? "#b45309" : "#f59e0b"}
            fillOpacity={i === top ? 0.85 : 0.6}
            stroke="#ffffff"
            strokeWidth="1"
          />
        );
      })}

      <circle cx={c} cy={c} r={2.5} fill="#334155" />
      {(
        [
          ["N", 0],
          ["E", 90],
          ["S", 180],
          ["W", 270],
        ] as const
      ).map(([label, brg]) => {
        const p = pt(brg, R + 11);
        return (
          <text
            key={label}
            x={p.x}
            y={p.y + 3}
            textAnchor="middle"
            className="fill-slate-500"
            style={{ font: "600 9px var(--font-mono, monospace)" }}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="font-mono text-[9px] tracking-[0.16em] text-slate-500">{label}</span>
      <span className="font-mono text-[13px] font-semibold tabular-nums text-slate-900">
        {value}
      </span>
    </div>
  );
}

/** Drift detail for one berg. Content only; the sidebar provides the chrome. */
export default function BergDetail({ berg, hour }: { berg: Iceberg; hour: number }) {
  const t = Math.max(hour, 1);
  const hist = bearingHistogram(berg, t);
  const stats = driftStats(berg, t);

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-2">
        <svg width="14" height="13" viewBox="0 0 20 18" aria-hidden>
          <path
            d="M10 1.5 L18.8 16.5 H1.2 Z"
            fill="#f59e0b"
            stroke="#b45309"
            strokeWidth="1.2"
          />
        </svg>
        <span className="font-mono text-[15px] font-semibold tracking-wide text-amber-700">
          ICEBERG {berg.id}
        </span>
        <span className="ml-auto rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[0.1em] text-slate-600">
          {berg.sector.toUpperCase()}
        </span>
      </div>

      <div className="mt-2 divide-y divide-slate-200">
        <Row label="EST. MASS" value={`${berg.massT.toLocaleString("en-US")} T`} />
        <Row label="WATERLINE" value={`${berg.waterlineM} M`} />
        <Row label="LAT" value={fmtCoord(berg.pos[0], true)} />
        <Row label="LON" value={fmtCoord(berg.pos[1], false)} />
        <Row
          label="MEAN SET / RATE"
          value={`${bearingToCompass(berg.meanBearing)} · ${berg.meanSpeedKts.toFixed(1)} KTS`}
        />
      </div>

      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50/80 px-3 pb-2.5 pt-2">
        <div className="font-mono text-[9px] font-semibold tracking-[0.18em] text-slate-500">
          DRIFT DIRECTION PROBABILITY · +{t.toFixed(0)}H
        </div>
        <DriftRose hist={hist} />
        <div className="border-t border-slate-200 pt-1.5 text-center font-mono text-[10px] tracking-[0.1em] text-slate-600">
          MOST LIKELY{" "}
          <span className="font-semibold text-amber-700">
            {stats.topSector} · {stats.topSectorPct}%
          </span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200">
        <div className="bg-white px-3 py-2">
          <div className="font-mono text-[8.5px] tracking-[0.18em] text-slate-500">
            EXPECTED DRIFT
          </div>
          <div className="font-mono text-[15px] font-semibold tabular-nums text-slate-900">
            {stats.meanDistNm.toFixed(1)}
            <span className="ml-1 text-[9px] font-medium text-slate-500">NM</span>
          </div>
        </div>
        <div className="bg-white px-3 py-2">
          <div className="font-mono text-[8.5px] tracking-[0.18em] text-slate-500">
            90% RADIUS
          </div>
          <div className="font-mono text-[15px] font-semibold tabular-nums text-slate-900">
            {stats.r90Km.toFixed(0)}
            <span className="ml-1 text-[9px] font-medium text-slate-500">KM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
