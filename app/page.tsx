import Link from "next/link";
import { ArrowUpRight, BookOpen, Layers3, Map } from "lucide-react";
import { NorthAmericaStudio } from "@/components/north-america-studio";
import { parseAtlasScope } from "@/lib/north-america";

export default async function Home({ searchParams }: { searchParams: Promise<{ places?: string | string[] }> }) {
  const scope = parseAtlasScope((await searchParams).places);
  return <div className="shell continental-page">
    <div className="continent-intro">
      <div><p className="eyebrow"><span/> OPEN GEOGRAPHIC ATLAS</p><h1>North America, explored.</h1>
        <p>Explore countries, territories, states, and provinces on one map.</p></div>
      <div className="button-row">
        <Link href="/places" className="quiet-button"><BookOpen size={16}/> Place directory</Link>
        <Link href="/us" className="quiet-button"><Map size={16}/> U.S. atlas</Link>
      </div>
    </div>
    <NorthAmericaStudio key={scope.join(",")} initialScope={scope}/>
    <nav className="home-shortcuts continent-shortcuts" aria-label="Explore more atlas tools">
      <div className="home-shortcut-links">
        <Link href="/places"><BookOpen size={16}/> Place directory</Link>
        <Link href="/creator"><Layers3 size={16}/> Create a map</Link>
        <Link href="/map"><Map size={16}/> Detailed U.S. map <ArrowUpRight size={14}/></Link>
      </div>
    </nav>
  </div>;
}
