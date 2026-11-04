import { PageHeading } from "@/components/page-heading";
import { Compare } from "@/components/compare";
import { countries, findRegion, mapData, observations, regions } from "@/lib/data";

export const metadata = { title: "Compare jurisdictions" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ regions?: string }> }) {
  const query = await searchParams;
  const ids = [...new Set((typeof query.regions === "string" ? query.regions : "").split(",").flatMap((id) => {
    const region = findRegion(id);
    return region ? [region.id] : [];
  }))].slice(0, 4);
  return <div className="shell inner-page"><PageHeading label="03 / COMPARATIVE GEOGRAPHY" title="Compare places">Put up to four jurisdictions side by side or find economies of a similar size using World Bank indicators.</PageHeading>
    <Compare key={ids.join(",")} regions={regions} silhouettes={mapData.silhouettes} observations={observations.filter((row) => row.year >= 2020)} countries={countries} initial={ids.length >= 2 ? ids : ["CA", "TX"]}/>
  </div>;
}
