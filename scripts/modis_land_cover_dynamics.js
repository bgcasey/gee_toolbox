/*
 * ---
 * title: MODIS Annual Land Cover Dynamics (2001-2023)
 * author: Brendan Casey
 * created: 2024-12-17
 * inputs: MODIS MCD12Q2 Dataset, Date Range, Area of Interest (AOI)
 * outputs: Annual multiband phenology images 
 * notes: 
 *  This script extracts all bands from the MODIS MCD12Q2 dataset
 *  for the years 2001 to 2023, clips them to a specified Area of
 *  Interest (AOI), and exports them as geoTIFFs to Google Drive.
 * ---
 */

/* 1. Setup
 * Prepare the environment, set AOI, and load helper functions
 */

/*  1.1 Import Required Modules */
var utils = require("users/bgcasey/science_centre:functions/utils");

/*  1.2 Define Constants and Area of Interest (AOI) */
// var aoi = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level1')
//   .filter(ee.Filter.eq('ADM0_NAME', 'Canada'))
//   .filter(ee.Filter.eq('ADM1_NAME', 'Alberta'))
//   .geometry()

/* Small aoi for testing purposes */
var aoi = ee.Geometry.Polygon([
  [-113.5, 55.5],  // Top-left corner
  [-113.5, 55.0],  // Bottom-left corner
  [-112.8, 55.0],  // Bottom-right corner
  [-112.8, 55.5]   // Top-right corner
]);

/* 2. Load MODIS MCD12Q2 Dataset */

/*  2.1 Load and Clip Dataset */
var dataset = ee.ImageCollection('MODIS/061/MCD12Q2')
  .filter(ee.Filter.date('2021-01-01', '2023-12-31'))
  .map(function(image) {
    var year = image.date().format('yyyy');
    return image.set('year', year).clip(aoi);
  });

/*  2.2 Apply Scaling Factors to Selected Bands */
function applyScaling(image) {
  var scaledBands = image
    .select(['EVI_Minimum_1']).multiply(0.0001).rename('EVI_Minimum_1')
    .addBands(image.select(['EVI_Minimum_2']).multiply(0.0001)
      .rename('EVI_Minimum_2'))
    .addBands(image.select(['EVI_Amplitude_1']).multiply(0.0001)
      .rename('EVI_Amplitude_1'))
    .addBands(image.select(['EVI_Amplitude_2']).multiply(0.0001)
      .rename('EVI_Amplitude_2'))
    .addBands(image.select(['EVI_Area_1']).multiply(0.1).rename('EVI_Area_1'))
    .addBands(image.select(['EVI_Area_2']).multiply(0.1).rename('EVI_Area_2'));
  return image.addBands(scaledBands, null, true)
    .copyProperties(image, image.propertyNames());
}

dataset = dataset.map(applyScaling);

/* 2.3 Ensure All Bands Are Float32 */
function convertToFloat(image) {
  return image.toFloat();
}

dataset = dataset.map(convertToFloat);
print(dataset, "dataset")

/* 3. Check Bands
 * Review to make sure calculations and bands appear 
 * correct.
 */

/*  3.1 Visualize Vegetation Peak Band for 2023 */
var vegetationPeak = dataset.filter(ee.Filter.date('2023-01-01',
  '2023-12-31')).select('Peak_1').mosaic();

var vegetationPeakVis = {
  min: 19364,
  max: 19582,
  palette: ['0f17ff', 'b11406', 'f1ff23']
};

Map.setCenter(-113.0, 55.25, 8);
Map.addLayer(vegetationPeak, vegetationPeakVis,
  'Vegetation Peak 2023');

// /* 3.2 Print Min and Max Values for All Bands (2023) */
// dataset.filter(ee.Filter.date('2023-01-01', '2023-12-31'))
//   .mosaic().bandNames().evaluate(function(bands) {
//     bands.forEach(function(band) {
//       var stats = dataset.filter(ee.Filter.date('2023-01-01',
//         '2023-12-31')).mosaic().select(band).reduceRegion({
//         reducer: ee.Reducer.minMax(),
//         geometry: aoi,
//         scale: 500,
//         maxPixels: 1e13
//       });
//       stats.evaluate(function(result) {
//         print(band + ' Min and Max (2023):', result);
//       });
//     });
//   });

