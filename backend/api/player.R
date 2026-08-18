library(baseballr)
library(dplyr)
library(stringr)

.chadwick_cache <- NULL

get_chadwick <- function() {
  if (is.null(.chadwick_cache)) {
    message("Loading Chadwick Bureau register (one-time ~5MB download)...")
    .chadwick_cache <<- baseballr::chadwick_player_lu()
    message("Chadwick register loaded.")
  }
  .chadwick_cache
}

search_players <- function(query) {
  lu <- get_chadwick()
  query_lower <- tolower(trimws(query))
  words <- strsplit(query_lower, "\\s+")[[1]]

  if (length(words) == 1) {
    matches <- lu %>%
      dplyr::filter(
        !is.na(key_mlbam), key_mlbam > 0,
        stringr::str_detect(tolower(name_last), stringr::fixed(words[1]))
      )
  } else {
    matches <- lu %>%
      dplyr::filter(
        !is.na(key_mlbam), key_mlbam > 0,
        stringr::str_detect(tolower(name_last), stringr::fixed(words[length(words)])),
        stringr::str_detect(tolower(name_first), stringr::fixed(words[1]))
      )
  }

  matches %>%
    dplyr::arrange(dplyr::desc(mlb_played_first)) %>%
    dplyr::select(name_first, name_last, key_mlbam) %>%
    head(15)
}
