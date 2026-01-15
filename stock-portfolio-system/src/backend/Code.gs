/**
 * Stock Portfolio Tracking System - Main Entry Point
 * Google Apps Script backend for portfolio management
 *
 * @fileoverview Main entry points, menu creation, and web app handlers
 * @author Stock Portfolio System
 * @version 1.0.0
 */

// ============================================================================
// INITIALIZATION & MENU
// ============================================================================

/**
 * Runs when the spreadsheet is opened
 * Creates custom menus
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('📈 Portfolio')
    .addItem('🔄 Refresh All Prices', 'menuRefreshPrices')
    .addItem('📊 Generate Reports', 'menuGenerateReports')
    .addSeparator()
    .addSubMenu(ui.createMenu('📝 Transactions')
      .addItem('➕ Add Buy Transaction', 'showBuyDialog')
      .addItem('➖ Add Sell Transaction', 'showSellDialog'))
    .addSubMenu(ui.createMenu('📦 Manage')
      .addItem('➕ Add Stock', 'showAddStockDialog')
      .addItem('🏷️ Add Category', 'showAddCategoryDialog')
      .addItem('🔗 Assign Categories', 'showAssignCategoriesDialog'))
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Settings')
      .addItem('🕐 Setup Triggers', 'setupAllTriggers')
      .addItem('🗑️ Remove Triggers', 'removeAllTriggers')
      .addItem('📋 Initialize Sheets', 'initializeAllSheets'))
    .addSeparator()
    .addItem('🌐 Open Web App', 'openWebApp')
    .addItem('ℹ️ About', 'showAbout')
    .addToUi();

  logInfo('Code', 'onOpen', 'Portfolio menu created');
}

/**
 * Initializes all required sheets with headers
 */
function initializeAllSheets() {
  const sheets = [
    SHEETS.CATEGORIES,
    SHEETS.STOCKS,
    SHEETS.TRANSACTIONS,
    SHEETS.DAILY_PRICES,
    SHEETS.HOLDINGS,
    SHEETS.REPORTS,
    SHEETS.CONFIG,
    SHEETS.LOGS,
    SHEETS.CORPORATE_ACTIONS
  ];

  sheets.forEach(sheetName => {
    getSheet_(sheetName); // This creates sheet with headers if not exists
  });

  // Add default config values
  initializeConfig_();

  showSuccessAlert('All sheets initialized successfully!');
  logInfo('Code', 'initializeAllSheets', 'All sheets initialized');
}

/**
 * Initializes default configuration values
 * @private
 */
function initializeConfig_() {
  const defaults = [
    ['SCREENER_BASE_URL', 'https://www.screener.in', 'Base URL for Screener.in'],
    ['PRICE_FETCH_DELAY_MS', '2000', 'Delay between API calls (ms)'],
    ['MAX_RETRIES', '3', 'Maximum retry attempts'],
    ['CACHE_DURATION_HOURS', '6', 'Cache validity period'],
    ['LOG_LEVEL', 'INFO', 'Logging level (DEBUG, INFO, WARN, ERROR)'],
    ['ALLOCATION_METHOD', 'EQUAL_WEIGHT', 'Multi-category allocation method'],
    ['AUTO_REFRESH_ENABLED', 'TRUE', 'Enable automatic price refresh']
  ];

  defaults.forEach(([key, value, desc]) => {
    if (!getConfigValue(key, null)) {
      setConfigValue(key, value, desc);
    }
  });
}

// ============================================================================
// MENU HANDLERS
// ============================================================================

/**
 * Menu handler: Refresh all prices
 */
function menuRefreshPrices() {
  try {
    const ui = SpreadsheetApp.getUi();
    const result = ui.alert(
      'Refresh Prices',
      'This will fetch current prices for all stocks. Continue?',
      ui.ButtonSet.YES_NO
    );

    if (result === ui.Button.YES) {
      const refreshResult = dailyPriceUpdate();
      refreshHoldings();
      updateAllCategoryAggregates();

      showSuccessAlert(
        `Price refresh complete!\n` +
        `Success: ${refreshResult.success}\n` +
        `Failed: ${refreshResult.failed}`
      );
    }
  } catch (error) {
    logError('Code', 'menuRefreshPrices', error.message, {}, error);
    showErrorAlert(error);
  }
}

