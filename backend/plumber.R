library(dplyr)
library(jsonlite)
library(readr)

source("api/cache_helpers.R")
source("api/player.R")
source("api/pitches.R")
source("api/stats.R")
source("api/export.R")

# Helper: write a JSON string directly into the response body (avoids plumber
# re-serializing a character as a JSON string-within-a-string).
json_response <- function(res, json_str) {
  res$setHeader("Content-Type", "application/json; charset=utf-8")
  res$body <- json_str
  res
}

# ── CORS ─────────────────────────────────────────────────────────────────────

#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "http://localhost:4000")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 200
    return(list())
  }
  plumber::forward()
}

# ── Player ────────────────────────────────────────────────────────────────────

#* @get /api/player/search
function(req, res, q = "") {
  if (nchar(trimws(q)) < 2) {
    return(json_response(res, "[]"))
  }
  results <- search_players(q)
  if (is.null(results) || nrow(results) == 0) {
    return(json_response(res, "[]"))
  }
  json_response(res, jsonlite::toJSON(results, na = "null", auto_unbox = TRUE))
}

#* @get /api/player/info
function(req, res, mlbam_id) {
  id  <- as.integer(mlbam_id)
  key <- paste0("player_info_", id)
  cached <- cache_get(key, ttl_seconds = 86400 * 7)
  if (!is.null(cached)) return(json_response(res, cached))
  info   <- get_player_bio(id)
  result <- jsonlite::toJSON(info, na = "null", auto_unbox = TRUE)
  cache_set(key, result)
  json_response(res, result)
}

# ── Stats ─────────────────────────────────────────────────────────────────────

#* @get /api/stats/season
function(req, res, mlbam_id, season) {
  id  <- as.integer(mlbam_id)
  yr  <- as.integer(season)
  key <- paste0("stats_season_", id, "_", yr)
  cached <- cache_get(key, ttl_seconds = 3600)
  if (!is.null(cached)) return(json_response(res, cached))
  stats  <- get_season_stats(id, yr)
  result <- jsonlite::toJSON(stats, na = "null", auto_unbox = TRUE)
  cache_set(key, result)
  json_response(res, result)
}

#* @get /api/stats/career
function(req, res, mlbam_id) {
  id  <- as.integer(mlbam_id)
  key <- paste0("stats_career_", id)
  cached <- cache_get(key, ttl_seconds = 86400)
  if (!is.null(cached)) return(json_response(res, cached))
  stats  <- get_career_stats(id)
  result <- jsonlite::toJSON(stats, na = "null", auto_unbox = TRUE)
  cache_set(key, result)
  json_response(res, result)
}

#* @get /api/stats/saber
function(req, res, mlbam_id, season) {
  id  <- as.integer(mlbam_id)
  yr  <- as.integer(season)
  key <- paste0("stats_saber_", id, "_", yr)
  cached <- cache_get(key, ttl_seconds = 3600)
  if (!is.null(cached)) return(json_response(res, cached))
  stats  <- get_saber_stats(id, yr)
  result <- jsonlite::toJSON(stats, na = "null", auto_unbox = TRUE)
  cache_set(key, result)
  json_response(res, result)
}

#* @get /api/stats/gamelog
function(req, res, mlbam_id, season) {
  id  <- as.integer(mlbam_id)
  yr  <- as.integer(season)
  key <- paste0("gamelog_", id, "_", yr)
  cached <- cache_get(key, ttl_seconds = 3600)
  if (!is.null(cached)) return(json_response(res, cached))
  log    <- get_game_log(id, yr)
  result <- jsonlite::toJSON(log, na = "null", auto_unbox = TRUE)
  cache_set(key, result)
  json_response(res, result)
}

# ── Pitches ───────────────────────────────────────────────────────────────────

#* @get /api/pitches
function(req, res, mlbam_id, start_date, end_date) {
  id  <- as.integer(mlbam_id)
  key <- paste0("pitches_", id, "_",
                gsub("-", "", start_date), "_",
                gsub("-", "", end_date))

  current_year <- as.integer(format(Sys.Date(), "%Y"))
  start_year   <- as.integer(substr(start_date, 1, 4))
  ttl          <- ifelse(start_year >= current_year, 3600, 86400)

  cached <- cache_get(key, ttl_seconds = ttl)
  if (!is.null(cached)) {
    message("Cache hit: ", key)
    return(json_response(res, cached))
  }

  data <- fetch_statcast_chunked(id, start_date, end_date)

  if (is.null(data) || nrow(data) == 0) {
    result <- jsonlite::toJSON(list(pitches = list(), total = 0), auto_unbox = TRUE)
    cache_set(key, result)
    return(json_response(res, result))
  }

  data <- data %>%
    compute_tunnel_point() %>%
    dplyr::mutate(
      ihb = -pfx_x * 12,
      ivb =  pfx_z * 12,
      dplyr::across(where(is.factor), as.character)
    )

  result <- jsonlite::toJSON(
    list(pitches = data, total = nrow(data)),
    na = "null", auto_unbox = TRUE, digits = 4
  )
  cache_set(key, result)
  message("Cached ", key, " (", nrow(data), " pitches)")
  json_response(res, result)
}

#* @get /api/pitches/export
function(req, res, mlbam_id, start_date, end_date) {
  id  <- as.integer(mlbam_id)
  key <- paste0("pitches_", id, "_",
                gsub("-", "", start_date), "_",
                gsub("-", "", end_date))

  cached <- cache_get(key, ttl_seconds = 86400)

  if (!is.null(cached)) {
    parsed <- jsonlite::fromJSON(cached, simplifyDataFrame = TRUE)
    data   <- parsed$pitches
  } else {
    data <- fetch_statcast_chunked(id, start_date, end_date)
    if (is.null(data) || nrow(data) == 0) {
      res$status <- 404
      return("No data found")
    }
    data <- data %>%
      compute_tunnel_point() %>%
      dplyr::mutate(
        ihb = -pfx_x * 12,
        ivb =  pfx_z * 12,
        dplyr::across(where(is.factor), as.character)
      )
  }

  fname <- paste0("statcast_", id, "_", start_date, "_", end_date, ".csv")
  res$setHeader("Content-Type", "text/csv")
  res$setHeader("Content-Disposition", paste0('attachment; filename="', fname, '"'))
  res$body <- readr::format_csv(as.data.frame(data))
  res
}

# ── Export (arbitrary filtered/grouped view from the frontend) ────────────────

#* @parser json
#* @post /api/export/<format>
function(req, res, format) {
  handle_export(req, res, format)
}
