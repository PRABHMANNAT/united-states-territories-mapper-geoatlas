# Dataset workflow

The committed snapshot is the reproducible build input. Deployments use it directly. The upstream services may revise previously published estimates, so the manifest records the SHA-256 hash of each exact download.

```sh
pnpm data:build
pnpm data:build --refresh
```

The first command reuses files in `.cache/sources` and downloads missing inputs. The second refreshes the inputs. Check resulting row counts, metric coverage, changed hashes, and reference years before committing. Use `STATEATLAS_DATA_VERSION` to name a refreshed release.

## Compatibility decisions

- Area uses 2026 TIGER/Line attributes. Coastline display uses 2025 Census cartographic geometry at 1:5m for the overview and 1:500k for detailed downloads.
- Census Vintage 2025 supplies annual July 1 estimates for states, D.C. and Puerto Rico. 2020 decennial Island Areas counts have distinct source IDs. The atlas does not rank them alongside annual population estimates.
- State GDP uses annual BEA SAGDP1. The five territorial accounts use their own release tables, with the reproducible Puerto Rico bulk archive ending in 2022.
- 2025 ACS 1-year tables cover states, D.C. and Puerto Rico. The unemployment metric is the survey estimate from ACS B23025. Direct ACS estimates retain their published margins when available.
- Density divides population by 2026 TIGER/Line land area. GDP per capita uses same-year resident estimates where available.
- Country matches use World Bank SP.POP.TOTL, NY.GDP.MKTP.CD, and AG.LND.TOTL.K2, with regional aggregates removed. The closest observation year is preferred and mismatches remain visible.

The 2025 education table reordered its categories. The bachelor’s-and-higher metric uses B15003 lines 20 through 23 in this vintage.
