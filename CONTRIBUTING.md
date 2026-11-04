# Contributing

Fork the repository and use the setup commands in [README](README.md). Keep changes scoped to a user-visible fix, verified dataset, or testable improvement. Include checks or screenshots relevant to your change.

For data contributions, identify the original table, reference year, unit, and geography. Keep upstream downloads in the cache. Run `pnpm data:build` and review changed counts and source hashes before committing the new snapshots.

## Good first issues

- Add Playwright coverage for keyboard navigation and focus return in the command palette.
- Document state-by-state boundary source exceptions with examples.
- Improve accessible wording for the map creator’s undo and redo controls.

Report data discrepancies with the region, metric, year, published value, and primary source URL.
