"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, BarChart3, BookOpen, Database, Github, GraduationCap, History, House, Layers3, Linkedin, Map, Menu, Search, Star, Columns2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { atlasById, atlasPlaces } from "@/lib/north-america";
import { metrics } from "@/lib/metrics";
import type { Region } from "@/lib/types";

export const nav = [
  { href: "/", title: "Atlas", icon: House },
  { href: "/places", title: "Places", icon: BookOpen },
  { href: "/us", title: "U.S. atlas", icon: Map },
  { href: "/rankings", title: "Rankings", icon: BarChart3 },
  { href: "/compare", title: "Compare", icon: Columns2 },
  { href: "/creator", title: "Map creator", icon: Layers3 },
  { href: "/timeline", title: "Timeline", icon: History },
  { href: "/quiz", title: "Geography quiz", icon: GraduationCap },
  { href: "/data", title: "Data & sources", icon: Database },
];

const github = "https://github.com/PRABHMANNAT/united-states-territories-mapper-geoatlas";

const socialLinks = [
  { href: `${github}/stargazers`, label: "See stars on GitHub", text: "GitHub stars", icon: Star },
  { href: "https://www.linkedin.com/in/prabhmannat", label: "Follow on LinkedIn", text: "LinkedIn", icon: Linkedin },
  { href: "https://github.com/PRABHMANNAT", label: "Follow on GitHub", text: "Follow on GitHub", icon: Github },
];

export function Brand() {
  return <Link href="/" className="brand" aria-label="NorthAtlas home">
    <span className="brand-icon"><svg viewBox="0 0 40 40" width="24" height="24" aria-hidden="true">
      <path fill="currentColor" d="m6 11 5-4 6 1 4-3 4 2-1 5 5 1 4-4 4 1-3 5-5 4-3 5-3 1-3-3-4-1-2-5-4-1-2 2-3-2Zm16 14 4 1 1 3 4 1 3 4-2 2-3-3-4-1-2-4Zm9-1 5 1 2 2-4 1-3-2Z"/>
    </svg></span>
    <span>North<span>Atlas</span><small>NORTH AMERICAN ATLAS</small></span>
  </Link>;
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
    ...atlasPlaces.map((place) => ({
      name: place.name,
      detail: place.parent ? atlasById.get(place.parent)?.name ?? place.type : place.type,
      href: `/places/${place.id}`,
      keys: `${place.id} ${place.code ?? ""}`,
    })),
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
        <div className="header-social" role="group" aria-label="Project and creator links">
          {socialLinks.map(({ href, label, text, icon: Icon }) =>
            <a key={href} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
              <Icon size={15} aria-hidden="true"/><span>{text}</span>
            </a>
          )}
        </div>
        <button className="icon-button header-search" onClick={open} aria-label="Search the atlas" title="Search places & tools (Ctrl/Cmd K)"><Search size={18}/></button>
      </div>
    </div></header>
    <dialog ref={dialog} className="command-dialog" aria-labelledby="command-title" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="command-inner">
        <h2 className="sr-only" id="command-title">Search NorthAtlas</h2>
        <div className="command-field"><Search size={21} /><input ref={input} placeholder="Search countries, subdivisions, and tools…" value={query} aria-label="Search NorthAtlas" onChange={(event) => { setQuery(event.target.value); setIndex(0); }} onKeyDown={(event) => {
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
  return <footer className="site-footer"><div className="shell footer-inner"><Brand /><p>An open atlas of North America.</p><nav aria-label="More atlas tools"><Link href="/quiz">Quiz</Link><Link href="/data">Data &amp; API</Link><a href={github}>GitHub</a></nav></div></footer>;
}
