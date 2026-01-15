/**
 * Cache Manager Module
 * Provides caching layer for API calls and calculations
 *
 * @fileoverview Caching utilities using CacheService
 * @author Stock Portfolio System
 * @version 1.0.0
 */

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Gets the script cache instance
 * @returns {GoogleAppsScript.Cache.Cache} Cache instance
 * @private
 */
function getCache_() {
  return CacheService.getScriptCache();
}

/**
 * Gets a value from cache
 * @param {string} key - Cache key
 * @returns {*} Cached value or null
 */
function cacheGet(key) {
  try {
    const cache = getCache_();
    const value = cache.get(key);

    if (value === null) {
      return null;
    }

    return JSON.parse(value);
  } catch (e) {
    logWarn('CacheManager', 'cacheGet', `Cache read error for key: ${key}`, { error: e.message });
    return null;
  }
}

/**
 * Sets a value in cache
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} expirationSeconds - Cache duration in seconds (max 21600 = 6 hours)
 */
function cacheSet(key, value, expirationSeconds) {
  try {
    const cache = getCache_();
    // CacheService max is 6 hours (21600 seconds)
    const expiration = Math.min(expirationSeconds, 21600);
    cache.put(key, JSON.stringify(value), expiration);
  } catch (e) {
    logWarn('CacheManager', 'cacheSet', `Cache write error for key: ${key}`, { error: e.message });
  }
}

/**
 * Removes a value from cache
 * @param {string} key - Cache key
 */
function cacheRemove(key) {
  try {
    const cache = getCache_();
    cache.remove(key);
  } catch (e) {
    logWarn('CacheManager', 'cacheRemove', `Cache remove error for key: ${key}`, { error: e.message });
  }
}

/**
 * Removes multiple values from cache
 * @param {string[]} keys - Array of cache keys
 */
function cacheRemoveAll(keys) {
  try {
    const cache = getCache_();
    cache.removeAll(keys);
  } catch (e) {
    logWarn('CacheManager', 'cacheRemoveAll', 'Cache bulk remove error', { error: e.message });
  }
}

// ============================================================================
// SPECIFIC CACHE OPERATIONS
// ============================================================================

/**
 * Gets current price from cache
 * @param {string} stockId - Stock ID
 * @returns {Object|null} Price data or null
 */
function getCachedCurrentPrice(stockId) {
  const key = CACHE_CONFIG.KEYS.CURRENT_PRICE + stockId;
  return cacheGet(key);
}

/**
 * Sets current price in cache
 * @param {string} stockId - Stock ID
 * @param {Object} priceData - Price data object
 */
function setCachedCurrentPrice(stockId, priceData) {
  const key = CACHE_CONFIG.KEYS.CURRENT_PRICE + stockId;
  cacheSet(key, priceData, CACHE_CONFIG.PRICE_CACHE_SECONDS);
}

/**
 * Gets historical prices from cache
 * @param {string} stockId - Stock ID
 * @returns {Object[]|null} Array of price data or null
 */
function getCachedHistoricalPrices(stockId) {
  const key = CACHE_CONFIG.KEYS.HISTORICAL_PRICES + stockId;
  return cacheGet(key);
}

/**
 * Sets historical prices in cache
 * @param {string} stockId - Stock ID
 * @param {Object[]} pricesData - Array of price data
 */
function setCachedHistoricalPrices(stockId, pricesData) {
  const key = CACHE_CONFIG.KEYS.HISTORICAL_PRICES + stockId;
  cacheSet(key, pricesData, CACHE_CONFIG.HISTORICAL_CACHE_SECONDS);
}

/**
 * Gets stock data from cache
 * @param {string} stockId - Stock ID
 * @returns {Object|null} Stock data or null
 */
function getCachedStockData(stockId) {
  const key = CACHE_CONFIG.KEYS.STOCK_DATA + stockId;
  return cacheGet(key);
}

/**
 * Sets stock data in cache
 * @param {string} stockId - Stock ID
 * @param {Object} stockData - Stock data object
 */
function setCachedStockData(stockId, stockData) {
  const key = CACHE_CONFIG.KEYS.STOCK_DATA + stockId;
  cacheSet(key, stockData, CACHE_CONFIG.HISTORICAL_CACHE_SECONDS);
}

/**
 * Gets cached calculation result
 * @param {string} calculationType - Type of calculation (e.g., 'xirr', 'cagr')
 * @param {string} entityId - Entity ID (stock, category, etc.)
 * @param {string} period - Time period
 * @returns {Object|null} Calculation result or null
 */
function getCachedCalculation(calculationType, entityId, period) {
  const key = `${CACHE_CONFIG.KEYS.CALCULATIONS}${calculationType}_${entityId}_${period}`;
  return cacheGet(key);
}

/**
 * Sets cached calculation result
 * @param {string} calculationType - Type of calculation
 * @param {string} entityId - Entity ID
 * @param {string} period - Time period
 * @param {Object} result - Calculation result
 */
function setCachedCalculation(calculationType, entityId, period, result) {
  const key = `${CACHE_CONFIG.KEYS.CALCULATIONS}${calculationType}_${entityId}_${period}`;
  // Short cache for calculations - 30 minutes
  cacheSet(key, result, 1800);
}

// ============================================================================
// CACHE INVALIDATION
// ============================================================================

/**
 * Invalidates all cached prices for a stock
 * @param {string} stockId - Stock ID
 */
