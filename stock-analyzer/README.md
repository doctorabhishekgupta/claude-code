# 📊 Stock Analyzer

A comprehensive desktop application for analyzing Indian stocks using data from multiple financial sources.

## Features

- **Multi-Source Data Aggregation**: Collects financial data from Screener.in, Tickertape.in, and Moneycontrol.com
- **10-Year Historical Analysis**: Analyzes key financial metrics over the past decade
- **Free Cash Flow Valuation**: Calculates intrinsic value using FCF/0.02 methodology
- **Peer Comparison**: Compares the stock with industry peers
- **Shareholding Pattern Analysis**: Identifies red flags and positive signals in ownership changes
- **Beautiful HTML Reports**: Generates professional, dark-themed analysis reports
- **Desktop GUI**: User-friendly interface built with CustomTkinter
- **CLI Support**: Command-line interface for automation

## Analysis Parameters

The tool analyzes the following metrics for the past 10 years:

1. **Operating Margin** - Trend and 10-year average
2. **CAGR Sales Growth** - 3, 5, and 10-year compound annual growth rates
3. **ROCE & ROE** - Return on Capital Employed and Return on Equity
4. **PE Ratio** - Price to Earnings with industry comparison
5. **PEG Ratio** - Price/Earnings to Growth ratio
6. **Debt/Equity Ratio** - Leverage analysis with trend
7. **EPS** - Earnings Per Share history and growth rate
8. **Stock Price CAGR** - 1, 3, and 5-year price performance
9. **Market Cap** - Current market capitalization with category
10. **FCF Valuation** - Free Cash Flow based valuation (FCF/0.02), negative FCF years count
11. **Shareholding Pattern** - 2-year change analysis with red flags detection

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Setup

1. Clone or download this repository:
```bash
cd stock-analyzer
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### GUI Mode (Default)

Launch the graphical interface:

```bash
python main.py
```

Then:
1. Enter the company name
2. Paste the Screener.in URL
3. Paste the Tickertape.in URL
4. Paste the Moneycontrol.com URL
5. Click "Analyze Stock"
6. Export to HTML when analysis is complete

### CLI Mode (Interactive)

Run in terminal with prompts:

```bash
python main.py --cli
```

### Quick Analysis (Command Line)

Run analysis directly from command line:

```bash
python main.py \
  --company "Motilal Oswal Financial Services Ltd" \
  --screener "https://www.screener.in/company/MOTILALOFS/consolidated/" \
  --tickertape "https://www.tickertape.in/stocks/motilal-oswal-financial-services-MOFS" \
  --moneycontrol "https://www.moneycontrol.com/india/stockpricequote/finance-general/motilaloswalfinancialservices/MOF01" \
  --output html
```

## Example URLs

For a stock like **Motilal Oswal Financial Services Ltd**:

| Source | URL Format |
|--------|-----------|
| Screener.in | `https://www.screener.in/company/MOTILALOFS/consolidated/` |
| Tickertape.in | `https://www.tickertape.in/stocks/motilal-oswal-financial-services-MOFS` |
| Moneycontrol | `https://www.moneycontrol.com/india/stockpricequote/finance-general/motilaloswalfinancialservices/MOF01` |

## Output

### Text Report
The analysis output includes:
- Executive summary
- Key financial metrics
- Growth metrics (CAGR)
- FCF-based valuation
- Shareholding pattern changes
- Peer comparison
- Red flags and positive signals

### HTML Report
A beautifully formatted dark-themed HTML report that can be:
- Opened in any web browser
- Saved for future reference
- Shared with others

## Project Structure

```
stock-analyzer/
├── main.py                 # Application entry point
├── requirements.txt        # Python dependencies
├── README.md              # This file
├── scrapers/              # Web scraping modules
│   ├── __init__.py
│   ├── base_scraper.py    # Base scraper class
│   ├── screener_scraper.py
│   ├── tickertape_scraper.py
│   └── moneycontrol_scraper.py
├── analysis/              # Financial analysis
│   ├── __init__.py
│   └── financial_analyzer.py
├── reports/               # Report generation
│   ├── __init__.py
│   └── report_generator.py
├── gui/                   # Desktop GUI
│   ├── __init__.py
│   └── app.py
├── utils/                 # Utility functions
│   └── __init__.py
└── output/                # Generated reports (auto-created)
```

## Dependencies

- **requests** - HTTP requests
- **beautifulsoup4** - HTML parsing
- **lxml** - Fast XML/HTML parser
- **pandas** - Data manipulation
- **numpy** - Numerical operations
- **customtkinter** - Modern GUI framework
- **reportlab** - PDF generation (optional)
- **matplotlib** - Charts (optional)

## Disclaimer

⚠️ **IMPORTANT**: This tool is for educational and informational purposes only. It does not constitute financial advice. Always:

- Conduct your own research
- Verify data from multiple sources
- Consult with a qualified financial advisor before making investment decisions
- Understand that past performance does not guarantee future results

## Troubleshooting

### Common Issues

1. **GUI not launching**: Ensure customtkinter is installed:
   ```bash
   pip install customtkinter
   ```

2. **Scraping errors**: The websites may have changed their structure. Check if the URLs are correct and the websites are accessible.

3. **Missing data**: Some metrics may show as "N/A" if the source website doesn't have that data for the particular stock.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is open source. Use at your own risk.
