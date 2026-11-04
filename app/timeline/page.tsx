import { PageHeading } from "@/components/page-heading";
import { Timeline } from "@/components/timeline";
import { mapData, observations, regions } from "@/lib/data";
import { timeMetrics } from "@/lib/metrics";

export const metadata = { title: "Historical timeline" };

export default function TimelinePage() {
  return <div className="shell inner-page"><PageHeading label="05 / CHANGE OVER TIME" title="The American timeline">Play through annual population and economic observations. The map uses present-day outlines for every year.</PageHeading>
    <Timeline data={mapData} regions={regions} observations={observations.filter((row) => timeMetrics.includes(row.metric) && row.source !== "islandCensus")}/>
  </div>;
}
