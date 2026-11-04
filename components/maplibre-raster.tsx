"use client";

import { Map, NavigationControl, ScaleControl, setWorkerUrl, type MapLayerMouseEvent } from "maplibre-gl";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { mapAttribution, type RasterProvider } from "@/lib/raster";
import type { Region } from "@/lib/types";
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());

export default function RasterMap({ provider, region, onSelect, onUnavailable }: {
  provider: RasterProvider; region?: Region; onSelect: (id: string) => void; onUnavailable: () => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [coordinate, setCoordinate] = useState("");
  const [warning, setWarning] = useState(false);
  const [ready, setReady] = useState(false);
  const [imageryLoaded, setImageryLoaded] = useState(false);
  const select = useEffectEvent((event: MapLayerMouseEvent) => {
    const id = event.features?.[0]?.properties.id;
    if (typeof id === "string") onSelect(id);
  });
  const unavailable = useEffectEvent(onUnavailable);

  useEffect(() => {
    if (!element.current) return;
    const controller = new AbortController();
    let receivedTile = false;
    let map: Map;
    try {
      map = new Map({
        container: element.current, center: [-97, 38], zoom: 3, minZoom: 1, maxZoom: (provider.maxZoom ?? 18) + 1,
        renderWorldCopies: false, scrollZoom: true, cooperativeGestures: true, dragRotate: false, touchPitch: false, clickTolerance: 5,
        style: {
          version: 8,
          sources: { imagery: { type: "raster", tiles: [provider.tiles], tileSize: 256, maxzoom: provider.maxZoom ?? 18, attribution: mapAttribution(provider.attribution) } },
          layers: [{ id: "imagery", type: "raster", source: "imagery" }],
        },
      });
    } catch { unavailable(); return; }
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    const timeout = window.setTimeout(() => { if (!receivedTile) unavailable(); }, 15000);
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(element.current);
    map.addControl(new NavigationControl({ showCompass: true }), "top-left");
    map.addControl(new ScaleControl({ unit: "metric" }));
    map.on("error", () => setWarning(true));
    map.on("sourcedata", (event) => {
      if (event.sourceId === "imagery" && event.tile?.state === "loaded") {
        receivedTile = true;
        setImageryLoaded(true);
        window.clearTimeout(timeout);
      }
    });
    map.on("mousemove", (event) => setCoordinate(`${event.lngLat.lat.toFixed(3)}°, ${event.lngLat.lng.toFixed(3)}°`));
    map.on("load", async () => {
      try {
        const response = await fetch("/datasets/regions.topojson", { signal: controller.signal });
        if (!response.ok) throw new Error("Boundary data unavailable");
        const topology = await response.json() as Topology<{ regions: GeometryCollection }>;
        map.addSource("regions", { type: "geojson", data: feature(topology, topology.objects.regions) });
        map.addLayer({ id: "regions-hit", type: "fill", source: "regions", paint: { "fill-color": "#ffffff", "fill-opacity": 0.01 } });
        map.addLayer({ id: "regions-outline", type: "line", source: "regions", paint: { "line-color": "#ffffff", "line-opacity": 0.65, "line-width": 1 } });
        map.addLayer({ id: "active-outline", type: "line", source: "regions", filter: ["==", ["get", "id"], ""], paint: { "line-color": "#ffffff", "line-width": 3 } });
        map.on("click", "regions-hit", select);
        setReady(true);
      } catch { if (!controller.signal.aborted) setWarning(true); }
    });
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [provider]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setFilter("active-outline", ["==", ["get", "id"], region?.id ?? ""]);
    if (region) map.flyTo({
      center: region.coordinates, zoom: region.type === "island" ? 11 : region.type === "territory" ? 7 : region.type === "district" ? 10 : 5,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 800,
    });
  }, [ready, region]);

  return <div className="raster-panel" data-imagery-state={imageryLoaded ? "ready" : "loading"}>
    <div className="raster-map" aria-label="Interactive imagery map" ref={element}/>
    <button className="imagery-overview quiet-button" onClick={() => mapRef.current?.fitBounds([[-125, 24], [-66, 50]], { padding: 45, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 250 })}>U.S. overview</button>
    <p className="map-gesture-help">Drag to move · Ctrl/⌘ + scroll to zoom · Use two fingers to pan or pinch on touchscreens</p>
    <div className="raster-status" role="status">{warning ? "Some imagery or boundaries could not be loaded. Try another location or zoom level." : !imageryLoaded ? "Loading imagery…" : provider.description ?? "Provider imagery"}{coordinate && <span> · {coordinate}</span>}</div>
  </div>;
}
