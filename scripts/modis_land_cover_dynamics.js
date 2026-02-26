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

/* 2. Load MODIS MCD12Q2 Dataset */

/*  2.1 Load and Clip Dataset */
var dataset = ee.ImageCollection('MODIS/061/MCD12Q2')
  .filter(ee.Filter.date('2001-01-01', '2023-12-31'))
  .map(function(image) {
    return image.clip(aoi);
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

/* 3.2 Print Min and Max Values for All Bands (2023) */
dataset.filter(ee.Filter.date('2023-01-01', '2023-12-31'))
  .mosaic().bandNames().evaluate(function(bands) {
    bands.forEach(function(band) {
      var stats = dataset.filter(ee.Filter.date('2023-01-01',
        '2023-12-31')).mosaic().select(band).reduceRegion({
        reducer: ee.Reducer.minMax(),
        geometry: aoi,
        scale: 500,
        maxPixels: 1e13
      });
      stats.evaluate(function(result) {
        print(band + ' Min and Max (2023):', result);
      });
    });
  });

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

/* End of script */



