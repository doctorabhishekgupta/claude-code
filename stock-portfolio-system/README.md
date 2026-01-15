# Stock Portfolio Tracking System

A complete, production-ready stock portfolio tracking and analysis system built with Google Sheets and Google Apps Script.

## Features

- **Stock Management**: Add and track stocks with Screener.in integration
- **Category System**: Organize stocks into categories with multi-category support
- **Transaction Tracking**: Record buy/sell transactions with FIFO allocation
- **Automated Price Fetching**: Daily price updates from Screener.in
- **XIRR-based CAGR**: Accurate return calculations accounting for cash flow timing
- **Multi-Period Reports**: 3M, 6M, 1Y, 3Y, 5Y performance analysis
- **Corporate Actions**: Handle stock splits and bonus shares
- **Web App Interface**: Optional web UI for easy access

## Project Structure

```
stock-portfolio-system/
├── README.md
├── docs/
│   ├── SYSTEM_ARCHITECTURE.md    # Architecture overview
│   ├── DATA_MODEL.md             # Database schema
│   ├── DEPLOYMENT.md             # Setup instructions
│   ├── FORMULAS_AND_EDGE_CASES.md # Math & edge cases
│   └── MAINTENANCE.md            # Maintenance guide
├── src/
│   ├── backend/
│   │   ├── Code.gs               # Main entry point
│   │   ├── Config.gs             # Configuration
│   │   ├── ErrorHandler.gs       # Logging & errors
│   │   ├── CacheManager.gs       # Caching layer
│   │   ├── PriceScraper.gs       # Screener.in scraping
│   │   ├── TransactionHandler.gs # Buy/Sell logic
│   │   ├── CAGRCalculator.gs     # XIRR calculations
│   │   ├── CategoryAggregator.gs # Category management
│   │   └── CorporateActions.gs   # Splits & bonus
│   └── frontend/
│       ├── WebApp.html           # Main web app
│       ├── Styles.html           # CSS styles
│       ├── Scripts.html          # JavaScript
│       ├── AddStockDialog.html   # Add stock dialog
│       ├── AddCategoryDialog.html
│       ├── BuyDialog.html
│       ├── SellDialog.html
│       └── AssignCategoriesDialog.html
└── tests/                        # Test files (future)
```

## Quick Start

1. Create a new Google Sheet
2. Open **Extensions → Apps Script**
3. Create files and copy code from `src/backend/` and `src/frontend/`
4. Run `initializeAllSheets()`
5. Run `setupAllTriggers()`
6. Start adding stocks and transactions!

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed setup instructions.

## Sheet Schema

| Sheet | Purpose |
|-------|---------|
| Categories | Stock categories (Large Cap, Banking, etc.) |
| Stocks | Stock master data with Screener URLs |
| Transactions | Buy/Sell transaction log |
| DailyPrices | Historical OHLC data |
| Holdings | Current holdings with FIFO tracking |
| Reports | Generated CAGR reports |
| Config | System configuration |
| Logs | Activity and error logs |
| CorporateActions | Splits, bonus, dividends |

## Key Functionality

### XIRR-based CAGR Calculation

Uses Newton-Raphson method to calculate accurate returns:

```javascript
// XIRR solves for r in:
// Σ(CF_i / (1 + r)^(d_i/365)) = 0

const xirr = calculateXIRR(cashFlows);
// Returns annualized rate of return
```

### FIFO Transaction Handling

```javascript
// When selling, oldest purchases are used first
const result = recordSellTransaction({
  stockId: 'STK-001',
  date: new Date(),
  price: 1650,
  quantity: 50
});
// result.fifoAllocation shows which buys were used
```

### Multi-Category Allocation

```javascript
// Stock in multiple categories is allocated proportionally
// Prevents double-counting in category totals
const allocationFactor = 1 / numberOfCategories;
```

## Automated Tasks

| Task | Schedule | Function |
|------|----------|----------|
| Price Update | 6:00 PM daily | `dailyPriceUpdate()` |
| Report Generation | Sunday 8:00 AM | `weeklyReportGeneration()` |
| Log Cleanup | 2:00 AM daily | `cleanupLogs()` |
| Error Digest | 9:00 AM daily | `sendErrorDigest()` |

## Configuration

Key settings in `Config.gs`:

```javascript
// Rate limiting for Screener.in
MIN_DELAY_MS: 2000,           // 2 seconds between requests
MAX_REQUESTS_PER_HOUR: 100,   // Max 100 requests/hour

// XIRR calculation
MAX_ITERATIONS: 100,          // Newton-Raphson iterations
TOLERANCE: 1e-10,             // Convergence tolerance
```

## API Reference

### Transaction Management

```javascript
// Record a buy
recordBuyTransaction({
  stockId: 'STK-001',
  date: new Date('2024-01-15'),
  price: 1500,
  quantity: 100,
  brokerage: 15,
  stt: 7.5
});

// Record a sell
recordSellTransaction({
  stockId: 'STK-001',
  date: new Date('2024-02-15'),
  price: 1650,
  quantity: 50
});
```

### CAGR Calculation

```javascript
// Stock CAGR
const result = calculateStockCAGR('STK-001', '1Y');
// { xirr: 0.1523, cagr: 0.1523, xirrPercent: '15.23%' }

// Portfolio CAGR
const portfolio = calculatePortfolioCAGR('1Y');

// Category CAGR
const category = calculateCategoryCAGR('CAT-001', '1Y');
```

### Price Fetching

```javascript
// Fetch current price
const price = fetchCurrentPrice('STK-001');

// Manual price entry (if scraping fails)
manualPriceEntry('STK-001', 1650.50, new Date());

// Historical backfill
performHistoricalBackfill();
```

## Documentation

- [System Architecture](docs/SYSTEM_ARCHITECTURE.md)
- [Data Model](docs/DATA_MODEL.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Formulas & Edge Cases](docs/FORMULAS_AND_EDGE_CASES.md)
- [Maintenance Guide](docs/MAINTENANCE.md)

## Limitations

- Price data depends on Screener.in availability
- Rate limited to ~100 requests/hour
- XIRR may not converge for unusual cash flow patterns
- Corporate actions require manual entry

## Technology

- **Database**: Google Sheets
- **Backend**: Google Apps Script (ES6+)
- **Frontend**: HTML Service
- **Data Source**: Screener.in (web scraping)

## License

MIT License - Feel free to use and modify for personal or commercial use.

## Contributing

Contributions welcome! Please ensure:
- Code is well-commented
- Edge cases are handled
- No external paid APIs

## Support

For issues, check the Logs sheet first, then review:
- [Troubleshooting Guide](docs/MAINTENANCE.md#3-common-issues--solutions)
- Google Apps Script documentation
