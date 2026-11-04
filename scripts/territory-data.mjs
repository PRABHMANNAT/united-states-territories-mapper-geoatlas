import { readSheet } from "read-excel-file/node";
import { csvParse } from "d3-dsv";
import { unzipSync } from "fflate";
import { cached } from "./cache.mjs";
import { sourceUrls, territoryURL, territoryWorkbooks } from "./sources.mjs";

export async function readTerritorialGDP(add) {
  await Promise.all(Object.entries(territoryWorkbooks).map(async ([id, [, path]]) => {
    const bytes = await cached(`bea-${id}.xlsx`, territoryURL(path));
    for (const [sheet, title, metric, scale] of [[1, "Table 1.1.", "gdp", 1e6], [3, "Table 1.3.", "real-gdp-growth", 1]]) {
      const rows = await readSheet(bytes, sheet);
      const yearIndex = rows.findIndex(([label]) => label === "Line");
      const years = rows[yearIndex];
      const values = rows[yearIndex + 1];
      if (!rows.some(([label]) => String(label).startsWith(title)) || yearIndex === -1 || values?.[0] !== 1 ||
          !String(values[1]).replace(/\s+/g, " ").trim().startsWith("Gross domestic product")) {
        throw new Error(`Unexpected BEA territory workbook layout for ${id} ${sheet}`);
      }
      years.forEach((heading, index) => {
        const reference = String(heading).match(/^(20\d{2})[rp]?$/);
        if (reference && typeof values[index] === "number") add(id, metric, +reference[1], values[index] * scale, `bea${id}`);
      });
    }
  }));

  const files = unzipSync(await cached("PRGDP.zip", sourceUrls.puertoRico), {
    filter: ({ name }) => /^PRGDP1-[13]_PR_.*\.csv$/.test(name),
  });
  for (const [table, metric, scale] of [["PRGDP1-1", "gdp", 1e6], ["PRGDP1-3", "real-gdp-growth", 1]]) {
    const member = Object.entries(files).find(([name]) => name.startsWith(table + "_"));
    if (!member) throw new Error(`Missing Puerto Rico table ${table}`);
    const row = csvParse(new TextDecoder().decode(member[1])).find((item) => item.LineCode === "1");
    if (!row) throw new Error(`Missing GDP line in ${table}`);
    for (const [year, value] of Object.entries(row)) {
      if (/^20\d{2}$/.test(year) && value && Number.isFinite(+value)) add("PR", metric, +year, +value * scale, "beaPR");
    }
  }
}

export async function readUrbanShare(add) {
  const [headings, ...rows] = await readSheet(await cached("urban.xlsx", sourceUrls.urban), 1);
  const index = headings.indexOf("2020 PCT URBAN POP");
  if (headings[1] !== "STATE ABBREV" || index === -1) throw new Error("Unexpected Census urban share workbook layout");
  for (const row of rows) {
    if (/^[A-Z]{2}$/.test(row[1]) && typeof row[index] === "number") add(row[1], "urban", 2020, row[index], "urban");
  }
}
