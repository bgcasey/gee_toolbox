# ---
# title: Generate Annual ClimateNA Values to XY Locations
# author: Brendan Casey
# created: 2025-01-17
# inputs:
#   - CSV file with lat/lon coordinates (EPSG:4326)
#   - DEM raster (EPSG:4326) (optional if CSV does not have
#     elevation column)
# outputs:
#   - climate variables as values in a .csv table
# notes:
#   Generates annual ClimateNA climate values to lat lon coordinates
#   using the ClimateNAr package.
# dependencies:
#   ClimateNAr package. Download from
#   https://register.climatena.ca/
# ---

# 1. Setup ----

## 1.1 Load packages ----
library(tidyverse)
library(ClimateNAr)
library(terra)

## 1.2 Load input CSV ----
# ClimateNAr requires a csv with lat/lon coordinates (EPSG:4326)
csv_path <- file.path(
  "D:/local_projects/",
  "invasive_species_indicator",
  "0_data",
  "processed",
  "species",
  "combined",
  "invsp_all_2026-01-24.csv"
)

# DEM path (optional if CSV does not have elevation column)
# ClimateNAr requires elevation data to extract climate values/
dem_path <- file.path(
  "D:/temp_spatial_data",
  "fabdem_full",
  "fab_dem_us_canada.tif"
)

## 1.3 Create output directory ----
output_dir <- file.path(
  "D:/temp_data",
  "climate_na",
  "annual"
)
if (!dir.exists(output_dir)) {
  dir.create(output_dir, recursive = TRUE)
}

## 1.4 Define variables of interest ----
# Variables: 'Y' = all annual, 'S' = seasonal, 'M' = monthly
# Or specify: c('MAT', 'MAP', 'TD', 'AHM', 'SHM')
var_list <- "YS"

# Define periods of interest
# Define start and end years
start_year <- 2000
end_year <- 2024

# Generate period list dynamically from start and end years
period_list <- c(
  paste0("Year_", start_year:end_year, ".ann"),
  "Normal_1991_2020"
)

## 1.5 Set conditional flags ----
# Prepare input CSV (TRUE/FALSE)
prepare_csv <- TRUE

# Combine annual data into single CSV (TRUE/FALSE)
combine_annual_data <- TRUE

# Combine normal and annual data into single CSV (TRUE/FALSE)
combine_normal_and_annual_data <- TRUE

# 2. Prepare input CSV (optional) ----
# Should be a CSV with columns ID1, ID2, lat, long, el

if (prepare_csv) {
  # Load input CSV
  input_df <- read_csv(csv_path)

  # Load dem
  dem <- terra::rast(dem_path)

  # Ensure ID columns are named correctly
  colnames(input_df)[which(colnames(input_df) == "site")] <- "ID1"
  colnames(input_df)[which(colnames(input_df) == "source")] <- "ID2"
  colnames(input_df)[which(colnames(input_df) == "year")] <- "ID3"

  # Ensure lat/long columns are named correctly
  colnames(input_df)[which(colnames(input_df) == "latitude")] <- "lat"
  colnames(input_df)[which(colnames(input_df) == "longitude")] <- "long"

  # Select only required columns
  input_df <- input_df %>% select(c("ID1",
                                    "ID2",
                                    "lat",
                                    "long",
                                    "el")
  ) %>%
    distinct()

  # Extract elevation values from DEM if not present
  if (!"el" %in% colnames(input_df)) {
    message("Extracting elevation values from DEM...")
    coords <- input_df[, c("long", "lat")]
    elev_values <- terra::extract(dem, coords)
    input_df$el <- elev_values[, 2]
  }

  # Save modified CSV
  input_csv <- file.path(
    "D:/temp_data",
    "climate_na",
    "annual",
    "climate_na_input_locations.csv"
  )
  write.csv(input_df, input_csv, row.names = FALSE)
} else {
  input_csv <- csv_path
}

# 3. Generate ClimateNA values ----
message("Generating ClimateNA values...")

# Run ClimateNAr
climate_data <- ClimateNAr(
  inputFile = input_csv_2,
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

# 4. Combine annual climate data (optional) ----
if (combine_annual_data) {
  year_range <- start_year:end_year

  # Load original data with year column
  orig <- read_csv(csv_path, show_col_types = FALSE) %>%
    rename(
      ID1 = site,
      ID2 = source,
      lat = latitude,
      long = longitude
    ) %>%
    select(ID1, ID2, year, lat, long) %>%
    distinct()

  yearly_clean <- map(year_range, function(yr) {
    message(paste("Processing year", yr))
    f <- file.path(
      output_dir,
      sprintf(
        "annualclimate_na_input_locations_Year_%s.csv",
        yr
      )
    )
    if (!file.exists(f)) {
      warning(
        "Missing file for year ",
        yr,
        ": ",
        f
      )
      return(NULL)
    }
    read_csv(f, show_col_types = FALSE) %>%
      left_join(
        orig %>% select(ID1, ID2, year, lat, long),
        by = c("ID1", "ID2", "lat", "long")
      ) %>%
      dplyr::select(
        ID1,
        ID2,
        year,
        lat,
        long,
        el,
        everything()
      ) %>%
      filter(year == yr)
  }) %>%
    list_rbind()

  # Save combined data
  output_file <- file.path(
    output_dir,
    "climate_na_annual_combined.csv"
  )
  write.csv(yearly_clean, output_file, row.names = FALSE)
  message(paste("Combined data saved to:", output_file))
}

# 5. Combine normal and annual climate data (optional) ----
if (combine_normal_and_annual_data) {
  # Load normal data
  normal_file <- file.path(
    output_dir,
    "annualclimate_na_input_locations_Normal_1991_.csv"
  )
  normal_data <- read_csv(normal_file, show_col_types = FALSE) %>%
    rename_with(~ paste0(., "_normal"), -c(ID1, ID2, lat, long, el))

  # Merge with yearly data
  final_data <- yearly_clean %>%
    left_join(
      normal_data,
      by = c("ID1", "ID2", "lat", "long", "el")
    )

  # Save final combined data
  final_output_file <- file.path(
    output_dir,
    "climate_na_annual_with_normal_combined.csv"
  )
  write.csv(final_data, final_output_file, row.names = FALSE)
  message(paste("Final combined data with normals saved to:",
                final_output_file)
  )
}

# End of script ----