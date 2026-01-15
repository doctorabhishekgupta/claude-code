/**
 * Price Scraper Module
 * Fetches stock prices from Screener.in
 *
 * @fileoverview Screener.in scraping with rate limiting and error handling
 * @author Stock Portfolio System
 * @version 1.0.0
 */

// ============================================================================
// MAIN FETCH FUNCTIONS
// ============================================================================

/**
 * Fetches current price for a stock from Screener.in
 * @param {string} stockId - Stock ID
 * @param {boolean} useCache - Whether to use cached data (default: true)
 * @returns {Object} Price data { price, timestamp, source }
 */
function fetchCurrentPrice(stockId, useCache = true) {
  const funcName = 'fetchCurrentPrice';
  logInfo('PriceScraper', funcName, `Fetching price for ${stockId}`);

  // Check cache first
  if (useCache) {
    const cached = getCachedCurrentPrice(stockId);
    if (cached) {
      logDebug('PriceScraper', funcName, `Cache hit for ${stockId}`);
      return cached;
    }
  }

  // Get stock details
  const stock = getStockById(stockId);
  if (!stock) {
    throw new PortfolioError(
      ERROR_CODES.STOCK_NOT_FOUND,
      `Stock not found: ${stockId}`
    );
  }

  // Fetch from Screener
  const html = fetchScreenerPage_(stock.screenerUrl);
  const priceData = parseCurrentPrice_(html);

  // Add metadata
  priceData.stockId = stockId;
  priceData.symbol = stock.symbol;
  priceData.timestamp = new Date();
  priceData.source = 'SCREENER';

  // Cache the result
  setCachedCurrentPrice(stockId, priceData);

  // Update stock sheet with current price
  updateStockCurrentPrice_(stockId, priceData.price);

  logInfo('PriceScraper', funcName, `Fetched price for ${stockId}: ${priceData.price}`);
  return priceData;
}

/**
 * Fetches historical prices for a stock
 * @param {string} stockId - Stock ID
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Object[]} Array of price data
 */
function fetchHistoricalPrices(stockId, startDate, endDate) {
  const funcName = 'fetchHistoricalPrices';
  logInfo('PriceScraper', funcName, `Fetching historical prices for ${stockId}`);

  // Get stock details
  const stock = getStockById(stockId);
  if (!stock) {
    throw new PortfolioError(
      ERROR_CODES.STOCK_NOT_FOUND,
      `Stock not found: ${stockId}`
    );
  }

  // Screener.in doesn't provide a direct historical prices API
  // We need to parse from the chart data or consolidated view
  const html = fetchScreenerPage_(stock.screenerUrl + 'consolidated/');

  // Parse historical data from the page
  const historicalData = parseHistoricalPrices_(html, stock.symbol);

  // Filter by date range if specified
  let filteredData = historicalData;
  if (startDate) {
    filteredData = filteredData.filter(d => new Date(d.date) >= startDate);
  }
  if (endDate) {
    filteredData = filteredData.filter(d => new Date(d.date) <= endDate);
  }

  // Save to DailyPrices sheet
  saveHistoricalPrices_(stockId, stock.symbol, filteredData);

  logInfo('PriceScraper', funcName,
    `Fetched ${filteredData.length} historical prices for ${stockId}`
  );

  return filteredData;
}

/**
 * Performs initial historical backfill for all stocks
 * Should be run once during setup
 */
function performHistoricalBackfill() {
  const funcName = 'performHistoricalBackfill';
  logInfo('PriceScraper', funcName, 'Starting historical backfill');

  const stocks = getAllActiveStocks();
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  stocks.forEach((stock, index) => {
    try {
      logInfo('PriceScraper', funcName,
        `Processing ${index + 1}/${stocks.length}: ${stock.symbol}`
      );

      // Check rate limit before each request
      const rateCheck = canMakeRequest();
      if (!rateCheck.canRequest) {
        if (rateCheck.reason === 'hourly_limit') {
          logWarn('PriceScraper', funcName, 'Hourly rate limit reached, stopping backfill');
          throw new PortfolioError(ERROR_CODES.SCREENER_RATE_LIMIT, 'Rate limit reached');
        }
        Utilities.sleep(rateCheck.waitTime);
      }

      fetchHistoricalPrices(stock.id);
      results.success++;

    } catch (error) {
      results.failed++;
      results.errors.push({
        stockId: stock.id,
        symbol: stock.symbol,
        error: error.message
      });

      if (error.code === ERROR_CODES.SCREENER_RATE_LIMIT) {
        break; // Stop on rate limit
      }
    }

    // Add delay between stocks
    Utilities.sleep(SCREENER_CONFIG.MIN_DELAY_MS);
  });

  logInfo('PriceScraper', funcName,
    `Backfill complete: ${results.success} success, ${results.failed} failed`,
    results
  );

  return results;
}

