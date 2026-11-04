"use client";

import Link from "next/link";
import { ArrowDownToLine, Globe2, Plus, X } from "lucide-react";
import { useState } from "react";
import { Shape } from "./shape";
import { ShareButton } from "./share";
import { downloadCsv } from "@/lib/downloads";
import { metricById } from "@/lib/metrics";
import { countryMatches, formatValue, series } from "@/lib/statistics";
import type { Country, Observation, Region } from "@/lib/types";

const compareMetrics = ["population", "population-growth", "area", "land", "density", "gdp", "gdp-per-capita", "income", "median-age", "poverty", "homeownership"];

export function Compare({ initial, initialTarget, initialCountryMetric, regions, silhouettes, observations, countries }: {
  initial: string[]; initialTarget: string; initialCountryMetric: string; regions: Region[]; silhouettes: Record<string, string>; observations: Observation[]; countries: Country[];
}) {
  const [ids, setIds] = useState(initial);
  const [countryMetric, setCountryMetric] = useState(initialCountryMetric);
  const [target, setTarget] = useState(initialTarget);
  const selected = ids.map((id) => regions.find((region) => region.id === id)!);
  const rows = compareMetrics.map((metric) => {
    const sameSeries = series(observations, metric).filter((row) => row.source !== "islandCensus");
    const years = [...new Set(sameSeries.map((row) => row.year))].sort((a, b) => b - a);
    const year = years.find((candidate) => ids.every((id) => sameSeries.some((row) => row.region === id && row.year === candidate))) ?? years[0];
    return { metric, year, items: ids.map((id) => sameSeries.find((row) => row.region === id && row.year === year)) };
  });
  const countryObs = series(observations, countryMetric, target).filter((row) => row.source !== "islandCensus")
    .sort((a, b) => b.year - a.year).find((row) => countries.some((item) => item.observations.some((value) => value.metric === countryMetric && value.year === row.year))) ??
    series(observations, countryMetric, target).find((row) => row.source !== "islandCensus");
  const matches = countryObs ? countryMatches(countries, countryObs).slice(0, 6) : [];

  function syncURL(next: string[], focus: string, indicator: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("regions", next.join(","));
    url.searchParams.set("target", focus);
    url.searchParams.set("countryMetric", indicator);
    window.history.replaceState(null, "", url);
  }

  function update(next: string[]) {
    const focus = next.includes(target) ? target : next[0];
    setIds(next);
    setTarget(focus);
    syncURL(next, focus, countryMetric);
  }

  return <>
    <section className="panel tool-panel">
      <div className="tool-summary"><div><h2>U.S. jurisdictions</h2><p>Each row uses a single reference year.</p></div><div className="button-row">
        <button className="quiet-button" onClick={() => downloadCsv([["metric", "year", ...ids], ...rows.map((row) => [row.metric, row.year, ...row.items.map((item) => item?.value)])], "stateatlas-comparison.csv")}><ArrowDownToLine size={16}/> CSV</button><ShareButton/>
      </div></div>
      <div className="compare-cards">{selected.map((region, i) => <div className="compare-card" key={i}>
        <div><Shape path={silhouettes[region.id]} /><button aria-label={`Remove ${region.name}`} className="icon-button" disabled={ids.length <= 2} onClick={() => update(ids.filter((id) => id !== region.id))}><X size={15}/></button></div>
        <Link href={`/regions/${region.slug}`}>{region.name}</Link>
        <select aria-label={`Jurisdiction ${i + 1}`} value={region.id} onChange={(event) => update(ids.map((id, position) => position === i ? event.target.value : id))}>
          {regions.filter((item) => item.id === region.id || !ids.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>)}
      {ids.length < 4 && <div className="compare-card add-place"><Plus size={22}/><label>Add jurisdiction<select aria-label="Add jurisdiction" value="" onChange={(event) => update([...ids, event.target.value])}><option value="" disabled>Select a place</option>{regions.filter((region) => !ids.includes(region.id)).map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label></div>}</div>
      <div className="table-scroll"><table><caption className="sr-only">Jurisdiction comparison by metric</caption><thead><tr><th scope="col">Metric</th>{selected.map((region) => <th scope="col" key={region.id}>{region.name}</th>)}</tr></thead>
        <tbody>{rows.map((row) => {
          const max = Math.max(1, ...row.items.map((item) => Math.abs(item?.value ?? 0)));
          const base = row.items[0]?.value;
          return <tr key={row.metric}><th scope="row">{metricById[row.metric].name}<small className="cell-detail">{row.year}</small></th>{row.items.map((item, i) => <td key={ids[i]}>{item ? <><strong className="mono">{formatValue(row.metric, item.value)}</strong><span className="bar-track comparison-bar"><span style={{ width: `${Math.abs(item.value) / max * 100}%`, background: item.value < 0 ? "var(--accent)" : undefined }}/></span>
            {i > 0 && base !== undefined && base > 0 && metricById[row.metric].unit !== "percent" && <small className="cell-detail">{((item.value / base - 1) * 100).toLocaleString("en-US", { maximumFractionDigits: 1, signDisplay: "exceptZero" })}% vs. {selected[0].id}</small>}</> : <span className="muted">Data unavailable</span>}</td>)}</tr>;
        })}</tbody>
      </table></div>
    </section>
    <section className="panel tool-panel secondary-panel">
      <div className="tool-summary"><div><p className="eyebrow"><span /> WORLD BANK INDICATORS</p><h2>Find a country match</h2></div><Globe2 size={30}/></div>
      <div className="controls"><label>Jurisdiction<select value={target} onChange={(event) => { setTarget(event.target.value); syncURL(ids, event.target.value, countryMetric); }}>{selected.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label>
        <label>Comparable metric<select value={countryMetric} onChange={(event) => { setCountryMetric(event.target.value); syncURL(ids, target, event.target.value); }}>{["gdp", "population", "land"].map((id) => <option value={id} key={id}>{metricById[id].name}</option>)}</select></label></div>
      {countryObs ? <><p className="metric-description"><strong>{regions.find((region) => region.id === target)?.name} · {countryObs.year} · {formatValue(countryMetric, countryObs.value)}</strong></p>
        <div className="table-scroll"><table><thead><tr><th scope="col">World Bank economy</th><th scope="col">Value</th><th scope="col">Year</th><th scope="col">Relative to jurisdiction</th></tr></thead>
          <tbody>{matches.map(({ country, observation }) => <tr key={country.id}><th scope="row">{country.name}</th><td className="mono">{formatValue(countryMetric, observation.value)}</td><td>{observation.year}{observation.year !== countryObs.year && <small className="cell-detail">Different year</small>}</td><td>{(observation.value / countryObs.value).toFixed(2)}×</td></tr>)}</tbody>
        </table></div>{!matches.length && <p className="empty-message">No eligible World Bank observations.</p>}</> : <p className="empty-message">This jurisdiction has no comparable observation for this metric.</p>}
      <p className="source-line">Matches prioritize the same year and then the absolute log ratio. GDP is in current U.S. dollars. National and subnational estimates may use different accounting conventions. <Link href="/data#methodology">Methodology</Link></p>
    </section>
  </>;
}
