import { metricById, thematicMetrics } from "./metrics";
import { formatValue } from "./statistics";

export const layerOptions = [
  { id: "political", name: "Political boundaries" },
  { id: "waterways", name: "Rivers & lakes" },
  ...thematicMetrics.map((id) => ({ id, name: metricById[id].name })),
  { id: "terrain", name: "Topographic map" },
  { id: "satellite", name: "Satellite & aerial" },
];

export const mapPalettes = {
  slate: { name: "Slate", colors: ["#dce1e6", "#c4cdd7", "#a5b2c1", "#7d8fa4"], selected: "#556e8a", thematic: ["#edf0f4", "#cbd5e1", "#94a6bc", "#5e7591", "#30445f"] },
  sage: { name: "Sage", colors: ["#dfe6dc", "#c6d4c0", "#a8bca1", "#8a9f86"], selected: "#587653", thematic: ["#edf1e8", "#d0ddc5", "#a7bf96", "#759263", "#435e37"] },
  sand: { name: "Sand", colors: ["#ede6da", "#ddd0bd", "#c7b396", "#ad9577"], selected: "#8b6e4b", thematic: ["#f2ece2", "#e2d3bc", "#c9ae88", "#a4845d", "#725334"] },
} as const;
export type MapPalette = keyof typeof mapPalettes;

export function politicalFills(regions: { id: string; censusRegion: string | null }[], palette: MapPalette, selected: string) {
  const colors = mapPalettes[palette];
  const groups = ["Northeast", "Midwest", "South", "West"];
  return Object.fromEntries(regions.map((region) => [region.id, region.id === selected ? colors.selected : region.censusRegion ? colors.colors[Math.max(0, groups.indexOf(region.censusRegion))] : "#d6d9dd"]));
}

const palettes = {
  light: mapPalettes.slate.thematic,
  dark: ["#374151", "#556476", "#7a8ca2", "#a7b6c9", "#dbe3ee"],
};

export function choropleth(values: Record<string, number>, metric: string, theme: "light" | "dark" = "light", palette?: MapPalette) {
  const sorted = Object.values(values).sort((a, b) => a - b);
  const colors = palette ? mapPalettes[palette].thematic : palettes[theme];
  if (!sorted.length) return { fills: {}, legend: [] };
  const min = sorted[0];
  const bounds = [...new Set(colors.map((_, i) => sorted[Math.ceil((i + 1) * sorted.length / colors.length) - 1]))];
  const bins = bounds.map((high, i) => ({
    high,
    color: colors[Math.round(i * (colors.length - 1) / Math.max(1, bounds.length - 1))],
  }));
  const fills = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, bins.find((bin) => value <= bin.high)!.color]));
  const legend = bins.map((bin, i) => ({
    color: bin.color,
    label: i === 0 ? `${formatValue(metric, min, "metric", true)}–${formatValue(metric, bin.high, "metric", true)}` : `≤ ${formatValue(metric, bin.high, "metric", true)}`,
  }));
  return { fills, legend };
}
