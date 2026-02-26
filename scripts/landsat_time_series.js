/*
 * ---
 * title: "Landsat Time Series Analysis"
 * author: "Brendan Casey"
 * created: "2024-12-05"
 * description: Generates a time series of Landsat satellite imagery,
 * calculates user-defined spectral indices, and outputs results as
 * multiband images for further analysis. 
 * ---
 */

/* 1. Setup
 * Prepare the environment, including the AOI, helper functions,
 * and date list for time series processing.
 */

/* Load helper functions */
var utils = require(
  "users/bgcasey/science_centre:functions/utils"
  );
var landsatTimeSeries = require(
  "users/bgcasey/science_centre:functions/landsat_time_series"
  );
var landsatIndicesAndMasks = require(
  "users/bgcasey/science_centre:functions/landsat_indices_and_masks"
  );

/* Define area of interest (AOI) */
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

/* Create a date list 
 * The date list specifies the starting points for time 
 * intervals used to extract a time series. The createDateList 
 * function generates a list of dates at a specified interval 
 * (e.g., 1 year), beginning on the provided start date 
 * ('2000-06-01') and ending on the end date ('2024-06-01').
 *
 * For each date in the list, the ls_fn function will create a 
 * new end date by advancing the start date by a user-defined 
 * number of time units (e.g., 4 months, 6 weeks). Indices will 
 * be calculated for each of these time intervals.
 *
 * Due to memory limits when generating a time series of
 * Alberta wide images, time series are generated in five year
 * batches. Comment out the unused time periods.  
 */

// var dateList = utils.createDateList(
//   ee.Date('2001-06-01'), ee.Date('2005-06-01'), 1, 'years'
// );

// var dateList = utils.createDateList(
//   ee.Date('2006-06-01'), ee.Date('2010-06-01'), 1, 'years'
// );

// var dateList = utils.createDateList(
//   ee.Date('2011-06-01'), ee.Date('2015-06-01'), 1, 'years'
// );

// var dateList = utils.createDateList(
//   ee.Date('2016-06-01'), ee.Date('2020-06-01'), 1, 'years'
// );

var dateList = utils.createDateList(
  ee.Date('2021-06-01'), ee.Date('2024-06-01'), 1, 'years'
);
 
print("Start Dates", dateList);

/* Define reducer statistic */
var statistic = 'mean'; // Choose from 'mean', 'median', 'max', etc.


/* 2. Landsat Time Series Processing
 * Calculate user-defined spectral indices for Landsat imagery.
 * 
 * Available indices:
 * - BSI: Bare Soil Index
 * - DRS: Distance Red & SWIR
 * - DSWI: Disease Stress Water Index
 * - EVI: Enhanced Vegetation Index
 * - GNDVI: Green Normalized Difference Vegetation Index
 * - LAI: Leaf Area Index
 * - NBR: Normalized Burn Ratio
 * - NDMI: Normalized Difference Moisture Index
 * - NDSI: Normalized Difference Snow Index
 * - NDVI: Normalized Difference Vegetation Index
 * - NDWI: Normalized Difference Water Index
 * - SAVI: Soil Adjusted Vegetation Index
 * - SI: Shadow Index
 */
var ls = landsatTimeSeries.ls_fn(
  dateList, 121, 'days', aoi,
  [
    'BSI', 'DRS', 'DSWI', 'EVI', 'GNDVI', 
    'LAI', 'NBR', 'NDMI', 'NDSI', 'NDVI',
    'NDWI', 'SAVI', 'SI'
  ],
  statistic
)
  // // Apply NDRS for Conifer
  // .map(function(image) {
  //   return landsatIndicesAndMasks.addNDRS(image, [210]);
  // })
  // // Apply NDRS for Broadleaf
  // .map(function(image) {
  //   return landsatIndicesAndMasks.addNDRS(image, [220]);
  // })
  // // Apply NDRS for all forest types
  // .map(function(image) {
  //   return landsatIndicesAndMasks.addNDRS(image);
  // })
  .map(function(image) {
    // Exclude QA_PIXEL band and rename remaining bands
    var filteredBandNames = image.bandNames().filter(
      ee.Filter.neq('item', 'QA_PIXEL')
    );
    return image
      .select(filteredBandNames)
      .toFloat(); // Convert all bands to Float32
  });

//print("Landsat Time Series:", ls);

/* 3. Check Calculated Bands
 * Review to make sure calculations and indices appear 
 * correct.
 */

/* 3.1 Check band summary statistics
* For each band calculate the min, max, and 
* standard deviation of pixel values and print to console.
* Check for values outside the expected range.
*/

/* Calculate summary statistics for the image collection */
var reducer = ee.Reducer.min()
  .combine(ee.Reducer.max(), '', true);

var collectionStats = utils.calculateImageCollectionStats(ls, 
                                                        aoi, 
                                                        1000, 
                                                        1e13, 
                                                        reducer);
print(collectionStats, "image stats")
utils.exportStatsToCSV(collectionStats, 'image_stats');



// /* 3.2 Plot NDVI
// * Visualize the NDVI for 2024 by adding it to the map.
// * Set visualization parameters to highlight vegetation health.
// */

