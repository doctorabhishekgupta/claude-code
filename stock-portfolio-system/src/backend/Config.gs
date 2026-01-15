/**
 * Configuration Module for Stock Portfolio System
 * Contains all constants, sheet names, and system configuration
 *
 * @fileoverview Central configuration for the portfolio tracking system
 * @author Stock Portfolio System
 * @version 1.0.0
 */

// ============================================================================
// SHEET NAMES
// ============================================================================

const SHEETS = {
  CATEGORIES: 'Categories',
  STOCKS: 'Stocks',
  TRANSACTIONS: 'Transactions',
  DAILY_PRICES: 'DailyPrices',
  HOLDINGS: 'Holdings',
  REPORTS: 'Reports',
  CONFIG: 'Config',
  LOGS: 'Logs',
  CORPORATE_ACTIONS: 'CorporateActions'
};

// ============================================================================
// COLUMN INDICES (0-based for arrays, 1-based for Range)
// ============================================================================

const COLUMNS = {
  CATEGORIES: {
    ID: 0,
    NAME: 1,
    DESCRIPTION: 2,
    CREATED_AT: 3,
    UPDATED_AT: 4,
    STOCK_COUNT: 5,
    TOTAL_INVESTED: 6,
    CURRENT_VALUE: 7,
    IS_ACTIVE: 8
  },
  STOCKS: {
    ID: 0,
    NAME: 1,
    SYMBOL: 2,
    SCREENER_URL: 3,
    CATEGORY_IDS: 4,
    ISIN: 5,
    SECTOR: 6,
    CURRENT_PRICE: 7,
    LAST_PRICE_UPDATE: 8,
    TOTAL_QUANTITY: 9,
    AVG_BUY_PRICE: 10,
    TOTAL_INVESTED: 11,
    CURRENT_VALUE: 12,
    UNREALIZED_PL: 13,
    UNREALIZED_PL_PERCENT: 14,
    CREATED_AT: 15,
    IS_ACTIVE: 16
  },
  TRANSACTIONS: {
    ID: 0,
    STOCK_ID: 1,
    STOCK_SYMBOL: 2,
    TYPE: 3,
    DATE: 4,
    PRICE: 5,
    QUANTITY: 6,
    TOTAL_VALUE: 7,
    BROKERAGE: 8,
    STT: 9,
    OTHER_CHARGES: 10,
    NET_VALUE: 11,
    NOTES: 12,
    FIFO_REFERENCE: 13,
    REMAINING_QUANTITY: 14,
    CREATED_AT: 15,
    CREATED_BY: 16
  },
  DAILY_PRICES: {
    ID: 0,
    STOCK_ID: 1,
    STOCK_SYMBOL: 2,
    DATE: 3,
    OPEN: 4,
    HIGH: 5,
    LOW: 6,
    CLOSE: 7,
    ADJUSTED_CLOSE: 8,
    VOLUME: 9,
    SOURCE: 10,
    FETCHED_AT: 11
  },
  HOLDINGS: {
    ID: 0,
    STOCK_ID: 1,
    STOCK_SYMBOL: 2,
    BUY_TRANSACTION_ID: 3,
    BUY_DATE: 4,
    BUY_PRICE: 5,
    ORIGINAL_QUANTITY: 6,
    REMAINING_QUANTITY: 7,
    INVESTED_VALUE: 8,
    CURRENT_PRICE: 9,
    CURRENT_VALUE: 10,
    UNREALIZED_PL: 11,
    HOLDING_DAYS: 12,
    LAST_UPDATED: 13
  },
  REPORTS: {
    ID: 0,
    TYPE: 1,
    ENTITY_ID: 2,
    ENTITY_NAME: 3,
    PERIOD: 4,
    START_DATE: 5,
    END_DATE: 6,
    TOTAL_INVESTED: 7,
    TOTAL_RETURNED: 8,
    CURRENT_VALUE: 9,
    XIRR: 10,
    CAGR: 11,
    ABSOLUTE_RETURN: 12,
    ABSOLUTE_RETURN_PERCENT: 13,
    GENERATED_AT: 14
  }
};

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

