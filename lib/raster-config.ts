import { rasterProvider, type RasterProvider } from "./raster";

// Public Web Mercator tile services documented by USGS The National Map.
export const defaultRasterProviders: { satellite: RasterProvider; terrain: RasterProvider } = {
  satellite: {
    tiles: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",
    attribution: "USDA, USGS The National Map: Orthoimagery",
    maxZoom: 16,
    description: "USGS satellite & aerial imagery · Dates vary by location; not live.",
  },
  terrain: {
    tiles: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
    attribution: "USGS The National Map; USGS Global Ecosystems; U.S. Census Bureau; USFS; Natural Earth; U.S. Department of State; NOAA",
    maxZoom: 16,
    description: "USGS The National Map · Topography and terrain.",
  },
};

export function getRasterProviders() {
  return {
    satellite: rasterProvider(process.env.STATEATLAS_SATELLITE_TILES, process.env.STATEATLAS_SATELLITE_ATTRIBUTION) ?? defaultRasterProviders.satellite,
    terrain: rasterProvider(process.env.STATEATLAS_TOPOGRAPHIC_TILES, process.env.STATEATLAS_TOPOGRAPHIC_ATTRIBUTION) ?? defaultRasterProviders.terrain,
  };
}
