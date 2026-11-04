import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { unzipSync } from "fflate";
import { open, openDbf } from "shapefile";

const cacheDir = ".cache/sources";
export const inputs = {};

export async function cached(name, url) {
  const path = `${cacheDir}/${name}`;
  let bytes;
  try {
    if (!process.argv.includes("--refresh")) bytes = await readFile(path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!bytes) {
    await mkdir(cacheDir, { recursive: true });
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "StateAtlas open-data ingestion" },
          signal: AbortSignal.timeout(90_000),
        });
        if (!response.ok) {
          const error = new Error(`${response.status} loading ${url}`);
          if (response.status !== 429 && response.status < 500) error.permanent = true;
          throw error;
        }
        bytes = Buffer.from(await response.arrayBuffer());
        break;
      } catch (error) {
        if (error.permanent || attempt === 3) throw error;
        await setTimeout(1500 * 2 ** attempt);
      }
    }
    await writeFile(`${path}.part`, bytes);
    await rename(`${path}.part`, path);
  }
  inputs[name] = { url, sha256: createHash("sha256").update(bytes).digest("hex") };
  return bytes;
}

export async function readShapeZip(name, url, attributesOnly = false) {
  const archive = unzipSync(await cached(name, url), {
    filter: ({ name }) => /\.(dbf|shp)$/i.test(name) && (!attributesOnly || name.endsWith(".dbf")),
  });
  const member = (extension) => Object.entries(archive).find(([key]) => key.endsWith(extension))?.[1];
  const dbf = member(".dbf");
  const options = { encoding: "utf-8" };
  const reader = attributesOnly ? await openDbf(dbf, options) : await open(member(".shp"), dbf, options);
  const records = [];
  for (let result = await reader.read(); !result.done; result = await reader.read()) {
    records.push(result.value);
  }
  return records;
}