/**
 * Daily price update for all active stocks
 * Called by daily trigger
 */
function dailyPriceUpdate() {
  const funcName = 'dailyPriceUpdate';
  logInfo('PriceScraper', funcName, 'Starting daily price update');

  // Check if market was open today
  if (!isMarketDay_(new Date())) {
    logInfo('PriceScraper', funcName, 'Market closed today, skipping update');
    return;
  }

  const stocks = getAllActiveStocks();
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  stocks.forEach((stock, index) => {
    try {
      // Rate limiting
      if (!waitForRateLimit()) {
        logWarn('PriceScraper', funcName, 'Rate limit reached, will continue tomorrow');
        return;
      }

      const priceData = fetchCurrentPrice(stock.id, false); // Force refresh

      // Also save to daily prices
      saveDailyPrice_(stock.id, stock.symbol, new Date(), priceData);

      results.success++;

    } catch (error) {
      results.failed++;
      results.errors.push({
        stockId: stock.id,
        symbol: stock.symbol,
        error: error.message
      });
    }

    // Progress log every 10 stocks
    if ((index + 1) % 10 === 0) {
      logInfo('PriceScraper', funcName,
        `Progress: ${index + 1}/${stocks.length} stocks processed`
      );
    }
  });

  // Update reports after price refresh
  if (results.success > 0) {
    generateAllReports();
  }

  logInfo('PriceScraper', funcName,
    `Daily update complete: ${results.success} success, ${results.failed} failed`,
    results
  );

  return results;
}

// ============================================================================
// HTTP FETCH FUNCTIONS
// ============================================================================

/**
 * Fetches a Screener.in page with rate limiting and retries
 * @param {string} url - URL to fetch
 * @returns {string} HTML content
 * @private
 */
function fetchScreenerPage_(url) {
  const funcName = 'fetchScreenerPage_';

  // Rate limit check
  if (!waitForRateLimit()) {
    throw new PortfolioError(
      ERROR_CODES.SCREENER_RATE_LIMIT,
      'Rate limit exceeded'
    );
  }

  const fetchFn = () => {
    const options = {
      method: 'get',
      headers: {
        'User-Agent': SCREENER_CONFIG.USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      muteHttpExceptions: true,
      followRedirects: true
    };

    recordRequest(); // Track for rate limiting

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 429) {
      throw new PortfolioError(
        ERROR_CODES.SCREENER_RATE_LIMIT,
        'Rate limited by Screener.in'
      );
    }

    if (responseCode !== 200) {
      throw new PortfolioError(
        ERROR_CODES.SCREENER_FETCH_ERROR,
        `HTTP ${responseCode} from Screener.in`
      );
    }

    return response.getContentText();
  };

  return withRetry(fetchFn, {
    maxRetries: SCREENER_CONFIG.MAX_RETRIES,
    initialDelayMs: SCREENER_CONFIG.INITIAL_BACKOFF_MS,
    backoffMultiplier: SCREENER_CONFIG.BACKOFF_MULTIPLIER,
    shouldRetry: isRetryableError
  });
}

// ============================================================================
// HTML PARSING FUNCTIONS
// ============================================================================

/**
 * Parses current price from Screener HTML
 * @param {string} html - HTML content
 * @returns {Object} Price data
 * @private
 */
