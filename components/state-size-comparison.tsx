"use client";

import { geoArea, geoAzimuthalEqualArea, geoPath } from "d3-geo";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { Minus, Move, Plus, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { useMapNavigation } from "./use-map-navigation";
import { formatValue, latest } from "@/lib/statistics";
import type { Observation, Region } from "@/lib/types";

type Boundary = Feature<Polygon | MultiPolygon>;
type Point = { x: number; y: number };

async function loadOutline(region: Region, signal: AbortSignal) {
  const response = await fetch(`/datasets/regions/${region.slug}.geojson`, { signal });
  if (!response.ok) throw new Error("Boundary unavailable");
  const boundary = await response.json() as Boundary;
  const geometry = boundary.geometry;
  // D3's spherical polygons use the opposite winding from RFC 7946.
  if (geoArea(boundary) > 2 * Math.PI) {
    const reverseRings = (rings: Polygon["coordinates"]) => rings.map((ring) => [...ring].reverse());
    boundary.geometry = geometry.type === "Polygon"
      ? { type: "Polygon", coordinates: reverseRings(geometry.coordinates) }
      : { type: "MultiPolygon", coordinates: geometry.coordinates.map(reverseRings) };
  }

  const [longitude, latitude] = region.coordinates;
  const projection = geoAzimuthalEqualArea().rotate([-longitude, -latitude]).scale(6371).translate([0, 0]).precision(0.25);
  const draw = geoPath(projection);
  const [[left, top], [right, bottom]] = draw.bounds(boundary);
  const path = draw(boundary);
  if (!path || !Number.isFinite(left + top + right + bottom)) throw new Error("Invalid boundary");
  return { path, width: right - left, height: bottom - top, x: (left + right) / 2, y: (top + bottom) / 2 };
}

type Outline = Awaited<ReturnType<typeof loadOutline>>;

export default function StateSizeComparison({ regions, observations, initialId }: {
  regions: Region[]; observations: Observation[]; initialId: string;
}) {
  const states = regions.filter((region) => region.type === "state").sort((a, b) => a.name.localeCompare(b.name));
  const [overlayId, setOverlayId] = useState(states.some((state) => state.id === initialId) ? initialId : "AK");
  const [baseId, setBaseId] = useState(overlayId === "TX" ? "AK" : "TX");
  const overlay = states.find((state) => state.id === overlayId)!;
  const base = states.find((state) => state.id === baseId)!;
  const overlayArea = latest(observations, overlayId, "land");
  const baseArea = latest(observations, baseId, "land");
  const ratio = overlayArea && baseArea ? overlayArea.value / baseArea.value : undefined;

  return <div className="size-comparison">
    <div className="size-comparison-options">
      <label><span><i className="size-key size-key-overlay"/> Move this state</span>
        <select value={overlayId} onChange={(event) => setOverlayId(event.target.value)}>
          {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
        </select>
        <small>{formatValue("land", overlayArea?.value)} land</small>
      </label>
      <label><span><i className="size-key size-key-base"/> Compare against</span>
        <select value={baseId} onChange={(event) => setBaseId(event.target.value)}>
          {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
        </select>
        <small>{formatValue("land", baseArea?.value)} land</small>
      </label>
      <p className="size-comparison-ratio" aria-live="polite">{ratio !== undefined && <>
        <strong>{ratio.toLocaleString("en-US", { maximumSignificantDigits: 3 })}×</strong>
        <span>{base.name}&rsquo;s land area</span>
      </>}</p>
    </div>
    <ComparisonCanvas key={`${overlayId}:${baseId}`} overlay={overlay} base={base} />
  </div>;
}

function ComparisonCanvas({ overlay, base }: { overlay: Region; base: Region }) {
  const [outlines, setOutlines] = useState<[Outline, Outline]>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ width: 840, height: 440 });
  const canvas = useRef<SVGSVGElement>(null);
  const navigation = useMapNavigation(canvas, { x: 0, y: 0, ...viewport }, { minZoom: 0.5, maxZoom: 8, dragExclude: ".size-drag", preserveOnResize: true });
  const drag = useRef<{ pointerId: number; start: Point; origin: Point } | null>(null);
  const gridId = useId();

  useEffect(() => {
    const controller = new AbortController();
    const movable = loadOutline(overlay, controller.signal);
    const fixed = base.id === overlay.id ? movable : loadOutline(base, controller.signal);
    Promise.all([movable, fixed]).then(setOutlines).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [overlay, base, attempt]);

  useEffect(() => {
    if (!canvas.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setViewport({ width, height });
    });
    observer.observe(canvas.current);
    return () => observer.disconnect();
  }, []);

  const { width, height } = viewport;
  const fit = outlines ? Math.min(
    width * 0.8 / Math.max(...outlines.map((shape) => shape.width)),
    height * 0.76 / Math.max(...outlines.map((shape) => shape.height)),
  ) : 1;
  const scale = fit;

  function pointerPosition(event: PointerEvent<SVGGElement>) {
    const matrix = canvas.current?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  }

  function startDrag(event: PointerEvent<SVGGElement>) {
    if (event.button !== 0 || drag.current) return;
    const start = pointerPosition(event);
    if (!start) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, start, origin: offset };
  }

  function moveDrag(event: PointerEvent<SVGGElement>) {
    const active = drag.current;
    if (active?.pointerId !== event.pointerId) return;
    const point = pointerPosition(event);
    if (!point) return;
    setOffset({
      x: active.origin.x + (point.x - active.start.x) / scale,
      y: active.origin.y + (point.y - active.start.y) / scale,
    });
  }

  function reset() {
    setOffset({ x: 0, y: 0 });
    navigation.reset();
  }

  return <>
    <div className="size-canvas">
      <svg ref={canvas} viewBox={`0 0 ${width} ${height}`} tabIndex={0} role="group" aria-label="Same-scale state outlines">
        <defs><pattern id={gridId} width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#dedfe3"/></pattern></defs>
        <rect width={width} height={height} fill={`url(#${gridId})`}/>
        {outlines && <>
          <g transform={`translate(${width / 2} ${height / 2}) scale(${scale})`}>
            <path className="size-base-outline" d={outlines[1].path} transform={`translate(${-outlines[1].x} ${-outlines[1].y})`} vectorEffect="non-scaling-stroke"/>
          </g>
          <g className="size-drag" tabIndex={0} role="group" aria-label={`Move ${overlay.name}. Drag or use the arrow keys.`}
            transform={`translate(${width / 2 + offset.x * scale} ${height / 2 + offset.y * scale})`}
            onPointerDown={startDrag} onPointerMove={moveDrag} onLostPointerCapture={() => { drag.current = null; }}
            onKeyDown={(event) => {
              const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
              if (!direction) return;
              event.preventDefault();
              const pixelsPerUnit = scale * (canvas.current?.getScreenCTM()?.a ?? 1);
              setOffset((point) => ({ x: point.x + direction[0] * 12 / pixelsPerUnit, y: point.y + direction[1] * 12 / pixelsPerUnit }));
            }}>
            <path className="size-overlay-outline" d={outlines[0].path} transform={`scale(${scale}) translate(${-outlines[0].x} ${-outlines[0].y})`} vectorEffect="non-scaling-stroke"/>
            <circle className="size-drag-handle" r="12"/>
            <Move x={-7} y={-7} width={14} height={14} aria-hidden="true" pointerEvents="none"/>
          </g>
        </>}
      </svg>
      {outlines ? <div className="size-zoom" role="group" aria-label="Size comparison zoom">
        <button className="icon-button" aria-label="Zoom comparison in" title="Zoom in (+)" onClick={() => navigation.zoomBy(1.4)} disabled={navigation.zoom >= 8}><Plus size={17}/></button>
        <button className="icon-button" aria-label="Zoom comparison out" title="Zoom out (−)" onClick={() => navigation.zoomBy(1 / 1.4)} disabled={navigation.zoom <= 0.5}><Minus size={17}/></button>
        <button className="icon-button" aria-label="Reset comparison view" onClick={reset}><RotateCcw size={16}/></button>
      </div> : <div className="size-load" role="status">{error ? <>
        <p>Could not load the state outlines.</p>
        <button className="quiet-button" onClick={() => { setError(false); setAttempt((value) => value + 1); }}>Try again</button>
      </> : "Loading state outlines…"}</div>}
    </div>
    <p className="size-comparison-caption">Drag the blue outline or move it with the arrow keys. Drag the background to pan both states; click it, then scroll or pinch to zoom. Both outlines use the same scale and preserve area. The land area figures exclude water.</p>
  </>;
}
