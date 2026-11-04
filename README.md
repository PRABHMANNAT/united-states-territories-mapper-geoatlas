# StateAtlas

**Explore every state. Compare every statistic. Understand America.**

StateAtlas is an interactive atlas and statistical field guide for the 50 states, Washington, D.C., five inhabited territories, and nine U.S. Minor Outlying Islands.

![StateAtlas homepage with the interactive map and California profile](docs/screenshots/atlas-desktop.png)

[Mobile screenshot](docs/screenshots/atlas-mobile.png) · [Timeline workspace](docs/screenshots/timeline-desktop.png) · [Social preview artwork](public/social.png)

Use the slim floating navigation to move between tools, or search places and metrics with **Ctrl/Cmd K**. The full-width atlas keeps search and region details inside the map panel, with a compact heading and shortcut row. On smaller screens, the menu beside the wordmark opens all destinations and region details sit below the map within the same panel. Light and dark themes remember your preference.

## Run locally

Install Node.js 24 and pnpm 11. From the repository root, run:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The app ships with versioned observations and Wikipedia profile excerpts. The core atlas, rankings, and exports work without API keys or a database. Optional satellite and topographic imagery use a configured tile provider.

## Explore

| Route | What you can do |
| --- | --- |
| `/map` | Pan and zoom, select a jurisdiction, switch statistical layers, trace major waterways, and download a PNG. |
| `/regions/california` | Open source-linked region profiles with metrics, an encyclopedia excerpt, and GeoJSON. |
| `/rankings` | Rank 18 metrics by reference year and jurisdiction scope. Switch between table, bar, and map views. |
| `/compare` | Compare two to four jurisdictions and find World Bank economies with similar population, land area, or nominal GDP. |
| `/creator` | Color regions in groups, design a legend, undo edits, save locally, and export SVG, PNG, JSON, or CSV. |
| `/timeline` | Play annual population and GDP series, jump or step between years, and inspect each place’s trend with fixed map thresholds and explicit missing-data states. |
| `/quiz` | Practice silhouettes, locations, capitals, population, and land area. |
| `/data` | Read the API examples, review methodology, and download observations and boundaries. |

## Develop

```sh
pnpm lint
pnpm types
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Run `pnpm data:build` to reconstruct snapshots from the source cache. See the [data workflow](docs/datasets.md) before refreshing inputs.

- [Architecture](docs/architecture.md)
- [Public API](docs/api.md)
- [Data licensing and attribution](DATA_LICENSES.md)
- [Roadmap](docs/roadmap.md)
- [Contributing](CONTRIBUTING.md)

The software uses the [MIT License](LICENSE). Each dataset has separate reuse terms.
