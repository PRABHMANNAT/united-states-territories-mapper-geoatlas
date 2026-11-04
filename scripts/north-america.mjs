import { mkdir, writeFile } from "node:fs/promises";
import { geoArea, geoConicEqualArea, geoPath } from "d3-geo";
import { readShapeZip } from "./cache.mjs";

const sovereign = new Set("ATG BHS BLZ BRB CAN CRI CUB DMA DOM GRD GTM HTI HND JAM KNA LCA MEX NIC PAN SLV USA VCT TTO".split(" "));
const projection = geoConicEqualArea().parallels([20, 60]).rotate([96, 0]).center([0, 48]).scale(850).translate([0, 0]).precision(0.35);
const path = geoPath(projection).digits(1);

const read = (name) => readShapeZip(`${name}.zip`, `https://naturalearth.s3.amazonaws.com/10m_cultural/${name}.zip`);
const clean = (value) => typeof value === "string" ? value.replaceAll("\0", "").trim() : value;
const slug = (name) => name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const text = (value) => typeof value === "string" && value && value !== "-99" ? value : undefined;

function orient(feature) {
  if (geoArea(feature) < 2 * Math.PI) return feature;
  const reverse = (rings) => rings.map((ring) => [...ring].reverse());
  const geometry = feature.geometry;
  return { ...feature, geometry: {
    type: geometry.type,
    coordinates: geometry.type === "Polygon" ? reverse(geometry.coordinates) : geometry.coordinates.map(reverse),
  } };
}

const [units, divisions] = await Promise.all([read("ne_10m_admin_0_map_units"), read("ne_10m_admin_1_states_provinces")]);
const catalog = [];
const shapes = {};
const seenSovereign = new Set();
const parents = new Map();
const splitCountries = new Map();

function add(feature, entry) {
  const shape = orient(feature);
  const [[x0, y0], [x1, y1]] = path.bounds(shape);
  const geometry = path(shape);
  if (!geometry || !Number.isFinite(x0 + y0 + x1 + y1)) throw new Error(`Missing shape: ${entry.id}`);
  const [cx, cy] = path.centroid(shape);
  const box = [x0, y0, x1, y1].map((n) => +n.toFixed(2));
  if (shapes[entry.id]) throw new Error(`Duplicate map ID: ${entry.id}`);
  shapes[entry.id] = { path: geometry, box, label: [cx, cy].map((n) => +n.toFixed(2)) };
  catalog.push({ ...entry, area: Math.round(geoArea(shape) * 6371 ** 2) });
}

for (const feature of units) {
  const row = Object.fromEntries(Object.entries(feature.properties).map(([key, value]) => [key.toUpperCase(), clean(value)]));
  if (row.CONTINENT !== "North America") continue;
  const id = row.GU_A3.toLowerCase();
  const country = sovereign.has(row.ADM0_A3);
  if (country && row.GU_A3 !== row.ADM0_A3) {
    const parts = splitCountries.get(row.ADM0_A3) ?? [];
    parts.push({ feature, row });
    splitCountries.set(row.ADM0_A3, parts);
    parents.set(row.GU_A3, row.ADM0_A3.toLowerCase());
    continue;
  }
  if (country) seenSovereign.add(row.ADM0_A3);
  parents.set(row.GU_A3, id);
  add(feature, {
    id,
    name: text(row.NAME_EN) ?? row.NAME,
    kind: country ? "country" : "territory",
    type: country ? "Sovereign country" : "Territory or map unit",
    region: text(row.SUBREGION),
    code: text(row.ISO_A2),
    jurisdiction: country ? undefined : text(row.SOVEREIGNT),
    wiki: text(row.WIKIDATAID),
    population: row.POP_EST >= 0 && row.POP_YEAR > 1900 ? row.POP_EST : undefined,
    populationYear: row.POP_EST >= 0 && row.POP_YEAR > 1900 ? row.POP_YEAR : undefined,
  });
}

for (const [code, parts] of splitCountries) {
  if (seenSovereign.has(code)) throw new Error(`Unexpected additional map units for ${code}`);
  const id = code.toLowerCase();
  parents.set(code, id);
  seenSovereign.add(code);
  const coordinates = parts.flatMap(({ feature }) => feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates);
  add({ type: "Feature", geometry: { type: "MultiPolygon", coordinates } }, {
    id, name: parts[0].row.ADMIN, kind: "country", type: "Sovereign country", region: parts[0].row.SUBREGION,
    code: code === "ATG" ? "AG" : undefined,
  });
}

for (const feature of divisions) {
  const row = Object.fromEntries(Object.entries(feature.properties).map(([key, value]) => [key.toUpperCase(), clean(value)]));
  const parent = parents.get(row.GU_A3) ?? parents.get(row.ADM0_A3);
  if (!parent || !text(row.NAME)) continue;
  const code = text(row.ISO_3166_2);
  const suffix = code ? code.split("-").slice(1).join("-") : slug(row.NAME);
  const proposed = `${parent}-${slug(suffix || row.NAME)}`;
  const id = shapes[proposed] ? `${parent}-${slug(row.ADM1_CODE)}` : proposed;
  const title = text(row.WIKIPEDIA)?.match(/^https?:\/\/en\.wikipedia\.org\/wiki\/(.+)$/)?.[1];
  add(feature, {
    id,
    parent,
    name: text(row.NAME_EN) ?? row.NAME,
    kind: "subdivision",
    type: text(row.TYPE_EN) ?? "Subdivision",
    region: text(row.REGION),
    code,
    wiki: text(row.WIKIDATAID),
    wikiTitle: title ? decodeURIComponent(title).replaceAll("_", " ") : undefined,
  });
}

const missing = [...sovereign].filter((code) => !seenSovereign.has(code));
if (missing.length) throw new Error(`Missing sovereign countries: ${missing.join(", ")}`);
catalog.sort((a, b) => a.name.localeCompare(b.name));
await mkdir("data/north-america", { recursive: true });
await writeFile("data/north-america/catalog.json", JSON.stringify(catalog) + "\n");
await writeFile("public/datasets/north-america-shapes.json", JSON.stringify(shapes) + "\n");
for (const kind of ["country", "territory", "subdivision"]) console.log(kind, catalog.filter((place) => place.kind === kind).length);
console.log(catalog.filter((place) => place.kind !== "subdivision").map((place) => place.name).join(", "));