function invalidatePriceCache(stockId) {
  const keys = [
    CACHE_CONFIG.KEYS.CURRENT_PRICE + stockId,
    CACHE_CONFIG.KEYS.HISTORICAL_PRICES + stockId,
    CACHE_CONFIG.KEYS.STOCK_DATA + stockId
  ];
  cacheRemoveAll(keys);
  logDebug('CacheManager', 'invalidatePriceCache', `Invalidated price cache for ${stockId}`);
}

/**
 * Invalidates calculation cache for an entity
 * @param {string} entityId - Stock or category ID
 */
function invalidateCalculationCache(entityId) {
  // Since we can't enumerate cache keys, we'll just let them expire
  // But we can remove known calculation types
  const calculationTypes = ['xirr', 'cagr', 'returns'];
  const periods = Object.keys(PERIODS);

  const keys = [];
  calculationTypes.forEach(type => {
    periods.forEach(period => {
      keys.push(`${CACHE_CONFIG.KEYS.CALCULATIONS}${type}_${entityId}_${period}`);
    });
  });

  cacheRemoveAll(keys);
  logDebug('CacheManager', 'invalidateCalculationCache', `Invalidated calculation cache for ${entityId}`);
}

/**
 * Invalidates all calculation caches
 * Called when transactions change
 */
function invalidateAllCalculations() {
  // Get all stocks and categories
  const stocksSheet = getSheet_(SHEETS.STOCKS);
  const categoriesSheet = getSheet_(SHEETS.CATEGORIES);

  const stockIds = stocksSheet.getRange(2, 1, Math.max(1, stocksSheet.getLastRow() - 1), 1)
    .getValues().flat().filter(id => id);
  const categoryIds = categoriesSheet.getRange(2, 1, Math.max(1, categoriesSheet.getLastRow() - 1), 1)
    .getValues().flat().filter(id => id);

  stockIds.forEach(invalidateCalculationCache);
  categoryIds.forEach(invalidateCalculationCache);

  // Also invalidate portfolio calculations
  invalidateCalculationCache('PORTFOLIO');

  logInfo('CacheManager', 'invalidateAllCalculations', 'Invalidated all calculation caches');
}

// ============================================================================
// RATE LIMIT TRACKING
// ============================================================================

const RATE_LIMIT_KEY = 'screener_rate_limit';

/**
 * Gets current rate limit status
 * @returns {Object} Rate limit status
 */
function getRateLimitStatus() {
  const data = cacheGet(RATE_LIMIT_KEY);
  if (!data) {
    return {
      requestsThisHour: 0,
      hourStart: Date.now(),
      lastRequestTime: 0
    };
  }

  // Reset if hour has passed
  const hourAgo = Date.now() - (60 * 60 * 1000);
  if (data.hourStart < hourAgo) {
    return {
      requestsThisHour: 0,
      hourStart: Date.now(),
      lastRequestTime: data.lastRequestTime
    };
  }

  return data;
}

/**
 * Records a request for rate limiting
 */
function recordRequest() {
  const status = getRateLimitStatus();
  status.requestsThisHour++;
  status.lastRequestTime = Date.now();
  cacheSet(RATE_LIMIT_KEY, status, 3600);
}

/**
 * Checks if we can make a request (rate limit check)
 * @returns {Object} { canRequest: boolean, waitTime: number }
 */
function canMakeRequest() {
  const status = getRateLimitStatus();

  // Check hourly limit
  if (status.requestsThisHour >= SCREENER_CONFIG.MAX_REQUESTS_PER_HOUR) {
    const hourAgo = Date.now() - (60 * 60 * 1000);
    const waitTime = status.hourStart + (60 * 60 * 1000) - Date.now();
    return { canRequest: false, waitTime, reason: 'hourly_limit' };
  }

  // Check minimum delay
  const timeSinceLastRequest = Date.now() - status.lastRequestTime;
  if (timeSinceLastRequest < SCREENER_CONFIG.MIN_DELAY_MS) {
    const waitTime = SCREENER_CONFIG.MIN_DELAY_MS - timeSinceLastRequest;
    return { canRequest: false, waitTime, reason: 'min_delay' };
  }

  return { canRequest: true, waitTime: 0 };
}

/**
 * Waits for rate limit to clear
 * @returns {boolean} True if waited, false if timed out
 */
function waitForRateLimit() {
  const maxWaitTime = 60000; // Max 1 minute wait
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const { canRequest, waitTime, reason } = canMakeRequest();

    if (canRequest) {
      return true;
    }

    if (reason === 'hourly_limit') {
      // Don't wait for hourly limit to reset
      return false;
    }

    // Wait for minimum delay
    Utilities.sleep(Math.min(waitTime, 5000));
  }

  return false;
}

// ============================================================================
// CACHE STATISTICS
// ============================================================================

/**
 * Gets cache statistics (for monitoring)
 * @returns {Object} Cache statistics
 */
function getCacheStatistics() {
  const rateLimitStatus = getRateLimitStatus();

  return {
    rateLimit: {
      requestsThisHour: rateLimitStatus.requestsThisHour,
      maxRequestsPerHour: SCREENER_CONFIG.MAX_REQUESTS_PER_HOUR,
      remainingRequests: SCREENER_CONFIG.MAX_REQUESTS_PER_HOUR - rateLimitStatus.requestsThisHour,
      timeSinceLastRequest: Date.now() - rateLimitStatus.lastRequestTime
    },
    cacheConfig: {
      priceExpirationMinutes: CACHE_CONFIG.PRICE_CACHE_SECONDS / 60,
      historicalExpirationMinutes: CACHE_CONFIG.HISTORICAL_CACHE_SECONDS / 60
    }
  };
}
