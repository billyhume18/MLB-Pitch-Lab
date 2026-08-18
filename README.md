# Pitch Lab

A standalone, research-grade baseball pitch analysis tool powered by Statcast and MLB Stats API data — built for pitching-lab performance and injury-prevention research (velocity/movement/command/consistency, plus pitch counts, rest, and fatigue signals).

## Prerequisites

- R (≥ 4.2) — https://www.r-project.org/
- Node.js (≥ 18) — https://nodejs.org/
- Python (≥ 3.9) — https://www.python.org/ — only required for the `.pkl` (Python pickle) export format

## Setup

### 1. Install R packages

```r
Rscript -e "install.packages(c('plumber','baseballr','dplyr','jsonlite','purrr','stringr','readr','httr2','writexl','arrow'), repos='https://cloud.r-project.org')"
```

### 2. Install Python packages (for `.pkl` export only)

```bash
python -m pip install pandas
```

If `python` isn't the interpreter you want the backend to use for this (e.g. multiple Python installs on the machine), set the `PITCHLAB_PYTHON` environment variable to the full path of the interpreter with `pandas` installed before starting the backend. Every other export format (CSV, XLSX, PDF, `.rds`, Parquet) works without Python.

### 3. Start both servers

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

### 4. Open the app

http://localhost:4000

## Usage notes

- Initial data loads for a full season take 30–90 seconds due to Baseball Savant rate limits. Subsequent loads for the same pitcher/date range are near-instant (file cache).
- The cache lives in `backend/cache/` (gitignored). Delete `.rds` files there to force a fresh fetch.
- Pitch-level data is cached for 24 hours (historical seasons) or 1 hour (current season); the cache key is per pitcher + date range and retains full pitch-level granularity, so every filter/metric below is computed client-side from one cached pull rather than re-fetching per filter.

## Pages

| Route       | Purpose                                                                                   |
|-------------|---------------------------------------------------------------------------------------------|
| `/lab`      | Single-pitcher deep dive: arsenal, sequencing, situation splits, movement, release-point consistency, velocity/spin fatigue, tunneling, command heatmap, workload/injury-risk, baseline comparison, and the raw pitch log. |
| `/compare`  | Side-by-side movement/velocity/arsenal comparison across up to 4 pitchers.                 |
| `/roster`   | Ad hoc, session-only pitcher grouping: add pitchers by search, see per-pitcher averages across every stat below, check pitchers into a group to see a combined group average, and drill into any pitcher's workload chart inline. |

## Global time frame

One time-frame control (season dropdown + custom date range) governs every page and is synced to the URL (`?start=...&end=...`), so a view is shareable/reloadable. It replaces what used to be independent per-page date pickers, including on `/compare`.

## Filters (`/lab` sidebar)

Beyond pitch type, count, inning, outs, runners on base, batted-ball type/direction, quality of contact, fielding alignment, season type, home/away, and single-game selection, the filter panel also covers the full Statcast Search-style set:

- Velocity, spin rate, IHB/IVB break, release position (x/z), extension, and arm angle ranges
- Plate location (x/z) ranges, in addition to the 9-zone/heart/shadow/chase picker
- Exit velocity, launch angle ranges, and a "Barrels only" toggle
- Inning half (top/bottom), handedness matchup (same-side/opposite-side), opponent team, times through the order, and days of rest before the outing
- **Minimum pitches per game** — drops all pitches from any outing under the threshold (useful for excluding mop-up appearances from mechanics analysis)
- **Minimum pitches per season** — on `/roster`, hides pitchers under the threshold from the averages table/group entirely

All of baseballr's Statcast functions are thin date+player proxies over Baseball Savant's CSV export (no server-side filter params exist), so every filter above is applied client-side to the one cached pitch-level pull — filter changes never trigger a re-fetch.

## Stats surfaced

- **Raw, per pitch**: full Statcast pitch-level schema — velocity, spin, movement, release point/extension, arm angle, plate location/zone, batted-ball outcomes, expected stats, run/win expectancy, and the raw rest-day/times-through-order columns Statcast now includes directly.
- **Derived, per pitcher per time frame**: whiff%, CSW%, chase%, zone%, hard-hit%, barrel%, pitch usage mix, and velocity/spin/release-point standard deviation — overall and by pitch type.
- **Traditional** (MLB Stats API): ERA, WHIP, W-L, SV, IP, K, BB, K/9, BB/9, K/BB, K%, BB%, plus FIP/xFIP/WAR from the API's `sabermetrics` stat type (not a client-side approximation).
- **Workload/injury-relevant**: pitches per outing over time, cumulative season pitch count, days of rest between outings, a rolling 3-outing-average-vs-current-outing spike flag, and within-outing velocity/spin decline (first 15 vs. last 15 pitches).

Hover the small `?` next to any abbreviated stat label for a plain-language definition.

## Exports

Every filtered/grouped view (`/lab`'s sidebar and pitch log, `/compare`, `/roster`) has an **Export** menu with six formats:

| Format          | How it's produced                                                        |
|------------------|---------------------------------------------------------------------------|
| CSV              | Client-side, instant                                                     |
| Excel (`.xlsx`)  | Backend, via `writexl`                                                   |
| PDF report       | Client-side: a formatted table (via `jspdf-autotable`) plus a snapshot of whatever charts are on screen (via `html2canvas`) |
| R (`.rds`)       | Backend, native `saveRDS()`                                              |
| Parquet          | Backend, via the `arrow` package                                          |
| Python (`.pkl`)  | Backend writes a CSV, then shells out to a small Python/pandas script (`backend/scripts/to_pickle.py`) — see Setup step 2 |

## Architecture

| Layer    | Technology                       | Port |
|----------|-----------------------------------|------|
| Backend  | R + plumber                       | 8000 |
| Frontend | Next.js 14 + Recharts              | 4000 |
| Cache    | `.rds` files on disk               | —    |

Traditional/sabermetric stats are fetched directly from the MLB Stats API's `/people/{id}/stats` endpoint rather than through `baseballr::mlb_stats()`, since that function no longer accepts a per-player ID as of baseballr 2.0.0 (it's a league/pool leaderboard endpoint now).
