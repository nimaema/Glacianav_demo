"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  ImageOverlay,
  MapContainer,
  Marker,
  Pane,
  Polygon,
  Polyline,
  ScaleControl,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
  ZoomControl,
} from "react-leaflet";
import { ICEBERGS, MAP_CENTER, MAP_ZOOM } from "@/lib/data";
import {
  containmentEllipse,
  heatCells,
  meanTrack,
  sampleTracks,
} from "@/lib/drift";
import {
  classForThickness,
  ICE_BOUNDS,
  iceFieldImage,
  iceThicknessAt,
} from "@/lib/icefield";
import type { IceRegion, LatLng, LayerState } from "@/lib/types";

/* CARTO Voyager: fast, crisp general-purpose basemap, no API key. */
const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/* All drift-probability graphics live in the amber family (= iceberg hue);
 * ice stays in the blue family; UI chrome is cobalt. */
const PROB_LIGHT = "#f59e0b";
const PROB_DARK = "#b45309";

/* Faint lat/lon graticule for a nautical-chart feel. */
const GRATICULE: LatLng[][] = (() => {
  const lines: LatLng[][] = [];
  for (let lat = 64; lat <= 84; lat += 2) {
    lines.push([
      [lat, -40],
      [lat, 70],
    ]);
  }
  for (let lng = -40; lng <= 70; lng += 5) {
    lines.push([
      [62, lng],
      [85, lng],
    ]);
  }
  return lines;
})();

interface NavMapProps {
  layers: LayerState;
  hour: number;
  selectedId: string | null;
  icePoint: LatLng | null;
  regionFocus: { region: IceRegion; key: number } | null;
  onSelectBerg: (id: string) => void;
  onMapClick: (pos: LatLng) => void;
}

function normLng(lng: number): number {
  return ((lng + 180) % 360 + 360) % 360 - 180;
}

function MapClick({ onClick }: { onClick: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, normLng(e.latlng.lng)]);
    },
  });
  return null;
}

/** Fit the chart to a sea-ice region chosen in the sidebar. */
function FlyToRegion({
  focus,
}: {
  focus: { region: IceRegion; key: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    const [[lat0, lng0], [lat1, lng1]] = focus.region.bounds;
    map.flyToBounds(
      [
        [lat0, lng0],
        [lat1, lng1],
      ],
      { padding: [40, 40], duration: 0.9, maxZoom: 7 },
    );
  }, [map, focus]);
  return null;
}

/** Live thickness readout that follows the cursor, sampled from the same
 * field function that paints the raster, so the two can never disagree. */
function IceProbe({ hour, enabled }: { hour: number; enabled: boolean }) {
  const [probe, setProbe] = useState<{ value: number; x: number; y: number } | null>(
    null,
  );
  const lastSample = useRef(0);

  useMapEvents({
    mousemove(e) {
      const now = performance.now();
      if (now - lastSample.current < 35) return;
      lastSample.current = now;
      const lng = ((e.latlng.lng + 180) % 360 + 360) % 360 - 180;
      const value = iceThicknessAt(e.latlng.lat, lng, hour);
      setProbe(
        value === null
          ? null
          : { value, x: e.containerPoint.x, y: e.containerPoint.y },
      );
    },
    mouseout() {
      setProbe(null);
    },
    dragstart() {
      setProbe(null);
    },
  });

  if (!enabled || probe === null) return null;
  return (
    <div
      className="pointer-events-none absolute z-[800] whitespace-nowrap rounded-md border border-slate-300/80 bg-white/95 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-slate-700 shadow-md"
      style={{ left: probe.x + 14, top: probe.y + 16 }}
    >
      {probe.value < 0.02
        ? "OPEN WATER"
        : `SEA ICE ${probe.value.toFixed(2)} M · ${classForThickness(probe.value)}`}
    </div>
  );
}

/** Focus the selected berg so its probability field is readable. */
function FlyToSelection({ pos }: { pos: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, Math.max(map.getZoom(), 7), { duration: 0.9 });
  }, [map, pos]);
  return null;
}

function bergIcon(selected: boolean): L.DivIcon {
  return L.divIcon({
    className: "berg-div",
    iconSize: [20, 18],
    iconAnchor: [10, 9],
    html: `<div class="berg-wrap">${selected ? '<span class="berg-ring"></span>' : ""}<svg class="berg-icon" width="20" height="18" viewBox="0 0 20 18"><path d="M10 1.5 L18.8 16.5 H1.2 Z" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/></svg></div>`,
  });
}

