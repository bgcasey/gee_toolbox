/*
 * ---
 * title: Global Geomorphometric Layers Export
 * author: Brendan Casey
 * created: 2024-12-13
 * inputs: Area of Interest (AOI), Geomorpho90m Dataset
 * outputs: Multiband Geomorpho90m Image exported to Google Drive
 * notes: 
 *  This script loads multiple geomorphometric variables from the 
 *  Geomorpho90m dataset, mosaics them, clips them to a specified 
 *  area of interest (AOI), and combines them into a single 
 *  multiband image. The result is exported as a GeoTIFF to Google 
 *  Drive.
 *
 *  Citation:
 *  Amatulli, Giuseppe, Daniel McInerney, Tushar Sethi, Peter Strobl, 
 *  and Sami Domisch. "Geomorpho90m, empirical evaluation and accuracy 
 *  assessment of global high-resolution geomorphometric layers." 
 *  Scientific Data 7, no. 1 (2020): 1-18.
 * ---
 */

/* 1. Setup
 * This section includes imports, user defined parameters, and
 * any setup required to prepare the environment.
 */

// 1.1 Define the Base Path for Geomorpho90m Dataset
var basePath = "projects/sat-io/open-datasets/Geomorpho90m/";

// 1.2 Define area of interest (AOI)
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

// 1.3 Define the Collection Names
var collectionNames = [
  "aspect", // Aspect
  "aspect-cosine", // Aspect-Cosine
  "aspect-sine", // Aspect-Sine
  "convergence", // Convergence Index
  "cti", // Compound Topographic Index (CTI)
  "dev-magnitude", // Deviation Magnitude
  "dev-scale", // Deviation Scale
  "eastness", // Eastness
  "elev-stdev", // Elevation Standard Deviation
  "northness", // Northness
  "rough-magnitude", // Multiscale Roughness Magnitude
  "rough-scale", // Multiscale Roughness Scale
  "roughness", // Roughness
  "slope", // Slope
  "spi", // Stream Power Index
  "tpi", // Topographic Position Index (TPI)
  "tri", // Terrain Ruggedness Index (TRI)
  "vrm" // Vector Ruggedness Measure (VRM)
];

/* 2. Geomorpho90m Processing
 * This section loads, mosaics, clips, and combines the Geomorpho90m 
 * collections into a single multiband image.
 */

/**
 * Load, mosaic, clip, and rename an image collection.
 *
 * @param {string} collectionName - The name of the collection.
 * @param {ee.Geometry} aoi - The area of interest.
 * @return {ee.Image} The processed image.
 */
function loadAndProcess(collectionName, aoi) {
  return ee.ImageCollection(basePath + collectionName)
    .mosaic()
    .clip(aoi)
    .rename(collectionName);
}

/**
 * Process all collections and combine them into a single multiband image.
 *
 * @param {ee.Geometry} aoi - The area of interest.
 * @return {ee.Image} The combined image.
 */
function getGeomorpho90m(aoi) {
  var geomorpho90m = loadAndProcess(collectionNames[0], aoi);
  for (var i = 1; i < collectionNames.length; i++) {
    geomorpho90m = geomorpho90m.addBands(
      loadAndProcess(collectionNames[i], aoi)
    );
  }
  return geomorpho90m;
}

// 2.1 Get Combined Geomorpho90m Image
var geomorpho90mImage = getGeomorpho90m(aoi);

print(geomorpho90mImage)

/* 3. Check bands
 * This section visualizes the calculated TWI on the map and 
 * calculates basic summary stats.
 */


// 3.1 Add CTI Layer to the Map
var palettes = require('users/gena/packages:palettes');
Map.centerObject(aoi, 9);
Map.addLayer(geomorpho90mImage.select('cti'), 
  {min: -3, max: 6, palette: palettes.cmocean.Algae[7]}, 
  'Compound Topographic Index (CTI)');
  
// 3.2 Print Min and Max Values for All Bands
geomorpho90mImage.bandNames().evaluate(function(bands) {
  bands.forEach(function(band) {
    var stats = geomorpho90mImage.select(band).reduceRegion({
      reducer: ee.Reducer.minMax(),
      geometry: aoi,
      scale: 90,
      maxPixels: 1e13
    });
    stats.evaluate(function(result) {
      print(band + ' Min and Max:', result);
    });
  });
});

/* 4. Export Outputs
 * This section exports the combined Geomorpho90m image to Google Drive.
 */

// 4.1 Export Geomorpho90m Image to Google Drive
Export.image.toDrive({
  image: geomorpho90mImage,
  description: 'Geomorpho90m_Export',
  folder: 'gee_exports', // Optional: Name of folder in Google Drive
  fileNamePrefix: 'global_geomorphometric_layers',
  region: aoi, // Export region (Area of Interest)
  scale: 90, // Pixel resolution in meters (adjust as needed)
  maxPixels: 1e13 // Maximum allowable number of pixels
});

/* End of script */
