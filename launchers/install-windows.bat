@echo off
setlocal

set "LAUNCHER_DIR=%~dp0"
for %%I in ("%LAUNCHER_DIR%..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%"

echo.
echo ============================================================
echo  SocketLens - Install Dependencies
echo  npm workspace setup for web, desktop, and examples
echo ============================================================
echo.

if not exist "package.json" (
  call :fail "Repository root was not found." "Keep this file inside the launchers folder."
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  call :fail "Node.js was not found." "Install Node.js 20.19+ or 22.12+ first."
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  call :fail "npm was not found." "Install npm 10+ with Node.js first."
  exit /b 1
)

where cargo >nul 2>nul
if errorlevel 1 (
  echo [warning] Rust/Cargo was not found.
  echo           Web mode and the echo server will work. Desktop mode and Proxy Mode need Rust/Cargo plus Tauri prerequisites.
) else (
  echo [ok] Rust/Cargo found for desktop mode.
)

echo.
echo [command] npm install
echo.

npm install
if errorlevel 1 (
  call :fail "npm install failed." "Check the npm error above, then retry from the repository root."
  exit /b 1
)

echo.
echo [ok] SocketLens dependencies installed.
echo.
echo Next:
echo   launchers\start-web.bat          - browser development mode
echo   launchers\start-echo-server.bat  - local WebSocket echo server
echo   launchers\start-desktop.bat      - native Tauri desktop mode
echo.
pause
exit /b 0

:fail
echo [error] %~1
if not "%~2"=="" echo        %~2
echo.
pause
exit /b 1
