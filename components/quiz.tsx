"use client";

import { useState } from "react";
import { Check, ChevronRight, X } from "lucide-react";
import { AtlasSvg } from "./atlas-svg";
import { Shape } from "./shape";
import { ShareButton } from "./share";
import { formatValue } from "@/lib/statistics";
import type { MapData, Observation, Region } from "@/lib/types";

const modes = ["Silhouette", "Map location", "Capital", "Land area", "Population", "Census fact"] as const;
type Mode = typeof modes[number];
type Question = { correct: Region; choices: Region[]; prompt: string; metric?: string; year?: number };
const rounds = 8;

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function Quiz({ data, regions, observations }: { data: MapData; regions: Region[]; observations: Observation[] }) {
  const [mode, setMode] = useState<Mode>("Silhouette");
  const [difficulty, setDifficulty] = useState(4);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [finished, setFinished] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);

  function makeQuestion(exclude: string[]) {
    const candidates = shuffle(regions.filter((item) => !exclude.includes(item.id)));
    let correct = candidates[0];
    let choices = shuffle([correct, ...shuffle(regions.filter((item) => item.id !== correct.id)).slice(0, difficulty - 1)]);
    const metric = mode === "Land area" || mode === "Census fact" ? "land" : mode === "Population" ? "population" : undefined;
    const value = (id: string) => observations.find((row) => row.region === id && row.metric === metric)?.value ?? 0;
    let prompt = "Which state matches this outline?";
    if (mode === "Map location") prompt = "Which state is highlighted?";
    if (mode === "Capital") prompt = `What is the capital of ${correct.name}?`;
    if (mode === "Population" || mode === "Land area") {
      choices = shuffle(candidates.slice(0, difficulty));
      correct = choices.reduce((leader, item) => value(item.id) > value(leader.id) ? item : leader);
      prompt = mode === "Population" ? "Which of these states has the largest population?" : "Which of these states has the greatest land area?";
    }
    if (mode === "Census fact") prompt = `Which of these states has about ${formatValue("land", value(correct.id))} of land?`;
    setQuestion({ correct, choices, prompt, metric, year: metric === "land" ? 2026 : metric ? 2025 : undefined });
    setSeen([...exclude, correct.id]);
    setAnswer("");
  }

  function start() {
    setRound(1); setScore(0); setStreak(0); setBest(0); setFinished(false); makeQuestion([]);
  }

  function choose(id: string) {
    if (!question || answer) return;
    setAnswer(id);
    if (id === question.correct.id) {
      setScore(score + 1); setStreak(streak + 1); setBest(Math.max(best, streak + 1));
    } else setStreak(0);
  }

  return <section className="panel tool-panel quiz-panel">
    {!question || finished ? <>
      <div className="tool-summary"><div><h2>{finished ? `${score} / ${rounds} correct` : "Choose a challenge"}</h2><p>{finished ? `Longest streak: ${best}` : `${rounds} questions per round`}</p></div></div>
      <div className="controls"><label>Challenge<select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>{modes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(+event.target.value)}><option value={3}>Warm-up</option><option value={4}>Standard</option><option value={6}>Expert</option></select></label></div>
      <div className="button-row"><button className="primary-button" onClick={start}>{finished ? "Play again" : "Start quiz"} <ChevronRight size={16}/></button>
        {finished && <ShareButton url={() => { const url = new URL("/quiz", window.location.origin); url.searchParams.set("score", String(score)); return url.href; }}/>}</div>
    </> : <>
      <div className="tool-summary"><div><p className="eyebrow"><span/> QUESTION {round} / {rounds}</p><h2>{question.prompt}</h2></div><p>Score {score} · Streak {streak}</p></div>
      {mode === "Silhouette" && <div className="quiz-shape"><Shape path={data.silhouettes[question.correct.id]}/></div>}
      {mode === "Map location" && <div className="ranking-map"><AtlasSvg data={data} regions={regions} selection={[question.correct.id]} labels={false}/></div>}
      <div className="quiz-options">{question.choices.map((item) => {
        const correct = answer && item.id === question.correct.id;
        return <button key={item.id} onClick={() => choose(item.id)} disabled={Boolean(answer)} className={correct ? "correct" : item.id === answer ? "incorrect" : ""}>{mode === "Capital" ? item.capital : item.name}{correct ? <Check size={18}/> : item.id === answer ? <X size={18}/> : null}</button>;
      })}</div>
      {answer && <div className="button-row quiz-feedback"><p role="status">{answer === question.correct.id ? "Correct." : `The answer is ${mode === "Capital" ? question.correct.capital : question.correct.name}.`}</p>
        <button className="primary-button" onClick={() => { if (round === rounds) setFinished(true); else { setRound(round + 1); makeQuestion(seen); } }}>{round === rounds ? "See results" : "Next question"} <ChevronRight size={16}/></button></div>}
      {question.year && <p className="source-line">U.S. Census Bureau · {question.metric === "land" ? "TIGER/Line" : "Population Estimates Program"} · {question.year}</p>}
    </>}
  </section>;
}
