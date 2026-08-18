CACHE_DIR <- "cache"

get_cache_path <- function(key) {
  file.path(CACHE_DIR, paste0(key, ".rds"))
}

cache_get <- function(key, ttl_seconds = 86400) {
  path <- get_cache_path(key)
  if (!file.exists(path)) return(NULL)
  age <- as.numeric(difftime(Sys.time(), file.mtime(path), units = "secs"))
  if (age > ttl_seconds) return(NULL)
  readRDS(path)
}

cache_set <- function(key, value) {
  if (!dir.exists(CACHE_DIR)) dir.create(CACHE_DIR, recursive = TRUE)
  saveRDS(value, get_cache_path(key))
  invisible(value)
}