/**
 * Menu handler: Generate all reports
 */
function menuGenerateReports() {
  try {
    generateAllReports();
    showSuccessAlert('Reports generated successfully!');
  } catch (error) {
    logError('Code', 'menuGenerateReports', error.message, {}, error);
    showErrorAlert(error);
  }
}

/**
 * Shows about dialog
 */
function showAbout() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    'Stock Portfolio Tracker',
    'Version 1.0.0\n\n' +
    'A comprehensive stock portfolio tracking system with:\n' +
    '• Transaction management (Buy/Sell with FIFO)\n' +
    '• Automated price fetching from Screener.in\n' +
    '• XIRR-based CAGR calculations\n' +
    '• Category-wise performance analysis\n' +
    '• Multi-period reports\n\n' +
    'Built with Google Sheets & Apps Script',
    ui.ButtonSet.OK
  );
}

// ============================================================================
// DIALOG HANDLERS
// ============================================================================

/**
 * Shows add stock dialog
 */
function showAddStockDialog() {
  const html = HtmlService.createHtmlOutputFromFile('AddStockDialog')
    .setWidth(400)
    .setHeight(450);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add New Stock');
}

/**
 * Shows add category dialog
 */
function showAddCategoryDialog() {
  const html = HtmlService.createHtmlOutputFromFile('AddCategoryDialog')
    .setWidth(400)
    .setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add New Category');
}

/**
 * Shows buy transaction dialog
 */
function showBuyDialog() {
  const html = HtmlService.createHtmlOutputFromFile('BuyDialog')
    .setWidth(450)
    .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, 'Record Buy Transaction');
}

/**
 * Shows sell transaction dialog
 */
function showSellDialog() {
  const html = HtmlService.createHtmlOutputFromFile('SellDialog')
    .setWidth(450)
    .setHeight(550);
  SpreadsheetApp.getUi().showModalDialog(html, 'Record Sell Transaction');
}

/**
 * Shows assign categories dialog
 */
function showAssignCategoriesDialog() {
  const html = HtmlService.createHtmlOutputFromFile('AssignCategoriesDialog')
    .setWidth(450)
    .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Assign Categories to Stock');
}

// ============================================================================
// DIALOG DATA PROVIDERS (Called from HTML)
// ============================================================================

/**
 * Gets list of all stocks for dropdown
 * @returns {Object[]} Array of {id, name, symbol}
 */
function getStocksForDropdown() {
  return getAllActiveStocks().map(s => ({
    id: s.id,
    name: s.name,
    symbol: s.symbol,
    currentPrice: s.currentPrice
  }));
}

/**
 * Gets list of all categories for dropdown
 * @returns {Object[]} Array of {id, name}
 */
function getCategoriesForDropdown() {
  return getAllCategories().map(c => ({
    id: c.id,
    name: c.name
  }));
}

/**
 * Gets available quantity for a stock (for sell dialog)
 * @param {string} stockId - Stock ID
 * @returns {number} Available quantity
 */
function getAvailableQuantityForStock(stockId) {
  const holdings = getHoldingsForStock_(stockId);
  return holdings.reduce((sum, h) => sum + h.remainingQuantity, 0);
}

/**
 * Gets holdings details for a stock
 * @param {string} stockId - Stock ID
 * @returns {Object[]} Holdings breakdown
 */
function getHoldingsDetailsForStock(stockId) {
  return getHoldingsForStock_(stockId).map(h => ({
    buyDate: Utilities.formatDate(new Date(h.buyDate), MARKET_CONFIG.TIMEZONE, 'yyyy-MM-dd'),
    buyPrice: h.buyPrice,
    remainingQuantity: h.remainingQuantity
  }));
}

// ============================================================================
// DIALOG ACTION HANDLERS (Called from HTML)
// ============================================================================

/**
 * Handles add stock form submission
 * @param {Object} formData - Form data
 * @returns {Object} Result
 */
