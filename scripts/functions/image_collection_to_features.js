/**
 * Export Image Collection to Features
 * 
 * This function processes an image collection by applying a 
 * reducer to feature regions (e.g., polygons or buffered 
 * points). The function renames the extracted image 
 * properties and exports the results to Google Drive.
 * 
 * @param {ee.Reducer} reducer - Reducer function to apply.
 * @param {ee.FeatureCollection} features - Collection of 
 * features (e.g., polygons, buffered points).
 * @param {ee.Geometry} aoi - Area of interest to filter 
 * features.
 * @param {ee.ImageCollection} imageCollection - Image 
 * collection.
 * @param {string} crs - Coordinate Reference System (CRS) 
 * to use.
 * @param {number} scale - Scale in meters for reduction.
 * @param {number} tileScale - Tile scale for parallel 
 * processing.
 * @param {string} file_name - Prefix for the exported file.
 * 
 * @return {ee.FeatureCollection} Feature collection with 
 * extracted image properties and renamed attributes.
 * 
 * @example
 * // 1. Create points and buffer them (so each is a small 
 * // polygon).
 * var point1 = ee.Feature(
 *   ee.Geometry.Point([-113.55, 55.20]),
 *   {id: 'point1'}
 * );
 * var point2 = ee.Feature(
 *   ee.Geometry.Point([-113.40, 55.30]),
 *   {id: 'point2'}
 * );
 * // Buffer points by 250 meters to make polygons
 * var bufferSize = 250;
 * var bufferedPoints = ee.FeatureCollection([
 *   point1.buffer(bufferSize),
 *   point2.buffer(bufferSize)
 * ]);
 * 
 * // 2. Define an AOI as a simple polygon
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
 * // 3. Load an example ImageCollection and filter
 * var imageCollection = ee.ImageCollection('COPERNICUS/S2')
 *   .filterDate('2020-06-01', '2020-06-10')
 *   .filterBounds(aoi)
 *   .select(['B4', 'B3', 'B2']); // Red, Green, Blue
 * 
 * // 4. Call the function with example parameters.
 * var result = imageCollectionToFeaturesSimple(
 *   ee.Reducer.mean(),      // reducer
 *   bufferedPoints,         // features (polygons)
 *   aoi,                    // aoi
 *   imageCollection,        // imageCollection
 *   'EPSG:4326',            // crs
 *   30,                     // scale
 *   1,                      // tileScale
 *   'example_export'        // file_name
 * );
 * 
 * // 5. Print the result to the console.
 * print('Example Result', result);
 */

exports.imageCollectionToFeatures = function(
  reducer, 
  features, 
  aoi, 
  imageCollection, 
  crs, 
  scale, 
  tileScale, 
  file_name
) {
  // Step 1: Create suffix using reducer type
  var reducerType = reducer.getInfo().type.split('.').pop();
  var suffix = ee.String(reducerType);

  // Step 2: Filter features by AOI
  var processedFeatures = features.filterBounds(aoi);

  // Step 3: Retrieve property names from features and images
  var featureProperties = ee.Feature(
    features.first()
  ).propertyNames();
  var imgProperties = ee.Feature(
    imageCollection.first()
  ).propertyNames();
  var combinedProperties = featureProperties.cat(
    imgProperties
  );

  // Step 4: Reduce regions using the provided reducer,
  // and copy image properties onto each feature
  var reducedRegion = imageCollection.map(function(img) {
    return img.reduceRegions({
      collection: processedFeatures,
      crs: crs,
      reducer: reducer, 
      scale: scale, 
      tileScale: tileScale
    }).map(function(
      featureWithReduction
    ) {
      // Copy image properties (e.g., system:index)
      return featureWithReduction.copyProperties(
        img
      );
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
    return ee.Feature(
      feature.geometry(), 
      newProperties
    );
  };

  var renamedFeatureCollection = reducedRegion.map(
    renameProperties
  );

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