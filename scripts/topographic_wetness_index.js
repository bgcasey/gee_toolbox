/*
 * ---
 * title: Topographic Wetness Index Calculation
 * author: Brendan Casey
 * created: 2024-12-13
 * inputs: Area of Interest (AOI), MERIT Hydro Dataset
 * outputs: TWI Image exported to Google Drive
 * notes: 
 *  This script calculates the Topographic Wetness Index (TWI)
 *  using the MERIT Hydro dataset. The index is derived as
 *  ln(α/tanβ), where α is the upslope area and β is the slope.
 *  A TWI geoTIFF is exported to Google Drive.
 * ---
 */

/* 1. Setup
 * This section includes imports, user defined parameters, and
 * any setup required to prepare the environment.
 */

// 1.1 Import Image
var meritHydro = ee.Image("MERIT/Hydro/v1_0_1");

// 1.2 Define Area of Interest (AOI)
var aoi = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Canada'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Alberta'))
  .geometry()

/* Small aoi for testing purposes */
// var aoi = ee.Geometry.Polygon([
//   [-113.5, 55.5],  // Top-left corner
//   [-113.5, 55.0],  // Bottom-left corner
//   [-112.8, 55.0],  // Bottom-right corner
//   [-112.8, 55.5]   // Top-right corner
// ]);

// 1.3 Configure visualization parameters
var TWI_vis = {
  min: 0,
  max: 20,
  palette: ['blue', 'cyan', 'green', 'yellow', 'red']
};

/* 2. TWI Calculation
 * This section calculates the Topographic Wetness Index (TWI).
 * from elevation (elv) and upslope area (upa).
 */

// 2.1 Extract Elevation and Upslope Area
var upslopeArea = meritHydro.clip(aoi).select('upa'); // Flow
// accumulation area
var elv = meritHydro.clip(aoi).select('elv'); // Elevation

// 2.2 Calculate Slope
var slope = ee.Terrain.slope(elv);

// 2.3 Compute TWI
// TWI equation: ln(α / tan(β)) where α = upslope area and β = slope
var upslopeAreaMeters = upslopeArea.multiply(1000000).rename(
  'UpslopeArea'
); // Convert km² to m²
var slopeRad = slope.divide(180).multiply(Math.PI).rename(
  'slopeRad'
); // Convert degrees to radians
var TWI = upslopeAreaMeters.divide(slopeRad.tan()).log().rename('TWI');

/* 3. Check bands
 * This section visualizes the calculated TWI on the map and 
 * calculates basic summary stats.
 */

// 3.1 Add TWI Layer to the Map
Map.centerObject(aoi, 9);
Map.addLayer(TWI, TWI_vis, 'Topographic Wetness Index');

// 3.2 Check Min and Max Values
var stats = TWI.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: aoi,
  scale: 30,
  maxPixels: 1e13
});
print('TWI Min and Max Values:', stats);

/* 4. Export the TWI image to Google Drive.
 */

// 4.1 Export TWI Image to Google Drive
Export.image.toDrive({
  image: TWI,
  description: 'TWI_Export',
  folder: 'gee_exports', // Optional: Name of folder in
  // Google Drive
  fileNamePrefix: 'topographic_wetness_index',
  region: aoi, // Export region (Area of Interest)
  scale: 92.77, // Pixel resolution in meters (adjust as needed)
  maxPixels: 1e13 // Maximum allowable number of pixels
});

/* End of script */


