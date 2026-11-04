import { PageHeading } from "@/components/page-heading";
import StateSizeComparison from "@/components/state-size-comparison";
import { observations, regions } from "@/lib/data";

export const metadata = {
  title: "Compare state sizes",
  description: "Drag one U.S. state over another at the same scale. Compare all 50 states with area-preserving outlines, zoom, and land area ratios.",
};

export default function CompareSizePage() {
  return <div className="shell inner-page size-page">
    <PageHeading label="DRAG & COMPARE" title="How big is your state?">
      Choose two states, then drag the blue outline over the gray one to compare their size. Zoom in for a closer look.
    </PageHeading>
    <section className="panel size-page-board" aria-label="Compare state sizes">
      <StateSizeComparison regions={regions.filter((region) => region.type === "state")}
        observations={observations.filter((row) => row.metric === "land")} initialId="AK"/>
    </section>
  </div>;
}
