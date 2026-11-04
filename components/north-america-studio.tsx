"use client";

import Link from "next/link";
import { ArrowUpRight, Download, LocateFixed, MapPin, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { exportSvg } from "@/lib/downloads";
import { atlasAdminLayers, atlasBounds, atlasById, atlasCountries, atlasLink, atlasPlaces, divisionLayerKey, type AdminLevel, type AtlasOutlines } from "@/lib/north-america";

import { useAtlasAdminLayers } from "./use-atlas-admin-layers";
import { paintPalette } from "@/lib/map-project";
const countryIds = atlasCountries.map((place) => place.id);
const number = new Intl.NumberFormat("en");

export function NorthAmericaStudio({ initialScope, editing = false }: { initialScope: string[]; editing?: boolean }) {
  const initialLayer = atlasAdminLayers[divisionLayerKey(initialScope[0] ?? "") ?? ""];
  const [scope, setScope] = useState(initialScope);
  const [active, setActive] = useState(initialScope[0] ?? "can");
  const [country, setCountry] = useState(initialLayer?.country ?? atlasById.get(initialScope[0])?.parent ?? initialScope[0] ?? "can");
  const [division, setDivision] = useState("");
  const [level, setLevel] = useState<AdminLevel>(initialLayer?.level ?? 1);
  const [divisionQuery, setDivisionQuery] = useState("");
  const [divisionsVisible, setDivisionsVisible] = useState(false);
  const [outlines, setOutlines] = useState<AtlasOutlines>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [color, setColor] = useState(paintPalette[8]);
  const [fills, setFills] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("North America");
  const [background, setBackground] = useState("#f5f5f5");
  const [labels, setLabels] = useState(true);
  const [paint, setPaint] = useState(false);
  const [status, setStatus] = useState("");
  const svg = useRef<SVGSVGElement>(null);
  const currentKey = `${country}-adm${level}`;
  const currentLayer = atlasAdminLayers[currentKey];
  const requested = [...new Set([
    ...(currentLayer ? [currentKey] : []),
    ...scope.flatMap((id) => divisionLayerKey(id) ?? []),
  ])].sort().join(",");
  const { layers, errors, retry } = useAtlasAdminLayers(requested);
  const localPlaces = useMemo(() => new Map(Object.entries(layers).flatMap(([key, items]) => {
    const layer = atlasAdminLayers[key];
    return items.map((item) => [item.id, {
      ...item, parent: layer.country, kind: "local" as const, level: layer.level, type: `Level ${layer.level} division`,
      area: undefined, code: undefined,
    }] as const);
  })), [layers]);
  const combinedOutlines = useMemo(() => ({
    ...outlines, ...Object.fromEntries(localPlaces),
  }), [outlines, localPlaces]);
  const placeFor = (id: string) => atlasById.get(id) ?? localPlaces.get(id);
  const selected = placeFor(active);
  const profile = atlasById.get(active);
  const firstLevel = atlasPlaces.filter((place) => place.parent === country);
  const subdivisions = level === 1 ? firstLevel : layers[currentKey] ?? [];
  const query = divisionQuery.trim().toLocaleLowerCase();
  const matching = subdivisions.filter((place) => !query || place.name.toLocaleLowerCase().includes(query));
  const coverage = scope.length ? scope : countryIds;
  const contextualParents = scope.length ? scope : [country];
  const extraDivisions = !divisionsVisible ? [] : level === 1
    ? atlasPlaces.filter((place) => place.parent && contextualParents.includes(place.parent)).map((place) => place.id)
    : (layers[currentKey] ?? []).filter((place) => contextualParents.includes(country) ||
      (place.firstLevel && contextualParents.includes(place.firstLevel))).map((place) => place.id);
  const depth = (id: string) => localPlaces.get(id)?.level ?? (atlasById.get(id)?.parent ? 1 : 0);
  const visible = [...new Set([...coverage, ...extraDivisions])].sort((a, b) => depth(a) - depth(b));
  const visibleSet = new Set(visible);
  const activeVisible = visibleSet.has(active);
  const readyToExport = Boolean(outlines && coverage.every((id) => combinedOutlines[id]));
  const bounds = outlines && atlasBounds(coverage, combinedOutlines);
  const shownSources = [...new Set(visible.flatMap((id) => divisionLayerKey(id) ?? []))];
  const layerLoading = Boolean(currentLayer && !layers[currentKey] && !errors.includes(currentKey));
  const requestedErrors = errors.filter((key) => requested.split(",").includes(key));
  const view = bounds && {
    x: bounds.x + bounds.width * (1 - 1 / zoom) / 2,
    y: bounds.y + bounds.height * (1 - 1 / zoom) / 2,
    width: bounds.width / zoom,
    height: bounds.height / zoom,
  };
  const viewBox = view ? `${view.x} ${view.y} ${view.width} ${view.height}` : undefined;
  const labelSize = Math.max(view?.width ?? 1, (view?.height ?? 1) * 1.25) / 80;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/datasets/north-america-shapes.json", { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error("Map unavailable");
      return response.json() as Promise<AtlasOutlines>;
    }).then(setOutlines).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [attempt]);

  function include(id: string) {
    if (!placeFor(id)) return;
    setScope((items) => items.includes(id) ? items : [...items, id]);
    setActive(id);
    setZoom(1);
  }

  function choose(id: string) {
    const place = placeFor(id);
    if (!place) return;
    setActive(id);
    if (!place.parent && !scope.length) {
      setCountry(id);
      setDivision("");
      setDivisionQuery("");
    }
    if (editing && paint) setFills((current) => ({ ...current, [id]: color }));
  }

  async function save(format: "svg" | "png") {
    if (!svg.current || !view || !readyToExport) return;
    const clone = svg.current.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute("class");
    const width = Math.max(1, Math.round(1200 * Math.min(1, view.width / view.height)));
    const height = Math.max(1, Math.round(1200 * Math.min(1, view.height / view.width)));
    const titleHeight = height * 0.075;
    const headingHeight = view.height * 0.075;
    clone.setAttribute("viewBox", `${view.x} ${view.y - headingHeight} ${view.width} ${view.height + headingHeight}`);
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(Math.round(height + titleHeight)));
    const svgNS = "http://www.w3.org/2000/svg";
    const banner = document.createElementNS(svgNS, "rect");
    banner.setAttribute("x", String(view.x));
    banner.setAttribute("y", String(view.y - headingHeight));
    banner.setAttribute("width", String(view.width));
    banner.setAttribute("height", String(headingHeight));
    banner.setAttribute("fill", "#111");
    const heading = document.createElementNS(svgNS, "text");
    heading.setAttribute("x", String(view.x + view.width * 0.025));
    heading.setAttribute("y", String(view.y - headingHeight * 0.35));
    heading.setAttribute("fill", "#fff");
    heading.setAttribute("font-family", "system-ui, sans-serif");
    heading.setAttribute("font-size", String(Math.min(headingHeight * 0.45, view.width * 0.028)));
    heading.textContent = title || "Untitled map";
    clone.append(banner, heading);
    if (shownSources.length) {
      const credits = document.createElementNS(svgNS, "text");
      credits.setAttribute("x", String(view.x + view.width * 0.025));
      credits.setAttribute("y", String(view.y + view.height * 0.975));
      credits.setAttribute("fill", "#111");
      credits.setAttribute("stroke", "#fff");
      credits.setAttribute("paint-order", "stroke");
      credits.setAttribute("stroke-width", String(view.width * 0.003));
      credits.setAttribute("font-family", "system-ui, sans-serif");
      credits.setAttribute("font-size", String(view.width * 0.014));
      credits.textContent = "Boundary data: Natural Earth and geoBoundaries";
      const sources = document.createElementNS(svgNS, "desc");
      sources.textContent = shownSources.map((key) => {
        const source = atlasAdminLayers[key];
        return `${source.source} via geoBoundaries (${source.year}). License: ${source.license} ${source.licenseUrl}. ${source.url}`;
      }).join("\n");
      clone.append(credits, sources);
    }
    try {
      await exportSvg(new XMLSerializer().serializeToString(clone), "north-america-atlas", format, width, Math.round(height + titleHeight));
      setStatus(`${format.toUpperCase()} downloaded`);
    } catch {
      setStatus("The map could not be downloaded.");
    }
  }

  const BoardHeading = editing ? "h2" : "h1";
  return <div className="continent-studio">
    <section className="continent-board panel" aria-label={editing ? "Custom map preview" : "North America map"}>
      <div className="continent-bar">
        <div><p className="eyebrow"><span/> {editing ? "MAP PREVIEW" : "CONTINENTAL ATLAS"}</p><BoardHeading>{editing ? title || "Untitled map" : scope.length === 1 ? placeFor(scope[0])?.name : scope.length ? `${scope.length} places` : "North America"}</BoardHeading></div>
        <div className="button-row">
          {editing ? <>
            <button className="quiet-button" onClick={() => save("svg")} disabled={!readyToExport}><Download size={15}/> SVG</button>
            <button className="primary-button" onClick={() => save("png")} disabled={!readyToExport}><Download size={15}/> PNG</button>
          </> : <Link href={atlasLink("/creator", scope)} className="primary-button">Customize map <ArrowUpRight size={16}/></Link>}
        </div>
      </div>
      <div className="continent-canvas">
        {outlines && view && <svg ref={svg} xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} role="group" aria-label="North America boundary map" className="continent-map">
          <title>{editing ? title || "Untitled map" : "North America"}</title>
          <rect x={view.x} y={view.y} width={view.width} height={view.height} fill={background}/>
          {visible.map((id) => {
            const shape = combinedOutlines[id];
            const place = placeFor(id);
            if (!shape || !place) return null;
            const fill = fills[id] ?? (place.parent && visibleSet.has(place.parent) ? fills[place.parent] : undefined) ?? (place.parent ? "#e1e1e1" : "#bfc4cb");
            const mark = !place.parent && Math.max(shape.box[2] - shape.box[0], shape.box[3] - shape.box[1]) < labelSize;
            return <g key={id} role="button" aria-label={place.name} aria-pressed={active === id} tabIndex={0}
              onClick={() => choose(id)} onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(id); }
              }}>
              <path d={shape.path} fill={fill} stroke="#4b5059" strokeWidth={depth(id) >= 2 ? 0.45 : place.parent ? 0.65 : 1} vectorEffect="non-scaling-stroke"/>
              {mark && <circle cx={shape.label[0]} cy={shape.label[1]} r={labelSize * 0.42} fill={fill} stroke="#4b5059" vectorEffect="non-scaling-stroke"/>}
            </g>;
          })}
          {labels && <g pointerEvents="none" fill="#171717" stroke="#fff" strokeWidth={labelSize * 0.25} paintOrder="stroke"
            fontFamily="system-ui, sans-serif" fontSize={labelSize} fontWeight={700} textAnchor="middle">
            {visible.map((id) => {
              const shape = combinedOutlines[id];
              const place = placeFor(id);
              if (!shape || !place || (id !== active && visible.length > 1 && shape.box[2] - shape.box[0] < labelSize * 3.4)) return null;
              return <text key={id} x={shape.label[0]} y={shape.label[1]}>{place.code ?? place.name}</text>;
            })}
          </g>}
        </svg>}
        {!outlines && <div className="continent-loading" role="status">{failed ? <>
          <p>Could not load the boundaries.</p>
          <button className="quiet-button" onClick={() => { setFailed(false); setAttempt(attempt + 1); }}>Try again</button>
        </> : "Loading North American boundaries…"}</div>}
        <div className="continent-zoom" role="group" aria-label="Atlas zoom">
          <button className="icon-button" aria-label="Zoom in" disabled={!outlines || zoom >= 8} onClick={() => setZoom(Math.min(8, zoom * 1.4))}><Plus size={17}/></button>
          <button className="icon-button" aria-label="Zoom out" disabled={!outlines || zoom <= 1} onClick={() => setZoom(Math.max(1, zoom / 1.4))}><Minus size={17}/></button>
          <button className="icon-button" aria-label="Reset zoom" disabled={!outlines} onClick={() => setZoom(1)}><RotateCcw size={15}/></button>
        </div>
      </div>
      <div className="continent-foot">
        <span>{shownSources.length ? "Natural Earth and geoBoundaries" : "Made with Natural Earth"}</span>
        <label><input type="checkbox" checked={labels} onChange={(event) => setLabels(event.target.checked)}/> Map labels</label>
      </div>
      {shownSources.length > 0 && <details className="continent-boundary-sources"><summary>Boundary sources</summary><ul>
        {shownSources.map((key) => {
          const item = atlasAdminLayers[key];
          return <li key={key}><a href={item.url}>{atlasById.get(item.country)?.name} · Level {item.level} · {item.year}</a> · {item.source} · {item.license}</li>;
        })}
      </ul></details>}
      {status && <p className="continent-status" role="status">{status}</p>}
    </section>

    <aside className="continent-sidebar">
      {selected && <section className="panel continent-controls continent-selection" aria-label="Selected place">
        <div className="continent-selection-head">
          <span className="continent-selection-icon"><MapPin size={18} aria-hidden="true"/></span>
          <div><p>{selected.type}</p><h2>{selected.name}</h2></div>
          {selected.code && <span className="continent-selection-code">{selected.code}</span>}
        </div>
        {profile && profile.kind !== "country" && profile.area > 0 && <p>{number.format(profile.area)} km² mapped area</p>}
        <div className="button-row">
          {profile && <Link className="quiet-button continent-selection-primary" href={`/places/${profile.id}`}>
            {profile.kind === "country" ? "Browse subdivisions" : "Open profile"} <ArrowUpRight size={14}/>
          </Link>}
          <button className="quiet-button" onClick={() => { setScope([selected.id]); setZoom(1); }}><LocateFixed size={14}/> Focus map</button>
        </div>
      </section>}

      <section className="panel continent-controls" aria-label="Map coverage">
        <div><p className="eyebrow"><span/> COVERAGE</p><h2>Choose places</h2></div>
        <p>Show one place or build a mix of countries and subdivisions.</p>
        <label>Country or territory<select value={country} onChange={(event) => { setCountry(event.target.value); setDivision(""); setDivisionQuery(""); }}>
          {atlasCountries.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
        </select></label>
        <div className="button-row">
          <button className="quiet-button" onClick={() => { setScope([country]); setActive(country); setZoom(1); }}>View only</button>
          <button className="primary-button" onClick={() => include(country)} disabled={scope.includes(country)}>Add country</button>
        </div>
        <label>Boundary level<select value={level} onChange={(event) => {
          const next = Number(event.target.value) as AdminLevel;
          setLevel(next);
          setDivision("");
          setDivisionQuery("");
          setDivisionsVisible(true);
          if (next > 1 && !scope.length) {
            setScope([country]);
            setActive(country);
            setZoom(1);
          }
        }}>
          <option value={1}>1st level · states and provinces</option>
          <option value={2}>2nd level · counties and districts</option>
          <option value={3}>3rd level · local divisions</option>
        </select></label>
        {level > 1 && currentLayer && <p>{currentLayer.name} · {number.format(currentLayer.count)} boundaries · {currentLayer.year}</p>}
        {level > 1 && subdivisions.length > 150 && <label>Find a local division<input value={divisionQuery}
          onChange={(event) => { setDivisionQuery(event.target.value); setDivision(""); }} placeholder="Search by name…"/></label>}
        <label>Subdivision<select value={division} onChange={(event) => setDivision(event.target.value)} disabled={!matching.length}>
          <option value="">{layerLoading ? "Loading boundaries…" : matching.length ? "Choose a subdivision" : subdivisions.length ? "No matching divisions" : "No boundaries available at this level"}</option>
          {matching.slice(0, 150).map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
        </select></label>
        {matching.length > 150 && <p>Showing 150 of {number.format(matching.length)}. Search by name to narrow the list.</p>}
        {level > 1 && currentLayer && !contextualParents.includes(country) && !firstLevel.some((place) => contextualParents.includes(place.id)) &&
          <p>Use View only or Add country to display this layer. You can also add individual divisions below.</p>}
        {requestedErrors.length > 0 && <div role="status"><p>Some local boundaries could not be loaded.</p><button className="text-button" onClick={retry}>Retry boundaries</button></div>}
        <button className="quiet-button" onClick={() => include(division)} disabled={!division || scope.includes(division)}>Add subdivision</button>
        <label className="continent-check continent-boundary-switch">
          <span><strong>Show subdivision boundaries</strong><small>Draw the selected level on the map.</small></span>
          <input type="checkbox" role="switch" aria-label="Show subdivision boundaries" className="sr-only" checked={divisionsVisible} onChange={(event) => setDivisionsVisible(event.target.checked)}/>
          <span className="continent-switch-track" aria-hidden="true"/>
        </label>
        {scope.length > 0 && <div className="continent-scope">
          <div>{scope.map((id) => <button className="quiet-button" key={id} onClick={() => {
            const next = scope.filter((item) => item !== id);
            setScope(next);
            if (active === id) setActive(next[0] ?? country);
            setZoom(1);
          }} aria-label={`Remove ${placeFor(id)?.name ?? id}`}>{placeFor(id)?.name ?? id} <X size={13}/></button>)}</div>
          <button className="text-button" onClick={() => { setScope([]); setActive(country); setZoom(1); }}>Show all North America</button>
        </div>}
      </section>

      {editing && <section className="panel continent-controls continent-colors" aria-label="Map styling">
        <div><p className="eyebrow"><span/> STYLE</p><h2>Make it yours</h2></div>
        <label>Map title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100}/></label>
        <label className="continent-color-input">Map background<input type="color" value={background} onChange={(event) => setBackground(event.target.value)}/></label>
        <fieldset><legend>Paint palette</legend><div className="continent-swatches">
          {paintPalette.map((hex) => <button key={hex} type="button" aria-label={`Select color ${hex}`} aria-pressed={color === hex} style={{ backgroundColor: hex }} onClick={() => setColor(hex)}/>)}
        </div></fieldset>
        <label className="continent-color-input">Custom paint color<input type="color" value={color} onChange={(event) => setColor(event.target.value)}/></label>
        <label className="continent-check"><input type="checkbox" checked={paint} onChange={(event) => setPaint(event.target.checked)}/> Paint when I click the map</label>
        {selected && <div className="button-row"><button className="primary-button" disabled={!activeVisible} onClick={() => setFills({ ...fills, [active]: color })}>Color {selected.name}</button>
          <button className="quiet-button" disabled={!fills[active]} onClick={() => setFills(Object.fromEntries(Object.entries(fills).filter(([id]) => id !== active)))}>Clear color</button></div>}
      </section>}

    </aside>
  </div>;
}