export default function NavMap({
  layers,
  hour,
  selectedId,
  icePoint,
  regionFocus,
  onSelectBerg,
  onMapClick,
}: NavMapProps) {
  const bergIcons = useMemo(
    () =>
      Object.fromEntries(
        ICEBERGS.map((b) => [b.id, bergIcon(b.id === selectedId)]),
      ),
    [selectedId],
  );

  const selectedBerg = ICEBERGS.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="absolute inset-0 z-0">
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        minZoom={3}
        maxZoom={10}
        zoomControl={false}
        worldCopyJump
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomleft" imperial={false} />
        <MapClick onClick={onMapClick} />
        <FlyToSelection pos={selectedBerg ? selectedBerg.pos : null} />
        <FlyToRegion focus={regionFocus} />
        <IceProbe hour={hour} enabled={layers.ice} />

        {/* inspected ice point */}
        {icePoint && (
          <CircleMarker
            center={icePoint}
            radius={5}
            interactive={false}
            pathOptions={{
              color: "#1d4ed8",
              weight: 2,
              fillColor: "#ffffff",
              fillOpacity: 0.9,
            }}
          />
        )}

        {GRATICULE.map((pts, i) => (
          <Polyline
            key={`grat-${i}`}
            positions={pts}
            interactive={false}
            pathOptions={{ color: "#334155", weight: 0.7, opacity: 0.12 }}
          />
        ))}

        {/* ---- sea ice: continuous thickness raster, regenerated per forecast hour ---- */}
        <Pane name="ice-field" style={{ zIndex: 250 }}>
          {layers.ice && (
            <ImageOverlay
              url={iceFieldImage(hour)}
              bounds={ICE_BOUNDS}
              opacity={0.92}
            />
          )}
        </Pane>

        {/* ---- drift probability field for the selected berg ---- */}
        {layers.prob &&
          selectedBerg &&
          heatCells(selectedBerg, hour).map((cell, i) => (
            <Polygon
              key={`heat-${i}`}
              positions={cell.ring}
              interactive={false}
              pathOptions={{
                stroke: false,
                fillColor: PROB_DARK,
                fillOpacity: 0.05 + cell.w * 0.4,
              }}
            />
          ))}

        {/* ---- ensemble spaghetti for the selected berg ---- */}
        {layers.tracks &&
          selectedBerg &&
          hour > 0.2 &&
          sampleTracks(selectedBerg, hour).map((line, i) => (
            <Polyline
              key={`spag-${i}`}
              positions={line}
              interactive={false}
              pathOptions={{ color: "#92400e", weight: 1, opacity: 0.3 }}
            />
          ))}

        {/* ---- containment ellipses + mean drift for every berg ---- */}
        {layers.prob &&
          ICEBERGS.map((berg) => {
            const track = meanTrack(berg, hour);
            const mean = track[track.length - 1];
            return (
              <Fragment key={`prob-${berg.id}`}>
                <Polygon
                  positions={containmentEllipse(berg, hour, 0.9)}
                  interactive={false}
                  pathOptions={{
                    color: PROB_LIGHT,
                    weight: 1,
                    opacity: 0.55,
                    dashArray: "5 5",
                    fillColor: PROB_LIGHT,
                    fillOpacity: 0.08,
                  }}
                />
                <Polygon
                  positions={containmentEllipse(berg, hour, 0.5)}
                  interactive={false}
                  pathOptions={{
                    color: PROB_DARK,
                    weight: 1.2,
                    opacity: 0.7,
                    fillColor: PROB_LIGHT,
                    fillOpacity: 0.18,
                  }}
                />
                {hour > 0.2 && (
                  <>
                    <Polyline
                      positions={track}
                      interactive={false}
                      pathOptions={{
                        color: PROB_DARK,
                        weight: 1.6,
                        opacity: 0.85,
                        dashArray: "2 6",
                      }}
                    />
                    <CircleMarker
                      center={mean}
                      radius={3.5}
                      interactive={false}
                      pathOptions={{
                        color: PROB_DARK,
                        weight: 1.6,
                        fillColor: "#ffffff",
                        fillOpacity: 1,
                      }}
                    />
                  </>
                )}
              </Fragment>
            );
          })}

        {/* ---- iceberg markers ---- */}
        {layers.bergs &&
          ICEBERGS.map((berg) => (
            <Marker
              key={berg.id}
              position={berg.pos}
              icon={bergIcons[berg.id]}
              alt={`Iceberg ${berg.id}`}
              title={`Iceberg ${berg.id}`}
              bubblingMouseEvents={false}
              eventHandlers={{ click: () => onSelectBerg(berg.id) }}
            >
              <Tooltip
                className="chart-tooltip"
                direction="top"
                offset={[0, -10]}
                opacity={1}
              >
                ICEBERG {berg.id} · {berg.massT.toLocaleString("en-US")} T
              </Tooltip>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
