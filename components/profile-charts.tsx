import { observations, sources } from "@/lib/data";
import { metricById } from "@/lib/metrics";
import { formatValue, latest } from "@/lib/statistics";

export function getProfileChartData(region: string, chapter: string) {
  const metric = chapter === "population" ? "population" : chapter === "economy" ? "gdp" : null;
  if (!metric) return null;
  const rows = observations.filter((row) => row.region === region && row.metric === metric).sort((a, b) => a.year - b.year).slice(-10);
  const shares = (chapter === "population" ? ["degree", "urban"] : ["poverty", "homeownership"]).map((id) => latest(observations, region, id)).filter((row) => row !== undefined);
  return { metric, rows, shares };
}

export function ProfileCharts({ region, chapter }: { region: string; chapter: string }) {
  const chart = getProfileChartData(region, chapter);
  if (!chart) return null;
  const { metric, rows, shares } = chart;
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <div className="profile-charts">
    <figure className="profile-chart"><figcaption><h3>{metricById[metric].name} over time</h3><p>Latest available observations (up to 10 years) · bars start at zero</p></figcaption>
      {rows.length ? <div className="observation-bars">{rows.map((row) => <div key={`${row.year}-${row.source}`}><span>{row.year}</span><div className="observation-track"><i style={{ width: `${row.value / max * 100}%` }}/></div><strong>{formatValue(metric, row.value)}</strong></div>)}</div> : <p>No comparable observations available.</p>}
    </figure>
    {shares.length > 0 && <figure className="profile-chart"><figcaption><h3>{chapter === "population" ? "Community indicators" : "Household indicators"}</h3><p>Different populations and reference years; these shares do not add to 100%.</p></figcaption>{shares.map((row) => <div className="share-indicator" key={row.metric}><div><strong>{metricById[row.metric].name}</strong><b>{formatValue(row.metric, row.value)}</b></div><meter min={0} max={100} value={row.value} aria-label={metricById[row.metric].name}/><p>{metricById[row.metric].description}</p><small>{row.year} · {sources[row.source]?.name}{row.margin !== undefined ? ` · MOE ±${formatValue(row.metric, row.margin)}` : ""}</small></div>)}</figure>}
  </div>;
}
