# Stock Portfolio System - Data Model & Schema

## 1. Complete Sheet Schema

### 1.1 Categories Sheet

| Column | Name | Data Type | Constraints | Description |
|--------|------|-----------|-------------|-------------|
| A | CategoryID | String | Primary Key, Format: `CAT-XXX` | Unique identifier |
| B | CategoryName | String | Required, Unique | Display name |
| C | Description | String | Optional | Category description |
| D | CreatedAt | DateTime | Auto-generated | Creation timestamp |
| E | UpdatedAt | DateTime | Auto-updated | Last modification |
| F | StockCount | Number | Calculated | Number of stocks in category |
| G | TotalInvested | Currency | Calculated | Total investment in category |
| H | CurrentValue | Currency | Calculated | Current value of category |
| I | IsActive | Boolean | Default: TRUE | Soft delete flag |

**Sample Data:**
```
| CategoryID | CategoryName    | Description              | CreatedAt           | UpdatedAt           | StockCount | TotalInvested | CurrentValue | IsActive |
|------------|-----------------|--------------------------|---------------------|---------------------|------------|---------------|--------------|----------|
| CAT-001    | Large Cap       | Bluechip companies       | 2024-01-15 10:00:00 | 2024-01-20 15:30:00 | 5          | 500000        | 575000       | TRUE     |
| CAT-002    | Banking         | Banking sector stocks    | 2024-01-15 10:05:00 | 2024-01-20 15:30:00 | 3          | 300000        | 345000       | TRUE     |
| CAT-003    | IT Services     | Information Technology   | 2024-01-15 10:10:00 | 2024-01-20 15:30:00 | 4          | 400000        | 380000       | TRUE     |
| CAT-004    | Pharma          | Pharmaceutical companies | 2024-01-16 09:00:00 | 2024-01-20 15:30:00 | 2          | 150000        | 165000       | TRUE     |
```

---

### 1.2 Stocks Sheet

| Column | Name | Data Type | Constraints | Description |
|--------|------|-----------|-------------|-------------|
| A | StockID | String | Primary Key, Format: `STK-XXX` | Unique identifier |
| B | StockName | String | Required | Company name |
| C | StockSymbol | String | Required, Unique | NSE/BSE symbol |
| D | ScreenerURL | URL | Required, Valid URL | Screener.in company page |
| E | CategoryIDs | String | Comma-separated | Assigned category IDs |
| F | ISIN | String | Optional | ISIN code |
| G | Sector | String | Optional | Industry sector |
| H | CurrentPrice | Currency | Auto-fetched | Latest price |
| I | LastPriceUpdate | DateTime | Auto-updated | Price fetch timestamp |
| J | TotalQuantity | Number | Calculated | Current holdings |
| K | AverageBuyPrice | Currency | Calculated | Weighted average cost |
| L | TotalInvested | Currency | Calculated | Total buy value |
| M | CurrentValue | Currency | Calculated | Current market value |
| N | UnrealizedPL | Currency | Calculated | Paper profit/loss |
| O | UnrealizedPLPercent | Percent | Calculated | P/L percentage |
| P | CreatedAt | DateTime | Auto-generated | Creation timestamp |
| Q | IsActive | Boolean | Default: TRUE | Soft delete flag |

