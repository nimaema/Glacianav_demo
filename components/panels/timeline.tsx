"use client";

import { Pause, Play } from "lucide-react";
import { FORECAST_MAX_H } from "@/lib/data";
import { N_PARTICLES } from "@/lib/drift";

interface TimelineProps {
  hour: number;
  onHourChange: (hour: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
}

const TICKS = [6, 12, 18];

export default function Timeline({
  hour,
  onHourChange,
  playing,
  onTogglePlay,
}: TimelineProps) {
  const pct = (hour / FORECAST_MAX_H) * 100;

  return (
    <section className="rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2 shadow-lg shadow-slate-900/10 backdrop-blur-md">
      <div className="flex items-baseline justify-between px-0.5">
        <span className="font-mono text-[9px] font-semibold tracking-[0.18em] text-slate-500">
          DRIFT FORECAST · {N_PARTICLES}-RUN ENSEMBLE
        </span>
        <span className="font-mono text-[13px] font-semibold tabular-nums text-blue-700">
          T+{hour.toFixed(1)}
          <span className="ml-0.5 text-[9px] font-medium text-slate-500">H</span>
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? "Pause forecast playback" : "Play forecast playback"}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white text-blue-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-700 active:scale-[0.96]"
        >
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>

        <div className="relative h-[26px] flex-1">
          <div className="absolute top-1/2 h-[4px] w-full -translate-y-1/2 rounded-full bg-slate-200" />
          <div
            className="absolute top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-blue-600"
            style={{ width: `${pct}%` }}
          />
          {TICKS.map((t) => (
            <span
              key={t}
              className="absolute top-1/2 h-[9px] w-px -translate-y-1/2 bg-slate-300"
              style={{ left: `${(t / FORECAST_MAX_H) * 100}%` }}
            />
          ))}
          <input
            type="range"
            min={0}
            max={FORECAST_MAX_H}
            step={0.1}
            value={hour}
            onChange={(e) => onHourChange(e.target.valueAsNumber)}
            aria-label="Forecast hour scrubber"
            aria-valuetext={`Forecast hour ${hour.toFixed(1)}`}
            className="scrubber absolute inset-0"
          />
        </div>

        <span className="shrink-0 font-mono text-[9px] font-medium tracking-[0.12em] text-slate-500">
          +24H
        </span>
      </div>
    </section>
  );
}
