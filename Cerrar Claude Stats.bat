@echo off
rem Detiene Claude Stats: el widget (si lo hay) y el servidor (puerto 4747).
set "WIDGET=%~dp0widget"
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'electron.exe' -and $_.CommandLine -like ('*' + $env:WIDGET + '*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":4747" ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>nul
echo Claude Stats detenido / stopped.
timeout /t 2 >nul
