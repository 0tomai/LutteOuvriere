@echo off
echo 🎬 Démarrage de MediaBox...
cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ Node.js n'est pas installe.
  echo    Telechargez-le sur https://nodejs.org
  pause
  exit /b 1
)

echo ✅ Node.js detecte
echo 🌐 Ouvrez http://localhost:8080 dans votre navigateur
echo 🛑 Ctrl+C pour arreter
echo.

start "" "http://localhost:8080"
node server.js
pause
