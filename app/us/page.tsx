import Link from "next/link";
import { ArrowRight, BarChart3, Compass, Database, History, Layers3, Shuffle, Columns2 } from "lucide-react";
import { MapStudio } from "@/components/map-studio";
import { RandomRegion } from "@/components/random-region";
import { mapData, mapObservations, regions, sources } from "@/lib/data";
import { articleLeads } from "@/lib/encyclopedia-data";
import { flagCatalog } from "@/lib/flag-data";
import { getRasterProviders } from "@/lib/raster-config";

const shortcuts = [
  { title: "Rankings", href: "/rankings", icon: BarChart3 },
  { title: "Compare places", href: "/compare", icon: Columns2 },
  { title: "Create a map", href: "/creator", icon: Layers3 },
  { title: "Timeline", href: "/timeline", icon: History },
  { title: "Download data", href: "/data", icon: Database },
];

export default async function Home() {
  const [flags, leads] = await Promise.all([flagCatalog(), articleLeads(regions)]);
  return <div className="shell home">
    <section className="home-intro">
      <div className="home-intro-main"><h1>The United States, <em>explored.</em></h1><p>50 states, territories & islands. Select a place to begin.</p></div>
      <div className="hero-actions"><Link href="/map" className="quiet-button"><Compass size={15}/> Explore the atlas <ArrowRight size={15}/></Link><RandomRegion slugs={regions.filter((region) => region.type === "state").map((region) => region.slug)}><Shuffle size={15}/><span>Surprise me</span></RandomRegion></div>
    </section>
    <MapStudio regions={regions} observations={mapObservations()} data={mapData} sources={sources} flags={flags} leads={leads} providers={getRasterProviders()} initialId="CA" initialLayer="political" home />
    <nav className="home-shortcuts" aria-label="Explore more atlas tools"><span className="home-shortcuts-title">Explore more</span>
      <div className="home-shortcut-links">{shortcuts.map(({ title, href, icon: Icon }) => <Link href={href} key={href} className={href === "/creator" ? "shortcut-primary" : undefined}><Icon size={16} aria-hidden="true"/><span>{title}</span><ArrowRight size={13} aria-hidden="true"/></Link>)}</div></nav>
  </div>;
}
