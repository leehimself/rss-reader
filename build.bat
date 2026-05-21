@echo off
chcp 65001 >nul
cd /d %~dp0
echo ================================
echo   RSS Reader - Build and Package
echo ================================
echo.
echo Step 1: Building...
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)
echo.
echo Step 2: Packaging...
call npx electron-builder --win
echo.
echo Done! Check the release/ folder.
pause
