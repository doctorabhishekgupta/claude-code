/**
 * Error Handler and Logger Module
 * Provides centralized error handling, logging, and retry mechanisms
 *
 * @fileoverview Error handling and logging utilities
 * @author Stock Portfolio System
 * @version 1.0.0
 */

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

/**
 * Logs a message to the Logs sheet
 * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
 * @param {string} module - Module name
 * @param {string} functionName - Function name
 * @param {string} message - Log message
 * @param {Object} details - Additional details (optional)
 * @param {string} stackTrace - Stack trace for errors (optional)
 */
function log(level, module, functionName, message, details, stackTrace) {
  // Check if we should log this level
  const levelValue = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  if (levelValue < LOG_CONFIG.CURRENT_LEVEL) {
    return;
  }

  try {
    const sheet = getSheet_(SHEETS.LOGS);
    const logId = generateLogId();
    const timestamp = new Date();

    const detailsStr = details ? JSON.stringify(details) : '';

    const row = [
      logId,
      timestamp,
      level,
      module,
      functionName,
      message,
      detailsStr,
      stackTrace || ''
    ];

    sheet.appendRow(row);

    // Also log to console for debugging
    console.log(`[${level}] ${module}.${functionName}: ${message}`);

  } catch (e) {
    // Fallback to console if sheet logging fails
    console.error('Failed to log to sheet:', e.message);
    console.log(`[${level}] ${module}.${functionName}: ${message}`);
  }
}

/**
 * Log debug message
 */
function logDebug(module, functionName, message, details) {
  log('DEBUG', module, functionName, message, details);
}

/**
 * Log info message
 */
function logInfo(module, functionName, message, details) {
  log('INFO', module, functionName, message, details);
}

/**
 * Log warning message
 */
function logWarn(module, functionName, message, details) {
  log('WARN', module, functionName, message, details);
}

/**
 * Log error message
 */
