# Architecture

Next.js serves the App Router pages and versioned API. The app reads committed JSON snapshots. It requires no database, tile service, or authentication for its core flows.

`scripts/ingest.mjs` loads upstream files through a local cache, joins source geographies to the jurisdiction registry, and validates observation identities. It emits separate files for regional metadata, observations, country series, topology, and projected artwork. The browser receives projected SVG path data and the observations each page needs. Detailed WGS84 GeoJSON is served on demand.

The continental map uses an Albers equal-area projection. Alaska, Hawaiʻi and territory insets use independent projections or scales. The Hawaiʻi and American Samoa insets focus on the main islands. The downloadable geometries preserve the remaining islands. The nine small outlying islands have their own silhouette and GeoJSON, accessible through the jurisdiction picker and individual profiles. Natural Earth coastlines have a different vintage and level of detail from the Census features.

MapLibre GL loads on demand for imagery. Both the homepage and dedicated atlas use `getRasterProviders()`, which defaults to the public USGS ImageryOnly and USGSTopo tile services. Valid HTTPS XYZ overrides and attribution can be supplied through `.env.example`. Tile URLs are browser-visible, so any custom tokens must be public or origin-restricted. Built-in tiles stop requesting new levels at the service's zoom 16 limit. Imagery dates and resolution vary; this is not live imagery.

MapLibre v6's module worker is registered explicitly using its documented bundler URL, allowing Next.js to emit the worker and its dependencies together. A ResizeObserver updates the map when fullscreen or panel geometry changes. Tile failures have a 15-second initial-load timeout and an offline-vector fallback with retry. The PNG exporter remains available for vector layers. Browser tests use a small attributed tile fixture to verify the actual WebGL/worker path independently of network access; live USGS rendering is also checked manually.

The API and UI share metric definitions, ranking order, tie handling, and formatters. The creator stores a validated versioned project in browser storage or a shareable URL. Standalone SVG and PNG exports use the same projected paths.
