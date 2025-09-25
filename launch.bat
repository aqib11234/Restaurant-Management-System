@echo off
echo Restaurant Management System Launcher
echo ====================================

REM Change this path to your cloned repository directory
set REPO_PATH=C:\restaurant-management-system

echo Navigating to repository: %REPO_PATH%
cd /d "%REPO_PATH%"

if errorlevel 1 (
    echo Error: Could not find repository at %REPO_PATH%
    echo Please update the REPO_PATH in this .bat file to point to your cloned repository.
    pause
    exit /b 1
)

echo Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo Error: Failed to install backend dependencies
    pause
    exit /b 1
)

echo Installing frontend dependencies...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo Error: Failed to install frontend dependencies
    pause
    exit /b 1
)

echo Starting backend server...
start "Backend Server" cmd /k "cd %REPO_PATH%\backend && npm start"

timeout /t 5 /nobreak > nul

echo Starting frontend application...
start "Frontend App" cmd /k "cd %REPO_PATH%\frontend && npm start"

echo.
echo Both backend and frontend are starting...
echo Backend will be available at http://localhost:5000
echo Frontend will be available at http://localhost:3000
echo.
echo Press any key to close this window...
pause > nul