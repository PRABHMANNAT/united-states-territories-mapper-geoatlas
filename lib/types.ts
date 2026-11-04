export type RegionType = "state" | "district" | "territory" | "island";
export type Units = "metric" | "imperial";
export type Region = {
  id: string;
  slug: string;
  name: string;
  fips: string | null;
  type: RegionType;
  capital: string | null;
  coordinates: [number, number];
  censusRegion: string | null;
  wikipediaTitle: string;
  boundarySource: string;
};

export type Observation = {
  region: string;
  metric: string;
  year: number;
  value: number;
  source: string;
  margin?: number;
};

export type Country = {
  id: string;
  name: string;
  observations: Pick<Observation, "metric" | "year" | "value">[];
};

export type Source = { name: string; url: string; vintage: string };
export type Flag = {
  id: string;
  title: string;
  asset: string;
  author: string | null;
  license: string;
  licenseUrl: string | null;
  source: string;
  width: number;
  height: number;
  modification: string;
};
export type Shape = {
  path: string;
  bounds: number[];
  label: number[];
  hitBox?: number[];
  panel: string;
};
export type MapData = {
  width: number;
  height: number;
  kmPerUnit: number;
  shapes: Record<string, Shape>;
  silhouettes: Record<string, string>;
  panels: { id: string; title: string; ids: string[]; box: number[] }[];
  water: { kind: string; path: string; name: string | null }[];
};

export const regionTypeLabels: Record<RegionType, string> = {
  state: "State",
  district: "Federal district",
  territory: "Territory",
  island: "Outlying island",
};
