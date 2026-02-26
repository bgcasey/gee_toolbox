/*
 * ---
 * title: Land Cover Proportion Functions
 * author: Brendan Casey
 * created: 2025-04-28
 * inputs:
 *   - AOI (Area of Interest) as GeoJSON or EE Geometry
 *   - CA_LC dataset with remapped classes
 *   - Dates for time series
 *   - Interval in months
 * outputs:
 *   - ImageCollection containing annual land cover proportions
 * notes:
 *   These functions calculate proportions of remapped land 
 *   cover classes annually across a given AOI.
 *
 *   Uses data from:
 *     Hermosilla, T., Wulder, M.A., White, J.C., Coops, N.C., 
 *     2022. Land cover classification in an era of big and 
 *     open data: Optimizing localized implementation and 
 *     training data selection to improve mapping outcomes. 
 *     Remote Sensing of Environment. No. 112780. 
 *     DOI: https://doi.org/10.1016/j.rse.2022.112780 
 * ---
 */

var ca_lc = ee.ImageCollection(
  "projects/sat-io/open-datasets/CA_FOREST_LC_VLCE2"
);

var dict = {
  "names": [
    "unclassified",
    "water",
    "snow_ice",
    "rock_rubble",
    "exposed_barren_land",
    "bryoids",
    "shrubs",
    "wetland",
    "wetland_treed",
    "herbs",
    "coniferous",
    "broadleaf",
    "mixedwood"
  ],
  "colors": [
    "#686868",
    "#3333ff",
    "#ccffff",
    "#cccccc",
    "#996633",
    "#ffccff",
    "#ffff00",
    "#993399",
    "#9933cc",
    "#ccff33",
    "#006600",
    "#00cc00",
    "#cc9900"
  ]
};

var from = [0, 20, 31, 32, 33, 40, 50, 80, 81, 100, 210, 220, 230];
var to = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Function to calculate remapped class proportions
 * annually across a given AOI.
 * 
 * Uses data from:
 *     Hermosilla, T., Wulder, M.A., White, J.C., Coops, N.C., 
 *     2022. Land cover classification in an era of big and 
 *     open data: Optimizing localized implementation and 
 *     training data selection to improve mapping outcomes. 
 *     Remote Sensing of Environment. No. 112780. 
 *     DOI: https://doi.org/10.1016/j.rse.2022.112780 
 * 
 * @param {Array<Date>} dates - List of dates for the time series.
 * @param {Number} interval - Interval in months for each calculation.
 * @param {Object} aoi - Area of interest as GeoJSON or EE Geometry.
 * 
 * @return {ee.ImageCollection} ImageCollection containing 
 * proportions of remapped land cover classes for each year.
 */
exports.landcover_proportion = function(dates, interval, aoi) {
  /**
   * Processes the image for a specific date range.
   * 
   * @param {Date} d1 - Start date for the interval.
   * @return {ee.Image} Image containing proportions of remapped
   * land cover classes for the given date range.
   */
  var landcover_ts = function(d1) {
    var start = ee.Date(d1);
    var end = ee.Date(d1).advance(interval, 'month');
    var date = ee.Date(d1);

    // Filter collection for the specific date range
    var lcImage = ee.Image(ca_lc.filterDate(start, end).first())
      .remap(from, to)
      .clip(aoi);

    // Define remapped class IDs and names
    var classValues = to;
    var classNames = dict.names;

    // Function to calculate per-pixel proportions
    var calculateProportions = function(image) {
      var proportions = classValues.map(function(value) {
        var classMask = image.eq(value);
        return classMask.rename('Proportion_' + value);
      });
      return ee.Image(proportions);
    };

    var lcProportions = calculateProportions(lcImage)
      .unmask(0)
      .clip(aoi);

    // Rename bands with readable names
    var renameBands = function(image) {
      return ee.Image(classValues.map(function(value, index) {
        return image.select(index).rename(classNames[index]);
      }));
    };

    var renamedProportions = renameBands(lcProportions);
    return renamedProportions.set("year", date.get('year'));
  };

  // Generate annual land cover proportions
  return ee.ImageCollection(dates.map(landcover_ts))
    .map(function(img) { return img.clip(aoi); });
};

/**
 * Function to calculate remapped class proportions
 * with a neighborhood kernel.
 * 
 * Uses data from:
 *     Hermosilla, T., Wulder, M.A., White, J.C., Coops, N.C., 
 *     2022. Land cover classification in an era of big and 
 *     open data: Optimizing localized implementation and 
 *     training data selection to improve mapping outcomes. 
 *     Remote Sensing of Environment. No. 112780. 
 *     DOI: https://doi.org/10.1016/j.rse.2022.112780 
 * 
 * @param {Array<Date>} dates - List of dates for the time series.
 * @param {Number} interval - Interval in months.
 * @param {Number} kernel_size - Kernel size in meters.
 * @param {Object} aoi - Area of interest as GeoJSON or EE Geometry.
 * 
 * @return {ee.ImageCollection} ImageCollection containing 
 * focal proportions of remapped land cover classes.
 */
exports.landcover_proportion_focal = function(
  dates, interval, kernel_size, aoi
) {
  /**
   * Processes the image for a specific date range.
   * 
   * @param {Date} d1 - Start date for the interval.
   * @return {ee.Image} Image containing focal proportions of
   * remapped land cover classes for the given date range.
   */
  var landcover_ts = function(d1) {
    var start = ee.Date(d1);
    var end = ee.Date(d1).advance(interval, 'month');
    var date = ee.Date(d1);

    // Filter collection for the specific date range
    var lcImage = ee.Image(ca_lc.filterDate(start, end).first())
      .remap(from, to)
      .clip(aoi);

    // Define kernel radius in meters and pixels
    var radiusInMeters = kernel_size;
    var projection = lcImage.projection();
    var radiusInPixels = ee.Number(radiusInMeters)
      .divide(projection.nominalScale())
      .round();
    var kernel = ee.Kernel.circle(radiusInPixels, 'pixels');

    // Define remapped class IDs and names
    var classValues = to;
    var classNames = dict.names;

    // Function to calculate proportions within the kernel
    var calculateProportions = function(image) {
      var proportions = classValues.map(function(value) {
        var classCount = image.updateMask(image.eq(value))
          .reduce(ee.Reducer.count());
        var totalCount = image.reduce(ee.Reducer.count());
        return classCount.divide(totalCount)
          .rename('Proportion_' + value);
      });
      return ee.Image(proportions);
    };

    var lcProportions = calculateProportions(
      lcImage.neighborhoodToBands(kernel)
    ).unmask(0).clip(aoi);

    // Rename bands with readable names
    var renameBands = function(image) {
      return ee.Image(classValues.map(function(value, index) {
        return image.select(index).rename(classNames[index]);
      }));
    };

    var renamedProportions = renameBands(lcProportions);
    
        // Add kernel size suffix to band names
    var bandNames = renamedProportions.bandNames();
    var appendKernelSize = function(bandName) {
      return ee.String(bandName)
        .cat("_")
        .cat(radiusInMeters.toString());
    };
    renamedProportions = renamedProportions.rename(
      bandNames.map(appendKernelSize)
    );

    return renamedProportions
      .set("year", date.get('year'));
  };

  // Generate focal land cover proportions
  return ee.ImageCollection(dates.map(landcover_ts))
    .map(function(img) { return img.clip(aoi); });
};