library(dplyr)
library(readr)
library(writexl)
library(arrow)

# "python" is not reliably on PATH in this environment (only the Windows
# Store alias stub is), so default to the full interpreter path; override
# with the PITCHLAB_PYTHON env var if the deployment machine differs.
PYTHON_BIN <- Sys.getenv(
  "PITCHLAB_PYTHON",
  unset = "C:/Users/Presentation3/AppData/Local/Programs/Python/Python314/python.exe"
)

rows_to_dataframe <- function(rows) {
  if (is.data.frame(rows)) return(rows)
  as.data.frame(
    jsonlite::fromJSON(jsonlite::toJSON(rows, auto_unbox = TRUE, na = "null"), simplifyDataFrame = TRUE),
    stringsAsFactors = FALSE
  )
}

send_binary_file <- function(res, path, content_type, filename) {
  bytes <- readBin(path, "raw", file.info(path)$size)
  res$setHeader("Content-Type", content_type)
  res$setHeader("Content-Disposition", paste0('attachment; filename="', filename, '"'))
  res$body <- bytes
  res
}

export_pickle <- function(df, tmp_dir) {
  csv_path <- file.path(tmp_dir, "export_data.csv")
  pkl_path <- file.path(tmp_dir, "export_data.pkl")
  readr::write_csv(df, csv_path)

  script_path <- normalizePath(file.path("scripts", "to_pickle.py"), mustWork = TRUE)
  result <- system2(
    PYTHON_BIN,
    args = c(shQuote(script_path), shQuote(csv_path), shQuote(pkl_path)),
    stdout = TRUE, stderr = TRUE
  )
  if (!file.exists(pkl_path)) {
    stop(paste0(
      "Pickle conversion failed (is pandas installed for ", PYTHON_BIN, "?): ",
      paste(result, collapse = "\n")
    ))
  }
  pkl_path
}

handle_export <- function(req, res, format) {
  body <- req$body
  rows <- body$rows
  filename_base <- if (!is.null(body$filename) && nchar(body$filename) > 0) body$filename else "pitch_lab_export"

  if (is.null(rows) || length(rows) == 0) {
    res$status <- 400
    return(list(error = "No rows provided"))
  }

  df <- rows_to_dataframe(rows)
  tmp_dir <- tempfile("pitchlab_export_")
  dir.create(tmp_dir)
  on.exit(unlink(tmp_dir, recursive = TRUE), add = TRUE)

  tryCatch({
    if (format == "csv") {
      res$setHeader("Content-Type", "text/csv")
      res$setHeader("Content-Disposition", paste0('attachment; filename="', filename_base, '.csv"'))
      res$body <- readr::format_csv(df)
      return(res)
    }

    if (format == "xlsx") {
      path <- file.path(tmp_dir, "export.xlsx")
      writexl::write_xlsx(df, path)
      return(send_binary_file(res, path,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        paste0(filename_base, ".xlsx")))
    }

    if (format == "rds") {
      path <- file.path(tmp_dir, "export.rds")
      saveRDS(df, path)
      return(send_binary_file(res, path, "application/octet-stream", paste0(filename_base, ".rds")))
    }

    if (format == "parquet") {
      path <- file.path(tmp_dir, "export.parquet")
      arrow::write_parquet(df, path)
      return(send_binary_file(res, path, "application/vnd.apache.parquet", paste0(filename_base, ".parquet")))
    }

    if (format == "pkl") {
      path <- export_pickle(df, tmp_dir)
      return(send_binary_file(res, path, "application/octet-stream", paste0(filename_base, ".pkl")))
    }

    res$status <- 400
    list(error = paste0("Unsupported format: ", format))
  }, error = function(e) {
    res$status <- 500
    list(error = e$message)
  })
}
