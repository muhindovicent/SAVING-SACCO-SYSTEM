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
echo   Admin:        admin@jengawealth.com / Admin@123
echo   Treasurer:    treasurer@jengawealth.com / Admin@123
echo   Loan Officer: loanofficer@jengawealth.com / Admin@123
echo   Auditor:      auditor@jengawealth.com / Auditor@123
echo   Member:       john@jengawealth.com / Member@123
echo.
echo =============================================
start "" "%~dp0sacco.html"
echo Done! The application should now open in your browser.
pause
