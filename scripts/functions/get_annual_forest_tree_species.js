/**
 * title: Get annual forest species classes
 * author: Brendan Casey
 * date: 2025-03-26
 * 
 * description: Function to get annual species data
 * from High-resolution Annual Forest Species Maps
 * for Canada's Forested Ecosystems.
 *
 * data citation: Hermosilla, T., Wulder, M.A., White,
 * J.C., Coops, N.C., 2022. Land cover classification
 * in an era of big and open data: Optimizing localized
 * implementation and training data selection to improve
 * mapping outcomes. Remote Sensing of Environment.
 * No. 112780. DOI:
 * https://doi.org/10.1016/j.rse.2022.112780 [Open Access]
 *
 * example usage:
 * var aoi = ee.Geometry.Polygon([[
 *   [-120.0, 60.0], [-110.0, 60.0],
 *   [-110.0, 50.0], [-120.0, 50.0]
 * ]]);
 * var speciesImages = exports.species_fn(
 *   '2022-01-01', '2022-12-31', aoi
 * );
 * Map.centerObject(aoi, 6);
 * Map.addLayer(speciesImages.first(), 
 *   {min: 0, max: 37, palette: dict['colors']}, 
 *   'Alberta Forest Species'
 * );
 */

/**
 * Function to process forest species data within a date
 * range and area of interest.
 * 
 * @param {string} startDate - Start date string for the
 * image collection.
 * @param {string} endDate - End date string for the
 * image collection.
 * @param {Object} aoi - Area of interest as an ee.Geometry
 * object.
 * @returns {ee.ImageCollection} - Processed images clipped
 * to AOI.
 */
exports.species_fn = function(startDate, endDate, aoi) {
  // Get species collection for the date range
  var speciesCollection = ee.ImageCollection(
    'projects/sat-io/open-datasets/CA_FOREST_SPECIES'
  ).filterDate(startDate, endDate);

  // Apply area of interest (AOI) filter if provided
  if (aoi) {
    speciesCollection = speciesCollection.filterBounds(aoi);
  }

  // Select and rename the band, clip to AOI if provided
  speciesCollection = speciesCollection.map(function(image) {
    var img = image.select('species').rename('forest_species_class');
    if (aoi) {
      img = img.clip(aoi);
    }
    return img.set({
      "start_date": ee.Date(startDate)
        .format('YYYY-MM-dd'), 
      "end_date": ee.Date(endDate)
        .format('YYYY-MM-dd'), 
      "year": ee.Date(image.get('system:time_start'))
        .get('year')
    });
  });

  return speciesCollection;
};