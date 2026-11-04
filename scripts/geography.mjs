import { geoAlbers, geoArea, geoCentroid, geoConicEqualArea, geoMercator, geoPath } from "d3-geo";
import { topology } from "topojson-server";
import { feature as fromTopology } from "topojson-client";
import { filter, filterWeight, presimplify, simplify, sphericalRingArea, sphericalTriangleArea } from "topojson-simplify";
import { sourceUrls } from "./sources.mjs";
import { readShapeZip } from "./cache.mjs";

const islandIds = {
  FQI: "XB", HQI: "XH", DQI: "XJ", JQI: "XT", KQI: "XK",
  MQI: "XM", BQI: "XN", LQI: "XP", WQI: "XW",
};

export const panels = [
  { id: "alaska", title: "Alaska", ids: ["AK"], box: [24, 441, 222, 98] },
  { id: "hawaii", title: "Hawaiʻi", ids: ["HI"], box: [254, 441, 157, 98] },
  { id: "caribbean", title: "Caribbean", ids: ["PR", "VI"], box: [419, 441, 171, 98] },
  { id: "marianas", title: "Mariana Islands", ids: ["MP", "GU"], box: [598, 441, 171, 98] },
  { id: "samoa", title: "American Samoa", ids: ["AS"], box: [777, 441, 159, 98] },
];

const collection = (features) => ({ type: "FeatureCollection", features });
const byId = (features) => Object.fromEntries(features.map((feature) => [feature.id, feature]));
const polygons = (geometry) => geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

// Shapefiles and d3 use clockwise exterior rings. GeoJSON downloads use RFC 7946 winding.
function orient(feature) {
  if (!feature.geometry) throw new Error(`Missing geometry for ${feature.id}`);
  if (geoArea(feature) < 2 * Math.PI) return feature;
  return reverseWinding(feature);
}

function reverseWinding(feature) {
  const geometry = feature.geometry;
  const coordinates = polygons(geometry).map((polygon) => polygon.map((ring) => [...ring].reverse()));
  return {
    ...feature,
    geometry: { ...geometry, coordinates: geometry.type === "Polygon" ? coordinates[0] : coordinates },
  };
}

function projectionFor(id, coordinates) {
  if (id === "conus") return geoAlbers().precision(0.25);
  if (id === "AK") return geoConicEqualArea().parallels([55, 65]).rotate([154, 0]).center([0, 58]);
  return geoMercator().rotate([-coordinates[0], 0]).center([0, coordinates[1]]).precision(0.25);
}

function clean(feature, id, regions, source) {
  return orient({
    type: "Feature",
    id,
    properties: { id, name: regions[id].name, source },
    geometry: feature.geometry,
  });
}

function projected(feature, path, region, projection) {
  const bounds = path.bounds(feature);
  const center = projection(region.coordinates);
  return {
    path: path(feature),
    bounds: bounds.flat().map((value) => +value.toFixed(2)),
    label: center.map((value) => +value.toFixed(2)),
  };
}

function simplified(features, triangleWeight, ringWeight) {
  const graph = presimplify(topology({ regions: collection(features) }), sphericalTriangleArea);
  const reduced = simplify(graph, triangleWeight);
  const filtered = filter(reduced, filterWeight(reduced, ringWeight, sphericalRingArea));
  return fromTopology(filtered, filtered.objects.regions).features;
}

export async function geography(regions) {
  const [overview, detail, tiger, islands, rivers, lakes] = await Promise.all([
    readShapeZip("overview.zip", sourceUrls.overview),
    readShapeZip("states.zip", sourceUrls.states),
    readShapeZip("tiger.zip", sourceUrls.tiger, true),
    readShapeZip("islands.zip", sourceUrls.islands),
    readShapeZip("rivers.zip", sourceUrls.rivers),
    readShapeZip("lakes.zip", sourceUrls.lakes),
  ]);

  const area = {};
  for (const record of tiger) {
    const region = regions[record.STUSPS];
    if (!region || record.STATEFP !== region.fips) throw new Error(`Unexpected TIGER region ${record.STUSPS}`);
    region.coordinates = [+record.INTPTLON, +record.INTPTLAT];
    region.censusRegion = ["Northeast", "Midwest", "South", "West"][Number(record.REGION) - 1] ?? null;
    area[region.id] = { land: record.ALAND / 1e6, water: record.AWATER / 1e6 };
  }

  const islandFeatures = islands.filter((row) => row.properties.ADM0_A3 === "UMI").map((row) => {
    const id = islandIds[row.properties.SU_A3];
    if (!id) throw new Error(`Unrecognized Natural Earth subunit ${row.properties.SU_A3}`);
    const feature = clean(row, id, regions, "earth");
    regions[id].coordinates = geoCentroid(feature).map((value) => +value.toFixed(6));
    return feature;
  });
  const standard = (features) => features.map((row) => clean(row, row.properties.STUSPS, regions, "cartographic"));
  const full = [...standard(detail), ...islandFeatures];
  const light = byId(simplified(standard(overview), 9e-9, 1e-10));
  const detailed = byId(full);
  const map = { width: 960, height: 555, panels, shapes: {}, silhouettes: {}, water: [] };
  const insetIds = new Set(panels.flatMap((panel) => panel.ids));
  const conus = Object.values(light).filter((row) => !insetIds.has(row.id) && regions[row.id].type !== "island");
  const mainProjection = projectionFor("conus").fitExtent([[55, 25], [909, 426]], collection(conus));
  const mainPath = geoPath(mainProjection).digits(1);

  for (const feature of conus) {
    map.shapes[feature.id] = { ...projected(feature, mainPath, regions[feature.id], mainProjection), panel: "conus" };
  }
  for (const panel of panels) {
    const features = panel.ids.map((id) => id === "AK" ? light[id] : detailed[id]);
    const [x, y, w, h] = panel.box;
    const proj = projectionFor(panel.ids[0], regions[panel.ids[0]].coordinates)
      .fitExtent([[x + 12, y + 23], [x + w - 12, y + h - 10]], collection(features));
    const path = geoPath(proj).digits(1);
    for (const feature of features) {
      map.shapes[feature.id] = { ...projected(feature, path, regions[feature.id], proj), panel: panel.id };
    }
  }

  for (const feature of full) {
    const region = regions[feature.id];
    region.boundarySource = feature.properties.source;
    const shape = region.type === "island" ? feature : light[region.id];
    const proj = projectionFor(region.id, region.coordinates).fitExtent([[5, 5], [115, 81]], shape);
    map.silhouettes[region.id] = geoPath(proj).digits(1)(shape);
  }

  const viewport = [[-128, 23], [-64, 51]];
  for (const [kind, features] of [["river", rivers], ["lake", lakes]]) {
    for (const raw of features) {
      const feature = kind === "lake" ? orient(raw) : raw;
      const [lon, lat] = geoCentroid(feature);
      if (lon < viewport[0][0] || lon > viewport[1][0] || lat < viewport[0][1] || lat > viewport[1][1]) continue;
      const path = mainPath(feature);
      if (path) map.water.push({ kind, path, name: raw.properties.name_en?.replaceAll("\0", "").trim() ?? null });
    }
  }

  for (const region of Object.values(regions)) {
    if (!map.silhouettes[region.id] || (region.type !== "island" && !map.shapes[region.id])) {
      throw new Error(`Missing projected geometry for ${region.id}`);
    }
  }
  const exported = collection(full.map(reverseWinding));
  const overviewFeatures = collection([...Object.values(light), ...islandFeatures].map(reverseWinding));
  return { area, map, exported, topology: topology({ regions: overviewFeatures }, 1e6) };
}
