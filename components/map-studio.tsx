"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowDownToLine, ArrowRight, Crosshair, Globe2, Layers3, LocateFixed, Maximize, Minus, Plus, Search, X } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import { AtlasSvg, overviewCamera, type Camera } from "./atlas-svg";
import { Shape } from "./shape";
import { RegionFlag } from "./region-flag";
import { ShareButton } from "./share";
import { choropleth, layerOptions } from "@/lib/layers";
import { metricById } from "@/lib/metrics";
import { formatValue, latest, ranked, yearsFor } from "@/lib/statistics";
import { exportSvg } from "@/lib/downloads";
import type { RasterProvider } from "@/lib/raster";
import { regionTypeLabels, type Flag, type MapData, type Observation, type Region, type Source } from "@/lib/types";

type Props = {
  regions: Region[]; data: MapData; observations: Observation[]; sources: Record<string, Source>;
  initialId: string; initialLayer: string; home?: boolean;
  providers?: { satellite: RasterProvider | null; terrain: RasterProvider | null };
  flags: Record<string, Flag>;
  leads: Record<string, { text: string; url: string }>;
};

const RasterMap = dynamic(() => import("./maplibre-raster"), {
  ssr: false,
  loading: () => <p className="map-notice" role="status">Loading imagery map…</p>,
});

