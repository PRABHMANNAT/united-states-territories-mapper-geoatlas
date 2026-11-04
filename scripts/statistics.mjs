import { readFile } from "node:fs/promises";
import { csvParse, dsvFormat } from "d3-dsv";
import { unzipSync } from "fflate";
import { cached } from "./cache.mjs";
import { acsBase, acsTables, sourceUrls, worldBankIndicators, worldBankURL } from "./sources.mjs";
import { readTerritorialGDP, readUrbanShare } from "./territory-data.mjs";

const number = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
};

export async function statistics(regions, area) {
  const observations = [];
  const index = new Map();
  const add = (region, metric, year, value, source, margin) => {
    if (value === null || !Number.isFinite(value)) return;
    const key = `${region}:${metric}:${year}`;
    if (!regions[region] || !Number.isInteger(year) || index.has(key)) throw new Error(`Invalid observation ${key}`);
    index.set(key, value);
    observations.push({ region, metric, year, value, source, ...(margin != null ? { margin } : {}) });
  };
  const find = (region, metric, year) => index.get(`${region}:${metric}:${year}`);
  const divide = (value, base) => value != null && base > 0 ? value / base : null;
  const growth = (value, base) => value != null && base > 0 ? (value / base - 1) * 100 : null;
  const fips = Object.fromEntries(Object.values(regions).filter((region) => region.fips).map((region) => [region.fips, region.id]));

  for (const [id, { land, water }] of Object.entries(area)) {
    add(id, "land", 2026, land, "tiger");
    add(id, "water", 2026, water, "tiger");
    add(id, "area", 2026, land + water, "tiger");
  }
  const [pop, gdp, acs, counts] = await Promise.all([
    cached("population.csv", sourceUrls.population),
    cached("gdp.zip", sourceUrls.gdp),
    Promise.all(acsTables.map((table) => cached(`${table}.dat`, `${acsBase}acsdt1y2025-${table}.dat`))),
    readFile("data/island-census.csv", "utf8"),
  ]);
  for (const row of csvParse(new TextDecoder("windows-1252").decode(pop))) {
    const id = fips[row.STATE];
    if (!id || row.SUMLEV !== "040") continue;
    for (let year = 2020; year <= 2025; year++) {
      const value = number(row[`POPESTIMATE${year}`]);
      add(id, "population", year, value, "pop");
      add(id, "population-growth", year, growth(value, find(id, "population", year - 1)), "derived");
    }
  }
  for (const row of csvParse(counts)) add(row.id, "population", +row.year, +row.population, "islandCensus");

  const archive = unzipSync(gdp, { filter: ({ name }) => /^SAGDP1__ALL_AREAS_/.test(name) });
  const gdpFile = Object.values(archive)[0];
  if (!gdpFile) throw new Error("SAGDP1 all-areas CSV is absent");
  for (const row of csvParse(new TextDecoder().decode(gdpFile))) {
    const id = fips[row.GeoFIPS?.replace(/[\s"]/g, "").slice(0, 2)];
    if (!id || !["1", "3"].includes(row.LineCode)) continue;
    for (let year = 1997; year <= 2025; year++) {
      const value = number(row[year]);
      if (row.LineCode === "3") add(id, "gdp", year, value === null ? null : value * 1e6, "bea");
      else add(id, "real-gdp-growth", year, growth(value, number(row[year - 1])), "derived");
    }
  }

  await Promise.all([readTerritorialGDP(add), readUrbanShare(add)]);

  for (const id of Object.keys(regions)) {
    for (let year = 2020; year <= 2025; year++) {
      const population = find(id, "population", year);
      add(id, "density", year, divide(population, area[id]?.land), "derived");
      if (regions[id].type !== "territory" || id === "PR") add(id, "gdp-per-capita", year, divide(find(id, "gdp", year), population), "derived");
    }
  }

  const acsRows = Object.fromEntries(acsTables.map((table, i) => [
    table,
    Object.fromEntries(dsvFormat("|").parse(new TextDecoder().decode(acs[i]))
      .filter((row) => /^0400000US\d\d$/.test(row.GEO_ID))
      .map((row) => [fips[row.GEO_ID.slice(-2)], row])),
  ]));
  for (const id of Object.keys(regions)) {
    const cell = (table, n, type = "E") => {
      const value = number(acsRows[table]?.[id]?.[`${table.toUpperCase()}_${type}${String(n).padStart(3, "0")}`]);
      return value !== null && value >= 0 ? value : null;
    };
    for (const [metric, table] of [
      ["income", "b19013"], ["median-age", "b01002"], ["home-value", "b25077"], ["household-size", "b25010"],
    ]) {
      add(id, metric, 2025, cell(table, 1), "acs", cell(table, 1, "M"));
    }
    for (const [metric, table, numerator, denominator] of [
      ["poverty", "b17001", [2], 1],
      ["homeownership", "b25003", [2], 1],
      ["degree", "b15003", [20, 21, 22, 23], 1],
      ["unemployment", "b23025", [5], 3],
    ]) {
      const parts = numerator.map((part) => cell(table, part));
      if (parts.some((part) => part === null)) continue;
      const ratio = divide(parts.reduce((sum, part) => sum + part, 0), cell(table, denominator));
      add(id, metric, 2025, ratio === null ? null : ratio * 100, "acs");
    }
  }
  return observations.sort((a, b) => a.metric.localeCompare(b.metric) || b.year - a.year || a.region.localeCompare(b.region));
}

export async function countries() {
  const [catalogue, ...series] = await Promise.all([
    cached("countries.json", sourceUrls.countries),
    ...Object.entries(worldBankIndicators).map(([metric, code]) => cached(`wb-${metric}.json`, worldBankURL(code))),
  ]);
  const rows = ([meta, rows]) => {
    if (!Array.isArray(rows) || Number(meta.pages) !== 1) throw new Error("Unexpected World Bank pagination");
    return rows;
  };
  const countries = Object.fromEntries(rows(JSON.parse(catalogue))
    .filter((row) => row.region.id !== "NA")
    .map((row) => [row.id, { id: row.id, name: row.name, observations: [] }]));
  Object.keys(worldBankIndicators).forEach((metric, i) => {
    for (const row of rows(JSON.parse(series[i]))) {
      const country = countries[row.countryiso3code];
      if (!country || row.obs_status === "F" || !Number.isFinite(row.value) || row.value <= 0) continue;
      country.observations.push({ metric, year: +row.date, value: row.value });
    }
  });
  return Object.values(countries).sort((a, b) => a.name.localeCompare(b.name));
}
