@echo off
title Jenga Wealth SACCO System
cd /d "%~dp0"
echo =============================================
echo   Jenga Wealth SACCO Management System
echo =============================================
echo.
echo Opening application in your browser...
echo.
echo Demo Credentials:
echo   Contact your SACCO administrator for login credentials.
echo.
echo =============================================
start "" "%~dp0sacco.html"
echo Done! The application should now open in your browser.
pause
