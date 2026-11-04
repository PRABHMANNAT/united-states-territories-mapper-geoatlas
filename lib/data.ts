import regionsJSON from "@/data/snapshot/regions.json";
import observationsJSON from "@/data/snapshot/observations.json";
import countriesJSON from "@/data/snapshot/countries.json";
import mapJSON from "@/data/snapshot/map.json";
import manifest from "@/data/snapshot/manifest.json";
import type { Country, MapData, Observation, Region, Source } from "./types";

export const regions = regionsJSON as Region[];
export const observations: Observation[] = observationsJSON;
export const countries: Country[] = countriesJSON;
export const mapData: MapData = mapJSON;
export const sources: Record<string, Source> = manifest.sources;
export { manifest };

export function findRegion(query: string) {
  return regions.find((region) => region.slug === query.toLowerCase() || region.id === query.toUpperCase());
}

export function mapObservations() {
  const seen = new Set<string>();
  return observations.filter((row) => {
    const key = `${row.region}:${row.metric}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