function parseCurrentPrice_(html) {
  const funcName = 'parseCurrentPrice_';

  try {
    // Method 1: Look for the current price in the header section
    // Pattern: <span class="number">1,650.50</span> near "Current Price"
    let priceMatch = html.match(/Current Price[^<]*<[^>]*>[^<]*<[^>]*class="[^"]*number[^"]*"[^>]*>[\s]*₹?[\s]*([0-9,]+\.?[0-9]*)/i);

    if (!priceMatch) {
      // Method 2: Look for price in top-ratios section
      priceMatch = html.match(/<span[^>]*id="top-ratios-price"[^>]*>[\s]*₹?[\s]*([0-9,]+\.?[0-9]*)/i);
    }

    if (!priceMatch) {
      // Method 3: Look for any prominent price display
      priceMatch = html.match(/<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s]*₹?[\s]*([0-9,]+\.?[0-9]*)/i);
    }

    if (!priceMatch) {
      // Method 4: Search for number near "Stock Price" or "Share Price"
      priceMatch = html.match(/(?:Stock|Share|Current)\s*Price[^<]*(?:<[^>]*>){0,5}[\s]*₹?[\s]*([0-9,]+\.?[0-9]*)/i);
    }

    if (!priceMatch) {
      throw new PortfolioError(
        ERROR_CODES.SCREENER_PARSE_ERROR,
        'Could not find current price in page'
      );
    }

    const priceStr = priceMatch[1].replace(/,/g, '');
    const price = parseFloat(priceStr);

    if (isNaN(price) || price <= 0) {
      throw new PortfolioError(
        ERROR_CODES.SCREENER_PARSE_ERROR,
        `Invalid price value: ${priceMatch[1]}`
      );
    }

    // Try to parse additional data
    const result = { price };

    // Try to get day high/low
    const highMatch = html.match(/High[^<]*<[^>]*class="[^"]*number[^"]*"[^>]*>[\s]*₹?[\s]*([0-9,]+\.?[0-9]*)/i);
    const lowMatch = html.match(/Low[^<]*<[^>]*class="[^"]*number[^"]*"[^>]*>[\s]*₹?[\s]*([0-9,]+\.?[0-9]*)/i);

    if (highMatch) {
      result.high = parseFloat(highMatch[1].replace(/,/g, ''));
    }
    if (lowMatch) {
      result.low = parseFloat(lowMatch[1].replace(/,/g, ''));
    }

    return result;

  } catch (error) {
    if (error instanceof PortfolioError) {
      throw error;
    }
    throw new PortfolioError(
      ERROR_CODES.SCREENER_PARSE_ERROR,
      `Parse error: ${error.message}`
    );
  }
}

/**
 * Parses historical prices from Screener HTML
 * @param {string} html - HTML content
 * @param {string} symbol - Stock symbol for logging
 * @returns {Object[]} Array of price data
 * @private
 */
function parseHistoricalPrices_(html, symbol) {
  const funcName = 'parseHistoricalPrices_';
  const prices = [];

  try {
    // Screener.in embeds chart data in JavaScript
    // Look for chart-data or data-points arrays
    const chartDataMatch = html.match(/var\s+chartData\s*=\s*(\[[\s\S]*?\]);/);

    if (chartDataMatch) {
      const chartData = JSON.parse(chartDataMatch[1]);
      chartData.forEach(point => {
        if (point.date && point.close) {
          prices.push({
            date: new Date(point.date),
            open: point.open || point.close,
            high: point.high || point.close,
            low: point.low || point.close,
            close: point.close,
            volume: point.volume || 0
          });
        }
      });
    }

    // If no chart data, try to parse from quarterly results table
    if (prices.length === 0) {
      const quarterlyMatch = html.match(/<table[^>]*class="[^"]*data-table[^"]*"[^>]*>([\s\S]*?)<\/table>/g);

      if (quarterlyMatch) {
        // Parse quarterly data as proxy for historical prices
        // This is limited but better than nothing
        logWarn('PriceScraper', funcName,
          `No chart data found for ${symbol}, historical data limited`
        );
      }
    }

    // Sort by date descending
    prices.sort((a, b) => new Date(b.date) - new Date(a.date));

    return prices;

  } catch (error) {
    logError('PriceScraper', funcName,
      `Error parsing historical prices for ${symbol}`,
      { error: error.message },
      error
    );
    return prices; // Return whatever we got
  }
}

// ============================================================================
// DATA PERSISTENCE FUNCTIONS
// ============================================================================

/**
 * Updates current price in Stocks sheet
 * @param {string} stockId - Stock ID
 * @param {number} price - Current price
 * @private
 */
function updateStockCurrentPrice_(stockId, price) {
  const sheet = getSheet_(SHEETS.STOCKS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.STOCKS.ID] === stockId) {
      const row = i + 1;
      sheet.getRange(row, COLUMNS.STOCKS.CURRENT_PRICE + 1).setValue(price);
      sheet.getRange(row, COLUMNS.STOCKS.LAST_PRICE_UPDATE + 1).setValue(new Date());

      // Recalculate current value if quantity exists
      const quantity = data[i][COLUMNS.STOCKS.TOTAL_QUANTITY] || 0;
      if (quantity > 0) {
        const currentValue = quantity * price;
        sheet.getRange(row, COLUMNS.STOCKS.CURRENT_VALUE + 1).setValue(currentValue);

        const totalInvested = data[i][COLUMNS.STOCKS.TOTAL_INVESTED] || 0;
        const unrealizedPL = currentValue - totalInvested;
        const unrealizedPLPercent = totalInvested > 0 ? (unrealizedPL / totalInvested) : 0;

        sheet.getRange(row, COLUMNS.STOCKS.UNREALIZED_PL + 1).setValue(unrealizedPL);
        sheet.getRange(row, COLUMNS.STOCKS.UNREALIZED_PL_PERCENT + 1).setValue(unrealizedPLPercent);
      }
      break;
    }
  }
}

