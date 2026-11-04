import { mkdir, readFile, writeFile } from "node:fs/promises";
import { csvFormat, tsvParse } from "d3-dsv";
import { inputs } from "./cache.mjs";
import { geography } from "./geography.mjs";
import { countries, statistics } from "./statistics.mjs";
import { sources } from "./sources.mjs";

const wikiTitles = {
  GA: "Georgia (U.S. state)", NY: "New York (state)", WA: "Washington (state)",
  DC: "Washington, D.C.", VI: "United States Virgin Islands",
};

const registry = tsvParse(await readFile("data/jurisdictions.tsv", "utf8"));
const regions = Object.fromEntries(registry.map((row) => [row.id, {
  ...row,
  fips: row.fips || null,
  capital: row.capital || null,
  wikipediaTitle: wikiTitles[row.id] ?? row.name,
}]));
if (Object.keys(regions).length !== 65 || registry.filter((row) => row.type === "state").length !== 50 ||
    new Set(registry.map((row) => row.slug)).size !== registry.length) {
  throw new Error("Jurisdiction registry is incomplete or contains duplicate identifiers");
}

const [geo, world] = await Promise.all([geography(regions), countries()]);
const observations = await statistics(regions, geo.area);
const snapshot = {
  version: process.env.STATEATLAS_DATA_VERSION ?? "2026-11-04",
  sources,
  inputs: Object.fromEntries(Object.entries(inputs).sort(([a], [b]) => a.localeCompare(b))),
};

for (const dir of ["data/snapshot", "public/datasets", "public/datasets/regions"]) await mkdir(dir, { recursive: true });
const json = (path, data) => writeFile(path, `${JSON.stringify(data)}\n`);
await Promise.all([
  json("data/snapshot/regions.json", Object.values(regions)),
  json("data/snapshot/map.json", geo.map),
  json("data/snapshot/boundaries.json", geo.topology),
  json("data/snapshot/observations.json", observations),
  json("data/snapshot/countries.json", world),
  json("data/snapshot/manifest.json", snapshot),
  json("public/datasets/regions.topojson", geo.topology),
  json("public/datasets/regions.json", Object.values(regions)),
  json("public/datasets/manifest.json", snapshot),
  json("public/datasets/observations.json", observations),
  json("public/datasets/countries.json", world),
  writeFile("public/datasets/observations.csv", `${csvFormat(observations, ["region", "metric", "year", "value", "source", "margin"])}\n`),
  ...geo.exported.features.map((feature) => json(`public/datasets/regions/${regions[feature.id].slug}.geojson`, feature)),
]);
console.log(`StateAtlas ${snapshot.version}: ${registry.length} regions, ${observations.length} observations, ${world.length} World Bank economies`);
