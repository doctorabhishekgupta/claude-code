# 📊 Stock Analyzer (Java Edition)

A comprehensive desktop application for analyzing Indian stocks, built with Java and JavaFX.

## Features

- **Multi-Source Data Aggregation**: Collects financial data from Screener.in, Tickertape.in, and Moneycontrol.com
- **10-Year Historical Analysis**: Analyzes key financial metrics over the past decade
- **Free Cash Flow Valuation**: Calculates intrinsic value using FCF/0.02 methodology
- **Peer Comparison**: Compares the stock with industry peers
- **Shareholding Pattern Analysis**: Identifies red flags and positive signals
- **Modern GUI**: Beautiful dark-themed JavaFX interface
- **CLI Support**: Command-line interface for automation
- **Executable JAR**: Single JAR file that runs on any system with Java

## Prerequisites

- **Java 17 or higher** (JDK required for building)
- **Maven 3.6+** (for building)

## Quick Start

### Option 1: Download Pre-built JAR

Download `stock-analyzer-1.0.0.jar` from releases and run:

```bash
java -jar stock-analyzer-1.0.0.jar
```

### Option 2: Build from Source

```bash
# Clone the repository
cd stock-analyzer-java

# Build with Maven
mvn clean package

# Run the application
java -jar target/stock-analyzer-1.0.0.jar
```

## Usage

### GUI Mode (Default)

```bash
java -jar stock-analyzer-1.0.0.jar
```

1. Enter the company name
2. Paste the Screener.in URL
3. Paste the Tickertape.in URL
4. Paste the Moneycontrol.com URL
5. Click "Analyze Stock"
6. Export to HTML when complete

### CLI Mode

```bash
java -jar stock-analyzer-1.0.0.jar --cli
```

Follow the prompts to enter company details and URLs.

## Building the Application

### Build Executable JAR

```bash
mvn clean package
```

The JAR file will be created at `target/stock-analyzer-1.0.0.jar`

### Create Native Installer (requires JDK 14+)

```bash
# For Windows (.exe installer)
jpackage --input target --name "Stock Analyzer" --main-jar stock-analyzer-1.0.0.jar \
         --main-class com.stockanalyzer.StockAnalyzerApp --type exe

# For macOS (.dmg installer)
jpackage --input target --name "Stock Analyzer" --main-jar stock-analyzer-1.0.0.jar \
         --main-class com.stockanalyzer.StockAnalyzerApp --type dmg

# For Linux (.deb installer)
jpackage --input target --name "Stock Analyzer" --main-jar stock-analyzer-1.0.0.jar \
         --main-class com.stockanalyzer.StockAnalyzerApp --type deb
```

## Analysis Parameters

The tool analyzes the following metrics for the past 10 years:

| # | Metric | Description |
|---|--------|-------------|
| 1 | Operating Margin | Trend and 10-year average |
| 2 | CAGR Sales Growth | 3, 5, and 10-year compound annual growth rates |
| 3 | ROCE | Return on Capital Employed |
| 4 | ROE | Return on Equity |
| 5 | PE Ratio | Price to Earnings with industry comparison |
| 6 | PEG Ratio | Price/Earnings to Growth ratio |
| 7 | Debt/Equity Ratio | Leverage analysis with trend |
| 8 | EPS | Earnings Per Share history and growth |
| 9 | Stock Price CAGR | 1, 3, and 5-year price performance |
| 10 | Market Cap | Current market capitalization |
| 11 | FCF Valuation | Free Cash Flow based valuation (FCF/0.02) |
| 12 | Shareholding Pattern | 2-year change analysis with red flags |

## Example URLs

For a stock like **Motilal Oswal Financial Services Ltd**:

| Source | URL |
|--------|-----|
| Screener.in | `https://www.screener.in/company/MOTILALOFS/consolidated/` |
| Tickertape.in | `https://www.tickertape.in/stocks/motilal-oswal-financial-services-MOFS` |
| Moneycontrol | `https://www.moneycontrol.com/india/stockpricequote/finance-general/motilaloswalfinancialservices/MOF01` |

## Project Structure

```
stock-analyzer-java/
├── pom.xml                          # Maven configuration
├── README.md                        # This file
├── src/main/java/com/stockanalyzer/
│   ├── StockAnalyzerApp.java       # Main application entry point
│   ├── scrapers/                    # Web scraping modules
│   │   ├── BaseScraper.java
│   │   ├── ScreenerScraper.java
│   │   ├── TickertapeScraper.java
│   │   └── MoneycontrolScraper.java
│   ├── models/                      # Data models
│   │   ├── FinancialData.java
│   │   ├── AnalysisResult.java
│   │   ├── ShareholdingData.java
│   │   └── PeerData.java
│   ├── analysis/                    # Financial analysis
│   │   └── FinancialAnalyzer.java
│   ├── reports/                     # Report generation
│   │   └── ReportGenerator.java
│   └── gui/                         # JavaFX GUI
│       └── MainController.java
└── output/                          # Generated reports
```

## Dependencies

- **JavaFX 21** - Modern GUI framework
- **JSoup 1.17** - HTML parsing and web scraping
- **Gson 2.10** - JSON processing
- **Apache Commons Lang 3.14** - Utility functions
- **SLF4J 2.0** - Logging

## Troubleshooting

### JavaFX Not Found
If you see "Error: JavaFX runtime components are missing", ensure you're using the shaded JAR or add JavaFX to module path:
```bash
java --module-path /path/to/javafx/lib --add-modules javafx.controls,javafx.fxml -jar stock-analyzer.jar
```

### Scraping Errors
The target websites may block automated access. Try:
- Running with a delay between requests
- Using a VPN if geographically restricted
- Checking if the website structure has changed

## Disclaimer

⚠️ **IMPORTANT**: This tool is for educational and informational purposes only. It does not constitute financial advice. Always:

- Conduct your own research
- Verify data from multiple sources
- Consult with a qualified financial advisor

## License

This project is open source. Use at your own risk.
