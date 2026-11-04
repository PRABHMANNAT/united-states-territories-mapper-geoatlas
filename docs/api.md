# Public API v1

Use `GET /api/v1/…`. Responses are JSON with a dataset `version` and either a `data` value or an `error` containing `code` and `message`. Successful responses are cacheable and allow cross-origin reads.

The [OpenAPI document](../public/openapi.json) lists the request parameters and response envelopes.

| Route | Parameters |
| --- | --- |
| `regions` | `type`, `page`, `limit` |
| `regions/{region}` | Slug or postal abbreviation |
| `regions/{region}/metrics` | `metric`, `year` |
| `rankings` | Required `metric`. Optional `scope`, `year`, `order`, `page`, `limit`. |
| `compare` | Required `regions` with two to four distinct comma-separated IDs or slugs. Optional `metric` and `year`. |
| `boundaries` | Required `region`. Returns a GeoJSON feature and detailed download URL. |
| `country-matches` | Required `region` and `metric` (`gdp`, `population` or `land`). Optional `year` and `limit`. |
| `metadata/metrics` | Metric definitions, canonical units, and years |
| `metadata/sources` | Source descriptions and provenance |

```sh
curl "http://localhost:3000/api/v1/rankings?metric=population&scope=states-dc&limit=5"
curl "http://localhost:3000/api/v1/compare?regions=CA,TX,PR"
```

Area values use square kilometers. Density is people per square kilometer. GDP is current U.S. dollars. Percent values use a 0–100 scale for shares. A missing ranking row has `rank: null` and `observation: null`. Pagination is 1-based and list limits are capped at 65.
