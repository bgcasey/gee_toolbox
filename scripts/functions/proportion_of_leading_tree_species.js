
/**
 * Function to calculate proportions of leading tree species
 * annually across a given area of interest (AOI). 
 * 
 * Uses data from:
 * 
 * Hermosilla, T., Wulder, M.A., White, J.C., Coops, N.C., 
 * Bater, C.W., Hobart, G.W., 2024. Characterizing long-term 
 * tree species dynamics in Canada's forested ecosystems 
 * using annual time series remote sensing data. Forest Ecology 
 * and Management 572, 122313. 
 * https://doi.org/10.1016/j.foreco.2024.122313 
 * (Hermosilla et al. 2024)
 * 
 * @param {Array<Date>} dates - List of dates for the time series.
 * @param {Number} interval - Interval in months for each calculation.
 * @param {Number} kernel_size - Kernel size in meters.
 * @param {Object} aoi - Area of interest as a GeoJSON or EE Geometry.
 * 
 * @return {ee.ImageCollection} Image collection containing proportions
 * of leading tree species for each year.
 * 
 * @example
 * // Define the AOI as an ee.Geometry object
 * var aoi = ee.Geometry.Polygon([
 *   [
 *     [-113.60000044487279, 55.15000133914695],
 *     [-113.60000044487279, 55.35000089418191],
 *     [-113.15000137891523, 55.35000086039801],
 *     [-113.15000138015347, 55.15000133548429],
 *     [-113.60000044487279, 55.15000133914695]
 *   ]
 * ]);
 *
 * // Define the dates and interval
 * var dates = ['2020-01-01', '2021-01-01', '2022-01-01'];
 * var interval = 12; // 12 months = 1 year
 * var kernel_size = 500; // Kernel size in meters
 *
 * // Call the function
 * var result = tsp.tree_species_proportion(dates, interval, kernel_size, aoi);
 * 
 * // Print the result
 * print('Tree Species Proportions:', result);
 */
exports.tree_species_proportion_focal = function(dates, interval, kernel_size, aoi) {
  /**
   * Processes the image for a specific date range.
   * 
   * @param {Date} d1 - Start date for the interval.
   * @return {ee.Image} Image containing proportions for the
   * given date range.
   */
  var species_ts = function(d1) {
    var start = ee.Date(d1);
    var end = ee.Date(d1).advance(interval, 'month');
    var date = ee.Date(d1);

    // Load tree species image collection
    var species = ee.ImageCollection(
      "projects/sat-io/open-datasets/CA_FOREST/SPECIES-1984-2022"
    )
    .filterDate(start, end)
    .first()
    .clip(aoi);

    // Define the kernel radius in meters and pixels
    var radiusInMeters = kernel_size;
    var projection = species.projection();
    var radiusInPixels = ee.Number(radiusInMeters)
      .divide(projection.nominalScale())
      .round();

    // Create a circular kernel
    var kernel = ee.Kernel.circle(radiusInPixels, 'pixels');

    // Define tree species IDs and names in snake case
    var speciesValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 
      13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 
      28, 29, 30, 31, 32, 33, 34, 35, 36, 37];
    var speciesNames = [
      "non_tree", "amabilis_fir", "balsam_fir", "subalpine_fir", 
      "bigleaf_maple", "red_maple", "sugar_maple", "gray_alder", 
      "red_alder", "yellow_birch", "white_birch", "yellow_cedar", 
      "black_ash", "tamarack", "western_larch", "norway_spruce", 
      "engelmann_spruce", "white_spruce", "black_spruce", 
      "red_spruce", "sitka_spruce", "whitebark_pine", "jack_pine", 
      "lodgepole_pine", "ponderosa_pine", "red_pine", 
      "eastern_white_pine", "balsam_poplar", "largetooth_aspen", 
      "trembling_aspen", "douglas_fir", "red_oak", 
      "eastern_white_cedar", "western_redcedar", "eastern_hemlock", 
      "western_hemlock", "mountain_hemlock", "white_elm"
    ];

    // Function to calculate proportions within the kernel
    var calculateSpeciesProportions = function(image) {
      var proportions = speciesValues.map(function(value) {
        var classCount = image.updateMask(image.eq(value))
          .reduce(ee.Reducer.count());
        var totalCount = image.reduce(ee.Reducer.count());
        var proportion = classCount.divide(totalCount)
          .rename('Proportion_' + value);
        return proportion;
      });
      return ee.Image(proportions);
    };

    // Calculate proportions and unmask missing data
    var speciesProportions = calculateSpeciesProportions(
      species.neighborhoodToBands(kernel)
    ).unmask(0).clip(aoi);

    // Rename bands with readable names in snake case
    var renameBands = function(image) {
      return ee.Image(speciesValues.map(function(value, index) {
        return image.select(index).rename(speciesNames[index]);
      }));
    };

    var renamedProportions = renameBands(speciesProportions);

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

    return renamedProportions.set("year", date.get('year'));
  };

  // Generate annual tree species proportions
  var species_focal_ts = ee.ImageCollection(
    dates.map(species_ts)
  ).map(function(img) { return img.clip(aoi); });

  return species_focal_ts;
};


