import { readFile, writeFile } from "node:fs/promises";
import { cached } from "./cache.mjs";

const catalog = JSON.parse(await readFile("data/north-america/catalog.json", "utf8"));
const requests = catalog.filter((place) => place.kind !== "subdivision" || place.wikiTitle);
const batches = [];
for (let i = 0; i < requests.length; i += 15) batches.push(requests.slice(i, i + 15));
const articles = {};
let batchNumber = 0;
let cachePrefix = "na-wiki";

async function worker() {
  while (batches.length) {
    const batch = batches.shift();
    const index = batchNumber++;
    const titles = batch.map((place) => place.wikiTitle ?? place.name);
    const params = new URLSearchParams({
      action: "query", format: "json", formatversion: "2", redirects: "1",
      prop: "extracts|revisions|pageprops", exintro: "1", explaintext: "1",
      exsentences: "2", exlimit: "max", rvprop: "ids", ppprop: "wikibase_item|disambiguation", titles: titles.join("|"),
    });
    try {
      const result = JSON.parse(await cached(`${cachePrefix}-${index}.json`, `https://en.wikipedia.org/w/api.php?${params}`));
      const query = result.query;
      if (!query) throw new Error(result.error?.info ?? "No Wikipedia pages");
      const redirects = new Map([...(query.normalized ?? []), ...(query.redirects ?? [])].map(({ from, to }) => [from, to]));
      for (const [i, place] of batch.entries()) {
        let title = titles[i];
        for (let step = 0; step < 5 && redirects.has(title); step++) title = redirects.get(title);
        const page = query.pages.find((item) => item.title === title);
        const revision = page?.revisions?.[0]?.revid;
        const extract = page?.extract?.trim();
        if (!extract || !revision || page.pageprops?.disambiguation !== undefined) continue;
        if (place.wiki && page.pageprops?.wikibase_item !== place.wiki) continue;
        articles[place.id] = { title: page.title, revision, extract };
      }
    } catch (error) {
      console.error(`Wikipedia batch ${index}: ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: 3 }, worker));
const missing = catalog.filter((place) => !articles[place.id] && /^Q\d+$/.test(place.wiki ?? ""));
const resolved = [];
for (let i = 0; i < missing.length; i += 40) {
  const places = missing.slice(i, i + 40);
  const params = new URLSearchParams({ action: "wbgetentities", ids: places.map((place) => place.wiki).join("|"), props: "sitelinks", sitefilter: "enwiki", format: "json" });
  try {
    const result = JSON.parse(await cached(`na-wikidata-${i}.json`, `https://www.wikidata.org/w/api.php?${params}`));
    for (const place of places) {
      const title = result.entities?.[place.wiki]?.sitelinks?.enwiki?.title;
      if (title) resolved.push({ ...place, wikiTitle: title });
    }
  } catch (error) {
    console.error(`Wikidata batch ${i}: ${error.message}`);
  }
}
for (let i = 0; i < resolved.length; i += 15) batches.push(resolved.slice(i, i + 15));
batchNumber = 0;
cachePrefix = "na-wiki-linked";
await Promise.all(Array.from({ length: 3 }, worker));
await writeFile("data/north-america/articles.json", JSON.stringify(Object.fromEntries(Object.entries(articles).sort())) + "\n");
console.log(`Saved ${Object.keys(articles).length} verified article extracts.`);
