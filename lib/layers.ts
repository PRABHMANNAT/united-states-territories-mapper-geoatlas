import { metricById, thematicMetrics } from "./metrics";
import { formatValue } from "./statistics";

export const layerOptions = [
  { id: "political", name: "Political boundaries" },
  { id: "waterways", name: "Rivers & lakes" },
  ...thematicMetrics.map((id) => ({ id, name: metricById[id].name })),
  { id: "terrain", name: "Topography · unavailable" },
  { id: "satellite", name: "Satellite · provider required" },
];

const palettes = {
  light: ["#dcebf1", "#b5d7e6", "#77b4cb", "#3984a3", "#205570"],
  dark: ["#294552", "#306277", "#3d809c", "#5da5ba", "#add8e3"],
};

export function choropleth(values: Record<string, number>, metric: string, theme: "light" | "dark" = "light") {
  const sorted = Object.values(values).sort((a, b) => a - b);
  const colors = palettes[theme];
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
