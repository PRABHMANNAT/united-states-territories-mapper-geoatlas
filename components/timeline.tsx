"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Info, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AtlasSvg } from "./atlas-svg";
import { Shape } from "./shape";
import { choropleth } from "@/lib/layers";
import { metricById, timeMetrics } from "@/lib/metrics";
import { formatValue, series, yearsFor } from "@/lib/statistics";
import type { MapData, Observation, Region } from "@/lib/types";

export function Timeline({ data, regions, observations }: { data: MapData; regions: Region[]; observations: Observation[] }) {
  const [metric, setMetric] = useState("population");
  const [index, setIndex] = useState(0);
  const [region, setRegion] = useState("CA");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(850);
  const years = useMemo(() => yearsFor(observations, metric).reverse(), [observations, metric]);
  const values = useMemo(() => series(observations, metric), [observations, metric]);
  const { fills, legend } = useMemo(() => choropleth(Object.fromEntries(values.map((item) => [`${item.region}:${item.year}`, item.value])), metric), [values, metric]);
  const year = years[index];
  const selected = regions.find((item) => item.id === region)!;
  const mapFills = Object.fromEntries(regions.flatMap((item) => fills[`${item.id}:${year}`] ? [[item.id, fills[`${item.id}:${year}`]]] : []));
  const current = values.find((item) => item.region === region && item.year === year);
  const previous = values.find((item) => item.region === region && item.year === years[index - 1]);
  const regionValues = values.filter((item) => item.region === region);
  const percentage = metricById[metric].unit === "percent";
  const difference = current && previous && (percentage || previous.value !== 0)
    ? percentage ? current.value - previous.value : (current.value / previous.value - 1) * 100
    : undefined;
  const available = values.filter((item) => item.year === year).length;

  function selectYear(next: number) {
    setIndex(next);
    setPlaying(false);
  }

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (index >= years.length - 1) setPlaying(false);
      else setIndex(index + 1);
    }, speed);
    return () => window.clearTimeout(timer);
  }, [index, playing, speed, years.length]);

  return <section className="timeline-workspace" aria-label="Historical timeline explorer">
    <div className="timeline-filterbar">
      <div className="controls">
        <label>Explore a measure<select value={metric} aria-label="Metric" onChange={(event) => { setMetric(event.target.value); setIndex(0); setPlaying(false); }}>{timeMetrics.map((id) => <option value={id} key={id}>{metricById[id].name}</option>)}</select></label>
        <label>Focus on a place<select value={region} aria-label="Jurisdiction" onChange={(event) => setRegion(event.target.value)}>{regions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      <span className="dataset-badge"><span className="availability-dot"/> Annual observations · {years[0]}–{years.at(-1)}</span>
    </div>
    <div className="timeline-grid">
      <div className="timeline-canvas">
        <div className="timeline-map-heading"><div><h2>{metricById[metric].name} across America</h2><p>Select a state on the map to explore its story.</p></div><span className="map-year">{year}</span></div>
        <div className="timeline-map"><AtlasSvg data={data} regions={regions} fills={mapFills} thematic selection={[region]} onSelect={setRegion}/></div>
        <div className="map-legend timeline-legend"><span className="legend-title">{metricById[metric].name}</span>{legend.map((item) => <span key={item.color}><i style={{ background: item.color }}/> {item.label}</span>)}<span><i className="legend-missing"/> No data</span></div>
        <div className="timeline-player">
          <div className="timeline-controls">
            <button className="primary-button play-button" onClick={() => { if (!playing && index === years.length - 1) setIndex(0); setPlaying((value) => !value); }}>{playing ? <Pause size={17}/> : <Play size={17}/>} {playing ? "Pause" : "Play"}</button>
            <div className="timeline-track"><label className="timeline-slider"><span className="sr-only">Reference year</span><input type="range" min="0" max={years.length - 1} value={index} aria-label="Reference year" aria-valuetext={String(year)} onChange={(event) => selectYear(+event.target.value)}/></label>
              <div className="timeline-year-buttons" aria-label="Choose a year">{years.map((item, i) => <button key={item} aria-label={`Go to ${item}`} aria-pressed={index === i} onClick={() => selectYear(i)}>{item}</button>)}</div>
            </div>
          </div>
          <div className="playback-options"><span><button className="icon-button" aria-label="Previous year" disabled={index === 0} onClick={() => selectYear(index - 1)}><ChevronLeft size={17}/></button><button className="icon-button" aria-label="Next year" disabled={index === years.length - 1} onClick={() => selectYear(index + 1)}><ChevronRight size={17}/></button><button className="icon-button" aria-label="Reset timeline" onClick={() => selectYear(0)}><RotateCcw size={15}/></button><small>{index + 1} of {years.length} years</small></span><label>Playback speed<select value={speed} onChange={(event) => setSpeed(+event.target.value)}><option value={1500}>Slow</option><option value={850}>Normal</option><option value={350}>Fast</option></select></label></div>
        </div>
      </div>
      <aside className="timeline-value" aria-label="Selected region insights">
        <div className="insight-header"><span className="eyebrow">IN FOCUS</span><span className="region-code">{region}</span></div>
        <div className="insight-region"><div><h2>{selected.name}</h2><p>{selected.censusRegion ?? (selected.type === "island" ? "Outlying island" : "U.S. territory")}</p></div><Shape path={data.silhouettes[region]}/></div>
        <div className="insight-observation"><p>{metricById[metric].name} <span>· {year}</span></p><p className={`timeline-number${!current ? " unavailable-value" : ""}`}>{current ? formatValue(metric, current.value, "metric", true) : "Data unavailable"}</p>
          {difference !== undefined ? <p className="year-difference"><strong>{difference.toLocaleString("en-US", { signDisplay: "exceptZero", maximumFractionDigits: 2 })}{percentage ? " pp" : "%"}</strong> from {previous?.year}</p> : <p className="muted">{current ? "First observation in this series" : "No published observation for this year."}</p>}
        </div>
        {regionValues.length > 0 ? <div className="trend-section"><div className="trend-heading"><span>The longer view</span><span>{years[0]}–{years.at(-1)}</span></div><TrendChart years={years} values={regionValues} year={year} metric={metric} name={selected.name}/><p>Annual values · axis scaled to this place</p></div> : <div className="trend-empty"><Info size={20}/><p>This place has no observations in this series. Choose another place or measure.</p></div>}
        <Link className="quiet-button profile-link" href={`/regions/${selected.slug}`}>Explore {selected.name}<ArrowRight size={16}/></Link>
        <div className="insight-source"><span className="eyebrow">BEHIND THE NUMBERS</span><p>{metric.startsWith("population") ? "U.S. Census Bureau · Population Estimates Program, Vintage 2025." : "Bureau of Economic Analysis · Annual GDP. Per capita values use same-year Census population estimates."}</p><Link href="/data">Sources & methodology <ArrowRight size={13}/></Link></div>
      </aside>
    </div>
    <div className="timeline-footnote"><Info size={15}/><p>Consistent colors across all years. Present-day boundaries (2025). Missing observations are shown in gray.</p><span>{available} places with data</span></div>
  </section>;
}

