/*
 * ---
 * title: Terrain Metrics Calculation
 * author: Brendan Casey
 * created: 2024-12-13
 * inputs: NRCan/CDEM DEM Dataset, Area of Interest (AOI)
 * outputs: Terrain Metrics (Slope, Aspect, Northness)
 * notes: 
 *  This script calculates terrain metrics including slope,
 *  aspect, and northness using the NRCan/CDEM dataset. The
 *  calculations are applied to a DEM image collection, which is
 *  mosaicked and clipped to the specified AOI. It checks the
 *  min/max values of all bands and prints the results.
 * ---
 */

/* 1. Setup */

// 1.1 Import Required Modules
// No additional modules required

// 1.2 Define Area of Interest (AOI)

/* Define area of interest (AOI) */
var aoi = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Canada'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Alberta'))
  .geometry()
  
// Example: Specify your AOI geometry
// var aoi = ee.Geometry.Polygon([
//   [-113.5, 55.5],  // Top-left corner
//   [-113.5, 55.0],  // Bottom-left corner
//   [-112.8, 55.0],  // Bottom-right corner
//   [-112.8, 55.5]   // Top-right corner
// ]);

// 1.2 Load and Mosaic DEM
var dem = ee.ImageCollection('NRCan/CDEM')
  .mosaic() // Combine the DEM collection into a single image
  .clip(aoi) // Clip to AOI
  .toFloat() // Convert the DEM to Float to allow smoother calculations:
  .setDefaultProjection('EPSG:3348', null, 23.19);
  
/* 2. Terrain Indices Calculation */

// 2.1 Slope Calculation
var slope = ee.Terrain.slope(dem).rename('slope');

// 2.2 Aspect Calculation
var aspect = ee.Terrain.aspect(dem).rename('aspect');

// 2.3 Northness Calculation
var northness = aspect
  .multiply(Math.PI).divide(180) // Convert degrees to radians
  .cos().rename('northness');

// 2.4 Eastness Calculation
var eastness = aspect
  .multiply(Math.PI).divide(180) // Convert degrees to radians
  .sin().rename('eastness');


/* 3. Combine Terrain Metrics */

// Add slope, aspect, and northness bands to the DEM
var terrain = dem
  .addBands(slope.rename('slope'))
  .addBands(northness)
  .addBands(aspect.rename('aspect'));

// Print the final terrain image
print("Terrain Metrics", terrain);

/* 4. Visualize bands and compute Min/Max Values */

// 4.1 Add Terrain Layers to the Map
Map.centerObject(aoi, 10);
Map.addLayer(terrain.select('elevation'), {min: 163, max: 3715}, 'Elevation');
Map.addLayer(terrain.select('slope'), {min: 0, max: 90}, 'Slope');
Map.addLayer(terrain.select('aspect'), {}, 'Aspect');
Map.addLayer(terrain.select('northness'), {min: -1, max: 1}, 'Northness');

// 4.2 Print Min/Max Values for Each Band
terrain.bandNames().evaluate(function(bands) {
  bands.forEach(function(band) {
    var stats = terrain.select(band).reduceRegion({
      reducer: ee.Reducer.minMax(),
      geometry: aoi,
      scale: 30,
      maxPixels: 1e13
    });
    stats.evaluate(function(result) {
      print(band + ' Min and Max:', result);
    });
  });
});

/* 5. Export Outputs */

// Export the combined terrain metrics to Google Drive
Export.image.toDrive({
  image: terrain,
  description: 'terrain_metrics_export',
  folder: 'terrain_exports',
  fileNamePrefix: 'terrain_metrics',
  region: aoi,
  scale: 30, // Export resolution in meters
  crs: 'EPSG:3348',
  maxPixels: 1e13
});

/* End of script */
