import { PageHeading } from "@/components/page-heading";
import { Quiz } from "@/components/quiz";
import { mapData, observations, regions } from "@/lib/data";

export const metadata = { title: "Geography quiz" };

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ score?: string }> }) {
  const { score } = await searchParams;
  return <div className="shell inner-page"><PageHeading label="06 / FIELD PRACTICE" title="Know your geography?">Test your knowledge of U.S. outlines, capitals, locations and Census statistics.</PageHeading>
    {typeof score === "string" && /^[0-8]$/.test(score) && <p className="quiz-shared">Shared result · {score} out of 8 correct</p>}
    <Quiz data={mapData} regions={regions.filter((region) => region.type === "state")} observations={observations.filter((row) => (row.metric === "population" && row.year === 2025) || row.metric === "land")}/>
  </div>;
}
