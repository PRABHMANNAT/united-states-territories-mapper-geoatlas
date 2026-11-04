import { readFile, writeFile } from "node:fs/promises";

const map = JSON.parse(await readFile("data/snapshot/map.json"));
const states = Object.entries(map.shapes).filter(([, shape]) => shape.panel === "conus")
  .map(([id, shape]) => `<path d="${shape.path}" fill="${id === "CA" ? "#ddab79" : "#8fb6a5"}"/>`).join("");

await writeFile("public/social.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><pattern id="grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M35 0H0V35" fill="none" stroke="#405a60" stroke-width=".6"/></pattern></defs>
  <rect width="1200" height="630" fill="#132832"/><rect x="493" width="707" height="630" fill="url(#grid)"/>
  <path d="M40 40H1160V590H40Z" fill="none" stroke="#5e7b7a"/><path d="M67 133H464M67 504H1133" fill="none" stroke="#5e7b7a"/>
  <g transform="translate(82 85)" fill="none" stroke="#b2d4c8"><circle r="19"/><path d="M4-11L-4 11-7-1Z"/></g>
  <text x="111" y="93" fill="#edf3e8" font-family="Georgia, serif" font-size="31">StateAtlas</text>
  <text x="68" y="166" fill="#deb38b" font-family="monospace" font-size="14" letter-spacing="4">THE OPEN ATLAS OF AMERICA</text>
  <g fill="#edf3e8" font-family="Georgia, serif" font-size="65"><text x="64" y="255">The United</text><text x="64" y="326">States,</text>
    <text x="64" y="400" fill="#a6cdbd" font-style="italic">explored.</text></g>
  <g transform="translate(379 119) scale(.89)" stroke="#e1ece0" stroke-width="1">${states}</g>
  <g font-family="monospace" font-size="15" fill="#c4d9ce" letter-spacing="2"><text x="68" y="549">50 STATES + D.C. · 5 TERRITORIES · 9 OUTLYING ISLANDS</text><text x="1133" y="549" text-anchor="end">VOL. 01 / U.S. ATLAS</text></g>
</svg>\n`);