function TrendChart({ years, values, year, metric, name }: { years: number[]; values: Observation[]; year: number; metric: string; name: string }) {
  const low = Math.min(...values.map((row) => row.value));
  const high = Math.max(...values.map((row) => row.value));
  const points = years.map((item, i) => {
    const observation = values.find((row) => row.year === item);
    return observation ? { year: item, value: observation.value, x: 8 + i / Math.max(1, years.length - 1) * 244, y: high === low ? 58 : 98 - (observation.value - low) / (high - low) * 76 } : null;
  });
  const path = points.map((point, i) => point ? `${i > 0 && points[i - 1] ? "L" : "M"}${point.x},${point.y}` : "").join(" ");
  return <figure className="trend-chart"><svg viewBox="0 0 260 128" role="img" aria-label={`${name}, ${metricById[metric].name}: ${values.map((row) => `${row.year}: ${formatValue(metric, row.value)}`).join("; ")}`}>
    {[22, 60, 98].map((y) => <line key={y} x1="8" x2="252" y1={y} y2={y} className="trend-grid"/>)}
    <path d={path} className="trend-line"/>
    {points.map((point) => point && <g key={point.year}><circle cx={point.x} cy={point.y} r={point.year === year ? 5 : 2.5} className={point.year === year ? "trend-point active" : "trend-point"}/><title>{`${point.year}: ${formatValue(metric, point.value)}`}</title></g>)}
    <text x="8" y="122">{years[0]}</text><text x="252" y="122" textAnchor="end">{years.at(-1)}</text>
  </svg><figcaption><span>Low {formatValue(metric, low, "metric", true)}</span><span>High {formatValue(metric, high, "metric", true)}</span></figcaption></figure>;
}
