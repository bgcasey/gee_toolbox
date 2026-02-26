/**
 * imageToPoints
 * 
 * Processes points by optionally buffering them, applying a reducer to
 * the buffered regions (or directly to the points if the buffer size
 * is 0), and renaming the properties of the resulting features based
 * on the reducer type, buffer size, and specified CRS, scale, and
 * tileScale. The final collection is also exported to Google Drive as
 * a CSV.
 * 
 * @param {number} bufferSize - The buffer size (in meters) to apply to
 * points.
 * @param {Object} reducer - The ee.Reducer to apply to the buffered
 * regions.
 * @param {ee.FeatureCollection} xyPoints - The collection of points
 * for analysis.
 * @param {ee.FeatureCollection} aoi - The area of interest for
 * filtering points.
 * @param {ee.Image} image - The image to process for values at each
 * point.
 * @param {string} crs - The coordinate reference system to use (e.g.,
 * 'EPSG:4326').
 * @param {number} scale - The nominal scale in meters of the
 * projection to work at.
 * @param {number} tileScale - The scaling factor for large parallel
 * computations.
 * @param {string} fileName - The prefix for the exported file in
 * Google Drive.
 * @return {ee.FeatureCollection} The collection of features with
 * renamed properties.
 * 
 * @example
 * // Create an example FeatureCollection of points.
 * var point1 = ee.Feature(
 *   ee.Geometry.Point([-113.55, 55.20]),
 *   {id: 'point1'}
 * );
 * var point2 = ee.Feature(
 *   ee.Geometry.Point([-113.40, 55.30]),
 *   {id: 'point2'}
 * );
 * var examplePoints = ee.FeatureCollection([point1, point2]);
 * 
 * // Define the AOI as an ee.Geometry object with simplified
 * // coordinates (2 decimals).
 * var aoi = ee.Geometry.Polygon([
 *   [
 *     [-113.60, 55.15],
 *     [-113.60, 55.35],
 *     [-113.15, 55.35],
 *     [-113.15, 55.15],
 *     [-113.60, 55.15]
 *   ]
 * ]);
 * 
 * // Load an example image (SRTM elevation).
 * var image = ee.Image('CGIAR/SRTM90_V4');
 * 
 * // Call the function with example parameters.
 * var result = image_to_points(
 *   1000,
 *   ee.Reducer.mean(),
 *   examplePoints,
 *   ee.FeatureCollection([aoi]),
 *   image,
 *   'EPSG:4326',
 *   30,
 *   1,
 *   'example_export'
 * );
 * 
 * // Print the result to the console.
 * print('Example Result', result);
 */
exports.image_to_points = function image_to_points(
  bufferSize,
  reducer,
  xyPoints,
  aoi,
  image,
  crs,
  scale,
  tileScale,
  fileName
) {
  // Step 1: Prepare a string suffix based on buffer size and
  // reducer type.
  var bufferStr = String(bufferSize);
  var reducerInfo = reducer.getInfo();
  var reducerType = reducerInfo.type.split('.').pop();
  var suffix = ee.String(reducerType).cat('_').cat(bufferStr);

  // Step 2: Filter the input points by the AOI and buffer them
  // if bufferSize is not 0.
  var processedPoints = xyPoints.filterBounds(aoi).map(
    function (pt) {
      return bufferSize === 0
        ? pt
        : pt.buffer(bufferSize);
    }
  );

  // Step 3: Reduce the image over the processed points.
  var reducedRegions = image.reduceRegions({
    collection: processedPoints,
    reducer: reducer,
    crs: crs,
    scale: scale,
    tileScale: tileScale
  });

  // Step 4: Rename properties of each feature to include the suffix
  // for non-XY properties.
  var xyProperties = ee.Feature(xyPoints.first())
    .propertyNames();

  var renameProperties = function (feature) {
    var newProperties = ee.Dictionary(
      feature.propertyNames().map(function (name) {
        var newName = ee.Algorithms.If(
          xyProperties.contains(name),
          name,
          ee.String(name).cat('_').cat(suffix)
        );
        return [newName, feature.get(name)];
      }).flatten()
    );
    return ee.Feature(feature.geometry(), newProperties);
  };

  var renamedFeatureCollection = reducedRegions.map(
    renameProperties
  );

  // Step 5: Export the resulting collection to Google Drive and
  // return it.
  Export.table.toDrive({
    collection: renamedFeatureCollection,
    description: fileName,
    folder: 'gee_exports',
    fileNamePrefix: fileName,
    fileFormat: 'CSV'
  });

  return renamedFeatureCollection;
};