**Sample Data:**
```
| StockID | StockName          | StockSymbol | ScreenerURL                                    | CategoryIDs     | ISIN          | Sector        | CurrentPrice | LastPriceUpdate     | TotalQuantity | AverageBuyPrice | TotalInvested | CurrentValue | UnrealizedPL | UnrealizedPLPercent | CreatedAt           | IsActive |
|---------|-------------------|-------------|------------------------------------------------|-----------------|---------------|---------------|--------------|---------------------|---------------|-----------------|---------------|--------------|--------------|---------------------|---------------------|----------|
| STK-001 | HDFC Bank         | HDFCBANK    | https://www.screener.in/company/HDFCBANK/      | CAT-001,CAT-002 | INE040A01034  | Banking       | 1650.50      | 2024-01-20 16:00:00 | 100           | 1500.00         | 150000        | 165050       | 15050        | 10.03%              | 2024-01-15 10:00:00 | TRUE     |
| STK-002 | Infosys           | INFY        | https://www.screener.in/company/INFY/          | CAT-001,CAT-003 | INE009A01021  | IT Services   | 1450.25      | 2024-01-20 16:00:00 | 50            | 1400.00         | 70000         | 72512.5      | 2512.5       | 3.59%               | 2024-01-15 10:05:00 | TRUE     |
| STK-003 | ICICI Bank        | ICICIBANK   | https://www.screener.in/company/ICICIBANK/     | CAT-001,CAT-002 | INE090A01021  | Banking       | 1020.75      | 2024-01-20 16:00:00 | 200           | 950.00          | 190000        | 204150       | 14150        | 7.45%               | 2024-01-15 10:10:00 | TRUE     |
| STK-004 | TCS               | TCS         | https://www.screener.in/company/TCS/           | CAT-001,CAT-003 | INE467B01029  | IT Services   | 3850.00      | 2024-01-20 16:00:00 | 25            | 3600.00         | 90000         | 96250        | 6250         | 6.94%               | 2024-01-15 10:15:00 | TRUE     |
| STK-005 | Sun Pharma        | SUNPHARMA   | https://www.screener.in/company/SUNPHARMA/     | CAT-004         | INE044A01036  | Pharma        | 1180.50      | 2024-01-20 16:00:00 | 75            | 1100.00         | 82500         | 88537.5      | 6037.5       | 7.32%               | 2024-01-16 09:00:00 | TRUE     |
```

---

### 1.3 Transactions Sheet

| Column | Name | Data Type | Constraints | Description |
|--------|------|-----------|-------------|-------------|
| A | TransactionID | String | Primary Key, Format: `TXN-XXXXXX` | Unique identifier |
| B | StockID | String | Foreign Key → Stocks.StockID | Stock reference |
| C | StockSymbol | String | Denormalized | For display |
| D | Type | String | Enum: BUY, SELL | Transaction type |
| E | Date | Date | Required, Not future | Transaction date |
| F | Price | Currency | Required, > 0 | Per share price |
| G | Quantity | Number | Required, > 0 | Number of shares |
| H | TotalValue | Currency | Calculated | Price × Quantity |
| I | Brokerage | Currency | Optional | Brokerage fees |
| J | STT | Currency | Optional | Securities Transaction Tax |
| K | OtherCharges | Currency | Optional | Other charges |
| L | NetValue | Currency | Calculated | Total ± Charges |
| M | Notes | String | Optional | Transaction notes |
| N | FIFOReference | String | For SELL only | Linked buy transaction(s) |
| O | RemainingQuantity | Number | For BUY only | Unsold quantity (FIFO) |
| P | CreatedAt | DateTime | Auto-generated | Record creation |
| Q | CreatedBy | String | Auto-set | User/trigger identifier |

**Sample Data:**
```
| TransactionID | StockID | StockSymbol | Type | Date       | Price   | Quantity | TotalValue | Brokerage | STT   | OtherCharges | NetValue  | Notes              | FIFOReference | RemainingQuantity | CreatedAt           | CreatedBy |
|---------------|---------|-------------|------|------------|---------|----------|------------|-----------|-------|--------------|-----------|---------------------|---------------|-------------------|---------------------|-----------|
| TXN-000001    | STK-001 | HDFCBANK    | BUY  | 2024-01-02 | 1480.00 | 50       | 74000      | 14.80     | 7.40  | 5.00         | 74027.20  | Initial purchase    |               | 50                | 2024-01-02 10:30:00 | USER      |
| TXN-000002    | STK-001 | HDFCBANK    | BUY  | 2024-01-10 | 1520.00 | 50       | 76000      | 15.20     | 7.60  | 5.00         | 76027.80  | Added on dip        |               | 50                | 2024-01-10 11:00:00 | USER      |
| TXN-000003    | STK-002 | INFY        | BUY  | 2024-01-05 | 1400.00 | 50       | 70000      | 14.00     | 7.00  | 5.00         | 70026.00  | Q3 results play     |               | 50                | 2024-01-05 09:45:00 | USER      |
| TXN-000004    | STK-003 | ICICIBANK   | BUY  | 2024-01-03 | 950.00  | 200      | 190000     | 38.00     | 19.00 | 10.00        | 190067.00 | Sector bet          |               | 200               | 2024-01-03 14:00:00 | USER      |
| TXN-000005    | STK-004 | TCS         | BUY  | 2024-01-08 | 3600.00 | 25       | 90000      | 18.00     | 9.00  | 5.00         | 90032.00  | IT allocation       |               | 25                | 2024-01-08 10:15:00 | USER      |
| TXN-000006    | STK-001 | HDFCBANK    | SELL | 2024-01-18 | 1640.00 | 20       | 32800      | 6.56      | 3.28  | 2.00         | 32788.16  | Partial booking     | TXN-000001    |                   | 2024-01-18 15:30:00 | USER      |
```

