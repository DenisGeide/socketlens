@echo off
setlocal

set "LAUNCHER_DIR=%~dp0"
for %%I in ("%LAUNCHER_DIR%..") do set "REPO_ROOT=%%~fI"
set "ICON=%REPO_ROOT%\docs\assets\branding\icon.ico"

echo.
echo ============================================================
echo  SocketLens - Generate Windows Shortcuts
echo  Creates desktop shortcuts for common launcher modes
echo ============================================================
echo.

if not exist "%REPO_ROOT%\package.json" (
  call :fail "Repository root was not found." "Keep this file inside the launchers folder."
  exit /b 1
)
if not exist "%ICON%" (
  call :fail "SocketLens icon was not found." "Expected docs\assets\branding\icon.ico."
  exit /b 1
)

set "SL_REPO_ROOT=%REPO_ROOT%"
set "SL_LAUNCHER_DIR=%LAUNCHER_DIR%"
set "SL_ICON=%ICON%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop=[Environment]::GetFolderPath('Desktop'); $shell=New-Object -ComObject WScript.Shell; $items=@(@('SocketLens Web','start-web.bat','SocketLens browser development mode'),@('SocketLens Desktop','start-desktop.bat','SocketLens native Tauri desktop mode'),@('SocketLens Echo Server','start-echo-server.bat','SocketLens local WebSocket echo server')); foreach($item in $items){ $target=Join-Path $env:SL_LAUNCHER_DIR $item[1]; $shortcut=$shell.CreateShortcut((Join-Path $desktop ($item[0]+'.lnk'))); $shortcut.TargetPath=$target; $shortcut.Arguments=''; $shortcut.WorkingDirectory=$env:SL_REPO_ROOT; $shortcut.IconLocation=$env:SL_ICON; $shortcut.Description=$item[2]; $shortcut.Save(); Write-Host ('[ok] Created ' + $item[0]) }"
if errorlevel 1 (
  call :fail "Shortcut generation failed." "Run this file from a normal Windows desktop session."
  exit /b 1
)

echo.
echo [ok] Desktop shortcuts created:
echo   SocketLens Web
echo   SocketLens Desktop
echo   SocketLens Echo Server
echo.
pause
exit /b 0

:fail
echo [error] %~1
if not "%~2"=="" echo        %~2
echo.
pause
exit /b 1
