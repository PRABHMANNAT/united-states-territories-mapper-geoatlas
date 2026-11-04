import { MapStudio } from "@/components/map-studio";
import { PageHeading } from "@/components/page-heading";
import { findRegion, mapData, mapObservations, regions, sources } from "@/lib/data";
import { articleLeads } from "@/lib/encyclopedia-data";
import { flagCatalog } from "@/lib/flag-data";
import { layerOptions } from "@/lib/layers";
import { rasterProvider } from "@/lib/raster";

export const metadata = { title: "Interactive atlas" };

export default async function MapPage({ searchParams }: { searchParams: Promise<{ region?: string; layer?: string }> }) {
  const [{ region, layer }, flags, leads] = await Promise.all([searchParams, flagCatalog(), articleLeads(regions)]);
  const initialId = typeof region === "string" ? findRegion(region)?.id ?? "" : "";
  const initialLayer = layerOptions.find((item) => item.id === layer)?.id ?? "political";
  const providers = {
    satellite: rasterProvider(process.env.STATEATLAS_SATELLITE_TILES, process.env.STATEATLAS_SATELLITE_ATTRIBUTION),
    terrain: rasterProvider(process.env.STATEATLAS_TOPOGRAPHIC_TILES, process.env.STATEATLAS_TOPOGRAPHIC_ATTRIBUTION),
  };
  return <div className="shell inner-page"><PageHeading label="01 / CARTOGRAPHY" title="Interactive atlas">Choose a map layer or look up any of the 65 jurisdictions to see its profile.</PageHeading>
    <MapStudio key={`${initialId}:${initialLayer}`} initialId={initialId} initialLayer={initialLayer} regions={regions} data={mapData} providers={providers} flags={flags} leads={leads}
      observations={mapObservations()} sources={sources}/>
  </div>;
}
