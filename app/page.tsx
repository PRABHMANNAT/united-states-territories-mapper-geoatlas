import Link from "next/link";
import { ArrowUpRight, BookOpen, Layers3, Map } from "lucide-react";
import { NorthAmericaStudio } from "@/components/north-america-studio";
import { atlasLink, parseAtlasScope } from "@/lib/north-america";

export default async function Home({ searchParams }: { searchParams: Promise<{ places?: string | string[] }> }) {
  const scope = parseAtlasScope((await searchParams).places);
  const shortcuts = [
    { title: "Place directory", description: "Find countries, territories, and profiles.", href: "/places", icon: BookOpen },
    { title: "Create a map", description: "Combine places, add color, and export.", href: atlasLink("/creator", scope), icon: Layers3 },
    { title: "Detailed U.S. map", description: "Explore layers, imagery, and state sizes.", href: "/map", icon: Map },
  ];

  return <div className="shell continental-page continental-home">
    <NorthAmericaStudio key={scope.join(",")} initialScope={scope}/>
    <nav className="continent-shortcuts" aria-label="Explore more atlas tools">
      {shortcuts.map(({ title, description, href, icon: Icon }) => <Link key={title} href={href} className="continent-shortcut">
        <span className="continent-shortcut-icon"><Icon size={17} aria-hidden="true"/></span>
        <span className="continent-shortcut-copy"><strong>{title}</strong><small>{description}</small></span>
        <ArrowUpRight className="continent-shortcut-arrow" size={16} aria-hidden="true"/>
      </Link>)}
    </nav>
  </div>;
}