// Define visualization parameters for NDVI
var ndviVisParams = {
  min: -0.5, // Lower limit for NDVI values
  max: 1.0,  // Upper limit for NDVI values
  palette: ['blue', 'white', 'green'] // Color palette
};

var image_first = ls.first();

// Extract the NDVI band from the 2024 image
var ndvi_first = image_first.select('NDVI');

// Reduce resolution for visualization
var ndvi_firstLowRes = ndvi_first.reproject({
  crs: ndvi_first.projection(),
  scale: 2000
});

// Center the map on the area of interest (AOI)
Map.centerObject(aoi, 9);

// Add the low-resolution NDVI layer to the map
Map.addLayer(ndvi_first, ndviVisParams, 'NDVI (Low Res)');


// // Create a mask where valid (non-missing) pixels are 1, and missing pixels are 0
// var missingPixelsMask = ndvi_first.mask().not();

// // Visualize the missing pixels
// Map.addLayer(missingPixelsMask, {min: 0, max: 1, palette: ['white', 'black']}, 'Missing Pixels');


// /* 3.3 Check band data types
// * Bands need to be the same data type in order to export 
// * multiband rasters to drive 
// */
 
print("Band Names", image_first.bandNames()); 
print("Band Types", image_first.bandTypes());

/* 4. Export Time Series to Google Drive
 * Export each image in the collection as multiband GeoTIFFs.
 */

/* Export parameters */
var folder = 'gee_exports';
var scale = 30; // 30-meter resolution
var crs = 'EPSG:4326'; // WGS 84 CRS

/* Define file naming function */
var fileNameFn = function(img) {
  var year = img.get('year').getInfo() || 'unknown';
  return 'landsat_multiband_' + year;
};

/* Export images to Google Drive */
utils.exportImageCollection(ls, aoi, folder, scale, crs, fileNameFn);


// /*
// * 6. Focal Analysis
// * Focal analyses and exporting original resolution (30 m) rasters. 
// */

// /* 
// * 6.1. Zero-meter focal (no smoothing) 
// */

// // 6.1.1. No focal operation, keep original 30 m resolution
// var ls_0 = ls.map(function(img) {
//   var newNames = img.bandNames().map(function(name) {
//     return ee.String(name).cat('_0');
//   });
//   return img.rename(newNames);
// });

// // print(ls_0, "ls_0");
// // Map.addLayer(
// //   ls_0.first().select('NDVI'), 
// //   {}, 
// //   'NDVI (0m focal, 30m res)'
// // );

// // 6.1.2. Define file naming function for 0 m exports
// var fileNameFn_0 = function(img) {
//   var year = img.get('year').getInfo() || 'unknown';
//   return 'landsat_multiband_0_' + year;
// };

// // 6.1.3. Export each image to Google Drive at 30 m resolution
// utils.exportImageCollection(
//   ls_0,
//   aoi,
//   'gee_exports',
//   30,          // scale in meters (30 m native resolution)
//   'EPSG:3978', // CRS
//   fileNameFn_0
// );

// /*
// * 6.2. 150-meter focal analysis
// */
// var kernelSize150 = 150;

// // 6.2.1. Compute focal statistics at 30 m resolution
// var ls_150 = ls.map(function(img) {
//   return utils.focalStats(
//     img, 
//     kernelSize150, 
//     'circle', 
//     ['year']
//   );
// });

// // print(ls_150, "ls_150");
// // Map.addLayer(
// //   ls_150.first().select('NDVI_mean_150'), 
// //   {}, 
// //   'NDVI (150m focal, 30m res)'
// // );

// // 6.2.2. Define the file naming function for 150 m exports
// var fileNameFn_150 = function(img) {
//   var year = img.get('year').getInfo() || 'unknown';
//   return 'landsat_multiband_150_' + year;
// };

// // 6.2.3. Export the ls_150 collection at 30 m resolution
// utils.exportImageCollection(
//   ls_150,
//   aoi,
//   'gee_exports',
//   30,          // scale in meters (30 m native resolution)
//   'EPSG:3978', // CRS
//   fileNameFn_150
// );

// /*
// * 6.3. 250-meter focal analysis
// */
// var kernelSize250 = 250;

// // 6.3.1. Compute focal statistics at 30 m resolution
// var ls_250 = ls.map(function(img) {
//   return utils.focalStats(
//     img, 
//     kernelSize250, 
//     'circle', 
//     ['year']
//   );
// });

// // print(ls_250, "ls_250");
// // Map.addLayer(
// //   ls_250.first().select('NDVI_mean_250'), 
// //   {}, 
// //   'NDVI (250m focal, 30m res)'
// // );

// // 6.3.2. Define the file naming function for 250 m exports
// var fileNameFn_250 = function(img) {
//   var year = img.get('year').getInfo() || 'unknown';
//   return 'landsat_multiband_250_' + year;
// };

// // 6.3.3. Export the ls_250 collection at 30 m resolution
// utils.exportImageCollection(
//   ls_250,
//   aoi,
//   'gee_exports',
//   30,          // scale in meters (30 m native resolution)
//   'EPSG:3978', // CRS
//   fileNameFn_250
// );