---

### 1.4 DailyPrices Sheet

| Column | Name | Data Type | Constraints | Description |
|--------|------|-----------|-------------|-------------|
| A | PriceID | String | Primary Key | Auto-generated |
| B | StockID | String | Foreign Key → Stocks.StockID | Stock reference |
| C | StockSymbol | String | Denormalized | For display |
| D | Date | Date | Required | Trading date |
| E | Open | Currency | Required | Opening price |
| F | High | Currency | Required | Day high |
| G | Low | Currency | Required | Day low |
| H | Close | Currency | Required | Closing price |
| I | AdjustedClose | Currency | Calculated | Split/bonus adjusted |
| J | Volume | Number | Optional | Trading volume |
| K | Source | String | Auto-set | Data source |
| L | FetchedAt | DateTime | Auto-generated | Fetch timestamp |

**Unique Constraint:** (StockID, Date) must be unique

**Sample Data:**
```
| PriceID    | StockID | StockSymbol | Date       | Open    | High    | Low     | Close   | AdjustedClose | Volume    | Source   | FetchedAt           |
|------------|---------|-------------|------------|---------|---------|---------|---------|---------------|-----------|----------|---------------------|
| PRC-000001 | STK-001 | HDFCBANK    | 2024-01-19 | 1635.00 | 1655.00 | 1630.00 | 1648.50 | 1648.50       | 5234567   | SCREENER | 2024-01-19 18:00:00 |
| PRC-000002 | STK-001 | HDFCBANK    | 2024-01-20 | 1645.00 | 1658.00 | 1640.00 | 1650.50 | 1650.50       | 4876543   | SCREENER | 2024-01-20 18:00:00 |
| PRC-000003 | STK-002 | INFY        | 2024-01-19 | 1440.00 | 1455.00 | 1435.00 | 1448.00 | 1448.00       | 3456789   | SCREENER | 2024-01-19 18:00:00 |
| PRC-000004 | STK-002 | INFY        | 2024-01-20 | 1445.00 | 1460.00 | 1442.00 | 1450.25 | 1450.25       | 3234567   | SCREENER | 2024-01-20 18:00:00 |
```

---

### 1.5 Holdings Sheet (Calculated/Derived)

| Column | Name | Data Type | Constraints | Description |
|--------|------|-----------|-------------|-------------|
| A | HoldingID | String | Primary Key | Auto-generated |
| B | StockID | String | Foreign Key | Stock reference |
| C | StockSymbol | String | Denormalized | For display |
| D | BuyTransactionID | String | Foreign Key → Transactions | Original buy reference |
| E | BuyDate | Date | From transaction | Purchase date |
| F | BuyPrice | Currency | From transaction | Purchase price |
| G | OriginalQuantity | Number | From transaction | Initially bought |
| H | RemainingQuantity | Number | Calculated | After FIFO sells |
| I | InvestedValue | Currency | Calculated | Remaining × BuyPrice |
| J | CurrentPrice | Currency | From Stocks | Latest price |
| K | CurrentValue | Currency | Calculated | Remaining × Current |
| L | UnrealizedPL | Currency | Calculated | Profit/Loss |
| M | HoldingDays | Number | Calculated | Days since purchase |
| N | LastUpdated | DateTime | Auto-updated | Calculation timestamp |

