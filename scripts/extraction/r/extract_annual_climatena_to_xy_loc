# ---
# title: Generate Annual ClimateNA Rasters
# author: Brendan Casey
# created: 2025-01-17
# inputs:
#   - ClimateNAr package (CRAN)
#   - DEM raster (EPSG:4326)
# outputs:
#   - climate variables as .tif rasters
# notes:
#   Generates annual ClimateNA climate rasters using the
#   ClimateNAr package.
# dependencies:
#   ClimateNAr package. Download from
#   https://register.climatena.ca/
# ---

# 1. Setup ----

## 1.1 Load packages ----
library(terra)
library(ClimateNAr)

## 1.2 Set terra options ----
terra::terraOptions(memfrac = 0.5)
terra::terraOptions()

## 1.3 Load DEM ----
# ClimateNAr requires lat/lon projection (EPSG:4326)
dem_path <- file.path(
  "D:/temp_spatial_data",
  "fabdem_full",
  "fab_dem_us_canada.tif"
)

## 1.4 Create output directory ----
output_dir <- file.path(
  "D:/temp_spatial_data",
  "climate_na_rasters",
  "annual"
)

## 1.5 Define variables of interest ----
# Variables: 'Y' = all annual, 'S' = seasonal, 'M' = monthly
# Or specify: c('MAT', 'MAP', 'TD', 'AHM', 'SHM')
var_list <- "YS"

# Define periods of interest
period_list <- c(
  "Year_2000.ann",
  "Year_2005.ann",
  "Year_2010.ann",
  "Year_2015.ann",
  "Year_2020.ann",
  "Year_2024.ann",
  "Normal_1991_2020"
)

## 1.6 Set conditional flags ----
rescale_dem <- TRUE
convert_to_integer <- TRUE

# 2. Rescale DEM (optional) ----
# Rescale to ~1km resolution while maintaining EPSG:4326
# At equator: 1km ≈ 0.0083 degrees; resolution varies with
# latitude

if (rescale_dem) {
  message("Rescaling DEM to ~1km resolution...")

  dem <- terra::rast(dem_path)

  # Calculate resolution factor (aggregate every N cells to
  # achieve ~1km). Original resolution in degrees
  current_res <- terra::res(dem)
  message(
    paste(
      "Current resolution:",
      round(current_res[1], 6),
      "degrees"
    )
  )

  # Target resolution in degrees (~1km at equator)
  target_res_deg <- 0.008983

  # Calculate aggregation factor
  agg_factor <- round(target_res_deg / current_res[1])
  agg_factor <- max(agg_factor, 1)

  message(paste("Aggregation factor:", agg_factor))

  if (agg_factor > 1) {
    # Aggregate by taking mean of cell values
    dem <- terra::aggregate(
      dem,
      fact = agg_factor,
      fun = "mean"
    )

    new_res <- terra::res(dem)
    message(
      paste(
        "New resolution:",
        round(new_res[1], 6),
        "degrees (~1km)"
      )
    )

    # Save aggregated raster
    agg_out_path <- sub("\\.tif$", "_1km.tif", dem_path)
    terra::writeRaster(
      dem,
      agg_out_path,
      overwrite = TRUE
    )
    dem_agg_path <- agg_out_path
    message(paste("Aggregated DEM saved to:", dem_agg_path))

    # Verify CRS is still EPSG:4326
    message(
      paste(
        "CRS:",
        terra::crs(dem, describe = TRUE)$code
      )
    )
  }
}

# 3. Convert DEM values to integer (optional) ----
# Load and convert to integer to reduce memory usage
if (convert_to_integer) {
  if (rescale_dem) {
    dem <- terra::as.int(dem)
  } else {
    dem <- terra::rast(dem_path)
    dem <- terra::as.int(dem)
  }
  dem_int_path <- sub("\\.tif$", "_int.tif", dem_path)
  terra::writeRaster(dem, dem_int_path, overwrite = TRUE)
  message(
    paste(
      "DEM converted to integer and saved to:",
      dem_int_path
    )
  )
}

rm(list = ls()[sapply(ls(), function(x) inherits(get(x), "SpatRaster"))])
gc()

# 4. Generate ClimateNA rasters ----
message("Generating ClimateNA rasters...")

# Determine which DEM file to use
if (rescale_dem && convert_to_integer) {
  dem_path_for_climate <- dem_int_path
} else if (rescale_dem && !convert_to_integer) {
  dem_path_for_climate <- dem_agg_path
} else if (!rescale_dem && convert_to_integer) {
  dem_path_for_climate <- dem_int_path
} else {
  dem_path_for_climate <- dem_path
}

# Run ClimateNAr
climate_data <- ClimateNAr(
  inputFile = dem_path_for_climate,
  periodList = period_list,
  varList = var_list,
  outDir = output_dir
)

message(
  paste(
    "Climate data extracted. Files saved to:",
    output_dir
  )
)

# End of script ----
