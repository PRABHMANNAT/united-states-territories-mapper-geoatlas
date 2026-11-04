import { MapStudio } from "@/components/map-studio";
import { PageHeading } from "@/components/page-heading";
import { findRegion, mapData, mapObservations, regions, sources } from "@/lib/data";
import { articleLeads } from "@/lib/encyclopedia-data";
import { flagCatalog } from "@/lib/flag-data";
import { layerOptions } from "@/lib/layers";
import { getRasterProviders } from "@/lib/raster-config";

export const metadata = { title: "Interactive atlas" };

export default async function MapPage({ searchParams }: { searchParams: Promise<{ region?: string; layer?: string }> }) {
  const [{ region, layer }, flags, leads] = await Promise.all([searchParams, flagCatalog(), articleLeads(regions)]);
  const initialId = typeof region === "string" ? findRegion(region)?.id ?? "" : "";
  const initialLayer = layerOptions.find((item) => item.id === layer)?.id ?? "political";
  const providers = getRasterProviders();
  return <div className="shell inner-page map-page"><PageHeading label="01 / CARTOGRAPHY" title="Interactive atlas">Choose a layer, select a place, or expand the map to fill your screen.</PageHeading>
    <MapStudio key={`${initialId}:${initialLayer}`} initialId={initialId} initialLayer={initialLayer} regions={regions} data={mapData} providers={providers} flags={flags} leads={leads}
      observations={mapObservations()} sources={sources}/>
  </div>;
}
