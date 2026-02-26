////////////////////////
// mask by forest age
////////////////////////

  
// Define a function to mask an image by multiple landcover classes
exports.maskByForestAge= function(image) {
  
  var age = ee.Image("projects/sat-io/open-datasets/CA_FOREST/CA_forest_age_2019");

  // Define the threshold for forest age (greater than 30 years)
  var ageThreshold = 60;
  
  var mask = age.gt(ageThreshold);
    
  return  image.updateMask(mask); 
}

////////////////////////////////////////
// Sentinel masks
////////////////////////////////////////

// cloud mask
exports.maskS2clouds=function(image){
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000).copyProperties(image, ['system:time_start']);
}

// snow mask
exports.maskS2snow=function(image){
  var scl= image.select('SCL');

  var nonSnowMask = scl.neq(11);

  return image.updateMask(nonSnowMask);
}

// exports.maskS2snow=function(image){
//   var scl= image.select('SCL');
//   // Bits 10 and 11 are clouds and cirrus, respectively.
//   var snowBitMask = 1 << 11;

//   // Both flags should be set to zero, indicating clear conditions.
//   var mask = scl.bitwiseAnd(snowBitMask).eq(0);

//   return image.updateMask(mask).divide(10000).copyProperties(image, ['system:time_start']);
// }

// forest mask
exports.MaskS2vegetation = function(image) {
  // Select the SCL band
  var scl = image.select('SCL');
  
  // Create a mask for vegetation pixels (SCL codes: 4 - Vegetation, 5 - Not-vegetated)
  var vegetationMask = scl.eq(4);
  
  // Apply the mask to the image
  return image.updateMask(vegetationMask);
};


// water mask
exports.maskS2water= function (image) {
  // Select the SCL band
  var scl = image.select('SCL');
  
  // Define the water class value
  var waterClass = 6;
  var wantedPixels = scl.neq(6);
  return image.updateMask(wantedPixels);
}





////////////////////////
// mask by forest pixels
////////////////////////

// Get the year of the image to determine the mask
var maskYear = 2019

var maskCollection = ee.ImageCollection('projects/sat-io/open-datasets/CA_FOREST_LC_VLCE2')// resolution=30 m
  .filter(ee.Filter.calendarRange(maskYear, maskYear, 'year'))

// Define the landcover classes you want to create a mask for
var landcoverClass1 = 210;
// var landcoverClass2 = 220;
// var landcoverClass3 = 230;

// Define a function to mask an image by multiple landcover classes
exports.maskByLandcover = function(image) {
  // Filter the mask collection based on the image's year
  var maskImage = maskCollection.first()
    // .filter(ee.Filter.calendarRange(maskYear, maskYear, 'year'))
    // .first();
    
    var mask = maskImage.eq(landcoverClass1)
      // .or(maskImage.eq(landcoverClass2))
      // .or(maskImage.eq(landcoverClass3));
    
  return  image.updateMask(mask); 
}


////////////////////////
// mask using DYNAMIC WORLD
////////////////////////

exports.dynamicWorld= function(image) {
  var probability_bands = [
  'water', 'trees', 'grass', 'flooded_vegetation', 'crops',
  'shrub_and_scrub', 'built', 'bare', 'snow_and_ice',]
  // var start = ee.Date(image.date());
  // var end = ee.Date(image.date()).advance(1, 'year');
  var start = ee.Date(image.get('date'));
  var end = ee.Date(image.get('date')).advance(1, 'year');
  var date_range = ee.DateRange(start, end);
  var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
        .filterDate(date_range)
        .filter(ee.Filter.calendarRange(6,9,'month'))
  // Select probability bands 
  var dw_time_series = dw.select(probability_bands)

  // Create a multi-band image summarizing probability 
  // for each band across the time-period
 var mean_probability = dw_time_series.reduce({
    reducer: ee.Reducer.mean(),
    parallelScale: 10  // Set the parallelScale value as desired
  });  // Create a single band image containing the class with the top probability
  var top_probability = mean_probability.toArray().arrayArgmax().arrayGet(0).rename('label')

  var mask = top_probability.eq(1)

  return image.updateMask(mask)
}  





