import { PageHeading } from "@/components/page-heading";
import { Timeline } from "@/components/timeline";
import { mapData, observations, regions } from "@/lib/data";
import { timeMetrics } from "@/lib/metrics";

export const metadata = { title: "Historical timeline" };

export default function TimelinePage() {
  return <div className="shell inner-page timeline-page"><PageHeading label="CHANGE OVER TIME" title="America, through the years.">See how people and economies move. Choose a measure, press play, and explore the story of each state.</PageHeading>
    <Timeline data={mapData} regions={regions} observations={observations.filter((row) => timeMetrics.includes(row.metric) && row.source !== "islandCensus")}/>
  </div>;
}
