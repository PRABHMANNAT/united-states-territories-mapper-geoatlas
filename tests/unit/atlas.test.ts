import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";
import { countries, mapData, observations, regions } from "@/lib/data";
import { csv } from "@/lib/downloads";
import { choropleth } from "@/lib/layers";
import { defaultProject, parseProject, projectSVG } from "@/lib/map-project";
import { metrics } from "@/lib/metrics";
import { countryMatches, formatValue, latest, ranked } from "@/lib/statistics";

describe("regional snapshot", () => {
  it("covers 50 states, one district, five territories and nine islands", () => {
    expect(regions).toHaveLength(65);
    expect(new Set(regions.map((region) => region.slug)).size).toBe(65);
    expect(regions.filter((region) => region.type === "state")).toHaveLength(50);
    expect(regions.filter((region) => region.type === "district")).toHaveLength(1);
    expect(regions.filter((region) => region.type === "territory")).toHaveLength(5);
    expect(regions.filter((region) => region.type === "island")).toHaveLength(9);
    for (const region of regions) {
      expect(mapData.silhouettes[region.id]).toMatch(/^M/);
      expect(Math.abs(region.coordinates[0])).toBeLessThanOrEqual(180);
      expect(Math.abs(region.coordinates[1])).toBeLessThanOrEqual(90);
      if (region.type !== "island") expect(mapData.shapes[region.id].bounds.every(Number.isFinite)).toBe(true);
    }
  });

  it("has unique keys and usable data for all 18 metrics", () => {
    expect(metrics).toHaveLength(18);
    expect(new Set(observations.map((item) => `${item.region}:${item.metric}:${item.year}`)).size).toBe(observations.length);
    for (const definition of metrics) expect(observations.some((item) => item.metric === definition.id)).toBe(true);
    expect(latest(observations, "CA", "degree")?.value).toBeCloseTo(38.799, 2);
    expect(latest(observations, "CA", "urban")?.value).toBeCloseTo(94.2366, 3);
  });
});

describe("statistical operations", () => {
  it("orders numerically in each direction and keeps missing data outside the ranks", () => {
    expect(ranked(regions, observations, "population", 2025, "states", "desc")[0].region.id).toBe("CA");
    expect(ranked(regions, observations, "population", 2025, "states", "asc")[0].region.id).toBe("WY");
    expect(ranked(regions, observations, "population", 2025, "all", "asc").at(-1)?.rank).toBeNull();
  });

  it("gives tied observations a shared competition rank", () => {
    const items = [{ region: "CA", value: 10 }, { region: "TX", value: 10 }, { region: "NY", value: 5 }]
      .map((row) => ({ ...row, year: 2025, metric: "population", source: "test" }));
    expect(ranked(regions, items, "population", 2025, "states", "desc").slice(0, 3).map((item) => item.rank)).toEqual([1, 1, 3]);
  });

  it("calculates density with Census land area and converts both area and density", () => {
    const land = latest(observations, "CA", "land")!.value;
    const population = latest(observations, "CA", "population")!.value;
    expect(latest(observations, "CA", "density")?.value).toBeCloseTo(population / land);
    expect(formatValue("land", 2.589988110336, "imperial")).toBe("1 mi²");
    expect(formatValue("density", 1, "imperial")).toBe("2.6 / mi²");
  });

  it("matches country observations by metric and prioritizes year compatibility", () => {
    const target = latest(observations, "CA", "gdp")!;
    const matches = countryMatches(countries, target);
    expect(matches.length).toBeGreaterThan(100);
    expect(matches[0].observation.metric).toBe("gdp");
    expect(matches[0].observation.year).toBe(target.year);
    expect(matches.every((match) => match.country.id !== "USA")).toBe(true);
  });

  it("handles equal values in a choropleth without duplicating legend bins", () => {
    const chart = choropleth({ CA: 0, TX: 0 }, "population-growth");
    expect(chart.legend).toHaveLength(1);
    expect(chart.fills.CA).toBe(chart.fills.TX);
  });
});

describe("exports", () => {
  it("quotes commas, line breaks and double quotes in CSV", () => {
    expect(csv([["A, B", 'He said "yes"', "first\nsecond", 0]])).toBe('"A, B","He said ""yes""","first\nsecond",0\r\n');
  });

  it("rejects arbitrary colors and escapes map titles and legend labels", () => {
    expect(parseProject(JSON.stringify(defaultProject))).toEqual(defaultProject);
    expect(parseProject(JSON.stringify({ ...defaultProject, groups: [{ name: "X", color: "url(evil)" }] }))).toBeNull();
    const result = projectSVG({ ...defaultProject, title: "<Study & report>" }, mapData, regions);
    expect(result.markup).toContain("&lt;Study &amp; report&gt;");
    expect(result.markup).not.toContain("<Study");
  });
});

describe("API", () => {
  const request = (path: string) => {
    const url = new URL(path, "https://stateatlas.example");
    return api(url, url.pathname.split("/").slice(3));
  };
  it("paginates regions and includes a version and cache headers", async () => {
    const response = request("/api/v1/regions?type=island&limit=3&page=2");
    expect(response.headers.get("Cache-Control")).toContain("s-maxage");
    const result = await response.json();
    expect(result.version).toBeTruthy();
    expect(result.data.items).toHaveLength(3);
    expect(result.data.total).toBe(9);
  });
  it("rejects invalid ranking inputs and duplicate comparisons", async () => {
    expect(request("/api/v1/rankings?metric=constructor").status).toBe(400);
    expect(request("/api/v1/compare?regions=CA,california").status).toBe(400);
    expect(request("/api/v1/regions/atlantis").status).toBe(404);
  });
  it("returns a projected-source boundary and the detailed download location", async () => {
    const { data } = await request("/api/v1/boundaries?region=california").json();
    expect(data.feature.id).toBe("CA");
    expect(data.feature.geometry.coordinates.length).toBeGreaterThan(0);
    expect(data.detail).toBe("/datasets/regions/california.geojson");
  });
});
