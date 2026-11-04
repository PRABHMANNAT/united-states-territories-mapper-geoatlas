"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, BarChart3, Compass, Database, GraduationCap, History, House, Layers3, Map, Menu, Search, Columns2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { metrics } from "@/lib/metrics";
import type { Region } from "@/lib/types";

export const nav = [
  { href: "/", title: "Overview", icon: House },
  { href: "/map", title: "Atlas", icon: Map },
  { href: "/rankings", title: "Rankings", icon: BarChart3 },
  { href: "/compare", title: "Compare", icon: Columns2 },
  { href: "/creator", title: "Map creator", icon: Layers3 },
  { href: "/timeline", title: "Timeline", icon: History },
  { href: "/quiz", title: "Geography quiz", icon: GraduationCap },
  { href: "/data", title: "Data & sources", icon: Database },
];

const github = "https://github.com/PRABHMANNAT/united-states-territories-mapper-geoatlas";

export function Brand() {
  return <Link href="/" className="brand" aria-label="StateAtlas home"><span className="brand-icon"><Compass size={24} strokeWidth={1.6} /></span><span>State<span>Atlas</span><small>AN AMERICAN ATLAS</small></span></Link>;
}

type Result = { name: string; detail: string; href: string; keys?: string };
const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9 ]/g, "").trim();

function searchRank(item: Result, query: string) {
  if (!query) return 0;
  const name = normalize(item.name);
  const keys = normalize(item.keys ?? "");
  if (name === query || keys.split(" ").includes(query)) return 0;
  if (name.startsWith(query)) return 1;
  if (`${name} ${keys}`.includes(query)) return 2;
  let offset = 0;
  for (const letter of query) {
    const next = name.indexOf(letter, offset);
    if (next === -1) return Infinity;
    offset = next + 1;
  }
  return 3 + (name.length - query.length) / 100;
}

export function Navigation({ regions }: { regions: Region[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  function open() {
    setMenuOpen(false);
    setQuery("");
    setIndex(0);
    if (!dialog.current?.open) dialog.current?.showModal();
    input.current?.focus();
  }

  useEffect(() => {
    function handle(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      if (dialog.current?.open) dialog.current.close();
      else open();
    }
    window.addEventListener("keydown", handle);
    window.addEventListener("atlas-search", open);
    return () => {
      window.removeEventListener("keydown", handle);
      window.removeEventListener("atlas-search", open);
    };
  }, []);

  const options: Result[] = [
    ...nav.map((item) => ({ name: item.title, detail: "Page", href: item.href })),
    { name: "Largest state", detail: "Land area ranking", href: "/rankings?metric=land" },
    { name: "Rivers and lakes", detail: "Map layer", href: "/map?layer=waterways" },
    ...metrics.map((item) => ({ name: item.name, detail: "Ranking", href: `/rankings?metric=${item.id}` })),
    ...regions.map((region) => ({ name: region.name, detail: region.capital ?? "Island", href: `/regions/${region.slug}`, keys: `${region.id} ${region.capital ?? ""}` })),
  ];
  const comparison = query.match(/^compare\s+(.+)\s+(?:and|vs\.?|with)\s+(.+)$/i);
  if (comparison) {
    const find = (key: string) => regions.find((region) => [region.name, region.id].some((value) => normalize(value) === normalize(key)));
    const a = find(comparison[1]);
    const b = find(comparison[2]);
    if (a && b && a !== b) options.unshift({ name: query, detail: "Comparison", href: `/compare?regions=${a.id},${b.id}` });
  }
  const matches = options.map((item) => ({ item, rank: searchRank(item, normalize(query)) }))
    .filter((row) => Number.isFinite(row.rank)).sort((a, b) => a.rank - b.rank).slice(0, 8).map((row) => row.item);
  function go(href: string) {
    dialog.current?.close();
    router.push(href);
  }

  return <>
    <header className={`site-header${menuOpen ? " menu-open" : ""}`}><div className="header-inner">
      <Brand />
      <button ref={menuButton} className="mobile-menu icon-button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22}/> : <Menu size={22}/>}</button>
      <nav id="primary-navigation" aria-label="Main navigation" onKeyDown={(event) => { if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); } }}>
        {nav.map(({ href, title, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setMenuOpen(false)}><Icon size={18} strokeWidth={1.7}/><span>{title}</span></Link>)}
      </nav>
      <div className="header-tools">
        <button className="icon-button header-search" onClick={open} aria-label="Search the atlas" title="Search places & tools (Ctrl/Cmd K)"><Search size={18}/></button>
      </div>
    </div></header>
    <dialog ref={dialog} className="command-dialog" aria-labelledby="command-title" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="command-inner">
        <h2 className="sr-only" id="command-title">Search StateAtlas</h2>
        <div className="command-field"><Search size={21} /><input ref={input} placeholder="Search states, capitals, statistics…" value={query} aria-label="Search StateAtlas" onChange={(event) => { setQuery(event.target.value); setIndex(0); }} onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setIndex((active) => Math.max(0, Math.min(matches.length - 1, active + (event.key === "ArrowDown" ? 1 : -1))));
          }
          if (event.key === "Enter" && matches[index]) go(matches[index].href);
        }} /><button onClick={() => dialog.current?.close()} className="quiet-button">Esc</button></div>
        <div className="command-results">{matches.length ? matches.map((item, i) => <button key={item.href} onClick={() => go(item.href)} className={i === index ? "highlighted" : ""}>
          <span>{item.name}<small>{item.detail}</small></span><ArrowRight size={15}/>
        </button>) : <p>No results. Try a state abbreviation or a metric.</p>}</div>
      </div>
    </dialog>
  </>;
}

export function Footer() {
  return <footer className="site-footer"><div className="shell footer-inner"><Brand /><p>An open, source-linked atlas of the United States.</p><nav aria-label="More atlas tools"><Link href="/quiz">Quiz</Link><Link href="/data">Data &amp; API</Link><a href={github}>GitHub</a></nav></div></footer>;
}
