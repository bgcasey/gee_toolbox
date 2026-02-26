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

 
var dateList = utils.createDateList(
  ee.Date('2001-06-01'), ee.Date('2005-06-01'), 1, 'years'
);

// var dateList = utils.createDateList(
//   ee.Date('2006-06-01'), ee.Date('2010-06-01'), 1, 'years'
// );

// var dateList = utils.createDateList(
//   ee.Date('2011-06-01'), ee.Date('2015-06-01'), 1, 'years'
// );

// var dateList = utils.createDateList(
//   ee.Date('2016-06-01'), ee.Date('2020-06-01'), 1, 'years'
// );

// var dateList = utils.createDateList(
//   ee.Date('2021-06-01'), ee.Date('2024-06-01'), 1, 'years'
// );
 
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
  // Apply NDRS for Conifer
  .map(function(image) {
    return landsatIndicesAndMasks.addNDRS(image, [210]);
  })
  // Apply NDRS for Broadleaf
  .map(function(image) {
    return landsatIndicesAndMasks.addNDRS(image, [220]);
  })
  // Apply NDRS for all forest types
  .map(function(image) {
    return landsatIndicesAndMasks.addNDRS(image);
  })
  .map(function(image) {
    // Exclude QA_PIXEL band and rename remaining bands
    var filteredBandNames = image.bandNames().filter(
      ee.Filter.neq('item', 'QA_PIXEL')
    );
    return image
      .select(filteredBandNames)
      .toFloat(); // Convert all bands to Float32
  });

// print("Landsat Time Series:", ls);

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
// var reducer = ee.Reducer.min()
//   .combine(ee.Reducer.max(), '', true);

// var collectionStats = utils.calculateImageCollectionStats(ls, 
//                                                         aoi, 
//                                                         1000, 
//                                                         1e13, 
//                                                         reducer);
// print(collectionStats, "image stats")
// utils.exportStatsToCSV(collectionStats, 'image_stats');

// /* 3.2 Check band data types
// * Bands need to be the same data type in order to export 
// * multiband rasters to drive 
// */
 
// print("Band Names", image_first.bandNames()); 
// print("Band Types", image_first.bandTypes());

// /* 3.3 Plot NDVI
// * Visualize the NDVI for 2024 by adding it to the map.
// * Set visualization parameters to highlight vegetation health.
// */

// // Define visualization parameters for NDVI
// var ndviVisParams = {
//   min: -0.5, // Lower limit for NDVI values
//   max: 1.0,  // Upper limit for NDVI values
//   palette: ['blue', 'white', 'green'] // Color palette
// };

// var image_first = ls.first();

// // Extract the NDVI band from the 2024 image
// var ndvi_first = image_first.select('NDVI');

// // Reduce resolution for visualization
// var ndvi_firstLowRes = ndvi_first.reproject({
//   crs: ndvi_first.projection(),
//   scale: 2000
// });

// // Center the map on the area of interest (AOI)
// Map.centerObject(aoi, 7);

// // Add the low-resolution NDVI layer to the map
// Map.addLayer(ndvi_firstLowRes, ndviVisParams, 'NDVI (Low Res)');


// // Create a mask where valid (non-missing) pixels are 1, and missing pixels are 0
// var missingPixelsMask = ndvi_first.mask().not();

// // Visualize the missing pixels
// Map.addLayer(missingPixelsMask, {min: 0, max: 1, palette: ['white', 'black']}, 'Missing Pixels');


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
