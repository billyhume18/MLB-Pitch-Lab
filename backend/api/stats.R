library(baseballr)
library(dplyr)
library(httr2)
library(jsonlite)

# baseballr 2.0.0 removed the player_id argument from mlb_stats() (it's now a
# player_pool/leaderboard endpoint, not a per-player one), so per-player
# season/career/gameLog/sabermetrics stats are fetched directly from the MLB
# Stats API's /people/{id}/stats endpoint instead.
MLB_STATS_BASE <- "https://statsapi.mlb.com/api/v1"

# MLB Stats API nests each stat under stat.* and a few identifiers under
# game.*/opponent.* after jsonlite's flatten; rename to the flat names the
# frontend already looks for (it falls back between snake_case and
# camelCase, so only the non-obvious renames are needed here).
clean_stat_names <- function(df) {
  names(df) <- sub("^stat\\.", "", names(df))
  names(df)[names(df) == "game.gamePk"]   <- "game_pk"
  names(df)[names(df) == "opponent.name"] <- "opponent"
  df
}

fetch_people_stats <- function(player_id, stat_type, stat_group = "pitching", season = NULL) {
  tryCatch({
    req <- httr2::request(paste0(MLB_STATS_BASE, "/people/", player_id, "/stats")) |>
      httr2::req_url_query(stats = stat_type, group = stat_group, season = season) |>
      httr2::req_user_agent("pitch-lab-research-tool/1.0")
    resp  <- httr2::req_perform(req)
    body  <- httr2::resp_body_string(resp)
    parsed <- jsonlite::fromJSON(body, flatten = TRUE)

    stats_list <- parsed$stats
    if (is.null(stats_list) || length(stats_list) == 0) return(tibble::tibble())
    splits <- stats_list$splits[[1]]
    if (is.null(splits) || length(splits) == 0 || nrow(splits) == 0) return(tibble::tibble())

    clean_stat_names(tibble::as_tibble(splits))
  }, error = function(e) {
    message("fetch_people_stats(", stat_type, ") failed: ", e$message)
    tibble::tibble()
  })
}

get_season_stats <- function(player_id, season) fetch_people_stats(player_id, "season", season = season)
get_career_stats <- function(player_id)         fetch_people_stats(player_id, "career")
get_game_log     <- function(player_id, season) fetch_people_stats(player_id, "gameLog", season = season)

# FIP / xFIP / FIP- / WAR, computed by MLB Stats API itself (avoids
# baseballr's fip_plus()+fg_guts(), which live-scrapes FanGraphs' constants
# page on every call).
get_saber_stats <- function(player_id, season) fetch_people_stats(player_id, "sabermetrics", season = season)

get_player_bio <- function(player_id) {
  tryCatch(
    baseballr::mlb_people(person_ids = player_id),
    error = function(e) { message(e$message); tibble::tibble() }
  )
}
