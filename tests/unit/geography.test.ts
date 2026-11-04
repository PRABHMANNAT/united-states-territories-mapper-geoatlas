import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapData, observations, regions } from "@/lib/data";
import { distanceKm, nearbyRegions } from "@/lib/geography";
import { mapAttribution, rasterProvider } from "@/lib/raster";
import { defaultRankingYear, ranked } from "@/lib/statistics";

describe("boundary files", () => {
  it("exports closed rings in longitude and latitude for every jurisdiction", () => {
    for (const region of regions) {
      const path = new URL(`../../public/datasets/regions/${region.slug}.geojson`, import.meta.url);
      const feature = JSON.parse(readFileSync(path, "utf8"));
      expect(feature.id).toBe(region.id);
      const { type, coordinates } = feature.geometry;
      expect(["Polygon", "MultiPolygon"]).toContain(type);
      const rings: number[][][] = (type === "Polygon" ? [coordinates] : coordinates).flat();
      expect(rings.length).toBeGreaterThan(0);
      for (const ring of rings) {
        if (ring.length < 4 || ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1]) {
          throw new Error(`Unclosed GeoJSON ring for ${region.slug}`);
        }
        if (ring.some(([lon, lat]) => !Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90)) {
          throw new Error(`Invalid coordinate for ${region.slug}`);
        }
      }
    }
  });

  it("gives small territories large independent selection targets", () => {
    expect(mapData.kmPerUnit).toBeGreaterThan(0);
    for (const id of ["GU", "MP", "AS", "PR", "VI"]) {
      const shape = mapData.shapes[id];
      expect(shape.hitBox?.[2]).toBeGreaterThan(80);
      expect(shape.hitBox?.[3]).toBeGreaterThan(55);
    }
    expect(mapData.shapes.GU.hitBox?.[0]).not.toBe(mapData.shapes.MP.hitBox?.[0]);
  });

  it("computes symmetric geographic distance and orders nearby places", () => {
    const dc = regions.find((item) => item.id === "DC")!;
    const maryland = regions.find((item) => item.id === "MD")!;
    expect(distanceKm(dc, maryland)).toBeCloseTo(distanceKm(maryland, dc));
    expect(distanceKm(dc, dc)).toBe(0);
    expect(nearbyRegions(dc, regions, 2)[0].region.id).toBe("MD");
  });
});

describe("territorial and imagery coverage", () => {
  it("defaults territorial GDP to a year where all five observations can be compared", () => {
    const year = defaultRankingYear(regions, observations, "gdp", "territories");
    expect(year).toBe(2022);
    expect(ranked(regions, observations, "gdp", year, "territories", "desc").filter((row) => row.rank)).toHaveLength(5);
  });

  it("requires HTTPS, all XYZ placeholders, and provider attribution", () => {
    expect(rasterProvider("https://tiles.example.org/{z}/{x}/{y}.jpg", "Provider")).toEqual({
      tiles: "https://tiles.example.org/{z}/{x}/{y}.jpg", attribution: "Provider",
    });
    expect(rasterProvider("http://tiles.example.org/{z}/{x}/{y}.jpg", "Provider")).toBeNull();
    expect(rasterProvider("https://tiles.example.org/{x}/{y}.jpg", "Provider")).toBeNull();
    expect(rasterProvider("https://tiles.example.org/{z}/{x}/{y}.jpg", " ")).toBeNull();
    expect(mapAttribution("A & <B>")).toBe("A &amp; &lt;B&gt;");
  });
});
