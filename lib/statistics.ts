import { metricById } from "./metrics";
import type { Country, Observation, Region, RegionType, Units } from "./types";

export const scopes: Record<string, { label: string; types: RegionType[] }> = {
  states: { label: "50 states", types: ["state"] },
  "states-dc": { label: "50 states + D.C.", types: ["state", "district"] },
  territories: { label: "5 territories", types: ["territory"] },
  all: { label: "All 65 jurisdictions", types: ["state", "district", "territory", "island"] },
};

export function series(observations: Observation[], metric: string, id?: string) {
  return observations.filter((row) => row.metric === metric && (!id || row.region === id));
}

export function yearsFor(observations: Observation[], metric: string) {
  return [...new Set(series(observations, metric).filter((row) => row.source !== "islandCensus").map((row) => row.year))].sort((a, b) => b - a);
}

export function latest(observations: Observation[], id: string, metric: string) {
  return series(observations, metric, id).reduce<Observation | undefined>(
    (best, row) => !best || row.year > best.year ? row : best,
    undefined,
  );
}

export function ranked(regions: Region[], observations: Observation[], metric: string, year: number, scope: string, order: "asc" | "desc") {
  const selected = scopes[scope] ?? scopes.states;
  const values = new Map(series(observations, metric).filter((row) => row.year === year && row.source !== "islandCensus").map((row) => [row.region, row]));
  const rows = regions.filter((region) => selected.types.includes(region.type))
    .map((region) => ({ region, observation: values.get(region.id), rank: null as number | null }))
    .sort((a, b) => {
      const left = a.observation?.value;
      const right = b.observation?.value;
      if (left === undefined || right === undefined) {
        if (left === right) return a.region.name.localeCompare(b.region.name);
        return left === undefined ? 1 : -1;
      }
      return (order === "asc" ? left - right : right - left) || a.region.name.localeCompare(b.region.name);
    });
  let rank = 0;
  let previous: number | undefined;
  rows.forEach((row, index) => {
    if (!row.observation) return;
    if (previous !== row.observation.value) rank = index + 1;
    previous = row.observation.value;
    row.rank = rank;
  });
  return rows;
}

const number = (value: number, digits: number, compact: boolean) => new Intl.NumberFormat("en-US", {
  maximumFractionDigits: digits,
  notation: compact ? "compact" : "standard",
}).format(value);

export function formatValue(metric: string, value?: number, units: Units = "metric", compact = false) {
  if (value === undefined) return "—";
  const unit = metricById[metric]?.unit;
  const imperial = units === "imperial";
  switch (unit) {
    case "area": return `${number(imperial ? value / 2.589988110336 : value, compact ? 1 : 2, compact)} ${imperial ? "mi²" : "km²"}`;
    case "density": return `${number(imperial ? value * 2.589988110336 : value, 1, compact)} / ${imperial ? "mi²" : "km²"}`;
    case "usd": return `${value < 0 ? "−" : ""}$${number(Math.abs(value), compact ? 2 : 0, compact)}`;
    case "percent": return `${number(value, 2, false)}%`;
    case "years": return `${number(value, 1, false)} yr`;
    case "people": return `${number(value, 2, false)}`;
    default: return number(value, compact ? 1 : 0, compact);
  }
}

export function countryMatches(countries: Country[], observation: Observation) {
  return countries.filter((country) => country.id !== "USA").flatMap((country) => {
    const sameMetric = country.observations.filter((item) => item.metric === observation.metric);
    const best = [...sameMetric].sort((a, b) =>
      Math.abs(a.year - observation.year) - Math.abs(b.year - observation.year) || b.year - a.year,
    )[0];
    if (!best || observation.value <= 0 || best.value <= 0) return [];
    return [{ country, observation: best, distance: Math.abs(Math.log(best.value / observation.value)) }];
  }).sort((a, b) =>
    Math.abs(a.observation.year - observation.year) - Math.abs(b.observation.year - observation.year) ||
    a.distance - b.distance || a.country.name.localeCompare(b.country.name),
  );
}
