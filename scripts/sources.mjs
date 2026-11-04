export const sourceUrls = {
  overview: "https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_state_5m.zip",
  states: "https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_state_500k.zip",
  tiger: "https://www2.census.gov/geo/tiger/TIGER2026/STATE/tl_2026_us_state.zip",
  population: "https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/state/totals/NST-EST2025-ALLDATA.csv",
  islandCensus: "https://www.census.gov/newsroom/press-kits/2021/2020-census-island-area-press-kit.html",
  gdp: "https://apps.bea.gov/regional/zip/SAGDP.zip",
  islands: "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_0_map_subunits.zip",
  lakes: "https://naturalearth.s3.amazonaws.com/50m_physical/ne_50m_lakes.zip",
  rivers: "https://naturalearth.s3.amazonaws.com/50m_physical/ne_50m_rivers_lake_centerlines.zip",
  countries: "https://api.worldbank.org/v2/country?format=json&per_page=400",
  urban: "https://www2.census.gov/geo/docs/reference/ua/State_Urban_Rural_Pop_2020_2010.xlsx",
  puertoRico: "https://apps.bea.gov/regional/zip/PRGDP.zip",
};

export const territoryWorkbooks = {
  AS: ["American Samoa", "2023-10/asgdp1023.xlsx"],
  GU: ["Guam", "2024-04/gugdp0424.xlsx"],
  MP: ["Northern Mariana Islands", "2024-11/cngdp1124.xlsx"],
  VI: ["U.S. Virgin Islands", "2024-06/vigdp0624.xlsx"],
};
export const territoryURL = (path) => `https://www.bea.gov/sites/default/files/${path}`;

export const acsBase = "https://www2.census.gov/programs-surveys/acs/summary_file/2025/table-based-SF/data/1YRData/";
export const acsTables = ["b19013", "b17001", "b01002", "b25077", "b25003", "b15003", "b25010", "b23025"];

export const worldBankIndicators = {
  population: ["SP.POP.TOTL", "2024:2025"],
  gdp: ["NY.GDP.MKTP.CD", "2024:2025"],
  land: ["AG.LND.TOTL.K2", "2023:2024"],
};

export const worldBankURL = ([code, years]) =>
  `https://api.worldbank.org/v2/country/all/indicator/${code}?date=${years}&format=json&per_page=700`;

export const sources = {
  cartographic: { name: "Census cartographic boundaries", url: sourceUrls.states, vintage: "2025 · 1:500,000" },
  tiger: { name: "Census TIGER/Line", url: sourceUrls.tiger, vintage: "2026" },
  pop: { name: "Census Population Estimates Program", url: sourceUrls.population, vintage: "Vintage 2025" },
  islandCensus: { name: "Census Island Areas Censuses", url: sourceUrls.islandCensus, vintage: "2020 decennial count" },
  bea: { name: "BEA GDP by State (SAGDP1)", url: "https://www.bea.gov/data/gdp/gdp-state", vintage: "Annual series through 2025" },
  acs: { name: "Census American Community Survey", url: acsBase, vintage: "2025 ACS 1-year estimates" },
  urban: { name: "Census Urban and Rural Classification", url: sourceUrls.urban, vintage: "2020 Census" },
  beaPR: { name: "BEA Puerto Rico GDP bulk archive", url: sourceUrls.puertoRico, vintage: "Archived annual series through 2022" },
  ...Object.fromEntries(Object.entries(territoryWorkbooks).map(([id, [name, path]]) => [
    `bea${id}`, { name: `BEA GDP for ${name}`, url: territoryURL(path), vintage: "Territorial annual estimates through 2022" },
  ])),
  derived: { name: "StateAtlas calculation", url: "/data#methodology", vintage: "See observation and metric definition" },
  earth: { name: "Natural Earth", url: "https://www.naturalearthdata.com/about/terms-of-use/", vintage: "1:10m subunits · 1:50m hydrography" },
  world: { name: "World Bank World Development Indicators", url: "https://databank.worldbank.org/source/world-development-indicators", vintage: "Observation years 2023–2025" },
};
