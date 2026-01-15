# Stock Portfolio Tracking System - System Architecture

## 1. System Overview

### 1.1 Purpose
A complete stock portfolio tracking and analysis system built on Google Sheets + Google Apps Script that enables:
- Stock categorization and management
- Buy/Sell transaction recording with FIFO logic
- Automated price fetching from Screener.in
- XIRR-based CAGR calculations
- Multi-period performance reports

### 1.2 Technology Stack
| Component | Technology |
|-----------|------------|
| Database | Google Sheets |
| Backend | Google Apps Script |
| Frontend | HTML Service (Web App) |
| Data Source | Screener.in (scraping) |
| Scheduling | Apps Script Triggers |

### 1.3 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  Google Sheets   │    │   Web App UI     │    │  Custom Menus    │  │
│  │  (Direct Edit)   │    │  (HTML Service)  │    │  (Script Menus)  │  │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘  │
└───────────┼───────────────────────┼───────────────────────┼─────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        APPS SCRIPT BACKEND                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Price     │  │ Transaction │  │    CAGR     │  │  Category   │    │
│  │  Scraper    │  │  Handler    │  │ Calculator  │  │ Aggregator  │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│  ┌──────┴────────────────┴────────────────┴────────────────┴──────┐    │
│  │                     UTILITY MODULES                             │    │
│  │  [Cache Manager] [Error Logger] [Retry Handler] [Validators]   │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER (Google Sheets)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│  │Categories │ │  Stocks   │ │Transactions│ │Daily Prices│ │  Reports │ │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘ │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                             │
│  │  Config   │ │   Logs    │ │  Holdings │                             │
│  └───────────┘ └───────────┘ └───────────┘                             │
└─────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL DATA SOURCE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                          Screener.in                                     │
│           (Rate-limited scraping with ethical throttling)                │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. Data Flow Diagrams

### 2.1 Buy Transaction Flow
```
User Input → Validation → Transaction Record → Holdings Update → Price Fetch → CAGR Recalc
     │            │              │                   │               │            │
     ▼            ▼              ▼                   ▼               ▼            ▼
[Stock, Date,  [Future Date?, [Transactions    [Holdings Tab   [Screener    [Reports Tab
 Price, Qty]   Price>0?,      Tab Updated]     FIFO Updated]   API Call]    Updated]
               Qty>0?]
```

### 2.2 Sell Transaction Flow
```
User Input → Ownership Check → FIFO Allocation → Transaction Record → Holdings Update → CAGR Recalc
     │             │                  │                  │                   │              │
     ▼             ▼                  ▼                  ▼                   ▼              ▼
[Stock, Date,  [Available    [Match against   [Transactions       [Reduce/Remove    [Update
 Price, Qty]   Qty >= Sell   oldest buys      Tab with FIFO       from Holdings]    Reports]
               Qty?]         first]           reference]
```

### 2.3 Price Fetch Flow
```
Trigger/Manual → Get Stocks → Check Cache → Fetch from Screener → Parse HTML → Store Prices
      │              │             │               │                   │            │
      ▼              ▼             ▼               ▼                   ▼            ▼
[Daily/Manual]  [Stocks Tab]  [Cache Hit?    [UrlFetchApp      [Regex/DOM      [Daily Prices
                              Skip if        with throttle]    Parsing]        Tab Updated]
                              recent]
```

### 2.4 CAGR Calculation Flow
```
Get Transactions → Build Cash Flows → Apply XIRR → Convert to CAGR → Aggregate by Category
       │                 │                │              │                   │
       ▼                 ▼                ▼              ▼                   ▼
[All Buy/Sell     [Dates + Amounts   [Newton-Raphson  [CAGR = XIRR    [Weight by
 for Stock]       + Current Value]   Iteration]       (already         invested
                                                      annualized)]     amount]
```

## 3. Module Architecture

### 3.1 Script Modules Overview

| Module | File | Responsibility |
|--------|------|----------------|
| Main | `Code.gs` | Entry points, menu creation, web app handlers |
| Config | `Config.gs` | Constants, sheet names, API settings |
| PriceScraper | `PriceScraper.gs` | Screener.in scraping, price fetching |
| TransactionHandler | `TransactionHandler.gs` | Buy/Sell logic, FIFO, validation |
| CAGRCalculator | `CAGRCalculator.gs` | XIRR calculation, CAGR conversion |
| CategoryAggregator | `CategoryAggregator.gs` | Multi-category handling, weighted returns |
| ReportGenerator | `ReportGenerator.gs` | Period reports, performance summaries |
| DataAccess | `DataAccess.gs` | Sheet read/write operations |
| Utils | `Utils.gs` | Helpers, validators, formatters |
| ErrorHandler | `ErrorHandler.gs` | Logging, retry logic, error tracking |
| CacheManager | `CacheManager.gs` | Caching layer for API calls |