**Sample Data:**
```
| HoldingID  | StockID | StockSymbol | BuyTransactionID | BuyDate    | BuyPrice | OriginalQuantity | RemainingQuantity | InvestedValue | CurrentPrice | CurrentValue | UnrealizedPL | HoldingDays | LastUpdated         |
|------------|---------|-------------|------------------|------------|----------|------------------|-------------------|---------------|--------------|--------------|--------------|-------------|---------------------|
| HLD-000001 | STK-001 | HDFCBANK    | TXN-000001       | 2024-01-02 | 1480.00  | 50               | 30                | 44400         | 1650.50      | 49515        | 5115         | 18          | 2024-01-20 18:00:00 |
| HLD-000002 | STK-001 | HDFCBANK    | TXN-000002       | 2024-01-10 | 1520.00  | 50               | 50                | 76000         | 1650.50      | 82525        | 6525         | 10          | 2024-01-20 18:00:00 |
| HLD-000003 | STK-002 | INFY        | TXN-000003       | 2024-01-05 | 1400.00  | 50               | 50                | 70000         | 1450.25      | 72512.5      | 2512.5       | 15          | 2024-01-20 18:00:00 |
```

---

### 1.6 Reports Sheet

| Column | Name | Data Type | Constraints | Description |
|--------|------|-----------|-------------|-------------|
| A | ReportID | String | Primary Key | Auto-generated |
| B | ReportType | String | Enum | STOCK_CAGR, CATEGORY_CAGR, PORTFOLIO_CAGR, PERIOD_REPORT |
| C | EntityID | String | Optional | Stock/Category ID |
| D | EntityName | String | Display | Stock/Category name |
| E | Period | String | Optional | 3M, 6M, 1Y, 3Y, 5Y, ALL |
| F | StartDate | Date | Calculated | Period start |
| G | EndDate | Date | Calculated | Period end |
| H | TotalInvested | Currency | Calculated | Total cash outflow |
| I | TotalReturned | Currency | Calculated | Total cash inflow |
| J | CurrentValue | Currency | Calculated | Present value of holdings |
| K | XIRR | Percent | Calculated | Internal rate of return |
| L | CAGR | Percent | Calculated | XIRR (already annualized) |
| M | AbsoluteReturn | Currency | Calculated | Net profit/loss |
| N | AbsoluteReturnPercent | Percent | Calculated | Return percentage |
| O | GeneratedAt | DateTime | Auto-set | Report generation time |

**Sample Data:**
```
| ReportID   | ReportType     | EntityID | EntityName    | Period | StartDate  | EndDate    | TotalInvested | TotalReturned | CurrentValue | XIRR   | CAGR   | AbsoluteReturn | AbsoluteReturnPercent | GeneratedAt         |
|------------|----------------|----------|---------------|--------|------------|------------|---------------|---------------|--------------|--------|--------|----------------|-----------------------|---------------------|
| RPT-000001 | STOCK_CAGR     | STK-001  | HDFC Bank     | ALL    | 2024-01-02 | 2024-01-20 | 150000        | 32788.16      | 132040       | 85.23% | 85.23% | 14828.16       | 9.89%                 | 2024-01-20 18:30:00 |
| RPT-000002 | STOCK_CAGR     | STK-002  | Infosys       | ALL    | 2024-01-05 | 2024-01-20 | 70000         | 0             | 72512.5      | 65.45% | 65.45% | 2512.5         | 3.59%                 | 2024-01-20 18:30:00 |
| RPT-000003 | CATEGORY_CAGR  | CAT-001  | Large Cap     | ALL    | 2024-01-02 | 2024-01-20 | 500000        | 32788.16      | 542027.5     | 72.15% | 72.15% | 74815.66       | 14.96%                | 2024-01-20 18:30:00 |
| RPT-000004 | PORTFOLIO_CAGR |          | Full Portfolio| 1Y     | 2023-01-20 | 2024-01-20 | 682500        | 32788.16      | 726565       | 45.32% | 45.32% | 76853.16       | 11.26%                | 2024-01-20 18:30:00 |
| RPT-000005 | PERIOD_REPORT  |          | Summary       | 3M     | 2023-10-20 | 2024-01-20 | 250000        | 0             | 278500       | 55.67% | 55.67% | 28500          | 11.40%                | 2024-01-20 18:30:00 |
```

