@echo off
rem Instala Claude Stats de una vez: el widget (Electron), el icono del escritorio y lo abre.
rem Se puede volver a ejecutar sin problema (por ejemplo, despues de actualizar).
rem Textos sin tildes: la consola de Windows no las muestra bien en un .bat.
setlocal
cd /d "%~dp0"
title Claude Stats

echo.
echo  Claude Stats - instalacion / setup
echo  ==================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [!] No encontre Node.js. Instalalo desde https://nodejs.org ^(version LTS^) y vuelve a abrir este archivo.
  echo  [!] Node.js was not found. Install it from https://nodejs.org ^(LTS^) and run this file again.
  echo.
  pause
  exit /b 1
)

echo  [1/3] Instalando el widget / Installing the widget  ^(Electron, ~110 MB, 1-2 min^)...
pushd widget
call npm install --no-fund --no-audit
set ERR=%errorlevel%
popd
if not "%ERR%"=="0" goto fallo
if not exist "widget\node_modules\electron\dist\electron.exe" goto fallo

echo.
echo  [2/3] Creando el icono del escritorio / Creating the desktop icon...
wscript //nologo "%~dp0Crear acceso directo.vbs" /escritorio

echo  [3/3] Abriendo el widget / Opening the widget...
wscript //nologo "%~dp0Abrir Claude Stats.vbs"

echo.
echo  Listo! El widget aparece abajo a la derecha de la pantalla, y "Claude Stats" quedo en el escritorio.
echo  Done! The widget shows up at the bottom right of your screen, and "Claude Stats" is on your desktop.
echo.
echo  Tip: clic derecho en el widget ^> "Iniciar con Windows" / right-click the widget ^> "Start with Windows".
echo.
timeout /t 15
exit /b 0

:fallo
echo.
echo  [!] No se pudo instalar el widget. Revisa tu conexion a internet y vuelve a abrir este archivo.
echo  [!] The widget could not be installed. Check your internet connection and run this file again.
echo.
pause
exit /b 1
