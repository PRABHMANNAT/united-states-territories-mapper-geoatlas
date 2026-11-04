"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AtlasSvg } from "./atlas-svg";
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
  const mapFills = Object.fromEntries(regions.flatMap((item) => fills[`${item.id}:${year}`] ? [[item.id, fills[`${item.id}:${year}`]]] : []));
  const current = values.find((item) => item.region === region && item.year === year);
  const previous = values.find((item) => item.region === region && item.year === years[index - 1]);
  const percentage = metricById[metric].unit === "percent";
  const difference = current && previous && (percentage || previous.value !== 0)
    ? percentage ? current.value - previous.value : (current.value / previous.value - 1) * 100
    : undefined;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (index >= years.length - 1) setPlaying(false);
      else setIndex(index + 1);
    }, speed);
    return () => window.clearTimeout(timer);
  }, [index, playing, speed, years.length]);

  return <section className="panel tool-panel">
    <div className="controls"><label>Metric<select value={metric} onChange={(event) => { setMetric(event.target.value); setIndex(0); setPlaying(false); }}>{timeMetrics.map((id) => <option value={id} key={id}>{metricById[id].name}</option>)}</select></label>
      <label>Jurisdiction<select value={region} onChange={(event) => setRegion(event.target.value)}>{regions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Playback speed<select value={speed} onChange={(event) => setSpeed(+event.target.value)}><option value={1500}>Slow</option><option value={850}>Normal</option><option value={350}>Fast</option></select></label>
    </div>
    <div className="timeline-controls"><div className="button-row"><button className="primary-button" onClick={() => { if (!playing && index === years.length - 1) setIndex(0); setPlaying((value) => !value); }}>{playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? "Pause" : "Play"}</button>
      <button className="quiet-button" aria-label="Reset timeline" onClick={() => { setPlaying(false); setIndex(0); }}><RotateCcw size={16}/></button></div>
      <label className="timeline-slider"><span>{years[0]} <strong>{year}</strong> {years.at(-1)}</span><input type="range" min="0" max={years.length - 1} value={index} aria-label="Reference year" aria-valuetext={String(year)} onChange={(event) => { setIndex(+event.target.value); setPlaying(false); }}/></label></div>
    <div className="timeline-grid"><div className="ranking-map"><AtlasSvg data={data} regions={regions} fills={mapFills} thematic selection={[region]} onSelect={setRegion}/>
      <div className="map-legend">{legend.map((item) => <span key={item.color}><i style={{ background: item.color }}/> {item.label}</span>)}<span><i className="legend-missing"/> No data</span></div></div>
      <div className="timeline-value"><p className="eyebrow"><span/> {year} OBSERVATION</p><h2>{regions.find((item) => item.id === region)?.name}</h2><p className="timeline-number">{current ? formatValue(metric, current.value, "metric", true) : "Data unavailable"}</p>
        {difference !== undefined && <p>{difference.toLocaleString("en-US", { signDisplay: "exceptZero", maximumFractionDigits: 2 })}{percentage ? " percentage points" : "%"} vs. {previous?.year}</p>}
        <p className="source-line">{metric.startsWith("population") ? "Census Population Estimates Program, Vintage 2025." : "BEA annual GDP by state. Per capita values use same-year Census population estimates."}</p>
      </div>
    </div>
    <p className="source-line">Color thresholds stay fixed across the series. Only published observations are displayed. State outlines use the 2025 cartographic vintage.</p>
  </section>;
}
