/*
 * ---
 * title: "Summarize Landsat Time Series to Polygons"
 * author: "Brendan Casey"
 * created: "2025-08-22"
 * description: Generates a time series of Landsat satellite imagery,
 * calculates user-defined spectral indices, and summarize the to polygons. 
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
var summarize = require(
  "users/bgcasey/science_centre_dev:functions/image_collection_to_features"
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

/* Create polygons for testing */
// Five smaller polygons within AOI (approx. 2 ha each)
var poly1 = ee.Geometry.Polygon([
  [-113.48, 55.48],
  [-113.48, 55.47873],
  [-113.47779, 55.47873],
  [-113.47779, 55.48]
]);

var poly2 = ee.Geometry.Polygon([
  [-113.46, 55.47],
  [-113.46, 55.46873],
  [-113.45779, 55.46873],
  [-113.45779, 55.47]
]);

var poly3 = ee.Geometry.Polygon([
  [-113.44, 55.46],
  [-113.44, 55.45873],
  [-113.43779, 55.45873],
  [-113.43779, 55.46]
]);

var poly4 = ee.Geometry.Polygon([
  [-113.42, 55.45],
  [-113.42, 55.44873],
  [-113.41779, 55.44873],
  [-113.41779, 55.45]
]);

var poly5 = ee.Geometry.Polygon([
  [-113.40, 55.44],
  [-113.40, 55.43873],
  [-113.39779, 55.43873],
  [-113.39779, 55.44]
]);

// Create features for each polygon
var feature1 = ee.Feature(poly1, {id: 1});
var feature2 = ee.Feature(poly2, {id: 2});
var feature3 = ee.Feature(poly3, {id: 3});
var feature4 = ee.Feature(poly4, {id: 4});
var feature5 = ee.Feature(poly5, {id: 5});

// Combine features into a single FeatureCollection
var polys_fc = ee.FeatureCollection([
  feature1,
  feature2,
  feature3,
  feature4,
  feature5
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

var dateList = utils.createDateList(
  ee.Date('2009-06-01'), ee.Date('2024-06-01'), 1, 'years'
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

/* 3. Summarize Landsat Time Series to Polygons
 * This section extracts summary statistics from the Landsat 
 * time series (ls) over each polygon in a feature collection.
 * The function imageCollectionToFeatures applies the specified 
 * reducer to all bands in each landsat image for every polygon, 
 * producing a per-polygon-per-date summary table.
 * 
 * The results are exported to Google Drive as a CSV file 
 * (one row per polygon-date-band combination).
 */

var ls_poly_summary = summarize.imageCollectionToFeatures(
  ee.Reducer.mean(),    // Reducer: mean value in each polygon
  polys_fc,             // FeatureCollection: 2-ha polygons
  aoi,                  // AOI (for filtering polygons)
  ls,                   // Landsat time series collection
  'EPSG:4326',          // CRS
  30,                   // Scale in meters
  4,                    // tileScale
  'ls_poly_summary'     // Output file name prefix
);



