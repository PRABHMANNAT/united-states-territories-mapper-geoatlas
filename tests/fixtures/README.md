# Imagery test fixture

`usgs-imagery.jpg` is one public USGS National Map imagery tile, downloaded from
https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/3/3/1.
Attribution: USDA, USGS The National Map: Orthoimagery.

Browser tests serve this single tile for all imagery requests to verify actual
WebGL rendering and worker loading without depending on external connectivity.
It is not used by the application or as evidence of geographic coverage.