function handleAddStock(formData) {
  try {
    const sheet = getSheet_(SHEETS.STOCKS);
    const stockId = generateStockId();
    const now = new Date();

    // Validate Screener URL
    if (!formData.screenerUrl || !formData.screenerUrl.match(/screener\.in\/company\//i)) {
      throw new PortfolioError(ERROR_CODES.VALIDATION_ERROR, 'Invalid Screener URL');
    }

    const row = [
      stockId,
      formData.name.trim(),
      formData.symbol.trim().toUpperCase(),
      formData.screenerUrl.trim(),
      formData.categoryIds || '',
      formData.isin || '',
      formData.sector || '',
      0, // Current price
      null, // Last price update
      0, // Total quantity
      0, // Avg buy price
      0, // Total invested
      0, // Current value
      0, // Unrealized PL
      0, // Unrealized PL %
      now,
      true
    ];

    sheet.appendRow(row);

    // Try to fetch initial price
    try {
      fetchCurrentPrice(stockId, false);
    } catch (e) {
      logWarn('Code', 'handleAddStock', `Could not fetch initial price: ${e.message}`);
    }

    logInfo('Code', 'handleAddStock', `Stock added: ${stockId} - ${formData.symbol}`);

    return { success: true, stockId, symbol: formData.symbol };

  } catch (error) {
    logError('Code', 'handleAddStock', error.message, formData, error);
    return { success: false, error: getUserFriendlyMessage(error) };
  }
}

/**
 * Handles add category form submission
 * @param {Object} formData - Form data
 * @returns {Object} Result
 */
function handleAddCategory(formData) {
  try {
    const result = addCategory({
      name: formData.name,
      description: formData.description
    });

    return { success: true, ...result };

  } catch (error) {
    logError('Code', 'handleAddCategory', error.message, formData, error);
    return { success: false, error: getUserFriendlyMessage(error) };
  }
}

/**
 * Handles buy transaction form submission
 * @param {Object} formData - Form data
 * @returns {Object} Result
 */
function handleBuyTransaction(formData) {
  try {
    const result = recordBuyTransaction({
      stockId: formData.stockId,
      date: new Date(formData.date),
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity, 10),
      brokerage: parseFloat(formData.brokerage) || 0,
      stt: parseFloat(formData.stt) || 0,
      otherCharges: parseFloat(formData.otherCharges) || 0,
      notes: formData.notes
    });

    return { success: true, ...result };

  } catch (error) {
    logError('Code', 'handleBuyTransaction', error.message, formData, error);
    return { success: false, error: getUserFriendlyMessage(error) };
  }
}

/**
 * Handles sell transaction form submission
 * @param {Object} formData - Form data
 * @returns {Object} Result
 */
function handleSellTransaction(formData) {
  try {
    const result = recordSellTransaction({
      stockId: formData.stockId,
      date: new Date(formData.date),
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity, 10),
      brokerage: parseFloat(formData.brokerage) || 0,
      stt: parseFloat(formData.stt) || 0,
      otherCharges: parseFloat(formData.otherCharges) || 0,
      notes: formData.notes
    });

    return { success: true, ...result };

  } catch (error) {
    logError('Code', 'handleSellTransaction', error.message, formData, error);
    return { success: false, error: getUserFriendlyMessage(error) };
  }
}

/**
 * Handles category assignment
 * @param {Object} formData - Form data with stockId and categoryIds
 * @returns {Object} Result
 */
function handleAssignCategories(formData) {
  try {
    const result = assignCategoriesToStock(
      formData.stockId,
      formData.categoryIds || []
    );

    return { success: true, ...result };

  } catch (error) {
    logError('Code', 'handleAssignCategories', error.message, formData, error);
    return { success: false, error: getUserFriendlyMessage(error) };
  }
}

// ============================================================================
// TRIGGER SETUP
// ============================================================================

/**
 * Sets up all scheduled triggers
 */
function setupAllTriggers() {
  // Remove existing triggers first
  removeAllTriggers();

  // Daily price update at 6:00 PM IST
  ScriptApp.newTrigger('dailyPriceUpdate')
    .timeBased()
    .atHour(18)
    .everyDays(1)
    .inTimezone(MARKET_CONFIG.TIMEZONE)
    .create();

  // Weekly report generation on Sunday 8:00 AM
  ScriptApp.newTrigger('weeklyReportGeneration')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(8)
    .inTimezone(MARKET_CONFIG.TIMEZONE)
    .create();

  // Daily log cleanup at 2:00 AM
  ScriptApp.newTrigger('cleanupLogs')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .inTimezone(MARKET_CONFIG.TIMEZONE)
    .create();

  // Daily error digest at 9:00 AM
  ScriptApp.newTrigger('sendErrorDigest')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .inTimezone(MARKET_CONFIG.TIMEZONE)
    .create();

  logInfo('Code', 'setupAllTriggers', 'All triggers set up successfully');
  showSuccessAlert('Triggers set up successfully!');
}

