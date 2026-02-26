/**
 * Applies Inverse Distance Weighting (IDW) interpolation to fill gaps in the image.
 * @param {ee.Image} image - The input image with gaps to fill.
 * @param {ee.Geometry} aoi - The area of interest for interpolation.
 * @param {number} range - The maximum distance (in meters) to search for values.
 * @param {number} gamma - The decay factor for the inverse distance.
 * @param {number} numPixels - The number of pixels to sample for interpolation.
 * @returns {ee.Image} - The image with gaps filled by interpolation.
 */
function applyIDWInterpolation(image, aoi, range, gamma, numPixels) {
  // Get the list of band names as an ee.List
  var bandNames = image.bandNames();

  // Function to interpolate a single band
  var interpolateBand = function(bandName) {
    bandName = ee.String(bandName);
    // Sample the image band to get known values
    var samples = image.select([bandName]).addBands(ee.Image.pixelLonLat())
      .sample({
        region: aoi,
        numPixels: numPixels,
        scale: 30,
        projection: 'EPSG:4326'
      })
      .map(function(sample) {
        var lat = sample.get('latitude');
        var lon = sample.get('longitude');
        var value = sample.get(bandName);
        // Return a feature with the band name set dynamically
        return ee.Feature(ee.Geometry.Point([lon, lat])).set(bandName, value);
      });

    // Estimate global mean and standard deviation from the samples
    var stats = samples.reduceColumns({
      reducer: ee.Reducer.mean().combine({
        reducer2: ee.Reducer.stdDev(),
        sharedInputs: true,
      }),
      selectors: [bandName]
    });

    // Apply IDW interpolation
    var interpolated = samples.inverseDistance({
      range: range,
      propertyName: bandName,
      mean: stats.get('mean'),
      stdDev: stats.get('stdDev'),
      gamma: gamma
    });

    // Return the interpolated band
    return interpolated.rename(bandName);
  };

  // Map the interpolation function over all band names
  var interpolatedBands = bandNames.map(function(bandName) {
    return interpolateBand(bandName);
  });

  // Combine all interpolated bands into a single image
  var interpolatedImage = ee.ImageCollection(interpolatedBands).toBands().clip(aoi);

  return interpolatedImage;
}

exports.applyIDWInterpolation = applyIDWInterpolation;

