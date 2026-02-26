// ---
// title:    Download FABDEM for US and Canada
// author:   bgcasey
// created:    2026-01-19
// inputs:  
//   - FABDEM ImageCollection
//   - FAO GAUL country boundaries
// outputs:     
//   - DEM GeoTIFF for US and Canada (exported to Drive)
// notes:  
//   This script downloads the FABDEM digital elevation 
//   model for the United States and Canada.   
//   The data is exported to Google Drive in GeoTIFF 
//   format.    Clips directly to feature collection to 
//   avoid geometry edge limits.  
// ---

// 1. Setup ----

// 1.1 Load datasets ----
var fabdem = ee.ImageCollection(
  "projects/sat-io/open-datasets/FABDEM"
);
var countries = ee.FeatureCollection(
  "FAO/GAUL/2015/level0"
);

//print('FABDEM Collection size:', fabdem.size());

// 1.2 Create elevation mosaic ----
var elev = fabdem
  .  mosaic()
  .setDefaultProjection('EPSG:3857', null, 30);

// 2. Define study area ----
// This section filters countries for US and Canada. 
// The section uses the FAO GAUL boundaries.   
// It produces a feature collection for clipping.

// 2.1 Get US and Canada features ----
var usCanada = countries
  .filter(
    ee. Filter.or(
      ee. Filter.eq('ADM0_NAME', 'Canada'),
      ee.Filter.eq(
        'ADM0_NAME', 
        'United States of America'
      )
    )
  );

// 3.   Clip elevation to study area ----
// This section clips the FABDEM mosaic to the 
// US and Canada boundaries.   
// The section uses the elevation mosaic and country
// features.  
// It produces a clipped elevation image.   

var elevClipped = elev. clip(usCanada);

// 4. Visualization ----
// This section creates map visualizations of the DEM. 
// The section uses the clipped elevation.  
// It produces hillshade, ocean mask, and elevation 
// palette layers.

// 4.1 Add elevation layer ----
// Add the elevation to the map.  Play with the 
// visualization tools to get a better visualization. 
Map.addLayer(elevClipped, {}, 'elev', false);

// 4.2 Create and add hillshade ----
// Use the terrain algorithms to compute a hillshade 
// with 8-bit values. 
var shade = ee. Terrain.hillshade(elevClipped);
Map.addLayer(shade, {}, 'hillshade', false);

// 4.3 Create ocean mask ----
// Create an "ocean" variable to be used for 
// cartographic purposes
var ocean = elevClipped. lte(0);
Map.addLayer(
  ocean.mask(ocean), 
  {palette:  '000022'}, 
  'ocean', 
  false
);

// 4.4 Create elevation palette visualization ----
// Create a custom elevation palette from hex strings.
var elevationPalette = [
  '006600', 
  '002200', 
  'fff700', 
  'ab7634', 
  'c4d0ff', 
  'ffffff'
];

// Use these visualization parameters, customized by 
// location.
var visParams = {
  min: 1, 
  max: 3000, 
  palette: elevationPalette
};

// Create a mosaic of the ocean and the elevation data
var visualized = ee.ImageCollection([
  // Mask the elevation to get only land
  elevClipped.  mask(ocean.not()).visualize(visParams), 
  // Use the ocean mask directly to display ocean.
  ocean.mask(ocean).visualize({palette: '000022'})
]).mosaic();

Map.addLayer(visualized, {}, 'elevation palette');


// 5. Export data ----
// This section exports the elevation data to Google 
// Drive.  
// The section uses the clipped elevation image. 
// It exports a GeoTIFF file to Google Drive. 

// 5.1 Export combined US-Canada DEM ----
Export.image. toDrive({
  image: elevClipped,
  description: 'FABDEM_US_Canada',
  folder: 'gee_exports',
  fileNamePrefix: 'fabdem_us_canada',
  scale: 100,
  crs: 'EPSG:4326',
  maxPixels:  1e13,
});

// End of script ----

// End of script ----