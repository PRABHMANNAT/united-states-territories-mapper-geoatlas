import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowDownToLine, BookOpen, ExternalLink, MapPin } from "lucide-react";
import { ArticleTopics } from "@/components/article-topics";
import { Encyclopedia } from "@/components/encyclopedia";
import { PageHeading } from "@/components/page-heading";
import { Shape } from "@/components/shape";
import { findRegion, mapData, observations, regions, sources } from "@/lib/data";
import { readArticle } from "@/lib/encyclopedia-data";
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
  { id: "population", title: "Population", pattern: /population|demographic|settlement|cities/i, metrics: ["population", "population-growth", "median-age", "degree", "urban"] },
  { id: "economy", title: "Economy and housing", pattern: /economy|industr|employment/i, metrics: ["gdp", "real-gdp-growth", "gdp-per-capita", "income", "poverty", "unemployment", "home-value", "homeownership"] },
  { id: "government", title: "Government", pattern: /government|politics|administrative/i, metrics: [] },
  { id: "culture", title: "Culture", pattern: /culture|cuisine|sport|music|landmark/i, metrics: [] },
];

export default async function Profile({ params }: PageProps<"/regions/[slug]">) {
  const { slug } = await params;
  const region = findRegion(slug);
  if (!region || region.slug !== slug) notFound();
  const article = await readArticle(region);
  const visibleChapters = chapters.filter((chapter) => chapter.metrics.length || article?.sections.some((item) => chapter.pattern.test(item.name)));
  const related = regions.filter((item) => item.id !== region.id && (region.censusRegion ? item.censusRegion === region.censusRegion : item.type === region.type)).slice(0, 5);
  const [longitude, latitude] = region.coordinates;
  return <div className="shell inner-page">
    <Link href="/map" className="breadcrumb">Atlas / Region profiles</Link>
    <div className="profile-hero"><PageHeading label={`FIELD GUIDE / ${region.id}`} title={region.name}>{regionTypeLabels[region.type]}{region.censusRegion ? ` · Census ${region.censusRegion} region` : ""}</PageHeading><Shape path={mapData.silhouettes[region.id]} /></div>
    <div className="profile-layout">
      <aside className="panel profile-nav"><p className="eyebrow"><span/> ON THIS PAGE</p><nav aria-label="Region sections"><a href="#overview">Overview</a>{visibleChapters.map((item) => <a key={item.id} href={`#${item.id}`}>{item.title}</a>)}<a href="#explore">Related jurisdictions</a></nav></aside>
      <div className="profile-content">
        <section className="panel tool-panel" id="overview"><div className="tool-summary"><div><h2>Overview</h2><p><MapPin size={15}/> {latitude.toFixed(4)}°, {longitude.toFixed(4)}°</p></div></div>
          <dl className="overview-details"><div><dt>{region.type === "territory" ? "Capital or seat" : "Capital"}</dt><dd>{region.capital ?? "—"}</dd></div><div><dt>Jurisdiction type</dt><dd>{regionTypeLabels[region.type]}</dd></div><div><dt>Census FIPS</dt><dd>{region.fips ?? "—"}</dd></div></dl>
          {article ? <div className="encyclopedia prose">
            <h3><BookOpen size={17}/> Encyclopedia</h3>
            <blockquote>{article.extract}</blockquote>
            <p className="source-line">Introductory excerpt from <a href={article.revisionUrl}>Wikipedia contributors · revision {article.revision}</a>. <a href={article.licenseUrl}>{article.license}</a>. Text extracted from the article lead.</p>
            <a className="text-button" href={article.url}>Read the current article <ExternalLink size={13}/></a>
          </div> : <Encyclopedia title={region.wikipediaTitle} />}
          <div className="button-row"><Link href={`/map?region=${region.id}`} className="primary-button">Find on atlas <ArrowRight size={16}/></Link><a href={`/datasets/regions/${region.slug}.geojson`} className="quiet-button" download><ArrowDownToLine size={16}/> GeoJSON</a></div>
        </section>
        {visibleChapters.map((item) => <section key={item.id} className="panel tool-panel" id={item.id}>
          <div className="tool-summary"><h2>{item.title}</h2></div>
          <dl className="profile-metrics">{item.metrics.filter((id) => metricById[id]).map((id) => {
            const row = latest(observations, region.id, id);
            return <div key={id}><dt>{metricById[id].name}</dt><dd>{row ? formatValue(id, row.value) : "Data unavailable"}</dd>
              {row && <small>{row.year} · <a href={sources[row.source]?.url}>{sources[row.source]?.name}</a>{row.margin !== undefined ? ` · MOE ±${formatValue(id, row.margin)}` : ""}</small>}</div>;
          })}</dl>
          {article && <ArticleTopics article={article} pattern={item.pattern} />}
        </section>)}
        <section id="explore" className="panel tool-panel"><div className="tool-summary"><h2>Related jurisdictions</h2></div>
          <div className="button-row">{related.map((item) => <Link className="quiet-button" href={`/regions/${item.slug}`} key={item.id}>{item.name}</Link>)}</div>
          <Link className="text-button" href={`/compare?regions=${region.id},${region.id === "CA" ? "TX" : "CA"}`}>Compare {region.name} <ArrowRight size={15}/></Link>
        </section>
      </div>
    </div>
  </div>;
}