const TRANSACTION_TYPES = {
  BUY: 'BUY',
  SELL: 'SELL'
};

// ============================================================================
// REPORT TYPES
// ============================================================================

const REPORT_TYPES = {
  STOCK_CAGR: 'STOCK_CAGR',
  CATEGORY_CAGR: 'CATEGORY_CAGR',
  PORTFOLIO_CAGR: 'PORTFOLIO_CAGR',
  PERIOD_REPORT: 'PERIOD_REPORT'
};

// ============================================================================
// PERIOD DEFINITIONS (in days)
// ============================================================================

const PERIODS = {
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  '3Y': 1095,
  '5Y': 1825,
  'ALL': -1  // Special: all available data
};

const PERIOD_LABELS = {
  '3M': '3 Months',
  '6M': '6 Months',
  '1Y': '1 Year',
  '3Y': '3 Years',
  '5Y': '5 Years',
  'ALL': 'All Time'
};

// ============================================================================
// SCREENER.IN CONFIGURATION
// ============================================================================

const SCREENER_CONFIG = {
  BASE_URL: 'https://www.screener.in',
  COMPANY_PATH: '/company/',

  // Rate limiting
  MIN_DELAY_MS: 2000,           // Minimum delay between requests
  MAX_REQUESTS_PER_HOUR: 100,   // Maximum requests per hour
  BACKOFF_MULTIPLIER: 2,        // Exponential backoff multiplier
  MAX_RETRIES: 3,               // Maximum retry attempts
  INITIAL_BACKOFF_MS: 1000,     // Initial backoff delay

  // Request settings
  TIMEOUT_MS: 30000,            // Request timeout
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',

  // Selectors for parsing (CSS-like patterns for regex)
  SELECTORS: {
    CURRENT_PRICE: /<span[^>]*class="[^"]*number[^"]*"[^>]*>[\s\S]*?([0-9,]+\.?[0-9]*)/,
    STOCK_NAME: /<h1[^>]*class="[^"]*company-name[^"]*"[^>]*>([\s\S]*?)<\/h1>/,
    MARKET_CAP: /Market Cap[^<]*<[^>]*>[\s\S]*?([0-9,]+\.?[0-9]*)/,
    PE_RATIO: /Stock P\/E[^<]*<[^>]*>[\s\S]*?([0-9,]+\.?[0-9]*)/
  }
};

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const CACHE_CONFIG = {
  // CacheService limits: 6 hours max
  PRICE_CACHE_SECONDS: 3600,      // 1 hour for current prices
  HISTORICAL_CACHE_SECONDS: 21600, // 6 hours for historical data

  // Cache key prefixes
  KEYS: {
    CURRENT_PRICE: 'price_current_',
    HISTORICAL_PRICES: 'price_hist_',
    STOCK_DATA: 'stock_data_',
    CALCULATIONS: 'calc_'
  }
};

// ============================================================================
// LOGGING CONFIGURATION
// ============================================================================

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const LOG_CONFIG = {
  CURRENT_LEVEL: LOG_LEVELS.INFO,  // Minimum level to log
  MAX_LOG_ROWS: 10000,              // Maximum rows in Logs sheet
  CLEANUP_BATCH_SIZE: 1000,         // Rows to delete during cleanup
  RETENTION_DAYS: 30                // Days to keep logs
};

// ============================================================================
// XIRR CALCULATION CONFIGURATION
// ============================================================================

const XIRR_CONFIG = {
  MAX_ITERATIONS: 100,            // Maximum Newton-Raphson iterations
  TOLERANCE: 1e-10,               // Convergence tolerance
  INITIAL_GUESS: 0.1,             // Starting guess (10%)
  MIN_RATE: -0.99,                // Minimum allowed rate (-99%)
  MAX_RATE: 10.0                  // Maximum allowed rate (1000%)
};

// ============================================================================
// VALIDATION PATTERNS
// ============================================================================

