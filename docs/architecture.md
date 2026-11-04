# Architecture

Next.js serves the App Router pages and versioned API. The app reads committed JSON snapshots. It requires no database, tile service, or authentication for its core flows.

`scripts/ingest.mjs` loads upstream files through a local cache, joins source geographies to the jurisdiction registry, and validates observation identities. It emits separate files for regional metadata, observations, country series, topology, and projected artwork. The browser receives projected SVG path data and the observations each page needs. Detailed WGS84 GeoJSON is served on demand.

The continental map uses an Albers equal-area projection. Alaska, Hawaiʻi and territory insets use independent projections or scales. The nine small outlying islands have their own silhouette and GeoJSON, accessible through the jurisdiction picker and individual profiles. Natural Earth coastlines have a different vintage and level of detail from the Census features.

The API and UI share metric definitions, ranking order, tie handling, and formatters. The creator stores a validated versioned project in browser storage or a shareable URL. Standalone SVG and PNG exports use the same projected paths.
