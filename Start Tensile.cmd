@echo off
rem Double-click to run Tensile. Needs Node.js. Close this window to stop it.
cd /d "%~dp0"
start "" "http://localhost:5173"
node serve.mjs
pause
