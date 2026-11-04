import { mkdir, readFile, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { cached } from "./cache.mjs";

const regions = JSON.parse(await readFile("data/snapshot/regions.json"));
const records = [];
const chunk = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
const actionURL = (host, params) => `https://${host}/w/api.php?${new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params })}`;
const tidy = (text = "") => text.replace(/<[^>]*>/g, " ").replaceAll("&amp;", "&").replaceAll("&nbsp;", " ").replace(/\s+/g, " ").trim();

for (const region of regions.filter((item) => item.type !== "island")) {
  try {
    const article = JSON.parse(await readFile(`data/encyclopedia/${region.slug}.json`));
    if (/^Q\d+$/.test(article.wikidata ?? "")) records.push({ ...region, wikidata: article.wikidata });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const candidates = [];
for (const [index, group] of chunk(records, 12).entries()) {
  const ids = group.map((item) => item.wikidata).join("|");
  const payload = JSON.parse(await cached(`flag-claims-${index}-${group[0].id}.json`, actionURL("www.wikidata.org", {
    action: "wbgetentities", ids, props: "claims",
  })));
  if (!payload.entities) throw new Error("Missing Wikidata claims");
  for (const region of group) {
    const claims = payload.entities[region.wikidata]?.claims?.P41?.filter((item) => item.rank !== "deprecated" && !item.qualifiers?.P582) ?? [];
    const statement = claims.find((item) => item.rank === "preferred") ?? claims[0];
    const filename = statement?.mainsnak?.datavalue?.value;
    if (typeof filename === "string") candidates.push({ region, title: `File:${filename}` });
  }
  await setTimeout(250);
}

await Promise.all(["data/flags", "public/flags"].map((directory) => mkdir(directory, { recursive: true })));
let count = 0;
for (const [index, group] of chunk(candidates, 10).entries()) {
  const titles = group.map((item) => item.title).join("|");
  const payload = JSON.parse(await cached(`flag-licenses-${index}-${group[0].region.id}.json`, actionURL("commons.wikimedia.org", {
    action: "query", prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "250",
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Credit", redirects: "1", titles,
  })));
  if (!payload.query?.pages) throw new Error("Commons returned no file metadata");
  const aliases = Object.fromEntries([...(payload.query.normalized ?? []), ...(payload.query.redirects ?? [])].map((item) => [item.from, item.to]));
  for (const { region, title } of group) {
    const name = aliases[aliases[title] ?? title] ?? aliases[title] ?? title;
    const page = payload.query.pages.find((item) => item.title === name);
    const file = page?.imageinfo?.[0];
    if (!file) continue;
    const license = tidy(file.extmetadata?.LicenseShortName?.value);
    const licenseUrl = file.extmetadata?.LicenseUrl?.value ?? null;
    const author = tidy(file.extmetadata?.Artist?.value || file.extmetadata?.Credit?.value);
    const publicDomain = /^public domain$/i.test(license);
    const creativeCommons = /^(CC0|CC BY(-SA)? \d(\.\d)?)$/i.test(license) && /^https?:\/\/creativecommons\.org\//i.test(licenseUrl ?? "");
    if (!publicDomain && !(creativeCommons && author)) { console.log(`${region.id}: skipped reuse terms ${license}`); continue; }
    if (!file.thumburl || !file.descriptionurl || !["thumb.wikimedia.org", "upload.wikimedia.org"].includes(new URL(file.thumburl).hostname)) continue;
    try {
      const bytes = await cached(`flag-image-${region.id}.bin`, file.thumburl);
      const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const jpg = bytes[0] === 255 && bytes[1] === 216;
      if ((!png && !jpg) || bytes.length > 500_000) throw new Error("Thumbnail is not a supported image");
      const asset = `/flags/${region.slug}.${png ? "png" : "jpg"}`;
      const attribution = {
        id: region.id, title: page.title, asset, author: author || null, license, licenseUrl, source: file.descriptionurl,
        width: file.thumbwidth, height: file.thumbheight, modification: "Wikimedia-generated thumbnail",
      };
      await writeFile(`public${asset}`, bytes);
      await writeFile(`data/flags/${region.slug}.json`, `${JSON.stringify(attribution, null, 2)}\n`);
      count++;
    } catch (error) {
      console.error(`${region.id}: ${error.message}`);
    }
    await setTimeout(200);
  }
}
console.log(`Saved ${count} flags with per-file attribution`);
