"use client";

import Link from "next/link";
import { ArrowDown, ArrowDownToLine, ArrowUp, BarChart3, Map, Table2 } from "lucide-react";
import { useState } from "react";
import { AtlasSvg } from "./atlas-svg";
import { Shape } from "./shape";
import { ShareButton } from "./share";
import { downloadCsv } from "@/lib/downloads";
import { choropleth } from "@/lib/layers";
import { metricById, metrics } from "@/lib/metrics";
import { defaultRankingYear, formatValue, ranked, rankingYears, scopes } from "@/lib/statistics";
import { regionTypeLabels, type MapData, type Observation, type Region, type Source, type Units } from "@/lib/types";

type Settings = { metric: string; year: number; scope: string; order: "asc" | "desc"; units: Units; view: "table" | "bars" | "map" };

export function Rankings({ initial, regions, data, observations, sources }: {
  initial: Settings; regions: Region[]; data: MapData; observations: Observation[]; sources: Record<string, Source>;
}) {
  const [settings, setSettings] = useState(initial);
  const [query, setQuery] = useState("");
  const [mapFocus, setMapFocus] = useState("");
  const [compare, setCompare] = useState<string[]>([]);
  const { metric, year, scope, order, units, view } = settings;
  const years = [...new Set([year, ...rankingYears(regions, observations, metric, scope)])].sort((a, b) => b - a);
  const definition = metricById[metric];
  const all = ranked(regions, observations, metric, year, scope, order);
  const rows = all.filter(({ region }) => [region.name, region.id].some((name) => name.toLowerCase().includes(query.trim().toLowerCase())));
  const max = Math.max(1, ...all.map((row) => Math.abs(row.observation?.value ?? 0)));
  const seenSources = [...new Set(all.flatMap((row) => row.observation ? [row.observation.source] : []))];
  const selected = all.find((row) => row.region.id === mapFocus);

  function change(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    if (patch.metric || patch.scope) next.year = defaultRankingYear(regions, observations, next.metric, next.scope);
    setSettings(next);
    const url = new URL(window.location.href);
    Object.entries(next).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    window.history.replaceState(null, "", url);
  }

  function exportRows() {
    downloadCsv([["rank", "jurisdiction", "id", "metric", "year", "value_in_dataset_unit", "unit", "source"],
      ...rows.map((row) => [row.rank, row.region.name, row.region.id, metric, year, row.observation?.value, definition.unit, row.observation?.source])],
    `stateatlas-${metric}-${year}.csv`);
  }

  function toggle(id: string) {
    setCompare((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id].slice(0, 4));
  }

  const toggleOrder = () => change({ order: order === "asc" ? "desc" : "asc" });
  const mapValues = Object.fromEntries(all.flatMap((row) => row.observation ? [[row.region.id, row.observation.value]] : []));
  const { fills, legend } = choropleth(mapValues, metric);

  return <section className="panel tool-panel">
    <div className="controls">
      <label>Metric<select value={metric} onChange={(event) => change({ metric: event.target.value })}>{metrics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Scope<select value={scope} onChange={(event) => change({ scope: event.target.value })}>{Object.entries(scopes).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></label>
      <label>Year<select value={year} onChange={(event) => change({ year: +event.target.value })}>{years.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Units<select value={units} onChange={(event) => change({ units: event.target.value as Units })}><option value="metric">Metric</option><option value="imperial">Imperial</option></select></label>
      <label>Find a region<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or abbreviation" /></label>
    </div>
    <div className="tool-summary"><div><h2>{definition.name}</h2><p>{scopes[scope].label} · {year} · {all.filter((row) => row.observation).length} with data</p></div>
      <div className="button-row">{([["table", Table2], ["bars", BarChart3], ["map", Map]] as const).map(([id, Icon]) => <button key={id} className="quiet-button" aria-label={`${id} view`} aria-pressed={view === id} onClick={() => change({ view: id })}><Icon size={16}/><span className="view-name">{id}</span></button>)}</div></div>
    <p className="metric-description">{definition.description}</p>
    <div className="button-row toolbar-secondary"><button className="quiet-button" onClick={toggleOrder}>{order === "desc" ? <ArrowDown size={15}/> : <ArrowUp size={15}/>} {order === "desc" ? "High to low" : "Low to high"}</button><button className="quiet-button" onClick={exportRows}><ArrowDownToLine size={16}/> CSV</button><ShareButton />
      {compare.length >= 2 && <Link className="primary-button" href={`/compare?regions=${compare.join(",")}`}>Compare {compare.length} selected</Link>}
    </div>
    {view === "map" && <div className="ranking-map"><AtlasSvg data={data} regions={regions} fills={fills} thematic selection={mapFocus ? [mapFocus] : []} onSelect={setMapFocus}/>
      <div className="map-legend">{legend.map((item) => <span key={item.color}><i style={{ background: item.color }}/> {item.label}</span>)}<span><i className="legend-missing"/> No data in scope</span></div>
      {selected && <p className="source-line"><Link href={`/regions/${selected.region.slug}`}>{selected.region.name}</Link> · {selected.rank ? `#${selected.rank} · ${formatValue(metric, selected.observation?.value, units)}` : "No comparable data"}</p>}
    </div>}
    {view === "bars" && <div className="bars" aria-label="Ranking bar chart">{rows.filter((row) => row.observation).map((row) => <div className="bar-row" key={row.region.id}><Link href={`/regions/${row.region.slug}`}>{row.region.name}</Link><span className="bar-track"><span style={{ width: `${Math.abs(row.observation!.value) / max * 100}%`, background: row.observation!.value < 0 ? "var(--accent)" : undefined }}/></span><strong>{formatValue(metric, row.observation?.value, units, true)}</strong></div>)}
      {rows.every((row) => !row.observation) && <p>No comparable values to chart.</p>}</div>}
    <div className="table-scroll"><table>
      <caption className="sr-only">{definition.name}, {scopes[scope].label}, {year}</caption>
      <thead><tr><th scope="col">Rank</th><th scope="col">Jurisdiction</th><th scope="col" aria-sort={order === "asc" ? "ascending" : "descending"}><button className="text-button" onClick={toggleOrder}>Value {order === "asc" ? <ArrowUp size={13}/> : <ArrowDown size={13}/>}</button></th><th scope="col">Compare</th></tr></thead>
      <tbody>{rows.map(({ region, observation, rank }) => <tr key={region.id}>
        <td className="mono">{rank ?? "—"}</td><th scope="row"><Link href={`/regions/${region.slug}`} className="table-region"><Shape path={data.silhouettes[region.id]} /><span>{region.name}<small>{regionTypeLabels[region.type]}</small></span></Link></th>
        <td className="mono value-cell">{observation ? formatValue(metric, observation.value, units) : <span className="muted">Data unavailable</span>}</td>
        <td><input aria-label={`Compare ${region.name}`} type="checkbox" checked={compare.includes(region.id)} disabled={compare.length >= 4 && !compare.includes(region.id)} onChange={() => toggle(region.id)}/></td>
      </tr>)}</tbody>
    </table>{!rows.length && <p className="empty-message">No jurisdictions match your search.</p>}</div>
    <p className="source-line">Ties share a rank and the next rank skips the tied positions. {seenSources.length ? seenSources.map((key) => <span key={key}><a href={sources[key]?.url}>{sources[key]?.name}</a>{" · "}</span>) : "This scope has no observations for the selected year."}<Link href="/data">Methodology</Link></p>
  </section>;
}
