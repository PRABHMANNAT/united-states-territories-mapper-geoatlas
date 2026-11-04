import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Flag } from "./types";

const directory = join(process.cwd(), "data", "flags");
const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";

export async function readFlag(slug: string): Promise<Flag | null> {
  try {
    return JSON.parse(await readFile(join(directory, `${slug}.json`), "utf8"));
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
}

export async function flagCatalog() {
  try {
    const files = await readdir(directory);
    const flags = await Promise.all(files.filter((name) => name.endsWith(".json")).map((name) => readFlag(name.slice(0, -5))));
    return Object.fromEntries(flags.flatMap((flag) => flag ? [[flag.id, flag]] : []));
  } catch (error) {
    if (missing(error)) return {};
    throw error;
  }
}
