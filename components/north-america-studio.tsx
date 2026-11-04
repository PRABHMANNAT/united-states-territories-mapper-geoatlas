"use client";

import Link from "next/link";
import { ArrowUpRight, Download, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { exportSvg } from "@/lib/downloads";
import { atlasBounds, atlasById, atlasCountries, atlasLink, atlasPlaces, type AtlasOutlines } from "@/lib/north-america";

import { paintPalette } from "@/lib/map-project";
const countryIds = atlasCountries.map((place) => place.id);
const number = new Intl.NumberFormat("en");

export function NorthAmericaStudio({ initialScope, editing = false }: { initialScope: string[]; editing?: boolean }) {
  const [scope, setScope] = useState(initialScope);
  const [active, setActive] = useState(initialScope[0] ?? "can");
  const [country, setCountry] = useState(atlasById.get(initialScope[0])?.parent ?? initialScope[0] ?? "can");
  const [division, setDivision] = useState("");
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
  const selected = atlasById.get(active);
  const subdivisions = atlasPlaces.filter((place) => place.parent === country);
  const coverage = scope.length ? scope : countryIds;
  const contextualParents = scope.length ? scope : [country];
  const extraDivisions = divisionsVisible
    ? atlasPlaces.filter((place) => place.parent && contextualParents.includes(place.parent)).map((place) => place.id)
    : [];
  const visible = [...new Set([...coverage, ...extraDivisions])].sort((a, b) =>
    Number(Boolean(atlasById.get(a)?.parent)) - Number(Boolean(atlasById.get(b)?.parent))
  );
  const activeVisible = visible.includes(active);
  const bounds = outlines && atlasBounds(coverage, outlines);
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
    if (!atlasById.has(id)) return;
    setScope((items) => items.includes(id) ? items : [...items, id]);
    setActive(id);
    setZoom(1);
  }

  function choose(id: string) {
    const place = atlasById.get(id);
    if (!place) return;
    setActive(id);
    if (!place.parent && !scope.length) setCountry(id);
    if (editing && paint) setFills((current) => ({ ...current, [id]: color }));
  }

  async function save(format: "svg" | "png") {
    if (!svg.current || !view) return;
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
    try {
      await exportSvg(new XMLSerializer().serializeToString(clone), "north-america-atlas", format, width, Math.round(height + titleHeight));
      setStatus(`${format.toUpperCase()} downloaded`);
    } catch {
      setStatus("The map could not be downloaded.");
    }
  }

  return <div className="continent-studio">
    <section className="continent-board panel" aria-label={editing ? "Custom map preview" : "North America map"}>
      <div className="continent-bar">
        <div><p className="eyebrow"><span/> {editing ? "MAP PREVIEW" : "CONTINENTAL ATLAS"}</p><h2>{editing ? title || "Untitled map" : scope.length === 1 ? atlasById.get(scope[0])?.name : scope.length ? `${scope.length} places` : "North America"}</h2></div>
        <div className="button-row">
          {editing ? <>
            <button className="quiet-button" onClick={() => save("svg")} disabled={!outlines}><Download size={15}/> SVG</button>
            <button className="primary-button" onClick={() => save("png")} disabled={!outlines}><Download size={15}/> PNG</button>
          </> : <Link href={atlasLink("/creator", scope)} className="primary-button">Customize map <ArrowUpRight size={16}/></Link>}
        </div>
      </div>
      <div className="continent-canvas">
        {outlines && view && <svg ref={svg} xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} role="group" aria-label="North America boundary map" className="continent-map">
          <title>{editing ? title || "Untitled map" : "North America"}</title>
          <rect x={view.x} y={view.y} width={view.width} height={view.height} fill={background}/>
          {visible.map((id) => {
            const shape = outlines[id];
            const place = atlasById.get(id);
            if (!shape || !place) return null;
            const fill = fills[id] ?? (place.parent && visible.includes(place.parent) ? fills[place.parent] : undefined) ?? (place.parent ? "#e1e1e1" : "#bfc4cb");
            const mark = !place.parent && Math.max(shape.box[2] - shape.box[0], shape.box[3] - shape.box[1]) < labelSize;
            return <g key={id} role="button" aria-label={place.name} aria-pressed={active === id} tabIndex={0}
              onClick={() => choose(id)} onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(id); }
              }}>
              <path d={shape.path} fill={fill} stroke="#4b5059" strokeWidth={place.parent ? 0.65 : 1} vectorEffect="non-scaling-stroke"/>
              {mark && <circle cx={shape.label[0]} cy={shape.label[1]} r={labelSize * 0.42} fill={fill} stroke="#4b5059" vectorEffect="non-scaling-stroke"/>}
            </g>;
          })}
          {labels && <g pointerEvents="none" fill="#171717" stroke="#fff" strokeWidth={labelSize * 0.25} paintOrder="stroke"
            fontFamily="system-ui, sans-serif" fontSize={labelSize} fontWeight={700} textAnchor="middle">
            {visible.map((id) => {
              const shape = outlines[id];
              const place = atlasById.get(id);
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
        <span>Made with Natural Earth</span>
        <label><input type="checkbox" checked={labels} onChange={(event) => setLabels(event.target.checked)}/> Map labels</label>
      </div>
      {status && <p className="continent-status" role="status">{status}</p>}
    </section>

    <aside className="continent-sidebar">
      <section className="panel continent-controls" aria-label="Map coverage">
        <div><p className="eyebrow"><span/> COVERAGE</p><h2>Choose places</h2></div>
        <p>Show one place or build a mix of countries and subdivisions.</p>
        <label>Country or territory<select value={country} onChange={(event) => { setCountry(event.target.value); setDivision(""); }}>
          {atlasCountries.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
        </select></label>
        <div className="button-row">
          <button className="quiet-button" onClick={() => { setScope([country]); setActive(country); setZoom(1); }}>View only</button>
          <button className="primary-button" onClick={() => include(country)} disabled={scope.includes(country)}>Add country</button>
        </div>
        <label>Subdivision<select value={division} onChange={(event) => setDivision(event.target.value)} disabled={!subdivisions.length}>
          <option value="">{subdivisions.length ? "Choose a subdivision" : "No subdivisions in this dataset"}</option>
          {subdivisions.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
        </select></label>
        <button className="quiet-button" onClick={() => include(division)} disabled={!division || scope.includes(division)}>Add subdivision</button>
        <label className="continent-check"><input type="checkbox" checked={divisionsVisible} onChange={(event) => setDivisionsVisible(event.target.checked)}/> Show subdivision boundaries</label>
        {scope.length > 0 && <div className="continent-scope">
          <div>{scope.map((id) => <button className="quiet-button" key={id} onClick={() => {
            const next = scope.filter((item) => item !== id);
            setScope(next);
            if (active === id) setActive(next[0] ?? country);
            setZoom(1);
          }} aria-label={`Remove ${atlasById.get(id)?.name}`}>{atlasById.get(id)?.name} <X size={13}/></button>)}</div>
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

      {selected && <section className="panel continent-controls" aria-label="Selected place">
        <div><p className="eyebrow"><span/> {selected.type}</p><h2>{selected.name}</h2></div>
        {selected.area > 0 && <p>{number.format(selected.area)} km² mapped area</p>}
        <div className="button-row">
          <Link className="quiet-button" href={`/places/${selected.id}`}>Open profile <ArrowUpRight size={15}/></Link>
          <button className="quiet-button" onClick={() => { setScope([selected.id]); setZoom(1); }}>Focus map</button>
        </div>
      </section>}
    </aside>
  </div>;
}
