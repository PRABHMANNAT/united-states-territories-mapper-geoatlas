import Link from "next/link";
import { NorthAmericaStudio } from "@/components/north-america-studio";
import { parseAtlasScope } from "@/lib/north-america";
import { Creator } from "@/components/creator";
import { PageHeading } from "@/components/page-heading";
import { mapData, observations, regions } from "@/lib/data";
import { defaultProject, parseProject } from "@/lib/map-project";

export const metadata = { title: "Map creator" };

export default async function CreatorPage({ searchParams }: { searchParams: Promise<{ project?: string; region?: string; scope?: string; places?: string | string[] }> }) {
  const { project, region, places, scope } = await searchParams;
  const legacy = scope === "us" || project !== undefined || region !== undefined;
  if (!legacy) {
    const selectedPlaces = parseAtlasScope(places);
    return <div className="shell continental-page">
      <div className="continent-intro">
        <div><p className="eyebrow"><span/> CARTOGRAPHY STUDIO</p><h1>Make a map</h1>
          <p>Mix countries and subdivisions, paint them in any color, and download your map.</p></div>
        <Link className="quiet-button" href="/creator?scope=us">U.S. creator</Link>
      </div>
      <NorthAmericaStudio key={selectedPlaces.join(",")} initialScope={selectedPlaces} editing/>
    </div>;
  }
  const selected = regions.find((item) => item.id === region)?.id;
  const loaded = parseProject(typeof project === "string" ? project : null);
  return <div className="shell inner-page"><PageHeading label="04 / CARTOGRAPHY STUDIO" title="Make a map">Color jurisdictions, design a legend, and take your map with you as an image or a shareable link.</PageHeading>
    <Creator key={loaded ? project : selected ?? "default"} initial={loaded ?? defaultProject} initialRegion={loaded ? undefined : selected} data={mapData} regions={regions} population={observations.filter((item) => item.metric === "population" && item.year === 2025)} invalid={Boolean(project && !loaded)}/>
  </div>;
}
