@echo off
REM ============================================================
REM  HivePulse - build & package Chrome + Firefox in one shot
REM  Produces (in the project root):
REM    hivepulse-<version>-chrome.zip   -> Chrome Web Store
REM    hivepulse-<version>-firefox.zip  -> addons.mozilla.org
REM  Each zip has manifest.json at its root (AMO/CWS requirement).
REM ============================================================
setlocal
cd /d "%~dp0"

echo.
echo === [1/4] Building Chrome (dist\) ===
call npm run build
if errorlevel 1 goto :error

echo.
echo === [2/4] Building Firefox (dist-firefox\) ===
call npm run build:firefox
if errorlevel 1 goto :error

echo.
echo === [3/4] Packaging Chrome zip ===
call npx --yes web-ext build --source-dir=dist --artifacts-dir=. --filename="hivepulse-{version}-chrome.zip" --overwrite-dest
if errorlevel 1 goto :error

echo.
echo === [4/4] Packaging Firefox zip ===
call npx --yes web-ext build --source-dir=dist-firefox --artifacts-dir=. --filename="hivepulse-{version}-firefox.zip" --overwrite-dest
if errorlevel 1 goto :error

echo.
echo ============================================================
echo  DONE. Upload-ready packages created in the project root:
echo    hivepulse-^<version^>-chrome.zip   (Chrome Web Store)
echo    hivepulse-^<version^>-firefox.zip  (addons.mozilla.org)
echo ============================================================
goto :end

:error
echo.
echo ************************************************************
echo  PACKAGING FAILED - see the output above for details.
echo ************************************************************
exit /b 1

:end
endlocal
