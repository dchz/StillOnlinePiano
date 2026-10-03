@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 24 LTS from https://nodejs.org first.
  echo Then close this window and run start-local.cmd again.
  pause
  exit /b 1
)
node scripts\local-dev.mjs
if errorlevel 1 pause
