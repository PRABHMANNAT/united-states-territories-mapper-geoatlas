"use client";

import { Download, Paintbrush, Redo2, RotateCcw, Save, Undo2 } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { AtlasSvg } from "./atlas-svg";
import { ShareButton } from "./share";
import { download, downloadCsv, exportSvg } from "@/lib/downloads";
import { choropleth } from "@/lib/layers";
import { defaultProject, parseProject, projectSVG, projectThemes, type MapProject } from "@/lib/map-project";
import type { MapData, Observation, Region } from "@/lib/types";

const saveKey = "stateatlas-saved-map-v1";
type History = { before: MapProject[]; active: MapProject; after: MapProject[] };

export function Creator({ initial, data, regions, population, invalid }: {
  initial: MapProject; data: MapData; regions: Region[]; population: Observation[]; invalid: boolean;
}) {
  const [history, setHistory] = useState<History>({ before: [], active: initial, after: [] });
  const [selection, setSelection] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState(0);
  const [labelRegion, setLabelRegion] = useState("CA");
  const [status, setStatus] = useState(invalid ? "That shared project could not be loaded." : "");
  const project = history.active;
  const palette = projectThemes[project.theme];
  const fills = Object.fromEntries(Object.entries(project.assignments).map(([id, group]) => [id, project.groups[group].color]));

  function edit(next: MapProject) {
    setHistory((current) => ({ before: [...current.before, current.active].slice(-70), active: next, after: [] }));
  }

  function undo() {
    setHistory(({ before, active, after }) => before.length ? { before: before.slice(0, -1), active: before.at(-1)!, after: [active, ...after] } : { before, active, after });
  }

  function redo() {
    setHistory(({ before, active, after }) => after.length ? { before: [...before, active], active: after[0], after: after.slice(1) } : { before, active, after });
  }

  function toggle(id: string) {
    setSelection((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  }

  function paint(erase = false) {
    const assignments = { ...project.assignments };
    selection.forEach((id) => {
      if (erase) delete assignments[id];
      else assignments[id] = activeGroup;
    });
    edit({ ...project, assignments });
  }

  function preset() {
    const values = Object.fromEntries(population.map((row) => [row.region, row.value]));
    const { fills, legend } = choropleth(values, "population");
    const assignments = Object.fromEntries(Object.entries(fills).map(([id, fill]) => [id, legend.findIndex((item) => item.color === fill)]));
    const groups = project.groups.map((old, i) => legend[i] ? { color: legend[i].color, name: legend[i].label } : old);
    edit({ ...project, title: "Resident population · 2025", groups, assignments });
  }

  function updateGroup(patch: Partial<MapProject["groups"][number]>) {
    edit({ ...project, groups: project.groups.map((item, i) => i === activeGroup ? { ...item, ...patch } : item) });
  }

  function share() {
    const url = new URL("/creator", window.location.origin);
    url.searchParams.set("project", JSON.stringify(project));
    return url.href;
  }

  async function exportImage(format: "svg" | "png") {
    const result = projectSVG(project, data, regions);
    try { await exportSvg(result.markup, "stateatlas-custom", format, result.width, result.height); setStatus(`${format.toUpperCase()} downloaded`); }
    catch { setStatus("The image could not be exported"); }
  }

  return <div className="creator-grid">
    <section className="panel tool-panel creator-preview"><div className="tool-summary"><div><p className="eyebrow"><span/> MAP PREVIEW</p><h2>{project.title || "Untitled atlas"}</h2></div><span className="muted">{selection.length} selected</span></div>
      <div className={`creator-map${project.boundaries ? "" : " no-boundaries"}`} style={{
        "--map-paper": palette.paper, "--map-land": palette.land, "--map-edge": palette.edge, "--map-ink": palette.ink,
        "--map-muted": palette.muted, "--map-inset": palette.paper, "--map-grid": palette.edge + "38",
      } as CSSProperties}><AtlasSvg data={data} regions={regions} fills={fills} selection={selection} labels={project.labels} customLabels={project.labelsByRegion} onSelect={toggle}/></div>
      <div className="editor-legend">{project.groups.map((item, i) => <span key={i}><i style={{ backgroundColor: item.color }}/> {item.name || `Group ${i + 1}`}</span>)}</div>
      <div className="button-row"><button className="quiet-button" onClick={() => exportImage("svg")}><Download size={15}/> SVG</button><button className="quiet-button" onClick={() => exportImage("png")}><Download size={15}/> PNG</button>
        <button className="quiet-button" onClick={() => download(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), "stateatlas-map.json")}>JSON</button>
        <button className="quiet-button" onClick={() => downloadCsv([["id", "jurisdiction", "group", "color"], ...regions.filter((region) => fills[region.id]).map((region) => [region.id, region.name, project.assignments[region.id] + 1, fills[region.id]])], "stateatlas-map-regions.csv")}>CSV</button><ShareButton url={share}/></div>
      <p className="source-line" role="status">{status}</p>
    </section>
    <section className="panel tool-panel creator-controls"><div className="tool-summary"><h2>Map settings</h2></div>
      <label>Map title<input maxLength={100} value={project.title} onChange={(event) => edit({ ...project, title: event.target.value })}/></label>
      <label>Theme<select value={project.theme} onChange={(event) => edit({ ...project, theme: event.target.value as MapProject["theme"] })}><option value="paper">Field paper</option><option value="midnight">Midnight</option></select></label>
      <label className="checkbox-label"><input type="checkbox" checked={project.labels} onChange={(event) => edit({ ...project, labels: event.target.checked })}/> Abbreviation labels</label>
      <label className="checkbox-label"><input type="checkbox" checked={project.boundaries} onChange={(event) => edit({ ...project, boundaries: event.target.checked })}/> Boundary strokes</label>
      <div className="button-row"><button className="quiet-button" onClick={undo} disabled={!history.before.length} aria-label="Undo"><Undo2 size={16}/></button><button className="quiet-button" onClick={redo} disabled={!history.after.length} aria-label="Redo"><Redo2 size={16}/></button><button className="quiet-button" onClick={() => { edit(defaultProject); setSelection([]); }}><RotateCcw size={14}/> Reset</button></div>
      <div className="controls paint-controls">
        <label>Legend group<select value={activeGroup} onChange={(event) => setActiveGroup(+event.target.value)}>{project.groups.map((item, i) => <option value={i} key={i}>{item.name || `Group ${i + 1}`}</option>)}</select></label>
        <label>Group name<input maxLength={40} value={project.groups[activeGroup].name} onChange={(event) => updateGroup({ name: event.target.value })}/></label>
        <label>Color<input type="color" value={project.groups[activeGroup].color} onChange={(event) => updateGroup({ color: event.target.value })}/></label>
      </div>
      <div className="button-row"><button className="primary-button" disabled={!selection.length} onClick={() => paint()}><Paintbrush size={15}/> Apply group</button><button className="quiet-button" disabled={!selection.length} onClick={() => paint(true)}>Erase fill</button></div>
      <label>Toggle a jurisdiction<select value="" onChange={(event) => toggle(event.target.value)}><option value="" disabled>Choose from all 65</option>{regions.map((region) => <option key={region.id} value={region.id}>{selection.includes(region.id) ? "✓ " : ""}{region.name}</option>)}</select></label>
      <div className="selected-regions">{selection.map((id) => <button key={id} className="quiet-button" onClick={() => toggle(id)} aria-label={`Deselect ${regions.find((region) => region.id === id)?.name}`}>{id} ×</button>)}</div>
      <label>Custom label jurisdiction<select value={labelRegion} onChange={(event) => setLabelRegion(event.target.value)}>{regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label>
      <label>Custom label<input maxLength={24} value={project.labelsByRegion[labelRegion] ?? ""} placeholder={labelRegion} onChange={(event) => {
        const labelsByRegion = { ...project.labelsByRegion };
        if (event.target.value) labelsByRegion[labelRegion] = event.target.value;
        else delete labelsByRegion[labelRegion];
        edit({ ...project, labelsByRegion });
      }}/></label>
      <button className="quiet-button" onClick={preset}>Apply 2025 population preset</button>
      <div className="button-row"><button className="quiet-button" onClick={() => {
        try { localStorage.setItem(saveKey, JSON.stringify(project)); setStatus("Map saved in this browser"); }
        catch { setStatus("This browser could not save the map"); }
      }}><Save size={15}/> Save</button><button className="quiet-button" onClick={() => {
        try {
          const saved = parseProject(localStorage.getItem(saveKey));
          if (saved) { edit(saved); setStatus("Saved map loaded"); }
          else setStatus("No saved map in this browser");
        } catch { setStatus("Browser storage is unavailable"); }
      }}>Load saved</button></div>
      <label>Import map JSON<input type="file" accept=".json,application/json" onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
          const parsed = file.size <= 12_000 ? parseProject(await file.text()) : null;
          if (!parsed) { setStatus("This file is not a StateAtlas map project"); return; }
          edit(parsed);
          setSelection([]);
          setStatus("Map project imported");
        } catch { setStatus("The selected file could not be read"); }
      }}/></label>
    </section>
  </div>;
}
