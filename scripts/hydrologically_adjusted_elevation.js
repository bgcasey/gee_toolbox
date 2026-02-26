/*
 * ---
 * title: Hydrologically Adjusted Elevations
 * author: Brendan Casey
 * created: 2024-12-13
 * inputs: Area of Interest (AOI), MERIT Hydro Dataset
 * outputs: HAND Image exported to Google Drive
 * notes: 
 *  This script extracts the hydrologically adjusted elevations 
 *  (Height Above Nearest Drainage - HAND) from the MERIT Hydro 
 *  dataset. The HAND band is exported as a GeoTIFF to Google 
 *  Drive.
 * ---
 */

/* 1. Setup
 * Set user defined parameters, and prepare the environment.
 */

// 1.1 Import Image
var meritHydro = ee.Image("MERIT/Hydro/v1_0_1");

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

// 1.3 Configure Visualization Parameters
var HAND_vis = {
  min: 0,
  max: 50,
  palette: ['blue', 'cyan', 'green', 'yellow', 'red']
};

/* 2. Extract HAND Band
 * This section extracts the hydrologically adjusted elevations 
 * (HAND) from the MERIT Hydro dataset. Outputs include the HAND 
 * image.
 */

// 2.1 Extract HAND Band
var hand = meritHydro.clip(aoi).select('hnd').rename('HAND');

/* 3. Visualization
 * This section visualizes the HAND data on the map.
 */

// 3.1 Add HAND Layer to the Map
Map.centerObject(aoi, 9);
Map.addLayer(hand, HAND_vis, 'Hydrologically Adjusted Elevations (HAND)');

// 3.2 Check Min and Max Values
var stats = hand.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: aoi,
  scale: 100,
  maxPixels: 1e13
});
print('HAND Min and Max Values:', stats);

/* 4. Export Outputs
 * This section exports the HAND image to Google Drive.
 */

// 4.1 Export HAND Image to Google Drive
Export.image.toDrive({
  image: hand,
  description: 'HAND_Export',
  folder: 'gee_exports', // Optional: Name of folder in Google Drive
  fileNamePrefix: 'hydrologically_adjusted_elevations',
  region: aoi, // Export region (Area of Interest)
  scale: 92.77, // Pixel resolution in meters (adjust as needed)
  maxPixels: 1e13 // Maximum allowable number of pixels
});

/* End of script */
