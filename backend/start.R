required_packages <- c("plumber", "baseballr", "dplyr", "jsonlite", "purrr", "stringr", "readr")
for (pkg in required_packages) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    message(paste0("Installing ", pkg, "..."))
    install.packages(pkg, repos = "https://cloud.r-project.org")
  }
}

library(plumber)

cat("=================================================\n")
cat("  Pitch Lab API starting on http://127.0.0.1:8000\n")
cat("=================================================\n\n")

pr <- plumb("plumber.R")
pr$run(port = 8000, host = "127.0.0.1", quiet = FALSE)
