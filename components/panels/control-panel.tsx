"use client";

import type { ReactNode } from "react";
import { Radar, Snowflake, Spline, Triangle } from "lucide-react";
import { ICE_CLASSES } from "@/lib/data";
import type { LayerState } from "@/lib/types";

interface LayersSectionProps {
  layers: LayerState;
  onToggle: (key: keyof LayerState) => void;
}

function Toggle({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-700"
    >
      <span className="flex items-center gap-2.5 text-[13px] font-medium text-slate-700">
        <span className={checked ? "text-blue-700" : "text-slate-400"}>{icon}</span>
        {label}
      </span>
      <span
        aria-hidden
        className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors duration-200 ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

/** Layer toggles + legends. Content only; the sidebar provides the chrome. */
export default function LayersSection({ layers, onToggle }: LayersSectionProps) {
  return (
    <div>
      <div className="px-2.5 pb-1">
        <Toggle
          label="Iceberg markers"
          icon={<Triangle className="h-3.5 w-3.5" />}
          checked={layers.bergs}
          onChange={() => onToggle("bergs")}
        />
        <Toggle
          label="Drift probability"
          icon={<Radar className="h-3.5 w-3.5" />}
          checked={layers.prob}
          onChange={() => onToggle("prob")}
        />
        <Toggle
          label="Ensemble tracks"
          icon={<Spline className="h-3.5 w-3.5" />}
          checked={layers.tracks}
          onChange={() => onToggle("tracks")}
        />
        <Toggle
          label="Ice thickness"
          icon={<Snowflake className="h-3.5 w-3.5" />}
          checked={layers.ice}
          onChange={() => onToggle("ice")}
        />
      </div>

      {layers.ice && (
        <div className="border-t border-slate-200 px-4 py-2.5">
          <div className="mb-1.5 font-mono text-[9px] font-semibold tracking-[0.2em] text-slate-500">
            ICE THICKNESS · DARKER = THICKER
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-sm ring-1 ring-inset ring-slate-400/40">
            {ICE_CLASSES.map((c) => (
              <span
                key={c.id}
                className="h-full flex-1"
                style={{ background: c.fill, opacity: 0.9 }}
                title={`${c.label} · ${c.range}`}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between font-mono text-[8.5px] tabular-nums text-slate-500">
            <span>0</span>
            <span>0.1</span>
            <span>0.3</span>
            <span>0.7</span>
            <span>1.2</span>
            <span>2.0</span>
            <span>m+</span>
          </div>
          <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] leading-snug text-slate-500">
            Winter-maximum forecast field, sea areas only. Hover for a live
            reading, click ice for a full point analysis, or browse regions in
            the Sea ice tab.
          </p>
        </div>
      )}

      {layers.prob && (
        <div className="border-t border-slate-200 px-4 py-2.5">
          <div className="mb-1.5 font-mono text-[9px] font-semibold tracking-[0.2em] text-slate-500">
            DRIFT PROBABILITY
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-3 w-5 shrink-0 rounded-sm border border-amber-700/70 bg-amber-500/25" />
              <span className="font-mono text-[9px] tracking-[0.1em] text-slate-600">
                50% CONTAINMENT
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-5 shrink-0 rounded-sm border border-dashed border-amber-500 bg-amber-400/10" />
              <span className="font-mono text-[9px] tracking-[0.1em] text-slate-600">
                90% CONTAINMENT
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-5 shrink-0 rounded-sm bg-amber-800/40" />
              <span className="font-mono text-[9px] tracking-[0.1em] text-slate-600">
                PROBABILITY FIELD (SELECTED)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
