import Link from "next/link";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ArrowUpRight, BookOpen, Layers3, Map } from "lucide-react";
import articles from "@/data/north-america/articles.json";
import { findRegion } from "@/lib/data";
import { atlasAdminLayers, atlasBounds, atlasById, atlasLink, atlasPlaces, encyclopediaLink, type AtlasOutlines } from "@/lib/north-america";

type Props = { params: Promise<{ id: string }> };
const excerpts: Record<string, { title: string; revision: number; extract: string }> = articles;
const number = new Intl.NumberFormat("en");
let outlines: Promise<AtlasOutlines> | undefined;

export async function generateMetadata({ params }: Props) {
  return { title: atlasById.get((await params).id)?.name ?? "Place profile" };
}

export default async function PlacePage({ params }: Props) {
  const place = atlasById.get((await params).id);
  if (!place) notFound();
  const parent = place.parent ? atlasById.get(place.parent) : undefined;
  const siblings = atlasPlaces.filter((item) => item.parent === (parent?.id ?? place.id) && item.id !== place.id);
  const divisionList = <ul>{siblings.map((item) => <li key={item.id}><Link href={`/places/${item.id}`}><strong>{item.name}</strong><span>{item.type}</span></Link></li>)}</ul>;
  if (place.kind === "country") {
    const levels = [1, 2, 3].filter((level) => level === 1 ? siblings.length > 0 : Boolean(atlasAdminLayers[`${place.id}-adm${level}`]));
    return <div className="shell inner-page">
      <header className="continent-intro">
        <div><p className="eyebrow"><span/> SUBDIVISION DIRECTORY</p><h1>{place.name}</h1>
          <p>{levels.length ? `Map boundary levels available: ${levels.join(", ")}.` : "No internal boundaries in the current map dataset."}</p></div>
        <div className="button-row">
          <Link href={atlasLink("/", [place.id])} className="quiet-button"><Map size={16}/> View on map</Link>
          <Link href={atlasLink("/creator", [place.id])} className="primary-button"><Layers3 size={16}/> Customize map</Link>
        </div>
      </header>
      {siblings.length > 0 && <section className="panel tool-panel continent-directory"><h2>First-level subdivisions</h2>{divisionList}</section>}
    </div>;
  }

  const article = excerpts[place.id];
  const detailed = parent?.id === "usa" && place.code ? findRegion(place.code.slice(3)) : undefined;
  const label = place.kind === "subdivision" ? "Other subdivisions" : "Subdivisions";
  const geometry = await (outlines ??= readFile(join(process.cwd(), "public/datasets/north-america-shapes.json"), "utf8").then(JSON.parse));
  const shape = geometry[place.id];
  const box = atlasBounds([place.id], geometry);

  return <div className="shell inner-page region-profile continental-profile">
    <header className="continent-intro">
      <div><p className="eyebrow"><span/> NORTH AMERICAN FIELD GUIDE</p><h1>{place.name}</h1>
        <p>{place.type}{parent ? <> · <Link href={`/places/${parent.id}`}>{parent.name}</Link></> : place.region ? ` · ${place.region}` : ""}</p></div>
      <div className="button-row">
        {detailed && <Link href={`/regions/${detailed.slug}`} className="quiet-button">Detailed U.S. profile</Link>}
        <Link href={atlasLink("/", [place.id])} className="quiet-button"><Map size={16}/> View on map</Link>
        <Link href={atlasLink("/creator", [place.id])} className="primary-button"><Layers3 size={16}/> Customize map</Link>
      </div>
    </header>
    <div className="profile-layout">
      <aside className="panel profile-nav"><p className="eyebrow"><span/> ON THIS PAGE</p><nav aria-label="Profile sections">
        <a href="#overview">Overview</a><a href="#geography">Geography</a>{siblings.length > 0 && <a href="#divisions">{label}</a>}<a href="#references">References</a>
      </nav></aside>
      <div className="profile-content">
        <section id="overview" className="panel tool-panel">
          <div className="tool-summary"><h2>Overview</h2></div>
          {article ? <div className="chapter-reading"><p>{article.extract}</p></div> : <div className="chapter-reading"><p>{place.name} is shown as {place.type.toLowerCase().match(/^[aeiou]/) ? "an" : "a"} {place.type.toLowerCase()}{parent ? ` of ${parent.name}` : place.region ? ` in ${place.region}` : ""} in the Natural Earth boundary dataset.</p></div>}
          <dl className="overview-details">
            <div><dt>Classification</dt><dd>{place.type}</dd></div>
            {place.code && <div><dt>ISO code</dt><dd>{place.code}</dd></div>}
            {place.jurisdiction && <div><dt>Associated jurisdiction</dt><dd>{place.jurisdiction}</dd></div>}
            {place.population !== undefined && <div><dt>Population estimate · {place.populationYear}</dt><dd>{number.format(place.population)}</dd></div>}
          </dl>
        </section>
        <section id="geography" className="panel tool-panel">
          <div className="tool-summary"><h2>Geography</h2></div>
          {shape && <svg className="continent-profile-outline" viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} role="img" aria-label={`Outline of ${place.name}`}>
            <path d={shape.path} fill="#242424"/>
          </svg>}
          <div className="chapter-reading"><p>{place.area > 0 ? `The mapped boundary covers approximately ${number.format(place.area)} km². ` : ""}This outline is drawn from Natural Earth at a continental map scale.</p></div>
        </section>
        {siblings.length > 0 && <section id="divisions" className="panel tool-panel continent-directory"><h2>{label}</h2>
          {divisionList}
        </section>}
        <details className="panel tool-panel profile-references" id="references"><summary><h2>References</h2></summary>
          <div className="reference-groups">
            <p><a href={place.parent ? "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/" : "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/"}>Natural Earth</a> · Boundary and geographic attributes.</p>
            {article && <p>Introductory excerpt from <a href={`https://en.wikipedia.org/wiki/Special:PermanentLink/${article.revision}`}>Wikipedia contributors</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.</p>}
            <p><a href={encyclopediaLink(place)}><BookOpen size={15}/> Read the encyclopedia article <ArrowUpRight size={13}/></a></p>
          </div>
        </details>
      </div>
    </div>
  </div>;
}