function logError(module, functionName, message, details, error) {
  const stackTrace = error ? error.stack : '';
  log('ERROR', module, functionName, message, details, stackTrace);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Custom error class for portfolio system
 */
class PortfolioError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'PortfolioError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

/**
 * Error codes for the system
 */
const ERROR_CODES = {
  // Validation errors (1xxx)
  VALIDATION_ERROR: 1000,
  INVALID_STOCK_ID: 1001,
  INVALID_CATEGORY_ID: 1002,
  INVALID_TRANSACTION_ID: 1003,
  INVALID_DATE: 1004,
  INVALID_PRICE: 1005,
  INVALID_QUANTITY: 1006,
  FUTURE_DATE: 1007,

  // Business logic errors (2xxx)
  INSUFFICIENT_HOLDINGS: 2001,
  STOCK_NOT_FOUND: 2002,
  CATEGORY_NOT_FOUND: 2003,
  DUPLICATE_ENTRY: 2004,
  FIFO_ERROR: 2005,

  // External API errors (3xxx)
  SCREENER_FETCH_ERROR: 3001,
  SCREENER_PARSE_ERROR: 3002,
  SCREENER_RATE_LIMIT: 3003,
  NETWORK_ERROR: 3004,

  // System errors (4xxx)
  SHEET_ERROR: 4001,
  CALCULATION_ERROR: 4002,
  CACHE_ERROR: 4003,
  TRIGGER_ERROR: 4004
};

/**
 * Wraps a function with error handling
 * @param {Function} fn - Function to wrap
 * @param {string} module - Module name for logging
 * @param {string} functionName - Function name for logging
 * @returns {Function} Wrapped function
 */
function withErrorHandling(fn, module, functionName) {
  return function(...args) {
    try {
      return fn.apply(this, args);
    } catch (error) {
      logError(module, functionName, error.message, { args }, error);

      if (error instanceof PortfolioError) {
        throw error;
      }

      throw new PortfolioError(
        ERROR_CODES.SHEET_ERROR,
        `Error in ${functionName}: ${error.message}`,
        { originalError: error.message }
      );
    }
  };
}

// ============================================================================
// RETRY MECHANISM
// ============================================================================

/**
 * Executes a function with exponential backoff retry
 * @param {Function} fn - Function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.initialDelayMs - Initial delay in milliseconds
 * @param {number} options.backoffMultiplier - Backoff multiplier
 * @param {Function} options.shouldRetry - Function to determine if should retry
 * @returns {*} Result of the function
 */
function withRetry(fn, options) {
  const {
    maxRetries = SCREENER_CONFIG.MAX_RETRIES,
    initialDelayMs = SCREENER_CONFIG.INITIAL_BACKOFF_MS,
    backoffMultiplier = SCREENER_CONFIG.BACKOFF_MULTIPLIER,
    shouldRetry = (error) => true
  } = options || {};

  let lastError;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      logWarn('ErrorHandler', 'withRetry',
        `Attempt ${attempt + 1} failed, retrying in ${delay}ms`,
        { error: error.message, nextDelay: delay }
      );

      Utilities.sleep(delay);
      delay *= backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * Determines if an error is retryable (transient)
 * @param {Error} error - The error to check
 * @returns {boolean} True if retryable
 */
function isRetryableError(error) {
  const message = error.message.toLowerCase();
  const retryablePatterns = [
    'timeout',
    'timed out',
    'network',
    'connection',
    'temporarily unavailable',
    '503',
    '502',
    '504',
    'rate limit'
  ];

  return retryablePatterns.some(pattern => message.includes(pattern));
}

// ============================================================================
// LOG MAINTENANCE
// ============================================================================

/**
 * Cleans up old log entries
 * Called by scheduled trigger
 */
function cleanupLogs() {
  const sheet = getSheet_(SHEETS.LOGS);
  const lastRow = sheet.getLastRow();

  if (lastRow <= LOG_CONFIG.MAX_LOG_ROWS) {
    return;
  }

  // Delete oldest rows
  const rowsToDelete = Math.min(
    lastRow - LOG_CONFIG.MAX_LOG_ROWS,
    LOG_CONFIG.CLEANUP_BATCH_SIZE
  );

  sheet.deleteRows(2, rowsToDelete);

  logInfo('ErrorHandler', 'cleanupLogs',
    `Deleted ${rowsToDelete} old log entries`,
    { remainingRows: sheet.getLastRow() }
  );
}

/**
 * Sends daily error digest via email
 * Called by scheduled trigger
 */
function sendErrorDigest() {
  const ownerEmail = getConfigValue('OWNER_EMAIL', '');
  if (!ownerEmail) {
    return;
  }

  const sheet = getSheet_(SHEETS.LOGS);
  const data = sheet.getDataRange().getValues();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const errors = [];

  for (let i = 1; i < data.length; i++) {
    const timestamp = new Date(data[i][1]);
    const level = data[i][2];

    if (level === 'ERROR' && timestamp >= yesterday) {
      errors.push({
        time: timestamp.toLocaleString('en-IN'),
        module: data[i][3],
        function: data[i][4],
        message: data[i][5]
      });
    }
  }

  if (errors.length === 0) {
    return;
  }

  const subject = `[Portfolio System] Error Digest - ${errors.length} errors`;
  let body = `Error Summary for the last 24 hours:\n\n`;

  errors.forEach((err, index) => {
    body += `${index + 1}. [${err.time}] ${err.module}.${err.function}\n`;
    body += `   ${err.message}\n\n`;
  });

  try {
    MailApp.sendEmail(ownerEmail, subject, body);
    logInfo('ErrorHandler', 'sendErrorDigest',
      `Sent error digest with ${errors.length} errors`
    );
  } catch (e) {
    console.error('Failed to send error digest:', e.message);
  }
}

// ============================================================================
// USER-FACING ERROR MESSAGES
// ============================================================================

/**
 * Gets user-friendly error message
 * @param {PortfolioError|Error} error - The error
 * @returns {string} User-friendly message
 */
function getUserFriendlyMessage(error) {
  if (!(error instanceof PortfolioError)) {
    return 'An unexpected error occurred. Please try again.';
  }

  const messages = {
    [ERROR_CODES.VALIDATION_ERROR]: 'Invalid input. Please check your data.',
    [ERROR_CODES.INVALID_STOCK_ID]: 'Invalid stock selected.',
    [ERROR_CODES.INVALID_CATEGORY_ID]: 'Invalid category selected.',
    [ERROR_CODES.INVALID_DATE]: 'Invalid date format. Please use YYYY-MM-DD.',
    [ERROR_CODES.INVALID_PRICE]: 'Price must be greater than zero.',
    [ERROR_CODES.INVALID_QUANTITY]: 'Quantity must be a positive whole number.',
    [ERROR_CODES.FUTURE_DATE]: 'Transaction date cannot be in the future.',
    [ERROR_CODES.INSUFFICIENT_HOLDINGS]: 'You do not have enough shares to sell.',
    [ERROR_CODES.STOCK_NOT_FOUND]: 'Stock not found in the system.',
    [ERROR_CODES.CATEGORY_NOT_FOUND]: 'Category not found in the system.',
    [ERROR_CODES.DUPLICATE_ENTRY]: 'This entry already exists.',
    [ERROR_CODES.SCREENER_FETCH_ERROR]: 'Unable to fetch data from Screener. Please try again later.',
    [ERROR_CODES.SCREENER_RATE_LIMIT]: 'Too many requests. Please wait a few minutes.',
    [ERROR_CODES.NETWORK_ERROR]: 'Network error. Please check your connection.',
    [ERROR_CODES.CALCULATION_ERROR]: 'Error calculating results. Please verify your data.'
  };

  return messages[error.code] || error.message;
}

/**
 * Shows error alert to user
 * @param {Error} error - The error
 */
function showErrorAlert(error) {
  const message = getUserFriendlyMessage(error);
  SpreadsheetApp.getUi().alert('Error', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Shows success message to user
 * @param {string} message - Success message
 */
function showSuccessAlert(message) {
  SpreadsheetApp.getUi().alert('Success', message, SpreadsheetApp.getUi().ButtonSet.OK);
}
