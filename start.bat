@echo off
setlocal
cd /d "%~dp0"
title AimTrail

if not exist "app.py" (
  echo [X] app.py tidak ditemukan. Ekstrak SELURUH isi zip ke sebuah folder dulu.
  goto fail
)

set "PY="
where py >nul 2>nul
if not errorlevel 1 set "PY=py -3"
if not defined PY (
  where python >nul 2>nul
  if not errorlevel 1 set "PY=python"
)
if not defined PY (
  echo [X] Python belum terpasang.
  echo     Unduh dari https://www.python.org/downloads/ lalu centang "Add python.exe to PATH".
  goto fail
)

set "VPY=%~dp0.venv\Scripts\python.exe"
if not exist "%VPY%" (
  echo Membuat lingkungan Python, tunggu sebentar...
  %PY% -m venv "%~dp0.venv"
  if errorlevel 1 goto fail
)

echo Memeriksa pustaka...
"%VPY%" -m pip install --disable-pip-version-check -q -r requirements.txt
if errorlevel 1 goto fail

"%VPY%" app.py %*
exit /b 0

:fail
echo.
pause
exit /b 1
