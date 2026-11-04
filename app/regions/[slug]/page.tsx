import Link from "next/link";
import Image from "next/image";
import { getProfileChartData, ProfileCharts } from "@/components/profile-charts";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowDownToLine, BookOpen, MapPin } from "lucide-react";
import { ProfileReferences } from "@/components/profile-references";
import { ArticleTopics } from "@/components/article-topics";
import { Encyclopedia } from "@/components/encyclopedia";
import { PageHeading } from "@/components/page-heading";
import { RegionFlag } from "@/components/region-flag";
import { Shape } from "@/components/shape";
import { findRegion, mapData, observations, regions, sources } from "@/lib/data";
import { readArticle, topicExcerpts } from "@/lib/encyclopedia-data";
import { readFlag } from "@/lib/flag-data";
import { nearbyRegions } from "@/lib/geography";
import { metricById } from "@/lib/metrics";
import { formatValue, latest } from "@/lib/statistics";
import { regionTypeLabels } from "@/lib/types";

export function generateStaticParams() {
  return regions.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/regions/[slug]">) {
  const { slug } = await params;
  return { title: findRegion(slug)?.name ?? "Region" };
}

const chapters = [
  { id: "history", title: "History", pattern: /history|indigenous|colonial|statehood/i, metrics: [] },
  { id: "geography", title: "Geography", pattern: /geography|climate|mountain|river|ecology/i, metrics: ["area", "land", "water", "density"] },
  { id: "population", title: "Population", pattern: /population|demographic|cities/i, metrics: ["population", "population-growth", "median-age", "degree", "urban"] },
  { id: "economy", title: "Economy and housing", pattern: /economy|industr|employment/i, metrics: ["gdp", "real-gdp-growth", "gdp-per-capita", "income", "poverty", "unemployment", "home-value", "homeownership"] },
  { id: "government", title: "Government", pattern: /government|politics|administrative/i, metrics: [] },
  { id: "culture", title: "Culture", pattern: /culture|cuisine|sport|music|landmark/i, metrics: [] },
];

export default async function Profile({ params }: PageProps<"/regions/[slug]">) {
  const { slug } = await params;
  const region = findRegion(slug);
  if (!region || region.slug !== slug) notFound();
  const [article, flag] = await Promise.all([readArticle(region), readFlag(region.slug)]);
  const visibleChapters = chapters.filter((chapter) => chapter.metrics.length || (article && topicExcerpts(article, chapter.pattern).length > 0));
  const showsFlag = Boolean(flag && !article?.image?.title.toLowerCase().includes("flag"));
  const sourceIds = new Set<string>();
  for (const chapter of visibleChapters) {
    for (const id of chapter.metrics) {
      const row = latest(observations, region.id, id);
      if (row) sourceIds.add(row.source);
    }
    const chart = getProfileChartData(region.id, chapter.id);
    for (const row of [...(chart?.rows ?? []), ...(chart?.shares ?? [])]) sourceIds.add(row.source);
  }
  const dataSources = [...sourceIds].map((id) => sources[id]).filter(Boolean);
  const related = nearbyRegions(region, regions);
  const [longitude, latitude] = region.coordinates;
  return <div className="shell inner-page region-profile">
    <Link href="/map" className="breadcrumb">Atlas / Region profiles</Link>
    <div className="profile-hero"><PageHeading label={`FIELD GUIDE / ${region.id}`} title={region.name}>{regionTypeLabels[region.type]}{region.censusRegion ? ` · Census ${region.censusRegion} region` : ""}</PageHeading><Shape path={mapData.silhouettes[region.id]} /></div>
    <div className="profile-layout">
      <aside className="panel profile-nav"><p className="eyebrow"><span/> ON THIS PAGE</p><nav aria-label="Region sections"><a href="#overview">Overview</a>{visibleChapters.map((item) => <a key={item.id} href={`#${item.id}`}>{item.title}</a>)}<a href="#explore">Related jurisdictions</a><a href="#references">References</a></nav></aside>
      <div className="profile-content">
        <section className="panel tool-panel" id="overview"><div className="tool-summary"><div><h2>Overview</h2><p><MapPin size={15}/> {latitude.toFixed(4)}°, {longitude.toFixed(4)}°</p></div></div>
          {article?.image && <figure className="profile-image"><Image unoptimized src={article.image.url} width={article.image.width} height={article.image.height} alt={article.image.title} /><figcaption>{article.image.title}</figcaption></figure>}
          <dl className="overview-details"><div><dt>{region.type === "territory" ? "Capital or seat" : "Capital"}</dt><dd>{region.capital ?? "—"}</dd></div><div><dt>Jurisdiction type</dt><dd>{regionTypeLabels[region.type]}</dd></div><div><dt>Census FIPS</dt><dd>{region.fips ?? "—"}</dd></div></dl>
          {flag && showsFlag && <figure className="flag-credit"><RegionFlag flag={flag} name={region.name} size={100}/><figcaption>{flag.title.replace(/^File:/, "")}</figcaption></figure>}
          {article ? <div className="encyclopedia prose">
            <h3><BookOpen size={17}/> Encyclopedia</h3>
            <blockquote>{article.extract}</blockquote>
          </div> : <Encyclopedia title={region.wikipediaTitle} />}
          <div className="button-row"><Link href={`/map?region=${region.id}`} className="primary-button">Find on atlas <ArrowRight size={16}/></Link><a href={`/datasets/regions/${region.slug}.geojson`} className="quiet-button" download><ArrowDownToLine size={16}/> GeoJSON</a></div>
        </section>
        {visibleChapters.map((item) => <section key={item.id} className="panel tool-panel" id={item.id}>
          <div className="tool-summary"><h2>{item.title}</h2></div>
          <dl className="profile-metrics">{item.metrics.filter((id) => metricById[id]).map((id) => {
            const row = latest(observations, region.id, id);
            return <div key={id}><dt>{metricById[id].name}</dt><dd>{row ? formatValue(id, row.value) : "Data unavailable"}</dd>
              {row && <small>{row.year} · {sources[row.source]?.name}{row.margin !== undefined ? ` · MOE ±${formatValue(id, row.margin)}` : ""}</small>}</div>;
          })}</dl>
          <ProfileCharts region={region.id} chapter={item.id}/>
          {article && <ArticleTopics article={article} pattern={item.pattern} />}
        </section>)}
        <section id="explore" className="panel tool-panel"><div className="tool-summary"><h2>Related jurisdictions</h2></div>
          <p className="source-line">Closest geographic reference points</p>
          <div className="button-row">{related.map(({ region: item, distance }) => <Link className="quiet-button" href={`/regions/${item.slug}`} key={item.id}>{item.name} <small>{Math.round(distance).toLocaleString("en-US")} km</small></Link>)}</div>
          <Link className="text-button" href={`/compare?regions=${region.id},${related[0].region.id}&target=${region.id}&countryMetric=land`}>Compare {region.name} <ArrowRight size={15}/></Link>
        </section>
        <ProfileReferences article={article} title={region.wikipediaTitle} chapters={chapters} dataSources={dataSources} flag={showsFlag ? flag : null}/>
      </div>
    </div>
  </div>;
}