---

### 1.7 Config Sheet

| Column | Name | Data Type | Description |
|--------|------|-----------|-------------|
| A | Key | String | Configuration key |
| B | Value | String | Configuration value |
| C | Description | String | Description |
| D | LastUpdated | DateTime | Last modification |

**Sample Data:**
```
| Key                    | Value                  | Description                      | LastUpdated         |
|------------------------|------------------------|----------------------------------|---------------------|
| SCREENER_BASE_URL      | https://www.screener.in| Base URL for Screener.in         | 2024-01-15 10:00:00 |
| PRICE_FETCH_DELAY_MS   | 2000                   | Delay between API calls (ms)     | 2024-01-15 10:00:00 |
| MAX_RETRIES            | 3                      | Maximum retry attempts           | 2024-01-15 10:00:00 |
| CACHE_DURATION_HOURS   | 6                      | Cache validity period            | 2024-01-15 10:00:00 |
| LOG_LEVEL              | INFO                   | Logging level                    | 2024-01-15 10:00:00 |
| OWNER_EMAIL            | user@example.com       | Email for notifications          | 2024-01-15 10:00:00 |
| MARKET_OPEN_TIME       | 09:15                  | Market opening time IST          | 2024-01-15 10:00:00 |
| MARKET_CLOSE_TIME      | 15:30                  | Market closing time IST          | 2024-01-15 10:00:00 |
| AUTO_BACKUP_ENABLED    | TRUE                   | Enable automatic backups         | 2024-01-15 10:00:00 |
```

---

### 1.8 Logs Sheet

| Column | Name | Data Type | Description |
|--------|------|-----------|-------------|
| A | LogID | String | Auto-generated ID |
| B | Timestamp | DateTime | Log timestamp |
| C | Level | String | DEBUG, INFO, WARN, ERROR |
| D | Module | String | Source module name |
| E | Function | String | Function name |
| F | Message | String | Log message |
| G | Details | String | Additional JSON details |
| H | StackTrace | String | Error stack trace |

**Sample Data:**
```
| LogID      | Timestamp           | Level | Module       | Function          | Message                              | Details                                          | StackTrace |
|------------|---------------------|-------|--------------|-------------------|--------------------------------------|--------------------------------------------------|------------|
| LOG-000001 | 2024-01-20 18:00:01 | INFO  | PriceScraper | fetchCurrentPrice | Started price fetch for STK-001      | {"stockId":"STK-001","symbol":"HDFCBANK"}        |            |
| LOG-000002 | 2024-01-20 18:00:03 | INFO  | PriceScraper | fetchCurrentPrice | Successfully fetched price           | {"price":1650.50,"source":"SCREENER"}            |            |
| LOG-000003 | 2024-01-20 18:00:04 | WARN  | PriceScraper | fetchCurrentPrice | Rate limit approaching               | {"requestsThisHour":85,"limit":100}              |            |
| LOG-000004 | 2024-01-20 18:05:00 | ERROR | PriceScraper | fetchHistoricalPrices | Failed to parse historical data   | {"stockId":"STK-005","error":"Timeout"}          | at fetch.. |
```

---

### 1.9 CorporateActions Sheet (For Stock Splits, Bonuses)

| Column | Name | Data Type | Constraints | Description |
|--------|------|-----------|-------------|-------------|
| A | ActionID | String | Primary Key | Auto-generated |
| B | StockID | String | Foreign Key | Stock reference |
| C | StockSymbol | String | Denormalized | For display |
| D | ActionType | String | Enum: SPLIT, BONUS, DIVIDEND | Type of action |
| E | ExDate | Date | Required | Ex-date |
| F | RecordDate | Date | Optional | Record date |
| G | Ratio | String | Required | e.g., "2:1", "1:1" |
| H | OldFaceValue | Currency | For splits | Original face value |
| I | NewFaceValue | Currency | For splits | New face value |
| J | AdjustmentFactor | Number | Calculated | Multiplier for adjustment |
| K | IsProcessed | Boolean | Default: FALSE | Processing status |
| L | ProcessedAt | DateTime | Optional | When processed |
| M | Notes | String | Optional | Additional notes |