### 3.2 Module Dependencies
```
                    ┌─────────────┐
                    │   Code.gs   │
                    │  (Main)     │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│PriceScraper.gs│  │TransactionHdlr│  │ReportGenerator│
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        │          ┌───────┴───────┐          │
        │          │               │          │
        ▼          ▼               ▼          ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ CacheManager  │  │CAGRCalculator │  │CategoryAggreg │
└───────────────┘  └───────────────┘  └───────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
            ┌─────────────┐ ┌─────────────┐
            │ DataAccess  │ │   Utils     │
            └──────┬──────┘ └─────────────┘
                   │
                   ▼
            ┌─────────────┐
            │ErrorHandler │
            │ Config      │
            └─────────────┘
```

## 4. Trigger Architecture

### 4.1 Time-Driven Triggers

| Trigger | Function | Schedule | Purpose |
|---------|----------|----------|---------|
| Daily Price Update | `dailyPriceUpdate()` | Daily 6:00 PM IST | Fetch closing prices |
| Weekly Report | `weeklyReportGeneration()` | Sunday 8:00 AM | Generate weekly summary |
| Cache Cleanup | `cleanupCache()` | Daily 2:00 AM | Clear stale cache entries |
| Error Report | `sendErrorDigest()` | Daily 9:00 AM | Email error summary |

### 4.2 Event-Driven Triggers

| Trigger | Function | Event | Purpose |
|---------|----------|-------|---------|
| onEdit | `onEditHandler()` | Cell edit | Validate inputs, auto-calculate |
| onOpen | `onOpenHandler()` | Sheet open | Create menus, check updates |
| doGet | `doGet(e)` | Web request | Serve web app |
| doPost | `doPost(e)` | Form submit | Process web app actions |

## 5. Security & Stability Design

### 5.1 Rate Limiting Strategy
```javascript
// Screener.in rate limiting
const RATE_LIMIT = {
  MIN_DELAY_MS: 2000,      // Minimum 2 seconds between requests
  MAX_REQUESTS_HOUR: 100,   // Max 100 requests per hour
  BACKOFF_MULTIPLIER: 2,    // Exponential backoff multiplier
  MAX_RETRIES: 3            // Maximum retry attempts
};
```

### 5.2 Error Handling Strategy
- All external calls wrapped in try-catch
- Exponential backoff for transient failures
- Detailed logging to Logs sheet
- Email alerts for critical failures
- Graceful degradation when data unavailable

### 5.3 Quota Management
| Resource | Daily Limit | Strategy |
|----------|-------------|----------|
| UrlFetch calls | 20,000 | Batch requests, caching |
| Script runtime | 6 min/execution | Chunked processing |
| Email | 100/day | Digest emails only |
| Triggers | 20 | Consolidate functions |

## 6. Caching Strategy

### 6.1 Cache Layers
1. **Script Cache** (CacheService): Short-term (6 hours max)
   - Current prices
   - Parsed HTML data

2. **Sheet Cache** (DailyPrices tab): Persistent
   - Historical prices
   - Calculated values

### 6.2 Cache Invalidation
- Price cache: Invalidate after market hours
- Calculation cache: Invalidate on transaction
- Report cache: Invalidate on data change

## 7. Web App Architecture

### 7.1 Endpoints
| Method | Action | Handler |
|--------|--------|---------|
| GET | Load app | `doGet()` |
| POST:addStock | Add stock | `handleAddStock()` |
| POST:addCategory | Add category | `handleAddCategory()` |
| POST:buyStock | Record buy | `handleBuyStock()` |
| POST:sellStock | Record sell | `handleSellStock()` |
| POST:getReport | Fetch report | `handleGetReport()` |

### 7.2 Frontend Structure
```
├── index.html          # Main app shell
├── styles.html         # CSS styles
├── scripts.html        # Client-side JavaScript
└── components/
    ├── stockForm.html  # Add stock form
    ├── transactionForm.html  # Buy/Sell forms
    └── reportView.html # Report display
```
