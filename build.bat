@echo off
setlocal
cd /d "%~dp0"
title AimTrail - Build

echo ==============================================
echo   AimTrail - membuat AimTrail.exe
echo ==============================================
echo.

if not exist "aimtrail.spec" (
  echo [X] File aimtrail.spec tidak ditemukan.
  echo     Ekstrak SELURUH isi file zip ke sebuah folder dulu,
  echo     lalu jalankan build.bat dari folder itu.
  goto fail
)

echo [1/5] Memeriksa Python...
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
%PY% --version
%PY% -c "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)"
if errorlevel 1 (
  echo [X] Python tidak bisa dijalankan atau versinya di bawah 3.9.
  echo     Jika yang terbuka adalah Microsoft Store, pasang Python dari python.org.
  goto fail
)

echo.
echo [2/5] Membuat lingkungan build (.venv-build)...
set "VPY=%~dp0.venv-build\Scripts\python.exe"
if not exist "%VPY%" (
  %PY% -m venv "%~dp0.venv-build"
  if errorlevel 1 goto fail
)

echo.
echo [3/5] Memasang pustaka. Pertama kali bisa beberapa menit, jangan ditutup...
"%VPY%" -m pip install --disable-pip-version-check -r requirements-build.txt
if errorlevel 1 goto fail

echo.
echo [4/5] Membuat ikon...
"%VPY%" icon.py
if errorlevel 1 goto fail

echo.
echo [5/5] Membangun AimTrail.exe (sekitar 1-2 menit)...
"%VPY%" -m PyInstaller --noconfirm --clean aimtrail.spec
if errorlevel 1 goto fail

if not exist "dist\AimTrail.exe" goto fail
echo.
echo ==============================================
echo   SELESAI: %~dp0dist\AimTrail.exe
echo ==============================================
echo (Opsional) Installer: buka installer.iss dengan Inno Setup, lalu Build ^> Compile.
echo.
pause
exit /b 0

:fail
echo.
echo ==============================================
echo   BUILD GAGAL - baca pesan di atas.
echo ==============================================
pause
exit /b 1