export function MapStudio({ regions, data, observations, sources, initialId, initialLayer, home = false, providers, flags, leads }: Props) {
  const [selected, setSelected] = useState(initialId);
  const [hovered, setHovered] = useState<string | null>(null);
  const [layer, setLayer] = useState(initialLayer);
  const [camera, setCamera] = useState<Camera>(overviewCamera);
  const [search, setSearch] = useState("");
  const [labels, setLabels] = useState(true);
  const [status, setStatus] = useState("");
  const [rasterFailed, setRasterFailed] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; camera: Camera; scale: number; moved: boolean } | null>(null);
  const moved = useRef(false);
  const region = regions.find((item) => item.id === selected);
  const flag = region ? flags[region.id] : undefined;
  const lead = region ? leads[region.id] : undefined;
  const activeMetric = metricById[layer];
  const raster = layer === "terrain" || layer === "satellite" ? providers?.[layer] : null;
  const unavailable = (layer === "terrain" || layer === "satellite") && (!raster || rasterFailed);
  const year = activeMetric ? yearsFor(observations, layer)[0] : undefined;
  const values = Object.fromEntries(observations.filter((item) => item.metric === layer && item.year === year).map((item) => [item.region, item.value]));
  const { fills, legend } = choropleth(values, layer);
  const query = search.trim().toLowerCase();
  const matches = query ? regions.filter((item) => [item.name, item.id, item.capital ?? ""].some((key) => key.toLowerCase().includes(query))) : [];
  const focus = hovered ? regions.find((item) => item.id === hovered) : undefined;

  function updateUrl(id: string, newLayer: string) {
    if (home) return;
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("region", id);
    else url.searchParams.delete("region");
    if (newLayer !== "political") url.searchParams.set("layer", newLayer);
    else url.searchParams.delete("layer");
    window.history.replaceState(null, "", url);
  }

  function fit(id = selected) {
    const bounds = data.shapes[id]?.bounds;
    if (!bounds) { setCamera(overviewCamera); return; }
    const [x0, y0, x1, y1] = bounds;
    const k = Math.max(1.15, Math.min(6, data.width * 0.65 / Math.max(x1 - x0, 1), data.height * 0.65 / Math.max(y1 - y0, 1)));
    setCamera({ x: data.width / 2 - (x0 + x1) * k / 2, y: data.height / 2 - (y0 + y1) * k / 2, k });
  }

  function select(id: string, zoom = false) {
    if (moved.current) return;
    setSelected(id);
    setSearch("");
    if (zoom && data.shapes[id]) fit(id);
    updateUrl(id, layer);
  }

  function zoom(factor: number) {
    setCamera((previous) => {
      const k = Math.max(1, Math.min(8, previous.k * factor));
      if (k === 1) return overviewCamera;
      const ratio = k / previous.k;
      return { k, x: data.width / 2 - (data.width / 2 - previous.x) * ratio, y: data.height / 2 - (data.height / 2 - previous.y) * ratio };
    });
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || camera.k === 1 || !svg.current) return;
    moved.current = false;
    drag.current = { startX: event.clientX, startY: event.clientY, camera, scale: data.width / svg.current.getBoundingClientRect().width, moved: false };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const start = drag.current;
    const dx = event.clientX - start.startX;
    const dy = event.clientY - start.startY;
    if (!start.moved && Math.hypot(dx, dy) < 5) return;
    start.moved = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setCamera({ ...start.camera, x: start.camera.x + dx * start.scale, y: start.camera.y + dy * start.scale });
  }
  function pointerEnd() {
    moved.current = Boolean(drag.current?.moved);
    drag.current = null;
    window.setTimeout(() => { moved.current = false; }, 0);
  }

  async function saveImage() {
    if (!svg.current) return;
    const clone = svg.current.cloneNode(true) as SVGSVGElement;
    const css = getComputedStyle(document.documentElement);
    const palette = ["--map-paper", "--map-grid", "--map-land", "--map-edge", "--map-ink", "--map-muted", "--map-selected", "--map-inset"];
    clone.setAttribute("style", palette.map((key) => `${key}:${css.getPropertyValue(key)}`).join(";"));
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = ".map-background{fill:var(--map-paper)}.map-grid-line{stroke:var(--map-grid)}.inset-frame{fill:var(--map-inset);stroke:var(--map-grid)}.inset-hit-area{fill:none}.region-path{stroke:var(--map-edge);stroke-width:.8}.region-path:not([fill]){fill:var(--map-land)}.missing .region-path{fill:#cbd3d5}.selected .region-path:not([fill]){fill:var(--map-selected)}.selected .region-path{stroke:#985f34;stroke-width:1.3}.region-label,.map-compass text{fill:var(--map-ink);font:700 9px sans-serif;text-anchor:middle;dominant-baseline:central}.label-leader,.map-scale path{fill:none;stroke:var(--map-muted);stroke-width:.7}.inset-title,.map-ocean,.map-scale text{fill:var(--map-muted);font:700 9px monospace;letter-spacing:1px}.water-lake{fill:#9ec9d8}.water-river,.map-compass path,.map-compass circle{fill:none;stroke:#5593a8}";
    clone.prepend(style);
    try { await exportSvg(new XMLSerializer().serializeToString(clone), "stateatlas-map", "png", data.width, data.height); setStatus("PNG downloaded"); }
    catch { setStatus("PNG export could not be created"); }
  }

  return <div className="atlas-workspace">
    <section className="atlas-card" aria-label="Interactive atlas">
      <div className="map-toolbar">
        <div className="map-tag"><Globe2 size={17} /><span><strong>United States</strong><small>NATIONAL ATLAS</small></span></div>
        <label className="select-control"><Layers3 size={16} /><span className="sr-only">Map layer</span><select aria-label="Map layer" value={layer} onChange={(event) => { setLayer(event.target.value); setRasterFailed(false); updateUrl(selected, event.target.value); }}>
          {layerOptions.map((option) => <option key={option.id} value={option.id}>{option.id === "satellite" && providers?.satellite ? "Satellite imagery" : option.id === "terrain" && providers?.terrain ? "Topographic map" : option.name}</option>)}
        </select></label>
      </div>
      {unavailable && <p className="map-notice" role="status">{rasterFailed ? "Imagery is unavailable in this browser. Political boundaries are shown below." : layer === "terrain" ? "Topographic imagery requires a configured tile provider. Political boundaries are shown below." : "Satellite imagery requires a licensed tile provider. Political boundaries are shown below."}</p>}
      {raster && !rasterFailed ? <RasterMap key={layer} provider={raster} region={region} onSelect={select} onUnavailable={() => setRasterFailed(true)}/> : <div className={`map-stage${camera.k > 1 ? " zoomed" : ""}`} ref={stage} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
        <AtlasSvg data={data} regions={regions} svgRef={svg} selection={selected ? [selected] : []} thematic={Boolean(activeMetric)} fills={fills} water={layer === "waterways"} labels={labels} camera={camera} onSelect={select} onHover={setHovered} showScale={camera.k === 1}/>
        <div className="map-zoom" onPointerDown={(event) => event.stopPropagation()}>
          <button aria-label="Zoom in" title="Zoom in" onClick={() => zoom(1.35)}><Plus size={17}/></button>
          <button aria-label="Zoom out" title="Zoom out" onClick={() => zoom(1 / 1.35)}><Minus size={17}/></button>
          <button aria-label="Reset map view" title="Reset map view" onClick={() => setCamera(overviewCamera)}><Maximize size={15}/></button>
          <button aria-label="Fit selected region" title="Fit selected region" onClick={() => fit()} disabled={!data.shapes[selected]}><LocateFixed size={17}/></button>
        </div>
        {focus && <div className="map-tooltip"><strong>{focus.name}</strong>{activeMetric && <span>{formatValue(layer, values[focus.id])}</span>}</div>}
      </div>}
      {activeMetric && <div className="map-legend"><strong>{activeMetric.name} · {year}</strong>{legend.map((item) => <span key={item.color}><i style={{ background: item.color }} /> {item.label}</span>)}<span><i className="legend-missing" /> No data</span></div>}
      {layer === "waterways" && <div className="map-legend"><strong>Major continental rivers and lakes</strong><a href={sources.earth?.url}>Natural Earth · 1:50m</a></div>}
      <div className="map-caption"><span><Crosshair size={14} /> {region ? coordinates(region) : raster && !rasterFailed ? "Web Mercator" : "Albers equal-area · separate inset scales"}</span>
        {(!raster || rasterFailed) && <div><button className="text-button" aria-pressed={labels} onClick={() => setLabels((value) => !value)}>{labels ? "Hide labels" : "Show labels"}</button><button className="text-button" onClick={saveImage}><ArrowDownToLine size={14}/> PNG</button></div>}</div>
      <span className="sr-only" role="status">{status}</span>
    </section>
    <aside className="atlas-sidebar" aria-label="Region details">
      <div className="region-picker"><label><Search size={16} /><input aria-label="Find a state or territory" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a jurisdiction…" onKeyDown={(event) => {
        if (event.key === "Enter" && matches[0]) select(matches[0].id, !home);
        if (event.key === "Escape") setSearch("");
      }} /></label>
        {query && <div className="region-matches">{matches.length ? matches.slice(0, 8).map((item) => <button key={item.id} onClick={() => select(item.id, !home)}><span>{item.name}</span><small>{item.id}</small></button>) : <p>No matching jurisdiction.</p>}</div>}
      </div>
      {region ? <article className="region-card" key={region.id}>
        <div className="region-card-label"><span className="eyebrow"><span /> REGION PROFILE</span><div>{flag && <a href={flag.source} aria-label={`Flag attribution for ${region.name}`}><RegionFlag flag={flag} name={region.name} size={28}/></a>}<button className="icon-button" aria-label="Clear region selection" onClick={() => { setSelected(""); setCamera(overviewCamera); updateUrl("", layer); }}><X size={16}/></button></div></div>
        <div className="region-title"><div><h2>{region.name}</h2><p>{regionTypeLabels[region.type]}{region.censusRegion ? ` · ${region.censusRegion}` : ""}</p></div><Shape path={data.silhouettes[region.id]} /></div>
        <dl className="region-stats"><div><dt>Capital</dt><dd>{region.capital ?? "—"}</dd></div>
          {["population", "land", "density", "gdp"].map((key) => {
            const value = latest(observations, region.id, key);
            return <div key={key}><dt>{metricById[key].name} {value && <small>{value.year}</small>}</dt><dd>{formatValue(key, value?.value, "metric", true)}</dd></div>;
          })}
        </dl>
        {lead && <div className="drawer-intro"><p>{lead.text}</p><small><a href={lead.url}>Wikipedia contributors</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a></small></div>}
        {activeMetric && year && <p className="source-line">{sources[observations.find((item) => item.metric === layer && item.year === year)?.source ?? "derived"]?.name}
          {(() => {
            const row = ranked(regions, observations, layer, year, "states-dc", "desc").find((row) => row.region.id === selected);
            return row?.rank ? ` · #${row.rank} among states + D.C.` : "";
          })()}</p>}
        <Link className="primary-button profile-link" href={`/regions/${region.slug}`}>Open profile <ArrowRight size={16}/></Link>
      </article> : <div className="region-card empty-region"><h2>Choose a region</h2><p>Click a shape or choose any jurisdiction from the list below.</p></div>}
      <label className="jump-control"><span>JUMP TO A JURISDICTION</span><select aria-label="Jump to a jurisdiction" value={selected} onChange={(event) => select(event.target.value, !home)}>
        <option value="" disabled>Select a jurisdiction</option>
        {(["state", "district", "territory", "island"] as const).map((type) => <optgroup label={regionTypeLabels[type]} key={type}>{regions.filter((item) => item.type === type).sort((a, b) => a.name.localeCompare(b.name)).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</optgroup>)}
      </select></label>
      {!home && <div className="map-share"><ShareButton /></div>}
    </aside>
  </div>;
}

function coordinates(region: Region) {
  const [longitude, latitude] = region.coordinates;
  return `${Math.abs(latitude).toFixed(2)}° ${latitude < 0 ? "S" : "N"} · ${Math.abs(longitude).toFixed(2)}° ${longitude < 0 ? "W" : "E"}`;
}
