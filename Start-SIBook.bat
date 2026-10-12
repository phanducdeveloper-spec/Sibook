@echo off
rem Chay SI Book tu ma nguon moi nhat (ban dev): build giao dien roi mo bang Electron.
title SI Book - Dev
cd /d "%~dp0frontend"
if not exist "node_modules" (
  echo Lan dau chay: dang cai thu vien npm...
  call npm install || goto :fail
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo Dang tai Electron...
  call node node_modules\electron\install.js || goto :fail
)
echo Dang build giao dien moi nhat...
call npx vite build --logLevel error || goto :fail
start "" "%~dp0frontend\node_modules\electron\dist\electron.exe" "%~dp0frontend"
exit /b 0
:fail
echo.
echo Build loi. Xem thong bao o tren.
pause
exit /b 1
