# StateAtlas implementation plan

1. Establish the design system, region registry, and reproducible boundary ingestion. Verify region coverage and map selection.
2. Normalize statistical snapshots and build rankings, profiles, and state-to-country comparisons. Verify year and unit compatibility.
3. Add the editor, export pipeline, geographic overlays, and time-series playback.
4. Publish the versioned API and data downloads. Verify keyboard access, browser journeys, and the production build before pushing.

The nationwide map uses projected SVG paths with independent insets so the political map works offline. Observation years belong to the individual data products. Each ranking fixes the observation year before comparing values.
