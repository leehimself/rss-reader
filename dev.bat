@echo off
chcp 65001 >nul
cd /d %~dp0
echo ================================
echo   RSS Reader - Development Mode
echo ================================
echo.
echo Starting Vite dev server + Electron...
echo.
call npm run dev
pause
