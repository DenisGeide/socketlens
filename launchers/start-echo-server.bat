@echo off
setlocal

set "LAUNCHER_DIR=%~dp0"
for %%I in ("%LAUNCHER_DIR%..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%"

call :header "Echo Server" "Local WebSocket endpoint for testing"

if not exist "package.json" (
  call :fail "Repository root was not found." "Keep this file inside the launchers folder."
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  call :fail "npm was not found." "Install Node.js 20.19+ or 22.12+ with npm 10+."
  exit /b 1
)

if not exist "node_modules" (
  call :installDependencies
  if errorlevel 1 exit /b 1
)

echo [mode] Local echo server
echo [command] npm run dev:echo
echo [url] ws://127.0.0.1:17787
echo.
echo Use this URL in SocketLens Direct Mode or as a Proxy Mode target.
echo.

npm run dev:echo
exit /b %ERRORLEVEL%

:header
echo.
echo ============================================================
echo  SocketLens - %~1
echo  %~2
echo ============================================================
echo.
exit /b 0

:fail
echo [error] %~1
if not "%~2"=="" echo        %~2
echo.
pause
exit /b 1

:installDependencies
echo [setup] Dependencies are missing.
echo [setup] Running npm install before launch.
echo.
npm install
if errorlevel 1 (
  call :fail "npm install failed." "Fix the npm error above, then run this launcher again."
  exit /b 1
)
echo.
echo [ok] Dependencies installed.
echo.
exit /b 0
