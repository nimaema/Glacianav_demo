"use client";

import { useEffect, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { FORECAST_MAX_H, ICEBERGS, REGION_LABEL } from "@/lib/data";
import { iceThicknessAt } from "@/lib/icefield";
import type { IceRegion, LatLng, LayerState } from "@/lib/types";
import NavMap from "./nav-map";
import Sidebar, { type SidebarTab } from "./panels/sidebar";
import Timeline from "./panels/timeline";

function ClockChip({ now }: { now: Date }) {
  const utc = now.toUTCString(); // e.g. "Sun, 19 Jul 2026 14:02:36 GMT"
  const time = utc.slice(17, 25);
  const date = utc.slice(5, 16).toUpperCase();
  return (
    <div className="rounded-lg border border-slate-300/80 bg-white/90 px-3 py-1.5 text-right shadow-lg shadow-slate-900/10 backdrop-blur-md">
      <div className="font-mono text-[13px] font-semibold tabular-nums text-slate-900">
        {time} <span className="text-[10px] font-medium text-blue-700">UTC</span>
      </div>
      <div className="font-mono text-[8.5px] tracking-[0.18em] text-slate-500">
        {date} · {REGION_LABEL}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [forecastHour, setForecastHour] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<SidebarTab>("bergs");
  const [icePoint, setIcePoint] = useState<LatLng | null>(null);
  const [regionFocus, setRegionFocus] = useState<{
    region: IceRegion;
    key: number;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [layers, setLayers] = useState<LayerState>({
    ice: true,
    bergs: true,
    prob: true,
    tracks: true,
  });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(
      () => setForecastHour((h) => Math.min(FORECAST_MAX_H, h + 0.12)),
      80,
    );
    return () => clearInterval(t);
  }, [playing]);

  useEffect(() => {
    if (playing && forecastHour >= FORECAST_MAX_H) setPlaying(false);
  }, [playing, forecastHour]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
        setIcePoint(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const togglePlay = () => {
    if (!playing && forecastHour >= FORECAST_MAX_H) setForecastHour(0);
    setPlaying((p) => !p);
  };

  const selectBerg = (id: string) => {
    setSelectedId(id);
    setIcePoint(null);
    setTab("bergs");
    setSidebarOpen(true);
  };

  /* Clicking ice opens a point analysis; clicking open water clears. */
  const handleMapClick = (pos: LatLng) => {
    const thickness = iceThicknessAt(pos[0], pos[1], forecastHour);
    if (thickness !== null && thickness > 0.02) {
      setIcePoint(pos);
      setSelectedId(null);
      setTab("ice");
      setSidebarOpen(true);
    } else {
      setSelectedId(null);
      setIcePoint(null);
    }
  };

  return (
    <div className="relative flex h-[100dvh] w-screen overflow-hidden bg-slate-200 font-sans text-slate-900">
      {sidebarOpen && (
        <Sidebar
            tab={tab}
            onTabChange={setTab}
            bergs={ICEBERGS}
            selectedId={selectedId}
            onSelect={(id) => (id ? selectBerg(id) : setSelectedId(null))}
            icePoint={icePoint}
            onClearIcePoint={() => setIcePoint(null)}
            onFocusRegion={(region) =>
              setRegionFocus((f) => ({ region, key: (f?.key ?? 0) + 1 }))
            }
            layers={layers}
            onToggle={(k) => setLayers((s) => ({ ...s, [k]: !s[k] }))}
            hour={forecastHour}
            onCollapse={() => setSidebarOpen(false)}
        />
      )}

      <main className="relative min-w-0 flex-1">
        <NavMap
          layers={layers}
          hour={forecastHour}
          selectedId={selectedId}
          icePoint={icePoint}
          regionFocus={regionFocus}
          onSelectBerg={selectBerg}
          onMapClick={handleMapClick}
        />

        {/* edge vignette to seat the chrome on the basemap */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{ boxShadow: "inset 0 0 90px rgba(15, 23, 42, 0.14)" }}
        />

        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Show sidebar"
            className="absolute left-3 top-3 z-20 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-300/80 bg-white/90 text-slate-600 shadow-lg shadow-slate-900/10 backdrop-blur-md transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        <div className="enter-top absolute right-3 top-3 z-20">
          <ClockChip now={now} />
        </div>

        <div className="enter-bottom absolute bottom-3 left-1/2 z-20 w-[min(92%,540px)] -translate-x-1/2">
          <Timeline
            hour={forecastHour}
            onHourChange={(h) => {
              setPlaying(false);
              setForecastHour(h);
            }}
            playing={playing}
            onTogglePlay={togglePlay}
          />
        </div>
      </main>
    </div>
  );
}
