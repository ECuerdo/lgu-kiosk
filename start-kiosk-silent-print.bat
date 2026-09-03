@echo off
title LGU Mapandan Kiosk Runner (Silent Thermal Print)
echo ============================================================
echo   STARTING LGU MAPANDAN KIOSK WITH SILENT PRINTING
echo ============================================================
echo.

:: Set URL of kiosk
set KIOSK_URL=http://localhost:3000/

:: Set a dedicated temp profile directory so Chrome ignores your currently open windows
set KIOSK_DATA_DIR=%LOCALAPPDATA%\LguKioskBrowserSession

if not exist "%KIOSK_DATA_DIR%" mkdir "%KIOSK_DATA_DIR%"

:: 1. Check Google Chrome
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo Launching Google Chrome in isolated Kiosk mode...
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="%KIOSK_DATA_DIR%" --kiosk-printing --app=%KIOSK_URL%
    exit /b
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo Launching Google Chrome in isolated Kiosk mode...
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --user-data-dir="%KIOSK_DATA_DIR%" --kiosk-printing --app=%KIOSK_URL%
    exit /b
)

:: 2. Check Microsoft Edge
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    echo Launching Microsoft Edge in isolated Kiosk mode...
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --user-data-dir="%KIOSK_DATA_DIR%" --kiosk-printing --app=%KIOSK_URL%
    exit /b
)

if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    echo Launching Microsoft Edge in isolated Kiosk mode...
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --user-data-dir="%KIOSK_DATA_DIR%" --kiosk-printing --app=%KIOSK_URL%
    exit /b
)

echo No compatible Chromium browser found!
pause
