/**
 * Export Image Collection to Buffered Points
 * 
 * This function processes an image collection by applying a reducer 
 * to buffered point locations (or direct points if buffer size is 0). 
 * The function renames the extracted image properties and exports 
 * the results to Google Drive.
 * 
 * @param {number} bufferSize - Buffer size in meters around points.
 * @param {ee.Reducer} reducer - Reducer function to apply.
 * @param {ee.FeatureCollection} xyPoints - Collection of points.
 * @param {ee.Geometry} aoi - Area of interest to filter points.
 * @param {ee.ImageCollection} imageCollection - Image collection.
 * @param {string} crs - Coordinate Reference System (CRS) to use.
 * @param {number} scale - Scale in meters for reduction.
 * @param {number} tileScale - Tile scale for parallel processing.
 * @param {string} file_name - Prefix for the exported file.
 * 
 * @return {ee.FeatureCollection} Feature collection with extracted 
 * image properties and renamed attributes.
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
 * // Load an example ImageCollection. For demonstration, filter a 
 * // small date range of Sentinel-2 imagery over the AOI.
 * var imageCollection = ee.ImageCollection('COPERNICUS/S2')
 *   .filterDate('2020-06-01', '2020-06-10')
 *   .filterBounds(aoi)
 *   .select(['B4', 'B3', 'B2']);  // Example: Red, Green, Blue
 * 
 * // Call the function with example parameters.
 * var result = imageCollectionToPoints(
 *   1000,             // bufferSize
 *   ee.Reducer.mean(),// reducer
 *   examplePoints,    // xyPoints
 *   aoi,              // aoi
 *   imageCollection,  // imageCollection
 *   'EPSG:4326',      // crs
 *   30,               // scale
 *   1,                // tileScale
 *   'example_export'  // file_name
 * );
 * 
 * // Print the result to the console.
 * print('Example Result', result);
 */
exports.imageCollectionToPoints = function(
  bufferSize, 
  reducer, 
  xyPoints, 
  aoi, 
  imageCollection, 
  crs, 
  scale, 
  tileScale, 
  file_name
) {
  // Step 1: Create suffix using buffer size and reducer type
  var bufferStr = String(bufferSize);
  var reducerType = reducer.getInfo().type.split('.').pop();
  var suffix = ee.String(reducerType).cat('_').cat(bufferStr);

  // Step 2: Apply buffer to points or use them directly
  var processedPoints = xyPoints.filterBounds(aoi)
    .map(function(pt) {
      return bufferSize === 0 ? pt : pt.buffer(bufferSize);
    });

  // Step 3: Retrieve property names from points and images
  var xyProperties = ee.Feature(xyPoints.first()).propertyNames();
  var imgProperties = ee.Feature(imageCollection.first())
    .propertyNames();
  var combinedProperties = xyProperties.cat(imgProperties);

  // Step 4: Reduce regions using the provided reducer,
  // and copy image properties onto each feature
  var reducedRegion = imageCollection.map(function(img) {
    return img.reduceRegions({
      collection: processedPoints,
      crs: crs,
      reducer: reducer, 
      scale: scale, 
      tileScale: tileScale
    }).map(function(featureWithReduction) {
      // Copy image properties (e.g., system:index, etc.) to the feature
      return featureWithReduction.copyProperties(img);
    });
  }).flatten();

  // Step 5: Rename extracted properties with a suffix
  var renameProperties = function(feature) {
    var newProperties = ee.Dictionary(
      feature.propertyNames().map(function(name) {
        var newName = ee.Algorithms.If(
          combinedProperties.contains(name),
          name,
          ee.String(name).cat('_').cat(suffix)
        );
        return [newName, feature.get(name)];
      }).flatten()
    );
    return ee.Feature(feature.geometry(), newProperties);
  };

  var renamedFeatureCollection = reducedRegion.map(renameProperties);

  // Step 6: Export the final feature collection to Google Drive
  Export.table.toDrive({
    collection: renamedFeatureCollection,
    description: file_name,
    folder: "gee_exports",
    fileNamePrefix: file_name,
    fileFormat: 'CSV'
  });

  return renamedFeatureCollection;
};
