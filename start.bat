@echo off
title Pitch Lab Launcher
echo ============================================
echo   Pitch Lab - Baseball Pitch Analysis Tool
echo ============================================
echo.
echo [1/2] Starting R backend on port 8000...
start "Pitch Lab Backend" cmd /k "cd /d "%~dp0backend" && Rscript start.R"
echo.
echo [2/2] Starting Next.js frontend on port 4000...
start "Pitch Lab Frontend" cmd /k "cd /d "%~dp0frontend" && npm install && npm run dev"
echo.
echo ============================================
echo  Both servers are starting up.
echo.
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:4000
echo.
echo  WAIT for the Frontend window to show:
echo    "Ready - started server on 0.0.0.0:4000"
echo  Then open: http://localhost:4000
echo ============================================
echo.
echo Opening browser in 90 seconds (first run needs npm install + compile)...
echo If the page errors, wait a moment and refresh.
timeout /t 90 /nobreak > nul
start http://localhost:4000
