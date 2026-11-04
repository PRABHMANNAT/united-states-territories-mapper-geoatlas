import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Region } from "./types";

export type Section = { name: string; anchor: string; level: number };
export type Article = {
  id: string;
  title: string;
  url: string;
  revision: number;
  revisionUrl: string;
  revisionDate: string;
  wikidata: string | null;
  license: string;
  licenseUrl: string;
  extract: string;
  sections: Section[];
};

export async function readArticle(region: Region): Promise<Article | null> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), "data", "encyclopedia", `${region.slug}.json`), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function wikipediaArticleURL(title: string) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
}

export function topicSections(article: Article, pattern: RegExp) {
  const sections = [];
  let topic = false;
  for (const item of article.sections) {
    if (item.level === 1) topic = pattern.test(item.name);
    if (topic || pattern.test(item.name)) sections.push(item);
  }
  return sections.slice(0, 8);
}