const VALIDATION = {
  CATEGORY_ID: /^CAT-\d{3}$/,
  STOCK_ID: /^STK-\d{3}$/,
  TRANSACTION_ID: /^TXN-\d{6}$/,
  SCREENER_URL: /^https:\/\/www\.screener\.in\/company\/[A-Z0-9]+\/?$/,
  ISIN: /^INE[A-Z0-9]{10}$/
};

// ============================================================================
// MARKET TIMING (IST)
// ============================================================================

const MARKET_CONFIG = {
  TIMEZONE: 'Asia/Kolkata',
  OPEN_HOUR: 9,
  OPEN_MINUTE: 15,
  CLOSE_HOUR: 15,
  CLOSE_MINUTE: 30,
  TRADING_DAYS: [1, 2, 3, 4, 5]  // Monday to Friday
};

// ============================================================================
// ID GENERATORS
// ============================================================================

/**
 * Generates a new Category ID
 * @returns {string} New category ID in format CAT-XXX
 */
function generateCategoryId() {
  const sheet = getSheet_(SHEETS.CATEGORIES);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return 'CAT-001';
  }

  const lastId = sheet.getRange(lastRow, 1).getValue();
  const numPart = parseInt(lastId.replace('CAT-', ''), 10);
  return `CAT-${String(numPart + 1).padStart(3, '0')}`;
}

/**
 * Generates a new Stock ID
 * @returns {string} New stock ID in format STK-XXX
 */
function generateStockId() {
  const sheet = getSheet_(SHEETS.STOCKS);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return 'STK-001';
  }

  const lastId = sheet.getRange(lastRow, 1).getValue();
  const numPart = parseInt(lastId.replace('STK-', ''), 10);
  return `STK-${String(numPart + 1).padStart(3, '0')}`;
}

/**
 * Generates a new Transaction ID
 * @returns {string} New transaction ID in format TXN-XXXXXX
 */
function generateTransactionId() {
  const sheet = getSheet_(SHEETS.TRANSACTIONS);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return 'TXN-000001';
  }

  const lastId = sheet.getRange(lastRow, 1).getValue();
  const numPart = parseInt(lastId.replace('TXN-', ''), 10);
  return `TXN-${String(numPart + 1).padStart(6, '0')}`;
}

/**
 * Generates a new Price ID
 * @returns {string} New price ID in format PRC-XXXXXX
 */
function generatePriceId() {
  const sheet = getSheet_(SHEETS.DAILY_PRICES);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return 'PRC-000001';
  }

  const lastId = sheet.getRange(lastRow, 1).getValue();
  const numPart = parseInt(lastId.replace('PRC-', ''), 10);
  return `PRC-${String(numPart + 1).padStart(6, '0')}`;
}

/**
 * Generates a new Holding ID
 * @returns {string} New holding ID in format HLD-XXXXXX
 */
function generateHoldingId() {
  const sheet = getSheet_(SHEETS.HOLDINGS);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return 'HLD-000001';
  }

  const lastId = sheet.getRange(lastRow, 1).getValue();
  const numPart = parseInt(lastId.replace('HLD-', ''), 10);
  return `HLD-${String(numPart + 1).padStart(6, '0')}`;
}

/**
 * Generates a new Report ID
 * @returns {string} New report ID in format RPT-XXXXXX
 */
function generateReportId() {
  const sheet = getSheet_(SHEETS.REPORTS);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return 'RPT-000001';
  }

  const lastId = sheet.getRange(lastRow, 1).getValue();
  const numPart = parseInt(lastId.replace('RPT-', ''), 10);
  return `RPT-${String(numPart + 1).padStart(6, '0')}`;
}

/**
 * Generates a new Log ID
 * @returns {string} New log ID in format LOG-XXXXXX
 */
