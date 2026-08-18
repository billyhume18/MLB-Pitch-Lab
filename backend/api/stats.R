library(baseballr)

get_season_stats <- function(player_id, season) {
  tryCatch(
    mlb_stats(stat_type = "season", stat_group = "pitching",
              season = season, player_id = player_id),
    error = function(e) { message(e$message); tibble::tibble() }
  )
}

get_career_stats <- function(player_id) {
  tryCatch(
    mlb_stats(stat_type = "career", stat_group = "pitching",
              player_id = player_id),
    error = function(e) { message(e$message); tibble::tibble() }
  )
}

get_game_log <- function(player_id, season) {
  tryCatch(
    mlb_stats(stat_type = "gameLog", stat_group = "pitching",
              season = season, player_id = player_id),
    error = function(e) { message(e$message); tibble::tibble() }
  )
}

get_player_bio <- function(player_id) {
  tryCatch(
    mlb_people(person_ids = player_id),
    error = function(e) { message(e$message); tibble::tibble() }
  )
}