/**
 * Function to calculate per-pixel proportions of leading tree species
 * annually across a given area of interest (AOI).
 * 
 * Uses data from:
 * 
 * Hermosilla, T., Wulder, M.A., White, J.C., Coops, N.C., 
 * Bater, C.W., Hobart, G.W., 2024. Characterizing long-term 
 * tree species dynamics in Canada's forested ecosystems 
 * using annual time series remote sensing data. Forest Ecology 
 * and Management 572, 122313. 
 * https://doi.org/10.1016/j.foreco.2024.122313 
 * (Hermosilla et al. 2024)
 * 
 * @param {Array<Date>} dates - List of dates for the time series.
 * @param {Number} interval - Interval in months for each calculation.
 * @param {Object} aoi - Area of interest as a GeoJSON or EE Geometry.
 * 
 * @return {ee.ImageCollection} Image collection containing proportions
 * of leading tree species for each year.
 * 
 * @example
 * // Define the AOI as an ee.Geometry object
 * var aoi = ee.Geometry.Polygon([
 *   [
 *     [-113.60000044487279, 55.15000133914695],
 *     [-113.60000044487279, 55.35000089418191],
 *     [-113.15000137891523, 55.35000086039801],
 *     [-113.15000138015347, 55.15000133548429],
 *     [-113.60000044487279, 55.15000133914695]
 *   ]
 * ]);
 *
 * // Define the dates and interval
 * var dates = ['2020-01-01', '2021-01-01', '2022-01-01'];
 * var interval = 12; // 12 months = 1 year
 *
 * // Call the function
 * var result = tsp.tree_species_proportion(dates, interval, aoi);
 * 
 * // Print the result
 * print('Tree Species Proportions:', result);
 */
exports.tree_species_proportion = function(dates, interval, aoi) {
  
  /**
   * Processes the image for a specific date range.
   * 
   * @param {Date} d1 - Start date for the interval.
   * @return {ee.Image} Image containing proportions of leading tree
   * species for the given date range.
   */
  var species_ts = function(d1) {
    var start = ee.Date(d1);
    var end = ee.Date(d1).advance(interval, 'month');
    var date = ee.Date(d1);

    // Load tree species image collection
    var species = ee.ImageCollection(
      "projects/sat-io/open-datasets/CA_FOREST/SPECIES-1984-2022"
    )
    .filterDate(start, end)
    .first()
    .clip(aoi);

    // Define tree species IDs and names in snake case
    var speciesValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 
      14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 
      30, 31, 32, 33, 34, 35, 36, 37];
    var speciesNames = [
      "non_tree", "amabilis_fir", "balsam_fir", "subalpine_fir", 
      "bigleaf_maple", "red_maple", "sugar_maple", "gray_alder", 
      "red_alder", "yellow_birch", "white_birch", "yellow_cedar", 
      "black_ash", "tamarack", "western_larch", "norway_spruce", 
      "engelmann_spruce", "white_spruce", "black_spruce", 
      "red_spruce", "sitka_spruce", "whitebark_pine", "jack_pine", 
      "lodgepole_pine", "ponderosa_pine", "red_pine", 
      "eastern_white_pine", "balsam_poplar", "largetooth_aspen", 
      "trembling_aspen", "douglas_fir", "red_oak", 
      "eastern_white_cedar", "western_redcedar", "eastern_hemlock", 
      "western_hemlock", "mountain_hemlock", "white_elm"
    ];

    // Function to calculate per-pixel proportions
    var calculateSpeciesProportions = function(image) {
      var proportions = speciesValues.map(function(value) {
        var classMask = image.eq(value);
        var proportion = classMask.rename('Proportion_' + value);
        return proportion;
      });
      return ee.Image(proportions);
    };

    // Calculate per-pixel proportions
    var speciesProportions = calculateSpeciesProportions(species)
      .unmask(0).clip(aoi);

    // Rename bands with readable names in snake case
    var renameBands = function(image) {
      return ee.Image(speciesValues.map(function(value, index) {
        return image.select(index).rename(speciesNames[index]);
      }));
    };

    var renamedProportions = renameBands(speciesProportions);

    return renamedProportions.set("year", date.get('year'));
  };

  // Generate annual tree species proportions
  var species_focal_ts = ee.ImageCollection(
    dates.map(species_ts)
  ).map(function(img) { return img.clip(aoi); });

  return species_focal_ts;
};