function generateLogId() {
  return `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets a sheet by name, creates if doesn't exist
 * @param {string} sheetName - Name of the sheet
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The sheet object
 * @private
 */
function getSheet_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    setupSheetHeaders_(sheet, sheetName);
  }

  return sheet;
}

/**
 * Sets up headers for a new sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet
 * @param {string} sheetName - Name of the sheet
 * @private
 */
function setupSheetHeaders_(sheet, sheetName) {
  const headers = getHeadersForSheet_(sheetName);
  if (headers && headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('white');
    sheet.setFrozenRows(1);
  }
}

/**
 * Gets header names for a sheet
 * @param {string} sheetName - Name of the sheet
 * @returns {string[]} Array of header names
 * @private
 */
function getHeadersForSheet_(sheetName) {
  const headerMaps = {
    [SHEETS.CATEGORIES]: [
      'CategoryID', 'CategoryName', 'Description', 'CreatedAt', 'UpdatedAt',
      'StockCount', 'TotalInvested', 'CurrentValue', 'IsActive'
    ],
    [SHEETS.STOCKS]: [
      'StockID', 'StockName', 'StockSymbol', 'ScreenerURL', 'CategoryIDs',
      'ISIN', 'Sector', 'CurrentPrice', 'LastPriceUpdate', 'TotalQuantity',
      'AvgBuyPrice', 'TotalInvested', 'CurrentValue', 'UnrealizedPL',
      'UnrealizedPLPercent', 'CreatedAt', 'IsActive'
    ],
    [SHEETS.TRANSACTIONS]: [
      'TransactionID', 'StockID', 'StockSymbol', 'Type', 'Date', 'Price',
      'Quantity', 'TotalValue', 'Brokerage', 'STT', 'OtherCharges', 'NetValue',
      'Notes', 'FIFOReference', 'RemainingQuantity', 'CreatedAt', 'CreatedBy'
    ],
    [SHEETS.DAILY_PRICES]: [
      'PriceID', 'StockID', 'StockSymbol', 'Date', 'Open', 'High', 'Low',
      'Close', 'AdjustedClose', 'Volume', 'Source', 'FetchedAt'
    ],
    [SHEETS.HOLDINGS]: [
      'HoldingID', 'StockID', 'StockSymbol', 'BuyTransactionID', 'BuyDate',
      'BuyPrice', 'OriginalQuantity', 'RemainingQuantity', 'InvestedValue',
      'CurrentPrice', 'CurrentValue', 'UnrealizedPL', 'HoldingDays', 'LastUpdated'
    ],
    [SHEETS.REPORTS]: [
      'ReportID', 'ReportType', 'EntityID', 'EntityName', 'Period', 'StartDate',
      'EndDate', 'TotalInvested', 'TotalReturned', 'CurrentValue', 'XIRR',
      'CAGR', 'AbsoluteReturn', 'AbsoluteReturnPercent', 'GeneratedAt'
    ],
    [SHEETS.CONFIG]: ['Key', 'Value', 'Description', 'LastUpdated'],
    [SHEETS.LOGS]: [
      'LogID', 'Timestamp', 'Level', 'Module', 'Function', 'Message',
      'Details', 'StackTrace'
    ],
    [SHEETS.CORPORATE_ACTIONS]: [
      'ActionID', 'StockID', 'StockSymbol', 'ActionType', 'ExDate', 'RecordDate',
      'Ratio', 'OldFaceValue', 'NewFaceValue', 'AdjustmentFactor', 'IsProcessed',
      'ProcessedAt', 'Notes'
    ]
  };

  return headerMaps[sheetName] || [];
}

/**
 * Gets configuration value from Config sheet
 * @param {string} key - Configuration key
 * @param {*} defaultValue - Default value if key not found
 * @returns {*} Configuration value
 */
function getConfigValue(key, defaultValue) {
  try {
    const sheet = getSheet_(SHEETS.CONFIG);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        return data[i][1];
      }
    }

    return defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Sets configuration value in Config sheet
 * @param {string} key - Configuration key
 * @param {*} value - Value to set
 * @param {string} description - Optional description
 */
function setConfigValue(key, value, description) {
  const sheet = getSheet_(SHEETS.CONFIG);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      sheet.getRange(i + 1, 4).setValue(new Date());
      return;
    }
  }

  // Key not found, add new row
  const newRow = [key, value, description || '', new Date()];
  sheet.appendRow(newRow);
}
