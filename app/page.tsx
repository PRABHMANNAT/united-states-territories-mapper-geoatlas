import Link from "next/link";
import { ArrowDownRight, ArrowRight, BarChart3, Compass, Database, Globe2, Map, Shuffle, Swords } from "lucide-react";
import { MapStudio } from "@/components/map-studio";
import { RandomRegion } from "@/components/random-region";
import { mapData, mapObservations, observations, regions, sources } from "@/lib/data";
import { articleLeads } from "@/lib/encyclopedia-data";
import { formatValue, latest } from "@/lib/statistics";
import { flagCatalog } from "@/lib/flag-data";

const features = [
  { title: "See how states rank", text: "Sort jurisdictions by population, geography, economic output and more.", href: "/rankings", icon: BarChart3, no: "01" },
  { title: "Compare places", text: "Put states side by side, then find their closest matches in the world.", href: "/compare", icon: Swords, no: "02" },
  { title: "Make your own map", text: "Color regions, build a legend and export your map to use anywhere.", href: "/creator", icon: Map, no: "03" },
];

export default async function Home() {
  const [flags, leads] = await Promise.all([flagCatalog(), articleLeads(regions)]);
  const alaska = latest(observations, "AK", "land");
  const california = latest(observations, "CA", "population");
  return <div className="shell home">
    <section className="home-intro">
      <div className="home-intro-main"><p className="eyebrow"><span /> THE OPEN ATLAS OF AMERICA</p><h1>The United States,<br className="hero-break"/> <em>explored.</em></h1>
        <p>Explore the geography and statistics of America’s states, territories and outlying islands. Every figure comes with a source and a year.</p>
        <div className="hero-actions"><Link href="/map" className="primary-button"><Compass size={17}/> Explore the atlas <ArrowRight size={17}/></Link><RandomRegion slugs={regions.filter((region) => region.type === "state").map((region) => region.slug)}><Shuffle size={16}/> Surprise me</RandomRegion></div>
      </div>
      <div className="hero-index">
        <span>VOL. 01 <i /> UNITED STATES</span>
        <div><strong>50</strong><p>States</p></div>
        <div><strong>05</strong><p>Inhabited territories</p></div>
        <div><strong>09</strong><p>Outlying islands</p></div>
        <small>Plus the District of Columbia</small>
      </div>
    </section>
    <div className="section-rule"><span>01 / EXPLORE THE MAP</span><ArrowDownRight size={17}/></div>
    <MapStudio regions={regions} observations={mapObservations()} data={mapData} sources={sources} flags={flags} leads={leads} initialId="CA" initialLayer="political" home />
    <div className="atlas-facts">
      <Link href="/rankings?metric=land"><Map size={20}/><div><small>LARGEST STATE BY LAND · {alaska?.year}</small><strong>Alaska <span>{formatValue("land", alaska?.value, "metric", true)}</span></strong></div><ArrowRight size={16}/></Link>
      <Link href="/rankings?metric=population"><Globe2 size={20}/><div><small>MOST POPULOUS STATE · {california?.year}</small><strong>California <span>{formatValue("population", california?.value, "metric", true)}</span></strong></div><ArrowRight size={16}/></Link>
      <Link href="/data"><Database size={20}/><div><small>OPEN DATA</small><strong>Download the atlas</strong></div><ArrowRight size={16}/></Link>
    </div>
    <section className="home-discovery">
      <div className="section-rule"><span>02 / GO DEEPER</span><ArrowDownRight size={17}/></div>
      <h2>Follow your curiosity.</h2>
      <div className="feature-grid">{features.map(({ title, text, href, icon: Icon, no }) => <Link href={href} className="feature-card" key={href}><div><Icon size={22}/><small>{no}</small></div><h3>{title}</h3><p>{text}</p><ArrowRight size={17}/></Link>)}</div>
      <div className="home-more"><Link href="/timeline">Play the population timeline <ArrowRight size={15}/></Link><Link href="/quiz">Test your geography <ArrowRight size={15}/></Link><Link href="/map?layer=waterways">Trace rivers and lakes <ArrowRight size={15}/></Link></div>
    </section>
  </div>;
}
