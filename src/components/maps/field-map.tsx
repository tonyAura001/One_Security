"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { AgentStatus } from "@/lib/api/types";

export interface MapAgent {
  id: string;
  lng: number;
  lat: number;
  status: AgentStatus;
}

const STATUS_COLOR: Record<AgentStatus, string> = {
  poste: "#10B981",
  ronde: "#2D6BFF",
  pause: "#F59E0B",
  alerte: "#EF4444",
};

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/** Apply the current status/selection styling to a marker element in place. */
function styleMarker(
  el: HTMLElement,
  status: AgentStatus,
  selected: boolean,
): void {
  const color = STATUS_COLOR[status];
  el.style.cssText = [
    "width:16px",
    "height:16px",
    "border-radius:50%",
    "border:0",
    "cursor:pointer",
    "padding:0",
    "position:relative",
    `background:${color}`,
    `box-shadow:${
      selected ? "0 0 0 4px rgba(45,107,255,.55)," : "0 0 0 3px var(--surface),"
    }0 2px 6px rgba(0,0,0,.45)`,
  ].join(";");

  const hasPing = el.querySelector("span");
  if (status === "alerte" && !hasPing) {
    const ping = document.createElement("span");
    ping.style.cssText = `position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:2px solid ${color};animation:superPing 1.6s ease-out infinite;pointer-events:none`;
    el.appendChild(ping);
  } else if (status !== "alerte" && hasPing) {
    hasPing.remove();
  }
}

/**
 * Live field map (MapLibre GL + OpenStreetMap tiles) of Senegal with a
 * moving agent marker per position. Markers are managed imperatively so
 * only their coordinates/status update on each tick — the map never
 * re-initialises.
 */
export function FieldMap({
  agents,
  selectedId,
  onSelect,
}: {
  agents: MapAgent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Init once.
  useEffect(() => {
    if (!container.current || map.current) return;
    const markerMap = markers.current;
    const m = new maplibregl.Map({
      container: container.current,
      style: OSM_STYLE,
      center: [-16.9, 14.9],
      zoom: 7.1,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      markerMap.clear();
    };
  }, []);

  // Sync markers with the agents array.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    for (const agent of agents) {
      seen.add(agent.id);
      const selected = agent.id === selectedId;
      let marker = markers.current.get(agent.id);
      if (!marker) {
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", "Position agent");
        el.addEventListener("click", () => onSelectRef.current(agent.id));
        marker = new maplibregl.Marker({ element: el })
          .setLngLat([agent.lng, agent.lat])
          .addTo(m);
        markers.current.set(agent.id, marker);
      } else {
        marker.setLngLat([agent.lng, agent.lat]);
      }
      styleMarker(marker.getElement(), agent.status, selected);
    }
    for (const [id, marker] of markers.current) {
      if (!seen.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }
  }, [agents, selectedId]);

  return (
    <div
      ref={container}
      className="pp-map size-full"
      role="application"
      aria-label="Carte des positions des agents en temps réel"
    />
  );
}
