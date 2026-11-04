import { mkdir, readFile, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { cached } from "./cache.mjs";

const directory = "data/encyclopedia";
const regions = JSON.parse(await readFile("data/snapshot/regions.json"));
const base = "https://en.wikipedia.org/w/api.php";
const tidy = (text) => text.replace(/<[^>]*>/g, "").replaceAll("&amp;", "&").replaceAll("&#039;", "'").trim();
const revisionURL = (revision) => `https://en.wikipedia.org/wiki/Special:PermanentLink/${revision}`;
const query = (params) => `${base}?${new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params })}`;

await mkdir(directory, { recursive: true });
const pending = regions.filter((region) => !process.argv.includes("--region") || process.argv.includes(region.id));
const results = [];
async function worker() {
  while (pending.length) {
    const region = pending.shift();
    try {
      const metadata = JSON.parse(await cached(`wiki-${region.id}.json`, query({
        action: "query", prop: "extracts|revisions|pageprops|info", exintro: "1", explaintext: "1",
        exsentences: "2", redirects: "1", titles: region.wikipediaTitle, rvprop: "ids|timestamp", ppprop: "wikibase_item", inprop: "url",
      })));
      const page = metadata.query?.pages?.[0];
      const revision = page?.revisions?.[0];
      if (!revision || !page.extract?.trim() || page.missing || !page.fullurl) throw new Error("Article or extract missing");
      const payload = JSON.parse(await cached(`wiki-sections-${region.id}.json`, query({
        action: "parse", oldid: String(revision.revid), prop: "sections|revid",
      })));
      if (payload.parse?.revid !== revision.revid) throw new Error("Section data revision mismatch");
      const sections = payload.parse.sections.filter((item) => Number(item.toclevel) <= 2 && item.anchor)
        .map((item) => ({ name: tidy(item.line), anchor: item.anchor, level: Number(item.toclevel) }));
      const profile = {
        id: region.id, title: page.title, url: page.fullurl, revision: revision.revid, revisionUrl: revisionURL(revision.revid),
        revisionDate: revision.timestamp, wikidata: page.pageprops?.wikibase_item ?? null,
        license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        extract: page.extract.trim(), sections,
      };
      await writeFile(`${directory}/${region.slug}.json`, `${JSON.stringify(profile, null, 2)}\n`);
      results.push(region.id);
    } catch (error) {
      console.error(`${region.id}: ${error.message}`);
      process.exitCode = 1;
    }
    await setTimeout(250);
  }
}
await Promise.all(Array.from({ length: 3 }, worker));
console.log(`Updated ${results.length} revision-linked encyclopedia records`);