/* 4. Export Time Series to Google Drive
 * Export each image in the collection as multiband GeoTIFFs.
 */
 
/* Export Parameters */
var folder = 'gee_exports';
var scale = 500;
var crs = 'EPSG:4326';

/* File Naming Function */
var fileNameFn = function(img) {
  var year = img.date().format('yyyy').getInfo();
  return 'MODIS_MCD12Q2_' + year;
};

/* Export Images to Google Drive */
utils.exportImageCollection(dataset, aoi, folder, scale, crs, fileNameFn);


// /*
// * 5. Focal Analysis
// * Focal analyses and exporting original resolution (500 m) rasters. 
// */

// /* 
// * 5.1. Zero-meter focal (no smoothing) 
// */

// // 5.1.1. No focal operation, keep original 500 m resolution
// var modis_0 = dataset.map(function(img) {
//   var newNames = img.bandNames().map(function(name) {
//     return ee.String(name).cat('_0');
//   });
//   return img.rename(newNames);
// });

// // print(modis_0, "modis_0");
// // Map.addLayer(
// //   modis_0.first().select('EVI_Amplitude_1_0'), 
// //   {}, 
// //   'EVI_Amplitude_1 (0m focal, 500m res)'
// // );

// // 5.1.2. Define file naming function for 0 m exports
// var fileNameFn_0 = function(img) {
//   var year = img.get('year').getInfo() || 'unknown';
//   return 'MODIS_MCD12Q2__0_' + year;
// };

// // 5.1.3. Export each image to Google Drive at 500 m resolution
// utils.exportImageCollection(
//   modis_0,
//   aoi,
//   'gee_exports',
//   500,          // scale in meters (500 m native resolution)
//   'EPSG:3978', // CRS
//   fileNameFn_0
// );

// /*
// * 5.2. 150-meter focal analysis
// */
// var kernelSize150 = 150;

// // 5.2.1. Compute focal statistics at 500 m resolution
// var modis_150 = dataset.map(function(img) {
//   return utils.focalStats(
//     img, 
//     kernelSize150, 
//     'circle', 
//     ['year']
//   );
// });

// // print(modis_150, "modis_150");
// // Map.addLayer(
// //   modis_150.first().select('EVI_Amplitude_1_mean_150'), 
// //   {}, 
// //   'EVI_Amplitude_1 (150m focal, 30m res)'
// // );

// // 5.2.2. Define the file naming function for 150 m exports
// var fileNameFn_150 = function(img) {
//   var year = img.get('year').getInfo() || 'unknown';
//   return 'MODIS_MCD12Q2__150_' + year;
// };

// // 5.2.3. Export the modis_150 collection at 500 m resolution
// utils.exportImageCollection(
//   modis_150,
//   aoi,
//   'gee_exports',
//   500,          // scale in meters (500 m native resolution)
//   'EPSG:3978', // CRS
//   fileNameFn_150
// );

// /*
// * 5.3. 250-meter focal analysis
// */
// var kernelSize250 = 250;

// // 5.3.1. Compute focal statistics at 500 m resolution
// var modis_250 = dataset.map(function(img) {
//   return utils.focalStats(
//     img, 
//     kernelSize250, 
//     'circle', 
//     ['year']
//   );
// });

// // print(modis_250, "modis_250");
// // Map.addLayer(
// //   modis_250.first().select('EVI_Amplitude_1_mean_250'), 
// //   {}, 
// //   'EVI_Amplitude_1 (250m focal, 30m res)'
// // );

// // 5.3.2. Define the file naming function for 250 m exports
// var fileNameFn_250 = function(img) {
//   var year = img.get('year').getInfo() || 'unknown';
//   return 'MODIS_MCD12Q2__250_' + year;
// };

// // 5.3.3. Export the modis_250 collection at 500 m resolution
// utils.exportImageCollection(
//   modis_250,
//   aoi,
//   'gee_exports',
//   500,          // scale in meters (500 m native resolution)
//   'EPSG:3978', // CRS
//   fileNameFn_250
// );

// /* End of script */



