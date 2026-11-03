@echo off
title Push EduAegis to GitHub
echo ======================================================================
echo              EduAegis: 1-Click GitHub Cloud Connector
echo ======================================================================
echo.
echo This tool will send your website files to your personal GitHub account
echo so you can launch it on the real internet with Render or Railway!
echo.
echo ----------------------------------------------------------------------
echo STEP 1: Make sure you created a repository on https://github.com
echo STEP 2: Copy the repository link (e.g., https://github.com/yourname/eduaegis.git)
echo ----------------------------------------------------------------------
echo.
set /p REPO_URL="PASTE YOUR GITHUB REPO LINK HERE AND PRESS ENTER: "

if "%REPO_URL%"=="" (
    echo.
    echo Error: You did not paste a link! Please run this file again and paste your link.
    pause
    exit /b
)

echo.
echo Connecting to: %REPO_URL% ...
git branch -M main
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%
echo Uploading your files to GitHub...
git push -u origin main

echo.
echo ======================================================================
echo   SUCCESS! All your files are now safely uploaded to your GitHub!
echo   Now follow the next step on Render.com to launch your live site!
echo ======================================================================
echo.
pause
