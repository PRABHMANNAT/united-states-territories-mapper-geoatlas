export type RasterProvider = { tiles: string; attribution: string };

export function rasterProvider(tiles?: string, attribution?: string): RasterProvider | null {
  if (!tiles || !attribution?.trim() || !["{z}", "{x}", "{y}"].every((part) => tiles.includes(part))) return null;
  try {
    const url = new URL(tiles);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return { tiles, attribution: attribution.trim() };
  } catch { return null; }
}

export function mapAttribution(text: string) {
  return text.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}
