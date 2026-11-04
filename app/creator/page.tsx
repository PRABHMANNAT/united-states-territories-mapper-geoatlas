import { Creator } from "@/components/creator";
import { PageHeading } from "@/components/page-heading";
import { mapData, observations, regions } from "@/lib/data";
import { defaultProject, parseProject } from "@/lib/map-project";

export const metadata = { title: "Map creator" };

export default async function CreatorPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const { project } = await searchParams;
  const loaded = parseProject(typeof project === "string" ? project : null);
  return <div className="shell inner-page"><PageHeading label="04 / CARTOGRAPHY STUDIO" title="Make a map">Color jurisdictions, design a legend, and take your map with you as an image or a shareable link.</PageHeading>
    <Creator key={loaded ? project : "default"} initial={loaded ?? defaultProject} data={mapData} regions={regions} population={observations.filter((item) => item.metric === "population" && item.year === 2025)} invalid={Boolean(project && !loaded)}/>
  </div>;
}
