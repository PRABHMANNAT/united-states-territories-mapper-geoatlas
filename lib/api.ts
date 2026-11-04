import { z } from "zod";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import boundaries from "@/data/snapshot/boundaries.json";
import { countries, findRegion, manifest, observations, regions, sources } from "./data";
import { metricById, metrics } from "./metrics";
import { countryMatches, defaultRankingYear, ranked, scopes, series, yearsFor } from "./statistics";

const metric = z.string().max(40).refine((id) => Object.hasOwn(metricById, id), "Unknown metric");
const year = z.coerce.number().int().min(1900).max(2100);
const scope = z.enum(["states", "states-dc", "territories", "all"]);
const regionType = z.enum(["state", "district", "territory", "island"]);
const paging = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(65).default(25),
});
const stringRegion = z.string().min(2).max(45);
const topo = boundaries as unknown as Topology<{ regions: GeometryCollection }>;

function send(data: unknown) {
  return Response.json({ version: manifest.version, data }, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400", "Access-Control-Allow-Origin": "*" },
  });
}

function error(status: number, code: string, message: string) {
  return Response.json({ version: manifest.version, error: { code, message } }, {
    status, headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
  });
}

function paginate<T>(items: T[], { page, limit }: z.infer<typeof paging>) {
  return { items: items.slice((page - 1) * limit, page * limit), page, limit, total: items.length };
}

function input<T extends z.ZodType>(schema: T, query: Record<string, string>) {
  const result = schema.safeParse(query);
  if (!result.success) throw result.error;
  return result.data;
}

export function api(url: URL, path: string[]) {
  if (url.search.length > 2048) return error(414, "QUERY_TOO_LONG", "Query strings are limited to 2,048 characters.");
  const query = Object.fromEntries(url.searchParams);
  const route = path.join("/");
  try {
    if (route === "regions") {
      const params = input(paging.extend({ type: regionType.optional() }), query);
      return send(paginate(regions.filter((item) => !params.type || item.type === params.type), params));
    }
    if (path[0] === "regions" && (path.length === 2 || (path.length === 3 && path[2] === "metrics"))) {
      const region = findRegion(path[1]);
      if (!region) return error(404, "REGION_NOT_FOUND", "This jurisdiction could not be found.");
      if (path.length === 2) return send(region);
      const params = input(z.object({ metric: metric.optional(), year: year.optional() }), query);
      return send({ region: region.id, observations: observations.filter((row) => row.region === region.id &&
        (!params.metric || params.metric === row.metric) && (!params.year || params.year === row.year)) });
    }
    if (route === "rankings") {
      const params = input(paging.extend({ metric, scope: scope.default("states"), year: year.optional(), order: z.enum(["asc", "desc"]).default("desc") }), query);
      const years = yearsFor(observations, params.metric);
      const reference = params.year ?? defaultRankingYear(regions, observations, params.metric, params.scope);
      if (!years.includes(reference)) return error(404, "YEAR_UNAVAILABLE", "This metric has no observations for that year.");
      return send({ metric: metricById[params.metric], year: reference, scope: scopes[params.scope].label, order: params.order,
        ...paginate(ranked(regions, observations, params.metric, reference, params.scope, params.order).map((row) => ({ ...row, observation: row.observation ?? null })), params) });
    }
    if (route === "compare") {
      const params = input(z.object({
        regions: z.string().max(160).transform((value) => value.split(",").map((part) => part.trim())).pipe(z.array(stringRegion).min(2).max(4)),
        metric: metric.optional(), year: year.optional(),
      }), query);
      const selected = params.regions.map(findRegion);
      if (selected.some((item) => !item)) return error(404, "REGION_NOT_FOUND", "At least one jurisdiction could not be found.");
      const ids = selected.map((item) => item!.id);
      if (new Set(ids).size !== ids.length) return error(400, "DUPLICATE_REGION", "Comparison regions must be unique.");
      const definitions = params.metric ? [metricById[params.metric]] : metrics;
      return send({ regions: selected, metrics: definitions.map((definition) => {
        const rows = series(observations, definition.id).filter((row) => ids.includes(row.region) && row.source !== "islandCensus");
        const years = yearsFor(observations, definition.id);
        const reference = params.year ?? years.find((candidate) => ids.every((id) => rows.some((row) => row.region === id && row.year === candidate))) ?? years[0];
        return { metric: definition.id, year: reference, observations: ids.map((id) => rows.find((row) => row.region === id && row.year === reference) ?? null) };
      }) });
    }
    if (route === "boundaries") {
      const params = input(z.object({ region: stringRegion }), query);
      const region = findRegion(params.region);
      if (!region) return error(404, "REGION_NOT_FOUND", "This jurisdiction could not be found.");
      const geometry = topo.objects.regions.geometries.find((item) => item.id === region.id);
      if (!geometry) return error(404, "BOUNDARY_NOT_FOUND", "No boundary geometry is available.");
      return send({ feature: feature(topo, geometry), detail: `/datasets/regions/${region.slug}.geojson`, source: sources[region.boundarySource] });
    }
    if (route === "metadata/metrics") return send(metrics.map((definition) => ({ ...definition, years: yearsFor(observations, definition.id) })));
    if (route === "metadata/sources") return send(manifest);
    if (route === "country-matches") {
      const params = input(z.object({ region: stringRegion, metric: z.enum(["population", "gdp", "land"]),
        year: year.optional(), limit: z.coerce.number().int().min(1).max(20).default(5) }), query);
      const region = findRegion(params.region);
      if (!region) return error(404, "REGION_NOT_FOUND", "This jurisdiction could not be found.");
      const rows = series(observations, params.metric, region.id).filter((row) => row.source !== "islandCensus");
      const target = params.year ? rows.find((row) => row.year === params.year) : rows.find((row) =>
        countries.some((country) => country.observations.some((item) => item.metric === params.metric && item.year === row.year))) ?? rows[0];
      if (!target) return error(404, "OBSERVATION_NOT_FOUND", "No comparable observation is available.");
      return send({ region: region.id, target, metric: metricById[params.metric], method: "Closest year, then absolute log ratio",
        matches: countryMatches(countries, target).slice(0, params.limit).map(({ country, observation, distance }) =>
          ({ country: { id: country.id, name: country.name }, observation, distance, yearMismatch: observation.year !== target.year })) });
    }
    return error(404, "ROUTE_NOT_FOUND", "This API endpoint could not be found.");
  } catch (cause) {
    if (cause instanceof z.ZodError) return error(400, "INVALID_INPUT", cause.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", "));
    throw cause;
  }
}
