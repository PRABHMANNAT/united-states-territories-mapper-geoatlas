import { PageHeading } from "@/components/page-heading";
import { Rankings } from "@/components/rankings";
import { mapData, observations, regions, sources } from "@/lib/data";
import { flagCatalog } from "@/lib/flag-data";
import { metricById } from "@/lib/metrics";
import { defaultRankingYear, scopes, yearsFor } from "@/lib/statistics";

export const metadata = { title: "State rankings" };

export default async function RankingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [query, flags] = await Promise.all([searchParams, flagCatalog()]);
  const metric = typeof query.metric === "string" && Object.hasOwn(metricById, query.metric) ? query.metric : "population";
  const years = yearsFor(observations, metric);
  const scope = typeof query.scope === "string" && Object.hasOwn(scopes, query.scope) ? query.scope : "states";
  const year = years.includes(Number(query.year)) ? Number(query.year) : defaultRankingYear(regions, observations, metric, scope);
  return <div className="shell inner-page"><PageHeading label="02 / STATISTICAL ATLAS" title="State rankings">Explore how jurisdictions compare within a common reference year. Change the scope to include D.C. or territories.</PageHeading>
    <Rankings key={JSON.stringify(query)} data={mapData} regions={regions} observations={observations} sources={sources} flags={flags} initial={{ metric, year, scope, order: query.order === "asc" ? "asc" : "desc", units: query.units === "imperial" ? "imperial" : "metric", view: query.view === "bars" || query.view === "map" ? query.view : "table" }}/>
  </div>;
}
