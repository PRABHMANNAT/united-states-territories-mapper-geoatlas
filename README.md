# StateAtlas

**Explore every state. Compare every statistic. Understand America.**

StateAtlas is an interactive atlas and statistical field guide for the 50 states, Washington, D.C., five inhabited territories, and nine U.S. Minor Outlying Islands.

## Run locally

Install Node.js 24 and pnpm 11. From the repository root, run:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The app ships with a versioned snapshot, so the atlas, rankings, and exports work without API keys or a database. Wikipedia excerpts load from Wikimedia on request.

## Explore

| Route | What you can do |
| --- | --- |
| `/map` | Pan and zoom, select a jurisdiction, switch statistical layers, trace major waterways, and download a PNG. |
| `/regions/california` | Open source-linked region profiles with metrics, an encyclopedia excerpt, and GeoJSON. |
| `/rankings` | Rank 18 metrics by reference year and jurisdiction scope. Switch between table, bar, and map views. |
| `/compare` | Compare two to four jurisdictions and find World Bank economies with similar population, land area, or nominal GDP. |
| `/creator` | Color regions in groups, design a legend, undo edits, save locally, and export SVG, PNG, JSON, or CSV. |
| `/timeline` | Play annual population and GDP series on a choropleth with fixed thresholds. |
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
