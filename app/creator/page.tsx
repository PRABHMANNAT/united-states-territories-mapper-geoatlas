import { Creator } from "@/components/creator";
import { PageHeading } from "@/components/page-heading";
import { mapData, observations, regions } from "@/lib/data";
import { defaultProject, parseProject } from "@/lib/map-project";

export const metadata = { title: "Map creator" };

export default async function CreatorPage({ searchParams }: { searchParams: Promise<{ project?: string; region?: string }> }) {
  const { project, region } = await searchParams;
  const selected = regions.find((item) => item.id === region)?.id;
  const loaded = parseProject(typeof project === "string" ? project : null);
  return <div className="shell inner-page"><PageHeading label="04 / CARTOGRAPHY STUDIO" title="Make a map">Color jurisdictions, design a legend, and take your map with you as an image or a shareable link.</PageHeading>
    <Creator key={loaded ? project : selected ?? "default"} initial={loaded ?? defaultProject} initialRegion={loaded ? undefined : selected} data={mapData} regions={regions} population={observations.filter((item) => item.metric === "population" && item.year === 2025)} invalid={Boolean(project && !loaded)}/>
  </div>;
}
