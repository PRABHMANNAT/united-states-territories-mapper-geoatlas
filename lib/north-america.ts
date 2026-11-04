import adminLayers from "@/data/north-america/admin-layers.json";
import catalog from "@/data/north-america/catalog.json";

export type AtlasPlace = {
  id: string;
  name: string;
  kind: "country" | "territory" | "subdivision";
  type: string;
  parent?: string;
  region?: string;
  jurisdiction?: string;
  code?: string;
  wiki?: string;
  wikiTitle?: string;
  area: number;
  population?: number;
  populationYear?: number;
};

export type AtlasOutline = {
  path: string;
  box: [number, number, number, number];
  label: [number, number];
};
export type AtlasOutlines = Record<string, AtlasOutline>;

export const atlasPlaces = catalog as AtlasPlace[];
export const atlasById = new Map(atlasPlaces.map((place) => [place.id, place]));
export const atlasCountries = atlasPlaces.filter((place) => place.kind !== "subdivision");

export type AdminLevel = 1 | 2 | 3;
export type LocalDivision = AtlasOutline & { id: string; name: string; firstLevel?: string };
export type AdminLayer = {
  country: string;
  level: 2 | 3;
  count: number;
  name: string;
  year: string;
  source: string;
  license: string;
  licenseUrl: string;
  url: string;
};
export const atlasAdminLayers = adminLayers as Record<string, AdminLayer>;

export function divisionLayerKey(id: string) {
  const key = /^([a-z]{3}-adm[23])-[a-z0-9-]{1,40}$/.exec(id)?.[1];
  return key && Object.hasOwn(atlasAdminLayers, key) ? key : undefined;
}

export function parseAtlasScope(value?: string | string[]) {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(",").filter((id) => atlasById.has(id) || divisionLayerKey(id)))];
}

export function atlasLink(path: "/" | "/creator", ids: string[]) {
  return ids.length ? `${path}?places=${ids.join(",")}` : path;
}

export function atlasBounds(ids: string[], shapes: AtlasOutlines) {
  const boxes = ids.flatMap((id) => shapes[id] ? [shapes[id].box] : []);
  if (!boxes.length) return { x: -500, y: -350, width: 1000, height: 700 };
  const left = Math.min(...boxes.map((box) => box[0]));
  const top = Math.min(...boxes.map((box) => box[1]));
  const width = Math.max(2, Math.max(...boxes.map((box) => box[2])) - left);
  const height = Math.max(2, Math.max(...boxes.map((box) => box[3])) - top);
  const pad = Math.max(width, height) * 0.09;
  return { x: left - pad, y: top - pad, width: width + pad * 2, height: height + pad * 2 };
}

export function encyclopediaLink(place: AtlasPlace) {
  if (/^Q\d+$/.test(place.wiki ?? "")) return `https://www.wikidata.org/wiki/Special:GoToLinkedPage/enwiki/${place.wiki}`;
  if (place.wikiTitle) return `https://en.wikipedia.org/wiki/${encodeURIComponent(place.wikiTitle.replaceAll(" ", "_"))}`;
  return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(place.name)}`;
}
