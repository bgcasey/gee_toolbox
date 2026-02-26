<!--
<img src="https://drive.google.com/uc?id=1fgYuG7jpnekZrkoL_PdVUnSiUFBFX-vI" alt="Logo" width="150" style="float: left; margin-right: 10px;">
-->

<img src="https://drive.google.com/uc?id=1szqLViKqTX5C1XF8uV7HbIst0i6Xvv7g" alt="Logo" width="300">

# Google Earth Engine Toolbox

![In Development](https://img.shields.io/badge/Status-In%20Development-yellow) 
![Languages](https://img.shields.io/badge/Languages-JavaScript-blue)


A collection of Google Earth Engine workflows and helper functions for satellite time series processing, spectral index generation, terrain and hydrological metrics, and general geospatial preprocessing. 

This is a sibling repository to the Science Centre's [Spatial Data Catalog and Management Guide](https://github.com/bgcasey/spatial_data_catalog) and [Geospatial Preprocessing and Extraction Toolkit](https://github.com/bgcasey/geospatial_preprocessing_and_extraction_toolkit).

## Features

### **Preprocessing Scripts**
Preprocessing scripts include general functions for preparing raw geospatial data for analysis, including:
- **Spectral Index Calculation**: Compute common vegetation indices (e.g., NDVI, EVI) from satellite imagery.
- **Focal Statistics**: Derive neighborhood-based metrics (e.g., mean, standard deviation) for raster data.
- **Mosaic Creation**: Merge downloaded raster tiles into a single continuous layer.


### **Google Earth Engine Vignette**
A [vignette](google_earth_engine_vignette.md) with instructions on how to setup GEE and load and run Science Centre scripts and helper functions [^1] from within the [Earth Engine Code Editor](code.earthengine.google.com) 


---


[^1]: The Google Earth Engine JavaScript files can be added directly to your Google Earth Engine Code Editor using [https://code.earthengine.google.com/?accept_repo=users/bgcasey/science_centre](https://code.earthengine.google.com/?accept_repo=users/bgcasey/science_centre).


