#!/bin/bash

# Stock Analyzer Build Script
# This script builds the application and optionally creates native installers

set -e

echo "=========================================="
echo "  Stock Analyzer - Build Script"
echo "=========================================="

# Check for Java
if ! command -v java &> /dev/null; then
    echo "Error: Java is not installed or not in PATH"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    echo "Error: Java 17 or higher is required. Found: $JAVA_VERSION"
    exit 1
fi

# Check for Maven
if ! command -v mvn &> /dev/null; then
    echo "Error: Maven is not installed or not in PATH"
    exit 1
fi

echo ""
echo "Step 1: Cleaning previous builds..."
mvn clean

echo ""
echo "Step 2: Building JAR with dependencies..."
mvn package -DskipTests

JAR_FILE="target/stock-analyzer-1.0.0.jar"
if [ -f "$JAR_FILE" ]; then
    echo ""
    echo "=========================================="
    echo "  BUILD SUCCESSFUL!"
    echo "=========================================="
    echo ""
    echo "JAR file created: $JAR_FILE"
    echo ""
    echo "To run the application:"
    echo "  java -jar $JAR_FILE"
    echo ""
    echo "To run in CLI mode:"
    echo "  java -jar $JAR_FILE --cli"
    echo ""
else
    echo "Error: Build failed - JAR file not created"
    exit 1
fi

# Ask about native installer
read -p "Create native installer? (y/n): " CREATE_INSTALLER

if [ "$CREATE_INSTALLER" = "y" ] || [ "$CREATE_INSTALLER" = "Y" ]; then
    if ! command -v jpackage &> /dev/null; then
        echo "Warning: jpackage not found. Requires JDK 14+"
        exit 0
    fi

    echo ""
    echo "Step 3: Creating native installer..."

    # Detect OS
    OS="$(uname -s)"
    case "${OS}" in
        Linux*)     TYPE="deb";;
        Darwin*)    TYPE="dmg";;
        MINGW*|CYGWIN*|MSYS*)  TYPE="exe";;
        *)          TYPE="app-image";;
    esac

    mkdir -p installers

    jpackage \
        --input target \
        --name "Stock Analyzer" \
        --main-jar stock-analyzer-1.0.0.jar \
        --main-class com.stockanalyzer.StockAnalyzerApp \
        --type $TYPE \
        --dest installers \
        --app-version 1.0.0 \
        --vendor "Stock Analyzer" \
        --description "Comprehensive Stock Analysis Tool" \
        --copyright "2024"

    echo ""
    echo "Installer created in: installers/"
    ls -la installers/
fi

echo ""
echo "Done!"
