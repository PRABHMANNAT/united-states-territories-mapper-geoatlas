export type MetricUnit = "count" | "area" | "density" | "usd" | "percent" | "years" | "people";

export type Metric = {
  id: string;
  name: string;
  unit: MetricUnit;
  category: "Population" | "Geography" | "Economy" | "Housing";
  description: string;
};

const metric = (id: string, name: string, unit: MetricUnit, category: Metric["category"], description: string): Metric => ({
  id, name, unit, category, description,
});

export const metrics = [
  metric("population", "Population", "count", "Population", "July 1 resident population estimates. The 2020 island area census counts are shown on profiles and excluded from estimate rankings."),
  metric("population-growth", "Population growth", "percent", "Population", "Percentage change from the previous July 1 estimate, using a single Census vintage."),
  metric("density", "Population density", "density", "Population", "Resident population divided by 2026 TIGER/Line land area."),
  metric("median-age", "Median age", "years", "Population", "Median age of the resident population from ACS table B01002."),
  metric("degree", "Bachelor’s degree or higher", "percent", "Population", "Share of residents age 25 and over with a bachelor’s, master’s, professional, or doctoral degree. ACS B15003."),
  metric("urban", "Urban population share", "percent", "Population", "Share of the 2020 Census population living in areas classified as urban by the Census Bureau."),
  metric("area", "Total area", "area", "Geography", "TIGER/Line land area plus water area."),
  metric("land", "Land area", "area", "Geography", "TIGER/Line land area, excluding water."),
  metric("water", "Water area", "area", "Geography", "TIGER/Line water area within the statistical boundary."),
  metric("gdp", "Nominal GDP", "usd", "Economy", "Annual gross domestic product in current U.S. dollars from BEA SAGDP1 or the separate territorial accounts."),
  metric("real-gdp-growth", "Real GDP growth", "percent", "Economy", "Annual percentage change in inflation-adjusted GDP from BEA state or territory accounts."),
  metric("gdp-per-capita", "GDP per capita", "usd", "Economy", "Current-dollar GDP divided by the Census July 1 resident estimate from the same year."),
  metric("income", "Median household income", "usd", "Economy", "Median household income in the past 12 months, in survey-year dollars. ACS B19013."),
  metric("poverty", "Poverty rate", "percent", "Economy", "Share below the federal poverty threshold among people for whom poverty status was determined. ACS B17001."),
  metric("unemployment", "Unemployment rate (ACS)", "percent", "Economy", "Unemployed civilians as a share of the civilian labor force age 16 and over. ACS B23025 annual survey estimate."),
  metric("home-value", "Median home value", "usd", "Housing", "Median value of owner-occupied housing units. ACS B25077."),
  metric("homeownership", "Homeownership rate", "percent", "Housing", "Owner-occupied homes as a share of occupied housing units. ACS B25003."),
  metric("household-size", "Average household size", "people", "Housing", "Average number of people in occupied housing units. ACS B25010."),
];

export const metricById = Object.fromEntries(metrics.map((item) => [item.id, item]));
export const thematicMetrics = ["population", "density", "gdp", "gdp-per-capita", "land", "income", "population-growth"];
export const timeMetrics = ["population", "gdp", "gdp-per-capita", "real-gdp-growth", "population-growth"];
