import { z } from "zod";
import type { MapData, Region } from "./types";

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const group = z.object({ name: z.string().max(40), color });

const schema = z.object({
  version: z.literal(1),
  title: z.string().max(100),
  theme: z.enum(["mono", "paper", "midnight"]),
  background: color.optional(),
  labels: z.boolean(),
  boundaries: z.boolean(),
  groups: z.array(group).length(5),
  assignments: z.record(z.string().regex(/^[A-Z]{2}$/), z.number().int().min(0).max(4)),
  labelsByRegion: z.record(z.string().regex(/^[A-Z]{2}$/), z.string().max(24)).default({}),
});

export type MapProject = z.infer<typeof schema>;
export const defaultProject: MapProject = {
  version: 1, title: "My U.S. atlas", theme: "mono", labels: true, boundaries: true,
  groups: [
    { name: "Group 1", color: "#cb9567" }, { name: "Group 2", color: "#65a08e" },
    { name: "Group 3", color: "#7b9fc4" }, { name: "Group 4", color: "#c4ab66" },
    { name: "Group 5", color: "#b99ab1" },
  ],
  assignments: {}, labelsByRegion: {},
};

export function parseProject(raw: string | null) {
  if (!raw || raw.length > 12_000) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}

export const paintPalette = ["#18181b", "#ffffff", "#687787", "#c13b42", "#dc7427", "#ecbd3d", "#39844e", "#168e88", "#3157af", "#8252a5", "#cb6b8b", "#9a7254"];

export const projectThemes = {
  mono: { paper: "#f5f5f5", land: "#d6d6d6", edge: "#505050", ink: "#181818", muted: "#535353" },
  paper: { paper: "#f4f3e9", land: "#d4ded1", edge: "#526960", ink: "#203631", muted: "#526960" },
  midnight: { paper: "#172934", land: "#45616a", edge: "#91a9aa", ink: "#eff9f5", muted: "#b5c8c8" },
};

export function projectPalette(project: MapProject) {
  const theme = projectThemes[project.theme];
  const paper = project.background;
  if (!paper) return theme;
  const [red, green, blue] = [1, 3, 5].map((offset) => {
    const channel = parseInt(paper.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const ink = luminance > 0.179 ? "#000000" : "#ffffff";
  return { ...theme, paper, ink, muted: ink };
}

const escapeXML = (text: string) => text.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
})[character]!);

export function projectSVG(project: MapProject, data: MapData, regions: Region[]) {
  const theme = projectPalette(project);
  const filledIslands = regions.filter((region) => region.type === "island" && Object.hasOwn(project.assignments, region.id));
  const width = data.width;
  const height = data.height + (filledIslands.length ? 156 : 105);
  const colorFor = (id: string) => project.groups[project.assignments[id]]?.color ?? theme.land;
  const shapeMarkup = regions.flatMap((region) => {
    const shape = data.shapes[region.id];
    if (!shape) return [];
    const [x, y] = shape.label;
    return [`<path d="${shape.path}" fill="${colorFor(region.id)}"/>${project.labels ? `<text x="${x}" y="${y}" font-size="9" text-anchor="middle" paint-order="stroke" stroke="${theme.paper}" stroke-width="1.5">${escapeXML(project.labelsByRegion[region.id] || region.id)}</text>` : ""}`];
  }).join("");
  const panelMarkup = data.panels.map((panel) => {
    const [x, y, w, h] = panel.box;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${theme.edge}" stroke-width=".5"/><text x="${x + 10}" y="${y + 15}" font-size="10">${escapeXML(panel.title)}</text>`;
  }).join("");
  const legend = project.groups.map((group, i) => `<rect x="${24 + i * 183}" y="0" width="12" height="12" fill="${group.color}"/><text x="${41 + i * 183}" y="11" font-size="11">${escapeXML(group.name.slice(0, 27))}</text>`).join("");
  const islands = filledIslands.map((region, index) => `<g transform="translate(${24 + index * 102} 0)"><path transform="scale(.40)" d="${data.silhouettes[region.id]}" fill="${colorFor(region.id)}"/><text y="44" font-size="9">${escapeXML(project.labelsByRegion[region.id] || region.name)}</text></g>`).join("");
  const stroke = project.boundaries ? `stroke="${theme.edge}" stroke-width=".65"` : "";
  return { width, height, markup: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${escapeXML(project.title)}</title><rect width="100%" height="100%" fill="${theme.paper}"/><g fill="${theme.ink}" font-family="sans-serif"><text x="24" y="36" font-size="24" font-family="Georgia,serif">${escapeXML(project.title || "Untitled atlas")}</text><g transform="translate(0 43)">${panelMarkup}<g ${stroke}>${shapeMarkup}</g></g>${islands ? `<g transform="translate(0 ${data.height + 47})">${islands}</g>` : ""}<g transform="translate(0 ${height - 51})">${legend}</g><text x="24" y="${height - 15}" font-size="10" fill="${theme.muted}">STATEATLAS · U.S. CENSUS BUREAU &amp; NATURAL EARTH · INSETS USE SEPARATE SCALES</text></g></svg>` };
}