/**
 * Saves daily price to DailyPrices sheet
 * @param {string} stockId - Stock ID
 * @param {string} symbol - Stock symbol
 * @param {Date} date - Price date
 * @param {Object} priceData - Price data object
 * @private
 */
function saveDailyPrice_(stockId, symbol, date, priceData) {
  const sheet = getSheet_(SHEETS.DAILY_PRICES);

  // Check if price for this date already exists
  const data = sheet.getDataRange().getValues();
  const dateStr = Utilities.formatDate(date, MARKET_CONFIG.TIMEZONE, 'yyyy-MM-dd');

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.DAILY_PRICES.STOCK_ID] === stockId) {
      const existingDate = Utilities.formatDate(
        new Date(data[i][COLUMNS.DAILY_PRICES.DATE]),
        MARKET_CONFIG.TIMEZONE,
        'yyyy-MM-dd'
      );
      if (existingDate === dateStr) {
        // Update existing row
        const row = i + 1;
        sheet.getRange(row, COLUMNS.DAILY_PRICES.CLOSE + 1).setValue(priceData.price);
        sheet.getRange(row, COLUMNS.DAILY_PRICES.HIGH + 1).setValue(priceData.high || priceData.price);
        sheet.getRange(row, COLUMNS.DAILY_PRICES.LOW + 1).setValue(priceData.low || priceData.price);
        sheet.getRange(row, COLUMNS.DAILY_PRICES.FETCHED_AT + 1).setValue(new Date());
        return;
      }
    }
  }

  // Add new row
  const priceId = generatePriceId();
  const newRow = [
    priceId,
    stockId,
    symbol,
    date,
    priceData.price, // Open (use current as open for daily close)
    priceData.high || priceData.price,
    priceData.low || priceData.price,
    priceData.price, // Close
    priceData.price, // Adjusted close
    0, // Volume
    'SCREENER',
    new Date()
  ];

  sheet.appendRow(newRow);
}

/**
 * Saves historical prices to DailyPrices sheet
 * @param {string} stockId - Stock ID
 * @param {string} symbol - Stock symbol
 * @param {Object[]} pricesData - Array of price data
 * @private
 */
function saveHistoricalPrices_(stockId, symbol, pricesData) {
  if (!pricesData || pricesData.length === 0) {
    return;
  }

  const sheet = getSheet_(SHEETS.DAILY_PRICES);

  // Get existing dates for this stock
  const existingData = sheet.getDataRange().getValues();
  const existingDates = new Set();

  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][COLUMNS.DAILY_PRICES.STOCK_ID] === stockId) {
      const dateStr = Utilities.formatDate(
        new Date(existingData[i][COLUMNS.DAILY_PRICES.DATE]),
        MARKET_CONFIG.TIMEZONE,
        'yyyy-MM-dd'
      );
      existingDates.add(dateStr);
    }
  }

  // Filter out existing dates and prepare new rows
  const newRows = [];
  pricesData.forEach(price => {
    const dateStr = Utilities.formatDate(
      new Date(price.date),
      MARKET_CONFIG.TIMEZONE,
      'yyyy-MM-dd'
    );

    if (!existingDates.has(dateStr)) {
      const priceId = generatePriceId();
      newRows.push([
        priceId,
        stockId,
        symbol,
        price.date,
        price.open,
        price.high,
        price.low,
        price.close,
        price.close, // Adjusted close
        price.volume || 0,
        'SCREENER',
        new Date()
      ]);
    }
  });

  // Bulk insert new rows
  if (newRows.length > 0) {
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length)
      .setValues(newRows);

    logInfo('PriceScraper', 'saveHistoricalPrices_',
      `Added ${newRows.length} historical prices for ${symbol}`
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Checks if a date is a market trading day
 * @param {Date} date - Date to check
 * @returns {boolean} True if market day
 * @private
 */
function isMarketDay_(date) {
  const dayOfWeek = date.getDay();
  return MARKET_CONFIG.TRADING_DAYS.includes(dayOfWeek);
}

/**
 * Checks if market is currently open
 * @returns {boolean} True if market is open
 */
function isMarketOpen() {
  const now = new Date();

  // Check if trading day
  if (!isMarketDay_(now)) {
    return false;
  }

  // Check time
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const openMinutes = MARKET_CONFIG.OPEN_HOUR * 60 + MARKET_CONFIG.OPEN_MINUTE;
  const closeMinutes = MARKET_CONFIG.CLOSE_HOUR * 60 + MARKET_CONFIG.CLOSE_MINUTE;

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

/**
 * Gets all active stocks from the Stocks sheet
 * @returns {Object[]} Array of stock objects
 */
function getAllActiveStocks() {
  const sheet = getSheet_(SHEETS.STOCKS);
  const data = sheet.getDataRange().getValues();
  const stocks = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.STOCKS.IS_ACTIVE] !== false) {
      stocks.push({
        id: data[i][COLUMNS.STOCKS.ID],
        name: data[i][COLUMNS.STOCKS.NAME],
        symbol: data[i][COLUMNS.STOCKS.SYMBOL],
        screenerUrl: data[i][COLUMNS.STOCKS.SCREENER_URL],
        categoryIds: data[i][COLUMNS.STOCKS.CATEGORY_IDS],
        currentPrice: data[i][COLUMNS.STOCKS.CURRENT_PRICE]
      });
    }
  }

  return stocks;
}

