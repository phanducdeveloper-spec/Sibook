@echo off
rem Dong goi SI Book: chay test, build ban Portable + Setup vao thu muc release.
title SI Book - Build
cd /d "%~dp0frontend"
echo [1/4] Dong SI Book dang chay (neu co)...
taskkill /f /im "SI Book.exe" >nul 2>&1
taskkill /f /im "SI-Book-*" >nul 2>&1
for /f "tokens=2 delims=," %%p in ('tasklist /fo csv /nh ^| findstr /i /c:"SI-Book-"') do taskkill /f /pid %%~p >nul 2>&1
if not exist "node_modules" (
  echo [2/4] Cai thu vien npm...
  call npm install || goto :fail
) else echo [2/4] Thu vien npm da co.
echo [3/4] Chay test...
call node --test electron/formats.test.cjs electron/library.test.cjs electron/link.test.cjs || goto :fail
echo [4/4] Build ban phat hanh (khoang 2-3 phut)...
call npm run dist || goto :fail
echo.
echo Xong! File o: %~dp0release
start "" "%~dp0release"
pause
exit /b 0
:fail
echo.
echo Build THAT BAI. Xem loi o tren.
pause
exit /b 1
