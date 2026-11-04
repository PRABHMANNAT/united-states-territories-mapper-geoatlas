"use client";

import { BookOpen } from "lucide-react";
import { useState } from "react";

export function Encyclopedia({ title }: { title: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "loaded">("idle");
  const [extract, setExtract] = useState("");

  async function load() {
    setStatus("loading");
    try {
      const query = new URLSearchParams({ action: "query", prop: "extracts", exintro: "1", explaintext: "1", exsentences: "3",
        redirects: "1", titles: title, format: "json", formatversion: "2", origin: "*" });
      const response = await fetch(`https://en.wikipedia.org/w/api.php?${query}`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error("Wikipedia request failed");
      const text = (await response.json()).query?.pages?.[0]?.extract;
      if (typeof text !== "string" || !text.trim()) throw new Error("Wikipedia has no extract");
      setExtract(text);
      setStatus("loaded");
    } catch { setStatus("error"); }
  }

  return <div className="encyclopedia prose">
    <h3><BookOpen size={17}/> Encyclopedia</h3>
    {status === "loaded" && <blockquote>{extract}</blockquote>}
    {status === "error" && <p role="status">The excerpt could not be loaded. See References for the article link.</p>}
    <div className="button-row">{status !== "loaded" && <button className="quiet-button" onClick={load} disabled={status === "loading"}>{status === "loading" ? "Loading excerpt…" : "Load Wikipedia excerpt"}</button>}</div>
  </div>;
}
