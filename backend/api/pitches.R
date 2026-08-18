library(baseballr)
library(dplyr)
library(purrr)

month_end <- function(date) {
  d <- as.Date(date)
  m <- as.integer(format(d, "%m"))
  y <- as.integer(format(d, "%Y"))
  if (m == 12) {
    as.Date(paste0(y + 1, "-01-01")) - 1
  } else {
    as.Date(paste0(y, "-", sprintf("%02d", m + 1), "-01")) - 1
  }
}

fetch_statcast_chunked <- function(pitcher_id, start_date, end_date) {
  start <- as.Date(start_date)
  end   <- as.Date(end_date)

  chunks <- list()
  current <- start
  while (current <= end) {
    chunk_end <- min(month_end(current), end)
    chunks <- c(chunks, list(list(s = as.character(current), e = as.character(chunk_end))))
    current <- chunk_end + 1
  }

  message(paste0("Fetching ", length(chunks), " month chunk(s) for pitcher ", pitcher_id))

  results <- purrr::map_dfr(chunks, function(chunk) {
    message(paste0("  Chunk: ", chunk$s, " to ", chunk$e))
    Sys.sleep(0.5)
    tryCatch({
      baseballr::statcast_search_pitchers(
        start_date = chunk$s,
        end_date   = chunk$e,
        pitcherid  = pitcher_id
      )
    }, error = function(e) {
      message(paste0("  Chunk failed: ", e$message))
      tibble::tibble()
    })
  })

  results
}

compute_tunnel_point <- function(data) {
  data %>%
    dplyr::mutate(
      tunnel_t = dplyr::case_when(
        !is.na(vy0) & !is.na(ay) & ay != 0 ~
          (-vy0 - sqrt(pmax(vy0^2 - 2 * ay * 30, 0))) / ay,
        TRUE ~ NA_real_
      ),
      tunnel_x = dplyr::case_when(
        !is.na(tunnel_t) ~
          release_pos_x + vx0 * tunnel_t + 0.5 * ax * tunnel_t^2,
        TRUE ~ NA_real_
      ),
      tunnel_z = dplyr::case_when(
        !is.na(tunnel_t) ~
          release_pos_z + vz0 * tunnel_t + 0.5 * az * tunnel_t^2,
        TRUE ~ NA_real_
      )
    ) %>%
    dplyr::select(-tunnel_t)
}
