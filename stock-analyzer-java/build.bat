@echo off
REM Stock Analyzer Build Script for Windows
REM This script builds the application and optionally creates native installers

echo ==========================================
echo   Stock Analyzer - Build Script
echo ==========================================

REM Check for Java
where java >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Java is not installed or not in PATH
    exit /b 1
)

REM Check for Maven
where mvn >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Maven is not installed or not in PATH
    exit /b 1
)

echo.
echo Step 1: Cleaning previous builds...
call mvn clean

echo.
echo Step 2: Building JAR with dependencies...
call mvn package -DskipTests

if exist "target\stock-analyzer-1.0.0.jar" (
    echo.
    echo ==========================================
    echo   BUILD SUCCESSFUL!
    echo ==========================================
    echo.
    echo JAR file created: target\stock-analyzer-1.0.0.jar
    echo.
    echo To run the application:
    echo   java -jar target\stock-analyzer-1.0.0.jar
    echo.
    echo To run in CLI mode:
    echo   java -jar target\stock-analyzer-1.0.0.jar --cli
    echo.
) else (
    echo Error: Build failed - JAR file not created
    exit /b 1
)

set /p CREATE_INSTALLER="Create Windows installer (.exe)? (y/n): "

if /i "%CREATE_INSTALLER%"=="y" (
    where jpackage >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo Warning: jpackage not found. Requires JDK 14+
        goto :end
    )

    echo.
    echo Step 3: Creating Windows installer...

    if not exist "installers" mkdir installers

    jpackage ^
        --input target ^
        --name "Stock Analyzer" ^
        --main-jar stock-analyzer-1.0.0.jar ^
        --main-class com.stockanalyzer.StockAnalyzerApp ^
        --type exe ^
        --dest installers ^
        --app-version 1.0.0 ^
        --vendor "Stock Analyzer" ^
        --description "Comprehensive Stock Analysis Tool" ^
        --copyright "2024" ^
        --win-menu ^
        --win-shortcut

    echo.
    echo Installer created in: installers\
    dir installers\
)

:end
echo.
echo Done!
pause
