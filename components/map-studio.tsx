"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowDownToLine, ArrowRight, Crosshair, Expand, Globe2, Layers3, LocateFixed, Maximize, Minimize, Minus, Paintbrush, PanelRight, Plus, Scan, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AtlasSvg } from "./atlas-svg";
import { useMapNavigation } from "./use-map-navigation";
import { Shape } from "./shape";
import { RegionFlag } from "./region-flag";
import { ShareButton } from "./share";
import { choropleth, layerOptions, mapPalettes, politicalFills, type MapPalette } from "@/lib/layers";
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

const StateSizeComparison = dynamic(() => import("./state-size-comparison"), {
  loading: () => <p className="map-notice" role="status">Loading size comparison…</p>,
});

export function MapStudio({ regions, data, observations, sources, initialId, initialLayer, home = false, providers, flags, leads }: Props) {
  const [selected, setSelected] = useState(initialId);
  const [hovered, setHovered] = useState<string | null>(null);
  const [layer, setLayer] = useState(initialLayer);
  const [search, setSearch] = useState("");
  const [labels, setLabels] = useState(true);
  const [status, setStatus] = useState("");
  const [rasterFailed, setRasterFailed] = useState(false);
  const [palette, setPalette] = useState<MapPalette>("slate");
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState(true);
  const [fullscreenDetails, setFullscreenDetails] = useState(false);
  const [comparingSize, setComparingSize] = useState(false);
  const showDetails = expanded ? fullscreenDetails : details;
  const detailsId = useId();
  const expandButton = useRef<HTMLButtonElement>(null);
  const atlas = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const region = regions.find((item) => item.id === selected);
  const flag = region ? flags[region.id] : undefined;
  const lead = region ? leads[region.id] : undefined;
  const activeMetric = metricById[layer];
  const raster = layer === "terrain" || layer === "satellite" ? providers?.[layer] : null;
  const unavailable = (layer === "terrain" || layer === "satellite") && (!raster || rasterFailed);
  const navigation = useMapNavigation(svg, { x: 0, y: 0, width: data.width, height: data.height }, { enabled: !comparingSize && !(raster && !rasterFailed) });
  const year = activeMetric ? yearsFor(observations, layer)[0] : undefined;
  const values = Object.fromEntries(observations.filter((item) => item.metric === layer && item.year === year).map((item) => [item.region, item.value]));
  const { fills, legend } = choropleth(values, layer, "light", palette);
  const mapFills = activeMetric ? fills : politicalFills(regions, palette, selected);
  const query = search.trim().toLowerCase();
  const matches = query ? regions.filter((item) => [item.name, item.id, item.capital ?? ""].some((key) => key.toLowerCase().includes(query))) : [];
  const focus = hovered ? regions.find((item) => item.id === hovered) : undefined;

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setExpanded(false); expandButton.current?.focus(); }
      if (event.key === "Tab") {
        const items = [...(atlas.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, select, [tabindex="0"]') ?? [])].filter((item) => item.getClientRects().length > 0);
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); };
  }, [expanded]);

  function changeLayer(next: string) {
    setComparingSize(false);
    setLayer(next);
    setRasterFailed(false);
    updateUrl(selected, next);
  }

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
    if (!bounds) { navigation.reset(); return; }
    const [x0, y0, x1, y1] = bounds;
    navigation.fit({ x: x0, y: y0, width: Math.max(1, x1 - x0), height: Math.max(1, y1 - y0) });
  }

  function select(id: string, zoom = false) {
    setSelected(id);
    if (!expanded) setDetails(true);
    setSearch("");
    if (zoom && data.shapes[id]) fit(id);
    updateUrl(id, layer);
  }

  async function saveImage() {
    if (!svg.current) return;
    const clone = svg.current.cloneNode(true) as SVGSVGElement;
    const css = getComputedStyle(svg.current);
    const palette = ["--map-paper", "--map-grid", "--map-land", "--map-edge", "--map-ink", "--map-muted", "--map-selected", "--map-inset", "--map-inset-ink"];
    clone.setAttribute("style", palette.map((key) => `${key}:${css.getPropertyValue(key)}`).join(";"));
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = ".map-background{fill:var(--map-paper)}.map-grid-line{stroke:var(--map-grid)}.inset-frame{fill:var(--map-inset);stroke:var(--map-inset)}.inset-hit-area{fill:none}.region-path{stroke:var(--map-edge);stroke-width:.8}.region-path:not([fill]){fill:var(--map-land)}.missing .region-path{fill:#cbd3d5}.selected .region-path:not([fill]){fill:var(--map-selected)}.selected .region-path{stroke:var(--map-ink);stroke-width:1.3}.region-label,.map-compass text{fill:var(--map-ink);font:700 9px sans-serif;text-anchor:middle;dominant-baseline:central}.label-leader,.map-scale path{fill:none;stroke:var(--map-muted);stroke-width:.7}.inset-title,.map-ocean,.map-scale text{fill:var(--map-muted);font:700 9px monospace;letter-spacing:1px}.inset-title,.inset-region .region-label{fill:var(--map-inset-ink)}.inset-region .region-label{stroke:var(--map-inset);stroke-width:1.8;paint-order:stroke}.selected.inset-region .region-path{stroke:var(--map-inset-ink)}.water-lake{fill:#9ec9d8}.water-river,.map-compass path,.map-compass circle{fill:none;stroke:#5593a8}";
    clone.prepend(style);
    try { await exportSvg(new XMLSerializer().serializeToString(clone), "stateatlas-map", "png", data.width, data.height); setStatus("PNG downloaded"); }
    catch { setStatus("PNG export could not be created"); }
  }

  return <div ref={atlas} role={expanded ? "dialog" : undefined} aria-modal={expanded ? true : undefined} aria-label={expanded ? "Fullscreen map" : undefined} className={`atlas-workspace${expanded ? " atlas-expanded" : ""}${showDetails ? "" : " details-hidden"}${comparingSize ? " atlas-size-mode" : ""}`}>
    <section className="atlas-card" aria-label="Interactive atlas">
      <div className="map-toolbar">
        <div className="map-tag"><Globe2 size={17} /><span><strong>United States</strong><small>NATIONAL ATLAS</small></span></div>
        <div className="map-modes" role="group" aria-label="Map style">
          {[{ id: "political", title: "Map" }, { id: "satellite", title: "Satellite" }, { id: "terrain", title: "Terrain" }].map((mode) =>
            <button key={mode.id} aria-pressed={!comparingSize && (mode.id === "political" ? !["satellite", "terrain"].includes(layer) : layer === mode.id)} onClick={() => changeLayer(mode.id)}>{mode.title}</button>
          )}
          <button className="size-mode-button" aria-pressed={comparingSize} onClick={() => setComparingSize(!comparingSize)}>
            <Scan size={14} aria-hidden="true"/> Compare size
          </button>
        </div>
        <div className="map-toolbar-actions">
          {!comparingSize && <>
            <label className="select-control"><Layers3 size={15}/><span className="sr-only">Map layer</span><select aria-label="Map layer" value={layer} onChange={(event) => changeLayer(event.target.value)}>{layerOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
            {!raster && <div className="palette-picker" role="group" aria-label="Map color palette">{(Object.keys(mapPalettes) as MapPalette[]).map((key) => <button key={key} className="palette-swatch" aria-label={`${mapPalettes[key].name} palette`} title={mapPalettes[key].name} aria-pressed={palette === key} onClick={() => setPalette(key)}><span style={{background:mapPalettes[key].selected}}/></button>)}</div>}
            <button className="icon-button" aria-label={showDetails ? "Hide region details" : "Show region details"} title={showDetails ? "Hide details" : "Show details"} aria-expanded={showDetails} aria-controls={detailsId} onClick={() => {
              if (expanded) setFullscreenDetails(!fullscreenDetails);
              else setDetails(!details);
            }}><PanelRight size={17}/></button>
          </>}
          <button ref={expandButton} className="icon-button atlas-expand-button" aria-label={expanded ? "Exit fullscreen" : "Enter fullscreen"} title={expanded ? "Exit fullscreen (Esc)" : "Fullscreen"} aria-pressed={expanded} onClick={() => {
            if (!expanded) setFullscreenDetails(false);
            setExpanded(!expanded);
          }}>{expanded ? <><Minimize size={17}/><span>Exit fullscreen</span></> : <Expand size={17}/>}</button>
        </div>
      </div>
      {comparingSize ? <StateSizeComparison regions={regions} observations={observations} initialId={selected}/> : <>
      {unavailable && <div className="map-notice" role="status">Imagery could not be loaded. The offline map is available below. <button className="text-button" onClick={() => setRasterFailed(false)}>Retry imagery</button></div>}
      <div className="map-scene">
      {raster && !rasterFailed ? <RasterMap key={layer} provider={raster} region={region} onSelect={select} onUnavailable={() => setRasterFailed(true)}/> : <div className="map-stage">
        <AtlasSvg data={data} regions={regions} svgRef={svg} selection={selected ? [selected] : []} thematic={Boolean(activeMetric)} fills={mapFills} water={layer === "waterways"} labels={labels} onSelect={select} onHover={setHovered} showScale={navigation.zoom === 1}/>
        <div className="map-zoom" role="group" aria-label="Map controls" onPointerDown={(event) => event.stopPropagation()}>
          <button aria-label="Zoom in" title="Zoom in" disabled={navigation.zoom >= 16} onClick={() => navigation.zoomBy(1.4)}><Plus size={17}/></button>
          <button aria-label="Zoom out" title="Zoom out" disabled={navigation.zoom <= 1} onClick={() => navigation.zoomBy(1 / 1.4)}><Minus size={17}/></button>
          <button aria-label="Reset map view" title="Reset map view" onClick={() => navigation.reset()}><Maximize size={15}/></button>
          <button aria-label="Fit selected region" title="Fit selected region" onClick={() => fit()} disabled={!data.shapes[selected]}><LocateFixed size={17}/></button>
          <Link className="map-customize" href={{ pathname: "/creator", query: selected ? { region: selected } : {} }} aria-label="Customize this map" title="Customize this map"><Paintbrush size={17}/></Link>
        </div>
        <p className="map-gesture-help map-gesture-overlay">Drag to move · Click map, then scroll to zoom · Pinch to zoom</p>
        {focus && <div className="map-tooltip"><strong>{focus.name}</strong>{activeMetric && <span>{formatValue(layer, values[focus.id])}</span>}</div>}
      </div>}
    <aside id={detailsId} className="atlas-sidebar" aria-label="Region details" hidden={!showDetails}>
      <div className="region-picker"><label><Search size={16} /><input aria-label="Find a state or territory" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a jurisdiction…" onKeyDown={(event) => {
        if (event.key === "Enter" && matches[0]) select(matches[0].id, !home);
        if (event.key === "Escape") setSearch("");
      }} /></label>
        {query && <div className="region-matches">{matches.length ? matches.slice(0, 8).map((item) => <button key={item.id} onClick={() => select(item.id, !home)}><span>{item.name}</span><small>{item.id}</small></button>) : <p>No matching jurisdiction.</p>}</div>}
      </div>
      {region ? <article className="region-card" key={region.id}>
        <div className="region-card-label"><span className="eyebrow"><span /> REGION PROFILE</span><div>{flag && <a href={flag.source} aria-label={`Flag attribution for ${region.name}`}><RegionFlag flag={flag} name={region.name} size={28}/></a>}<button className="icon-button" aria-label="Clear region selection" onClick={() => { setSelected(""); navigation.reset(); updateUrl("", layer); }}><X size={16}/></button></div></div>
        <div className="region-title"><div><h2>{region.name}</h2><p>{regionTypeLabels[region.type]}{region.censusRegion ? ` · ${region.censusRegion}` : ""}</p></div><Shape path={data.silhouettes[region.id]} /></div>
        <dl className="region-stats"><div><dt>Capital</dt><dd>{region.capital ?? "—"}</dd></div>
          {["population", "land", "density", "gdp"].map((key) => {
            const value = latest(observations, region.id, key);
            return <div key={key}><dt>{metricById[key].name} {value && <small>{value.year}</small>}</dt><dd>{formatValue(key, value?.value, "metric", true)}</dd></div>;
          })}
        </dl>
        {!home && lead && <div className="drawer-intro"><p>{lead.text}</p><small><a href={lead.url}>Wikipedia contributors</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a></small></div>}
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
      </div>
      {activeMetric && <div className="map-legend"><strong>{activeMetric.name} · {year}</strong>{legend.map((item) => <span key={item.color}><i style={{ background: item.color }} /> {item.label}</span>)}<span><i className="legend-missing" /> No data</span></div>}
      {layer === "waterways" && <div className="map-legend"><strong>Major continental rivers and lakes</strong><a href={sources.earth?.url}>Natural Earth · 1:50m</a></div>}
      <div className="map-caption"><span><Crosshair size={14} /> {region ? coordinates(region) : raster && !rasterFailed ? "Web Mercator" : "Albers equal-area · separate inset scales"}</span>
        {(!raster || rasterFailed) && <div><button className="text-button" aria-pressed={labels} onClick={() => setLabels((value) => !value)}>{labels ? "Hide labels" : "Show labels"}</button><button className="text-button" onClick={saveImage}><ArrowDownToLine size={14}/> PNG</button></div>}</div>
      </>}
      <span className="sr-only" role="status">{status}</span>
    </section>

  </div>;
}

function coordinates(region: Region) {
  const [longitude, latitude] = region.coordinates;
  return `${Math.abs(latitude).toFixed(2)}° ${latitude < 0 ? "S" : "N"} · ${Math.abs(longitude).toFixed(2)}° ${longitude < 0 ? "W" : "E"}`;
}