/**
 * Removes all existing triggers
 */
function removeAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });

  logInfo('Code', 'removeAllTriggers', `Removed ${triggers.length} triggers`);
}

/**
 * Weekly report generation trigger handler
 */
function weeklyReportGeneration() {
  logInfo('Code', 'weeklyReportGeneration', 'Starting weekly report generation');

  try {
    generateAllReports();
    updateAllCategoryAggregates();

    // Send email summary if configured
    const ownerEmail = getConfigValue('OWNER_EMAIL', '');
    if (ownerEmail) {
      sendWeeklySummaryEmail_(ownerEmail);
    }

  } catch (error) {
    logError('Code', 'weeklyReportGeneration', error.message, {}, error);
  }
}

/**
 * Sends weekly summary email
 * @param {string} email - Recipient email
 * @private
 */
function sendWeeklySummaryEmail_(email) {
  const portfolioCAGR = calculatePortfolioCAGR('1Y');
  const categoryAllocation = getCategoryAllocation();

  let body = `Weekly Portfolio Summary\n`;
  body += `========================\n\n`;
  body += `Portfolio Value: ₹${categoryAllocation.totalValue.toLocaleString()}\n`;
  body += `1-Year CAGR: ${portfolioCAGR.xirrPercent}\n\n`;
  body += `Category Breakdown:\n`;

  categoryAllocation.allocations.forEach(cat => {
    body += `  ${cat.categoryName}: ₹${cat.currentValue.toLocaleString()} (${cat.percentageStr})\n`;
  });

  try {
    MailApp.sendEmail(email, '[Portfolio] Weekly Summary', body);
  } catch (e) {
    logError('Code', 'sendWeeklySummaryEmail_', e.message, {}, e);
  }
}

// ============================================================================
// WEB APP HANDLERS
// ============================================================================

/**
 * Serves the web app
 * @param {Object} e - Event object
 * @returns {HtmlOutput} Web app HTML
 */
function doGet(e) {
  const page = e.parameter.page || 'index';

  try {
    const html = HtmlService.createTemplateFromFile('WebApp');
    html.page = page;

    return html.evaluate()
      .setTitle('Stock Portfolio Tracker')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  } catch (error) {
    logError('Code', 'doGet', error.message, { page }, error);
    return HtmlService.createHtmlOutput(`<h1>Error</h1><p>${error.message}</p>`);
  }
}

/**
 * Handles POST requests from web app
 * @param {Object} e - Event object
 * @returns {Object} JSON response
 */
function doPost(e) {
  try {
    const action = e.parameter.action;
    const data = JSON.parse(e.postData.contents);

    let result;

    switch (action) {
      case 'addStock':
        result = handleAddStock(data);
        break;
      case 'addCategory':
        result = handleAddCategory(data);
        break;
      case 'buyStock':
        result = handleBuyTransaction(data);
        break;
      case 'sellStock':
        result = handleSellTransaction(data);
        break;
      case 'getReport':
        result = getReportData_(data);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logError('Code', 'doPost', error.message, {}, error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Gets report data for web app
 * @param {Object} params - Report parameters
 * @returns {Object} Report data
 * @private
 */
function getReportData_(params) {
  const period = params.period || '1Y';

  return {
    success: true,
    portfolio: calculatePortfolioCAGR(period),
    categories: compareCategoryPerformance(period),
    allocation: getCategoryAllocation(),
    stocks: getAllActiveStocks().map(s => ({
      ...s,
      cagr: calculateStockCAGR(s.id, period)
    }))
  };
}

/**
 * Opens web app in new tab
 */
function openWebApp() {
  const url = ScriptApp.getService().getUrl();
  const html = `<script>window.open('${url}', '_blank');google.script.host.close();</script>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setHeight(1).setWidth(1),
    'Opening Web App...'
  );
}

/**
 * Includes HTML file content (for templates)
 * @param {string} filename - File to include
 * @returns {string} File content
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
