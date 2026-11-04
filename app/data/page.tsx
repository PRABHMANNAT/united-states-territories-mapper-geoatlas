import { ArrowDownToLine, ArrowUpRight } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { manifest, sources } from "@/lib/data";
import { metrics } from "@/lib/metrics";

export const metadata = { title: "Data and API" };

const downloads = [
  ["Metric observations (CSV)", "observations.csv"], ["Metric observations (JSON)", "observations.json"],
  ["Regional boundaries (TopoJSON)", "regions.topojson"], ["World Bank economy observations (JSON)", "countries.json"],
  ["Provenance manifest (JSON)", "manifest.json"],
];

const endpoints = [
  ["/api/v1/regions?limit=5", "List jurisdictions with pagination."],
  ["/api/v1/regions/california", "Read a region by slug or postal code."],
  ["/api/v1/regions/texas/metrics?metric=population", "Read the population time series for Texas."],
  ["/api/v1/rankings?metric=gdp&scope=states-dc&limit=10", "Rank states and D.C. by nominal GDP."],
  ["/api/v1/compare?regions=CA,TX,NY", "Compare three jurisdictions at common years."],
  ["/api/v1/boundaries?region=california", "Read the generalized California feature and locate its detailed file."],
  ["/api/v1/metadata/metrics", "Inspect definitions, units and years."],
  ["/api/v1/metadata/sources", "Inspect source metadata and input hashes."],
  ["/api/v1/country-matches?region=california&metric=gdp", "Match California’s nominal GDP to World Bank economies."],
];

export default function DataPage() {
  return <div className="shell inner-page">
    <PageHeading label="REFERENCE / OPEN DATA" title="Data & API">Download the datasets behind the atlas or query the versioned, read-only API. Current snapshot {manifest.version}.</PageHeading>
    <section className="panel tool-panel prose"><div className="tool-summary"><h2>Download the snapshot</h2></div><div className="download-grid">{downloads.map(([label, file]) => <a className="quiet-button" key={file} href={`/datasets/${file}`} download>{label} <ArrowDownToLine size={16}/></a>)}</div></section>
    <section className="panel tool-panel prose secondary-panel"><div className="tool-summary"><h2>Public API v1</h2></div><p>Successful responses include <code>version</code> and <code>data</code>. Errors include a stable <code>error.code</code> and a message. List endpoints accept <code>page</code> and <code>limit</code>.</p>
      <dl className="endpoint-list">{endpoints.map(([href, label]) => <div key={href}><dt><a href={href}><code>{href}</code> <ArrowUpRight size={14}/></a></dt><dd>{label}</dd></div>)}</dl></section>
    <section className="panel tool-panel prose secondary-panel" id="methodology"><div className="tool-summary"><h2>Sources & methodology</h2></div>
      <p>Rankings fix one reference year and scope. Blank observations stay blank. Island Area Census counts appear in profiles and are kept separate from July 1 estimate rankings. Density uses TIGER/Line 2026 land area. National outlines and insets use different scales.</p>
      <p>World Bank country matching uses comparable indicators, sorts by year distance first, and then compares the absolute log ratio. Land estimates can differ in boundary and measurement conventions.</p>
      <ul>{Object.entries(sources).filter(([id]) => id !== "derived").map(([id, source]) => <li key={id}><a href={source.url}>{source.name}</a> · {source.vintage}</li>)}</ul></section>
    <section className="panel tool-panel prose secondary-panel"><div className="tool-summary"><h2>Metric definitions</h2></div>
      <dl className="endpoint-list">{metrics.map((item) => <div key={item.id}><dt>{item.name} <code>{item.id}</code></dt><dd>{item.description}</dd></div>)}</dl>
    </section>
  </div>;
}
