import { MapStudio } from "@/components/map-studio";
import { PageHeading } from "@/components/page-heading";
import { findRegion, mapData, observations, regions, sources } from "@/lib/data";
import { layerOptions } from "@/lib/layers";

export const metadata = { title: "Interactive atlas" };

export default async function MapPage({ searchParams }: { searchParams: Promise<{ region?: string; layer?: string }> }) {
  const { region, layer } = await searchParams;
  const initialId = typeof region === "string" ? findRegion(region)?.id ?? "" : "";
  const initialLayer = layerOptions.find((item) => item.id === layer)?.id ?? "political";
  return <div className="shell inner-page"><PageHeading label="01 / CARTOGRAPHY" title="Interactive atlas">Choose a map layer or look up any of the 65 jurisdictions to see its profile.</PageHeading>
    <MapStudio key={`${initialId}:${initialLayer}`} initialId={initialId} initialLayer={initialLayer} regions={regions} data={mapData}
      observations={observations.filter((row) => row.year >= 2025 || row.source === "islandCensus")} sources={sources}/>
  </div>;
}
