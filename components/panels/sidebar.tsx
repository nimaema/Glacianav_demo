"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  PanelLeftClose,
  Radar,
} from "lucide-react";
import { bearingToCompass } from "@/lib/drift";
import type { Iceberg, IceRegion, LatLng, LayerState } from "@/lib/types";
import LayersSection from "./control-panel";
import IcePanel from "./ice-panel";
import BergDetail from "./inspector";

export type SidebarTab = "bergs" | "ice";

interface SidebarProps {
  tab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  bergs: Iceberg[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  icePoint: LatLng | null;
  onClearIcePoint: () => void;
  onFocusRegion: (region: IceRegion) => void;
  layers: LayerState;
  onToggle: (key: keyof LayerState) => void;
  hour: number;
  onCollapse: () => void;
}

function BergRow({
  berg,
  onClick,
}: {
  berg: Iceberg;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Iceberg ${berg.id}, ${berg.sector}`}
      className="flex w-full cursor-pointer items-center gap-2.5 border-l-2 border-transparent px-4 py-2.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700"
    >
      <svg width="13" height="12" viewBox="0 0 20 18" aria-hidden className="shrink-0">
        <path
          d="M10 1.5 L18.8 16.5 H1.2 Z"
          fill="#f59e0b"
          stroke="#b45309"
          strokeWidth="1.2"
        />
      </svg>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block font-mono text-[12.5px] font-semibold text-slate-900">
          {berg.id}
        </span>
        <span className="block truncate text-[11px] text-slate-500">{berg.sector}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10.5px] tabular-nums text-slate-600">
        <ArrowUp
          aria-hidden
          className="h-3 w-3 text-blue-600"
          style={{ transform: `rotate(${berg.meanBearing}deg)` }}
        />
        {bearingToCompass(berg.meanBearing)} {berg.meanSpeedKts.toFixed(1)} kt
      </span>
    </button>
  );
}

export default function Sidebar({
  tab,
  onTabChange,
  bergs,
  selectedId,
  onSelect,
  icePoint,
  onClearIcePoint,
  onFocusRegion,
  layers,
  onToggle,
  hour,
  onCollapse,
}: SidebarProps) {
  const [layersOpen, setLayersOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selected = bergs.find((b) => b.id === selectedId) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [selectedId, tab, icePoint]);

  return (
    <aside className="enter-left flex h-full w-[19.5rem] shrink-0 flex-col border-r border-slate-300 bg-white/95 shadow-xl shadow-slate-900/10 backdrop-blur-md max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30">
      {/* brand */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-blue-700/25 bg-blue-700/10">
          <Radar className="h-4 w-4 text-blue-700" />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13px] font-bold tracking-[0.12em] text-slate-900">
            GLACIANAV ICE WATCH
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-slate-500">
            SEA ICE &amp; ICEBERG MONITOR
            <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
            <span className="font-semibold text-emerald-700">LIVE</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Hide sidebar"
          className="cursor-pointer rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* tabs */}
      <div className="border-b border-slate-200 px-3 py-2">
        <div
          role="tablist"
          aria-label="Sidebar content"
          className="grid grid-cols-2 gap-0.5 rounded-md bg-slate-100 p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "bergs"}
            onClick={() => onTabChange("bergs")}
            className={`cursor-pointer rounded px-2 py-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] transition-colors focus-visible:outline-2 focus-visible:outline-blue-700 ${
              tab === "bergs"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            ICEBERGS · {bergs.length}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "ice"}
            onClick={() => onTabChange("ice")}
            className={`cursor-pointer rounded px-2 py-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] transition-colors focus-visible:outline-2 focus-visible:outline-blue-700 ${
              tab === "ice"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            SEA ICE
          </button>
        </div>
      </div>

      {/* tab content */}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {tab === "ice" ? (
          <IcePanel
            hour={hour}
            point={icePoint}
            onClearPoint={onClearIcePoint}
            onFocusRegion={onFocusRegion}
          />
        ) : selected === null ? (
          <div key="list" className="swap-in-l">
            <p className="px-4 pb-2 pt-3 text-[11px] leading-snug text-slate-500">
              Select a berg here or on the chart to see where it is likely to
              drift.
            </p>
            <div className="divide-y divide-slate-100">
              {bergs.map((b) => (
                <BergRow key={b.id} berg={b} onClick={() => onSelect(b.id)} />
              ))}
            </div>
          </div>
        ) : (
          <div key={selected.id} className="swap-in-r">
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="flex w-full cursor-pointer items-center gap-1 px-3 py-2.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-slate-500 transition-colors hover:text-blue-700 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              ALL ICEBERGS
            </button>
            <BergDetail berg={selected} hour={hour} />
          </div>
        )}
      </div>

      {/* layers */}
      <div className="border-t border-slate-200">
        <button
          type="button"
          onClick={() => setLayersOpen((o) => !o)}
          aria-expanded={layersOpen}
          className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 font-mono text-[10px] font-semibold tracking-[0.2em] text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700"
        >
          MAP LAYERS
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              layersOpen ? "" : "-rotate-90"
            }`}
          />
        </button>
        {layersOpen && (
          <div className="max-h-[45dvh] overflow-y-auto pb-1">
            <LayersSection layers={layers} onToggle={onToggle} />
          </div>
        )}
      </div>
    </aside>
  );
}
