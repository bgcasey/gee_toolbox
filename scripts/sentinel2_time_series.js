/*
 * ---
 * title: "Sentinel-2 Time Series Analysis"
 * author: "Brendan Casey"
 * created: "2024-12-18"
 * description: Generates a time series of Sentinel-2 satellite imagery,
 * calculates user-defined spectral indices, and outputs results as
 * multiband images for further analysis. 
 * ---
 */

/* 1. Setup
 * Prepare the environment, including the AOI, helper functions,
 * and date list for time series processing.
 */

/* Load helper functions */
var utils = require("users/bgcasey/science_centre:functions/utils");
var sentinelTimeSeries = require(
  "users/bgcasey/science_centre:functions/sentinel_time_series"
);
var sentinelIndicesAndMasks = require(
  "users/bgcasey/science_centre:functions/sentinel_indices_and_masks"
);

/* Define area of interest (AOI) */
var aoi = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Canada'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Alberta'))
  .geometry();

/* Small aoi for testing purposes */
// var aoi = ee.Geometry.Polygon([
//   [-113.5, 55.5],  // Top-left corner
//   [-113.5, 55.0],  // Bottom-left corner
//   [-112.8, 55.0],  // Bottom-right corner
//   [-112.8, 55.5]   // Top-right corner
// ]);

/* Create a date list 
 * The date list specifies the starting points for time 
 * intervals used to extract a time series. The createDateList 
 * function generates a list of dates at a specified interval 
 * (e.g., 1 year), beginning on the provided start date 
 * ('2000-06-01') and ending on the end date ('2024-06-01').
 *
 * For each date in the list, the s2_fn function will create a 
 * new end date by advancing the start date by a user-defined 
 * number of time units (e.g., 4 months, 6 weeks). Indices will 
 * be calculated for each of these time intervals.
 *
 * Due to memory limits when generating a time series of
 * Alberta wide images, time series are generated in two year
 * batches. Comment out the unused time periods.  
 */
 
var dateList = utils.createDateList(
  ee.Date('2019-06-01'), ee.Date('2020-06-01'), 1, 'years'
);

// var dateList = utils.createDateList(
//   ee.Date('2021-06-01'), ee.Date('2022-06-01'), 1, 'years'
// );

// var dateList = utils.createDateList(
//   ee.Date('2023-06-01'), ee.Date('2024-06-01'), 1, 'years'
// );

print("Start Dates", dateList);

/* Define reducer statistic */
var statistic = 'mean'; // Options: 'mean', 'median', 'max', etc.

/* 2. Sentinel-2 Time Series Processing
 * Calculate user-defined spectral indices for Sentinel-2 imagery.
 *
 * Available indices:
 * - CRE: Chlorophyll Red Edge Index
 * - DRS: Distance Red & SWIR
 * - DSWI: Disease Stress Water Index
 * - EVI: Enhanced Vegetation Index
 * - GNDVI: Green Normalized Difference Vegetation Index
 * - LAI: Leaf Area Index
 * - NBR: Normalized Burn Ratio
 * - NDRE1, NDRE2, NDRE3: Normalized Difference Red-Edge Indices
 * - NDVI: Normalized Difference Vegetation Index
 * - NDWI: Normalized Difference Water Index
 * - RDI: Ratio Drought Index
 */

// Generate Sentinel-2 Time Series
var s2 = sentinelTimeSeries.s2_fn(
  dateList, 121, 'days', aoi,
  ['CRE', 'DRS', 'DSWI', 'EVI', 'GNDVI', 'LAI', 'NBR', 
   'NDRE1', 'NDRE2', 'NDRE3', 'NDVI', 'NDWI', 'RDI']
)
  .map(function(image) { 
    return sentinelIndicesAndMasks.addNDRS(image, [210]); // Coniferous 
  })
  .map(function(image) { 
    return sentinelIndicesAndMasks.addNDRS(image, [220]); // Broadleaf 
  })
  .map(function(image) { 
    return sentinelIndicesAndMasks.addNDRS(image); // Mixedwood 
  })
  .map(function(image) {
    // Convert all bands in the image to float
    return image.toFloat();
  });

// print('Sentinel-2 Time Series:', s2);

/* 3. Check Calculated Bands
 * Review to make sure calculations and indices appear correct.
 */

// /* 3.1 Check band summary statistics
// * For each band calculate the min, max, and 
// * standard deviation of pixel values and print to console.
// * Check for values outside the expected range.
// */

// // Extract the first image in the time series
// var image_first = s2.first();

// // Calculate summary statistics for the first image
// var stats_first = image_first.reduceRegion({
//   reducer: ee.Reducer.min()
//     .combine(ee.Reducer.max(), '', true)
//     .combine(ee.Reducer.stdDev(), '', true),
//   geometry: aoi,
//   scale: 1000,
//   bestEffort: true,
//   maxPixels: 1e13
// });
// print('Summary Statistics for First Image:', stats_first);

// /* 3.2 Check Band Data Types
// * Bands need to be the same data type to export multiband rasters.
// */
// print("Band Names", image_first.bandNames()); 
// print("Band Types", image_first.bandTypes());

// /* 3.3 Plot NDVI
// * Visualize the NDVI for the first time step by adding it to the map.
// * Set visualization parameters to highlight vegetation health.
// */

// // Define visualization parameters for NDVI
// var ndviVisParams = {
//   min: -0.1, // Lower limit for NDVI values
//   max: 1.0,  // Upper limit for NDVI values
//   palette: ['blue', 'white', 'green'] // Color palette
// };

// // Extract the NDVI band from the first image
// var ndvi_first = image_first.select('NDVI');

// // Reduce resolution for visualization
// var ndvi_firstLowRes = ndvi_first.reproject({
//   crs: ndvi_first.projection(),
//   scale: 100
// });

// // Center the map on the area of interest (AOI)
// Map.centerObject(aoi, 9);

// // Add the low-resolution NDVI layer to the map
// Map.addLayer(ndvi_firstLowRes, ndviVisParams, 'NDVI (Low Res)');

/* 4. Export Sentinel-2 Time Series to Google Drive */
var folder = 'gee_exports';
var scale = 10; // Sentinel-2 resolution in meters
var crs = 'EPSG:4326'; // WGS 84 CRS

/* Define file naming function */
var fileNameFn = function(img) {
  var year = img.get('year').getInfo() || 'unknown';
  return 'sentinel2_multiband_' + year;
};

/* Export images to Google Drive */
utils.exportImageCollection(s2, aoi, folder, scale, crs, fileNameFn);




