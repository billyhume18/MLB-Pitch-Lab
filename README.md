# Pitch Lab

A standalone, research-grade baseball pitch analysis website powered by Statcast data.

## Prerequisites

- R (≥ 4.2) — https://www.r-project.org/
- Node.js (≥ 18) — https://nodejs.org/

## Setup

### 1. Install R packages

```r
Rscript -e "install.packages(c('plumber','baseballr','dplyr','jsonlite','purrr','stringr','readr'), repos='https://cloud.r-project.org')"
```

### 2. Start both servers

**Windows:** Double-click `start.bat` — opens two terminal windows and a browser tab automatically.

**Manual:**

```bash
# Terminal 1 — backend
cd backend
Rscript start.R

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

### 3. Open the app

http://localhost:3000

## Usage notes

- Initial data loads for a full season take 30–90 seconds due to Baseball Savant rate limits. Subsequent loads for the same pitcher/date range are near-instant (file cache).
- The cache lives in `backend/cache/` (gitignored). Delete `.rds` files there to force a fresh fetch.
- Data is cached for 24 hours (historical seasons) or 1 hour (current season).

## Architecture

| Layer    | Technology            | Port |
|----------|-----------------------|------|
| Backend  | R + plumber           | 8000 |
| Frontend | Next.js 14 + Recharts | 3000 |
| Cache    | `.rds` files on disk  | —    |