/**
 * Gets a stock by ID
 * @param {string} stockId - Stock ID
 * @returns {Object|null} Stock object or null
 */
function getStockById(stockId) {
  const sheet = getSheet_(SHEETS.STOCKS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.STOCKS.ID] === stockId) {
      return {
        id: data[i][COLUMNS.STOCKS.ID],
        name: data[i][COLUMNS.STOCKS.NAME],
        symbol: data[i][COLUMNS.STOCKS.SYMBOL],
        screenerUrl: data[i][COLUMNS.STOCKS.SCREENER_URL],
        categoryIds: data[i][COLUMNS.STOCKS.CATEGORY_IDS],
        currentPrice: data[i][COLUMNS.STOCKS.CURRENT_PRICE],
        totalQuantity: data[i][COLUMNS.STOCKS.TOTAL_QUANTITY],
        avgBuyPrice: data[i][COLUMNS.STOCKS.AVG_BUY_PRICE],
        totalInvested: data[i][COLUMNS.STOCKS.TOTAL_INVESTED]
      };
    }
  }

  return null;
}

/**
 * Gets latest price for a stock (from cache or sheet)
 * @param {string} stockId - Stock ID
 * @returns {number} Current price
 */
function getLatestPrice(stockId) {
  // Try cache first
  const cached = getCachedCurrentPrice(stockId);
  if (cached) {
    return cached.price;
  }

  // Get from Stocks sheet
  const stock = getStockById(stockId);
  if (stock && stock.currentPrice) {
    return stock.currentPrice;
  }

  // Fallback: get from DailyPrices
  const sheet = getSheet_(SHEETS.DAILY_PRICES);
  const data = sheet.getDataRange().getValues();

  let latestPrice = 0;
  let latestDate = new Date(0);

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.DAILY_PRICES.STOCK_ID] === stockId) {
      const priceDate = new Date(data[i][COLUMNS.DAILY_PRICES.DATE]);
      if (priceDate > latestDate) {
        latestDate = priceDate;
        latestPrice = data[i][COLUMNS.DAILY_PRICES.CLOSE];
      }
    }
  }

  return latestPrice;
}

/**
 * Manual price entry (for when scraping fails or user override)
 * @param {string} stockId - Stock ID
 * @param {number} price - Price to set
 * @param {Date} date - Date for the price
 */
function manualPriceEntry(stockId, price, date) {
  if (!stockId || !price || price <= 0) {
    throw new PortfolioError(
      ERROR_CODES.VALIDATION_ERROR,
      'Invalid stock ID or price'
    );
  }

  const stock = getStockById(stockId);
  if (!stock) {
    throw new PortfolioError(ERROR_CODES.STOCK_NOT_FOUND, 'Stock not found');
  }

  const priceDate = date || new Date();

  // Save to daily prices
  saveDailyPrice_(stockId, stock.symbol, priceDate, { price });

  // Update current price
  updateStockCurrentPrice_(stockId, price);

  // Invalidate cache
  invalidatePriceCache(stockId);

  logInfo('PriceScraper', 'manualPriceEntry',
    `Manual price entry for ${stock.symbol}: ${price}`,
    { stockId, price, date: priceDate }
  );

  return { success: true, stockId, price, date: priceDate };
}