**Sample Data:**
```
| ActionID   | StockID | StockSymbol | ActionType | ExDate     | RecordDate | Ratio | OldFaceValue | NewFaceValue | AdjustmentFactor | IsProcessed | ProcessedAt         | Notes              |
|------------|---------|-------------|------------|------------|------------|-------|--------------|--------------|------------------|-------------|---------------------|--------------------|
| ACT-000001 | STK-002 | INFY        | BONUS      | 2023-12-15 | 2023-12-20 | 1:1   |              |              | 2.0              | TRUE        | 2023-12-21 10:00:00 | 1:1 Bonus issue    |
| ACT-000002 | STK-004 | TCS         | SPLIT      | 2024-01-05 | 2024-01-10 | 2:1   | 2.00         | 1.00         | 2.0              | TRUE        | 2024-01-11 10:00:00 | Stock split 2:1    |
```

---

## 2. Data Relationships

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Categories  │────<│   Stocks    │>────│Transactions │
│             │ M:N │             │ 1:M │             │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                          │ 1                  │ 1
                          │                    │
                          │ M                  │ M
                   ┌──────┴──────┐     ┌──────┴──────┐
                   │DailyPrices  │     │  Holdings   │
                   │             │     │             │
                   └─────────────┘     └─────────────┘

                   ┌─────────────┐     ┌─────────────┐
                   │   Reports   │     │CorporateActs│
                   │ (Aggregate) │     │             │
                   └─────────────┘     └─────────────┘
```

## 3. Index Recommendations

For fast lookups, sort/filter these columns frequently:
- **Transactions:** StockID + Date (for FIFO queries)
- **DailyPrices:** StockID + Date (for price lookups)
- **Holdings:** StockID + RemainingQuantity > 0 (for active holdings)
- **Reports:** ReportType + Period (for report retrieval)

## 4. Data Validation Rules

### 4.1 Categories
```javascript
const CATEGORY_VALIDATION = {
  CategoryID: { pattern: /^CAT-\d{3}$/, required: true },
  CategoryName: { maxLength: 50, required: true, unique: true },
  Description: { maxLength: 200, required: false }
};
```

### 4.2 Stocks
```javascript
const STOCK_VALIDATION = {
  StockID: { pattern: /^STK-\d{3}$/, required: true },
  StockName: { maxLength: 100, required: true },
  StockSymbol: { maxLength: 20, required: true, unique: true },
  ScreenerURL: { pattern: /^https:\/\/www\.screener\.in\/company\//, required: true },
  CategoryIDs: { pattern: /^(CAT-\d{3})(,CAT-\d{3})*$/, required: false }
};
```

### 4.3 Transactions
```javascript
const TRANSACTION_VALIDATION = {
  TransactionID: { pattern: /^TXN-\d{6}$/, required: true },
  StockID: { foreignKey: 'Stocks.StockID', required: true },
  Type: { enum: ['BUY', 'SELL'], required: true },
  Date: { type: 'date', notFuture: true, required: true },
  Price: { type: 'number', min: 0.01, required: true },
  Quantity: { type: 'integer', min: 1, required: true }
};
```

## 5. Named Ranges (For Easy Formula Reference)

| Named Range | Sheet | Range | Description |
|-------------|-------|-------|-------------|
| Categories | Categories | A2:I1000 | All category data |
| Stocks | Stocks | A2:Q1000 | All stock data |
| Transactions | Transactions | A2:Q10000 | All transactions |
| DailyPrices | DailyPrices | A2:L100000 | All price data |
| Holdings | Holdings | A2:N10000 | All holdings |
| Reports | Reports | A2:O10000 | All reports |
| Config | Config | A2:D100 | Configuration |
