<p align="center">
  <img src="app/icon.svg" alt="NorthAtlas map mark" width="64" height="64">
</p>

<h1 align="center">NorthAtlas</h1>

<p align="center"><strong>An interactive atlas and map maker for North America.</strong></p>

<p align="center">
  <a href="https://github.com/PRABHMANNAT/united-states-territories-mapper-geoatlas/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/PRABHMANNAT/united-states-territories-mapper-geoatlas?style=flat-square"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-171717?style=flat-square"></a>
  <a href="#run-locally"><img alt="Runs locally without API keys" src="https://img.shields.io/badge/setup-no%20API%20keys-171717?style=flat-square"></a>
</p>

<p align="center"><a href="#make-your-first-map">Make a map</a> · <a href="#run-locally">Run locally</a> · <a href="#maps-and-data">Explore the data</a></p>

What does Alaska look like over Texas at the same scale? What would a map of the United States, Alberta, and Yukon look like? NorthAtlas lets you explore both ideas in a browser, then export the map you make.

![NorthAtlas showing the North American map and boundary controls](docs/screenshots/northatlas-overview.png)

## Make your first map

1. Open **Map Creator** and add a country, territory, or subdivision. You can mix whole countries with individual regions.
2. Pick a swatch or enter a custom color, then click a place to paint it. Click again with the same color to clear its fill.
3. Set a title and background, toggle labels, and download a **PNG** or **SVG**. Use the expand button beside the zoom controls for a fullscreen preview. Press **Esc** to return to the editor.

After starting the app, try the [U.S. + Alaska + Alberta + Yukon map](http://localhost:3000/creator?places=usa,usa-ak,can-ab,can-yt).

![A custom NorthAtlas map with different colors for the United States, Alaska, Alberta, and Yukon](docs/screenshots/northatlas-creator.png)

## Explore the atlas

| Open | What you can do |
| --- | --- |
| `/` | View the continent, focus on one place, combine places, or show finer boundaries. |
| `/places` | Browse countries and their subdivision directories, or read sourced profiles for territories and first-level subdivisions. |
| `/creator` | Build a custom North American map and export it as PNG or SVG. |
| `/map` | Explore the detailed U.S. atlas with satellite and terrain imagery, statistical layers, waterways, and draggable state outlines for same-scale comparisons. |
| `/rankings` | Rank U.S. jurisdictions by metric and year. |
| `/compare` | Compare two to four U.S. jurisdictions side by side, or find similar economies in World Bank data. |
| `/timeline` and `/quiz` | Explore changes in population and GDP or practice geography. |
| `/data` | Find downloadable datasets, metric definitions, and API examples. |

Choose **Compare states** in the top navbar to open the comparison tool. On phones, open the navigation menu first. Press **Ctrl/Cmd + K** to find a place or tool. The [U.S. creator](http://localhost:3000/creator?scope=us) supports legends, undo and redo, saved projects, and JSON or CSV export.

## Run locally

Use **Node.js 24** and **pnpm 11**. Clone the repository and run the commands below.

```sh
git clone https://github.com/PRABHMANNAT/united-states-territories-mapper-geoatlas.git
cd united-states-territories-mapper-geoatlas
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000). The bundled maps, profiles, statistics, and export tools work without a database or API keys. Satellite and terrain imagery need an internet connection and use USGS by default. [USGS The National Map](https://www.usgs.gov/faqs/what-are-base-map-services-or-urls-used-national-map)

## Maps and data

| Coverage | Source |
| --- | --- |
| 23 sovereign countries, 22 territories and other map units, and 434 first-level subdivisions | [Natural Earth](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/) |
| Second-level boundaries for 17 countries and territories, and third-level boundaries for eight | [geoBoundaries](https://www.geoboundaries.org/api.html) |
| Detailed U.S. boundaries, population, and economic observations | [U.S. Census Bureau](https://www.census.gov/), [BEA](https://www.bea.gov/), and the [dataset guide](docs/datasets.md) |
| Encyclopedia context and images | Revision links and individual image credits on the relevant profiles |

Local boundary coverage varies by place and year. The atlas lists the source, vintage, and license for each available layer. Country pages act as directories, while deeper subdivisions are available for mapping. The U.S. statistical tools identify missing observations.

The software is [MIT licensed](LICENSE). Data and images have separate reuse terms. [Data licensing and attribution](DATA_LICENSES.md) · [Local boundary layer sources](data/north-america/admin-layers.json) · [Public API](docs/api.md)

NorthAtlas uses Next.js and TypeScript, D3 for vector maps, and MapLibre for U.S. imagery. [Architecture](docs/architecture.md)

## Contribute

Found a missing boundary, mislabeled place, or confusing control? [Open an issue](https://github.com/PRABHMANNAT/united-states-territories-mapper-geoatlas/issues/new) with the place, dataset, or steps to reproduce it. See the [contribution guide](CONTRIBUTING.md) and [data refresh workflow](docs/datasets.md).

```sh
pnpm lint
pnpm types
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

To refresh continental data, run `node scripts/north-america.mjs` for countries and first-level outlines, `node scripts/north-america-admin.mjs` for local boundaries, and `node scripts/north-america-articles.mjs` for encyclopedia introductions.

Made with love by [Prabhmannat Singh](https://github.com/PRABHMANNAT). If NorthAtlas helps you make a map or discover something new, [give it a star on GitHub](https://github.com/PRABHMANNAT/united-states-territories-mapper-geoatlas).
