import type { Region } from "./types";

const radians = Math.PI / 180;

export function distanceKm(a: Region, b: Region) {
  const [lonA, latA] = a.coordinates.map((value) => value * radians);
  const [lonB, latB] = b.coordinates.map((value) => value * radians);
  const haversine = Math.sin((latB - latA) / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin((lonB - lonA) / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function nearbyRegions(region: Region, regions: Region[], limit = 5) {
  return regions.filter((item) => item.id !== region.id).map((item) => ({ region: item, distance: distanceKm(region, item) }))
    .sort((a, b) => a.distance - b.distance || a.region.name.localeCompare(b.region.name)).slice(0, limit);
}
