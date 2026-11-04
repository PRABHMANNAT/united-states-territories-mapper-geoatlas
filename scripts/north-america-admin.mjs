import { mkdir, readFile, writeFile } from "node:fs/promises";
import { geoArea, geoCentroid, geoConicEqualArea, geoContains, geoPath } from "d3-geo";
import { cached, readShapeZip } from "./cache.mjs";

const catalog = JSON.parse(await readFile("data/north-america/catalog.json", "utf8"));
const aliases = { nly: "BES", usg: "", bqi: "", bjn: "", ser: "" };
const countries = new Map(catalog.filter((place) => !place.parent).map((place) => [aliases[place.id] ?? place.id.toUpperCase(), place.id]));
const url = "https://www.geoboundaries.org/api/current/gbOpen/ALL";
const directory = "public/datasets/north-america-admin";
const manifest = {};
const projection = geoConicEqualArea().parallels([20, 60]).rotate([96, 0]).center([0, 48]).scale(850).translate([0, 0]).precision(0.35);
const draw = geoPath(projection).digits(3);
const clean = (value) => typeof value === "string" ? value.replaceAll("\0", "").trim() : "";

function oriented(feature) {
  if (geoArea(feature) < 2 * Math.PI) return feature;
  const geometry = feature.geometry;
  const reverse = (rings) => rings.map((ring) => [...ring].reverse());
  return { ...feature, geometry: { ...geometry, coordinates: geometry.type === "Polygon" ? reverse(geometry.coordinates) : geometry.coordinates.map(reverse) } };
}

const admin1 = await readShapeZip("ne_10m_admin_1_states_provinces.zip", "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_1_states_provinces.zip");
const byCode = new Map(catalog.filter((place) => place.parent && place.code).map((place) => [place.code, place]));
const parents = new Map();
for (const feature of admin1) {
  const place = byCode.get(clean(feature.properties.iso_3166_2));
  if (!place) continue;
  const shape = oriented(feature);
  const [[left, top], [right, bottom]] = draw.bounds(shape);
  const list = parents.get(place.parent) ?? [];
  list.push({ id: place.id, shape, left, top, right, bottom });
  parents.set(place.parent, list);
}

await mkdir(directory, { recursive: true });
const queue = [];
for (const level of [2, 3]) {
  const index = JSON.parse(await cached(`na-gb-adm${level}.json`, `${url}/ADM${level}/`));
  for (const row of index) {
    const country = countries.get(row.boundaryISO);
    if (country && row.simplifiedGeometryGeoJSON) queue.push({ row, country, level });
  }
}

async function worker() {
  while (queue.length) {
    const { row, country, level } = queue.shift();
    const key = `${country}-adm${level}`;
    const source = JSON.parse(await cached(`na-gb-${row.boundaryISO}-${level}.geojson`, row.simplifiedGeometryGeoJSON));
    const items = [];
    for (const feature of source.features) {
      if (!feature.geometry || !["Polygon", "MultiPolygon"].includes(feature.geometry.type)) continue;
      const name = feature.properties.shapeName?.trim() || "Unnamed local division";
      const code = feature.properties.shapeID?.toLowerCase();
      if (!/^[a-z0-9-]{1,40}$/.test(code ?? "")) continue;
      const shape = oriented(feature);
      const path = draw(shape);
      const [[left, top], [right, bottom]] = draw.bounds(shape);
      if (!path || !Number.isFinite(left + top + right + bottom)) continue;
      const center = geoCentroid(shape);
      const [x, y] = projection(center);
      const parent = parents.get(country)?.find((candidate) => x >= candidate.left && x <= candidate.right &&
        y >= candidate.top && y <= candidate.bottom && geoContains(candidate.shape, center));
      items.push({
        id: `${key}-${code}`,
        name,
        firstLevel: parent?.id,
        path,
        box: [left, top, right, bottom].map((value) => +value.toFixed(3)),
        label: draw.centroid(shape).map((value) => +value.toFixed(3)),
      });
    }
    if (!items.length || new Set(items.map((item) => item.id)).size !== items.length) throw new Error(`Invalid layer: ${key}`);
    manifest[key] = {
      country,
      level,
      count: items.length,
      name: row.boundaryCanonical && row.boundaryCanonical !== "Unknown" ? row.boundaryCanonical : `Level ${level} divisions`,
      year: row.boundaryYearRepresented,
      source: row.boundarySource,
      license: row.boundaryLicense,
      licenseUrl: row.licenseSource,
      url: `https://www.geoboundaries.org/api/current/gbOpen/${row.boundaryISO}/ADM${level}/`,
    };
    await writeFile(`${directory}/${key}.json`, JSON.stringify(items) + "\n");
    console.log(key, items.length);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
await writeFile("data/north-america/admin-layers.json", JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2) + "\n");
