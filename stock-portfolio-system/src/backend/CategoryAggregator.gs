/**
 * Category Aggregator Module
 * Handles multi-category allocation and weighted returns calculation
 *
 * @fileoverview Category-wise CAGR with allocation logic for multi-category stocks
 * @author Stock Portfolio System
 * @version 1.0.0
 *
 * Multi-Category Allocation Logic:
 * --------------------------------
 * When a stock belongs to multiple categories, we need to avoid double-counting.
 * Two approaches are implemented:
 *
 * 1. EQUAL_WEIGHT: Split investment equally among categories
 *    If stock X (invested ₹100k) belongs to Cat A and Cat B:
 *    → Cat A gets ₹50k allocation
 *    → Cat B gets ₹50k allocation
 *
 * 2. PROPORTIONAL: Split based on category's overall weight
 *    If Cat A has 60% of portfolio and Cat B has 40%:
 *    → Cat A gets ₹60k allocation
 *    → Cat B gets ₹40k allocation
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const ALLOCATION_METHODS = {
  EQUAL_WEIGHT: 'EQUAL_WEIGHT',
  PROPORTIONAL: 'PROPORTIONAL'
};

// Default allocation method
const DEFAULT_ALLOCATION_METHOD = ALLOCATION_METHODS.EQUAL_WEIGHT;

// ============================================================================
// CATEGORY CAGR CALCULATION
// ============================================================================

/**
 * Calculates XIRR-based CAGR for a category
 * Handles multi-category stocks with allocation logic
 *
 * @param {string} categoryId - Category ID
 * @param {string} period - Period code
 * @param {string} allocationMethod - Allocation method for multi-category stocks
 * @returns {Object} Category CAGR result
 */
function calculateCategoryCAGR(categoryId, period, allocationMethod) {
  const funcName = 'calculateCategoryCAGR';

  // Check cache
  const cached = getCachedCalculation('xirr', categoryId, period);
  if (cached) {
    return cached;
  }

  const method = allocationMethod || DEFAULT_ALLOCATION_METHOD;
  logInfo('CategoryAggregator', funcName,
    `Calculating CAGR for ${categoryId}, period: ${period}, method: ${method}`
  );

  // Get category details
  const category = getCategoryById(categoryId);
  if (!category) {
    throw new PortfolioError(ERROR_CODES.CATEGORY_NOT_FOUND, 'Category not found');
  }

  // Get all stocks in this category
  const stocksInCategory = getStocksInCategory_(categoryId);

  if (stocksInCategory.length === 0) {
    return {
      categoryId,
      categoryName: category.name,
      period,
      xirr: null,
      cagr: null,
      message: 'No stocks in category'
    };
  }

  // Get date range
  const endDate = new Date();
  const startDate = getPeriodStartDate_(period);

  // Build aggregated cash flows with allocation
  const cashFlows = buildCategoryCashFlows_(
    categoryId,
    stocksInCategory,
    startDate,
    endDate,
    method
  );

  if (cashFlows.length < 2) {
    return {
      categoryId,
      categoryName: category.name,
      period,
      xirr: null,
      cagr: null,
      message: 'Insufficient cash flows'
    };
  }

  // Calculate XIRR
  const xirr = calculateXIRR(cashFlows);

  // Calculate totals
  const totalInvested = Math.abs(
    cashFlows.filter(cf => cf.amount < 0).reduce((sum, cf) => sum + cf.amount, 0)
  );
  const totalValue = cashFlows.filter(cf => cf.amount > 0)
    .reduce((sum, cf) => sum + cf.amount, 0);

  const result = {
    categoryId,
    categoryName: category.name,
    period,
    periodLabel: PERIOD_LABELS[period],
    startDate,
    endDate,
    xirr,
    cagr: xirr,
    xirrPercent: xirr !== null ? (xirr * 100).toFixed(2) + '%' : 'N/A',
    stockCount: stocksInCategory.length,
    cashFlowCount: cashFlows.length,
    totalInvested,
    totalValue,
    allocationMethod: method
  };

  // Cache result
  setCachedCalculation('xirr', categoryId, period, result);

  // Save to Reports sheet
  saveCategoryReport_(result);

  return result;
}

/**
 * Builds cash flows for a category with allocation logic
 * @param {string} categoryId - Category ID
 * @param {Object[]} stocks - Stocks in category
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} method - Allocation method
 * @returns {Object[]} Aggregated cash flows
 * @private
 */
function buildCategoryCashFlows_(categoryId, stocks, startDate, endDate, method) {
  const cashFlows = [];

  stocks.forEach(stock => {
    // Get allocation factor for this stock
    const allocationFactor = getStockAllocationFactor_(stock, categoryId, method);

    // Get all transactions for this stock in the period
    const transactions = getTransactionsForStock(stock.id);
    const filteredTxns = transactions.filter(t => {
      const txnDate = new Date(t.date);
      return txnDate >= startDate && txnDate <= endDate;
    });

    // Add allocated transaction cash flows
    filteredTxns.forEach(txn => {
      const allocatedAmount = (txn.netValue || txn.totalValue) * allocationFactor;

      if (txn.type === TRANSACTION_TYPES.BUY) {
        cashFlows.push({
          date: new Date(txn.date),
          amount: -allocatedAmount
        });
      } else if (txn.type === TRANSACTION_TYPES.SELL) {
        cashFlows.push({
          date: new Date(txn.date),
          amount: allocatedAmount
        });
      }
    });

    // Add allocated current value of holdings
    const holdings = getHoldingsForStock_(stock.id);
    const remainingQty = holdings.reduce((sum, h) => sum + h.remainingQuantity, 0);

    if (remainingQty > 0) {
      const currentPrice = getLatestPrice(stock.id);
      if (currentPrice > 0) {
        const currentValue = remainingQty * currentPrice * allocationFactor;
        cashFlows.push({
          date: endDate,
          amount: currentValue
        });
      }
    }
  });

  // Sort by date
  cashFlows.sort((a, b) => new Date(a.date) - new Date(b.date));

  return cashFlows;
}

/**
 * Gets allocation factor for a stock in a category
 * @param {Object} stock - Stock object
 * @param {string} categoryId - Target category ID
 * @param {string} method - Allocation method
 * @returns {number} Allocation factor (0 to 1)
 * @private
 */
function getStockAllocationFactor_(stock, categoryId, method) {
  const categories = stock.categoryIds ?
    stock.categoryIds.split(',').map(c => c.trim()) : [];

  if (categories.length === 0) {
    return 0;
  }

  if (categories.length === 1) {
    return 1; // Stock belongs to only one category
  }

  // Multi-category stock
  if (method === ALLOCATION_METHODS.EQUAL_WEIGHT) {
    // Equal split among all categories
    return 1 / categories.length;
  } else if (method === ALLOCATION_METHODS.PROPORTIONAL) {
    // Proportional to category weight (more complex)
    const categoryWeights = calculateCategoryWeights_();
    const targetWeight = categoryWeights[categoryId] || 0;
    const totalWeight = categories.reduce((sum, catId) => {
      return sum + (categoryWeights[catId] || 0);
    }, 0);

    return totalWeight > 0 ? targetWeight / totalWeight : (1 / categories.length);
  }

  return 1 / categories.length; // Default to equal weight
}

/**
 * Calculates weight of each category in the portfolio
 * @returns {Object} Category ID -> Weight mapping
 * @private
 */
function calculateCategoryWeights_() {
  const stocksSheet = getSheet_(SHEETS.STOCKS);
  const stocksData = stocksSheet.getDataRange().getValues();

  const categoryTotals = {};
  let portfolioTotal = 0;

  for (let i = 1; i < stocksData.length; i++) {
    const categoryIds = stocksData[i][COLUMNS.STOCKS.CATEGORY_IDS];
    const currentValue = stocksData[i][COLUMNS.STOCKS.CURRENT_VALUE] || 0;

    if (categoryIds && currentValue > 0) {
      const categories = categoryIds.split(',').map(c => c.trim());
      const valuePerCategory = currentValue / categories.length;

      categories.forEach(catId => {
        categoryTotals[catId] = (categoryTotals[catId] || 0) + valuePerCategory;
      });

      portfolioTotal += currentValue;
    }
  }

  // Convert to weights
  const weights = {};
  Object.keys(categoryTotals).forEach(catId => {
    weights[catId] = portfolioTotal > 0 ? categoryTotals[catId] / portfolioTotal : 0;
  });

  return weights;
}

// ============================================================================
// CATEGORY DATA ACCESS
// ============================================================================

/**
 * Gets a category by ID
 * @param {string} categoryId - Category ID
 * @returns {Object|null} Category object or null
 */
function getCategoryById(categoryId) {
  const sheet = getSheet_(SHEETS.CATEGORIES);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.CATEGORIES.ID] === categoryId) {
      return {
        id: data[i][COLUMNS.CATEGORIES.ID],
        name: data[i][COLUMNS.CATEGORIES.NAME],
        description: data[i][COLUMNS.CATEGORIES.DESCRIPTION],
        stockCount: data[i][COLUMNS.CATEGORIES.STOCK_COUNT],
        totalInvested: data[i][COLUMNS.CATEGORIES.TOTAL_INVESTED],
        currentValue: data[i][COLUMNS.CATEGORIES.CURRENT_VALUE],
        isActive: data[i][COLUMNS.CATEGORIES.IS_ACTIVE]
      };
    }
  }

  return null;
}

/**
 * Gets all stocks in a category
 * @param {string} categoryId - Category ID
 * @returns {Object[]} Array of stocks
 * @private
 */
function getStocksInCategory_(categoryId) {
  const sheet = getSheet_(SHEETS.STOCKS);
  const data = sheet.getDataRange().getValues();
  const stocks = [];

  for (let i = 1; i < data.length; i++) {
    const categoryIds = data[i][COLUMNS.STOCKS.CATEGORY_IDS] || '';
    const isActive = data[i][COLUMNS.STOCKS.IS_ACTIVE];

    if (isActive !== false && categoryIds.includes(categoryId)) {
      stocks.push({
        id: data[i][COLUMNS.STOCKS.ID],
        name: data[i][COLUMNS.STOCKS.NAME],
        symbol: data[i][COLUMNS.STOCKS.SYMBOL],
        categoryIds: categoryIds,
        currentPrice: data[i][COLUMNS.STOCKS.CURRENT_PRICE],
        totalQuantity: data[i][COLUMNS.STOCKS.TOTAL_QUANTITY],
        totalInvested: data[i][COLUMNS.STOCKS.TOTAL_INVESTED],
        currentValue: data[i][COLUMNS.STOCKS.CURRENT_VALUE]
      });
    }
  }

  return stocks;
}

// ============================================================================
// CATEGORY AGGREGATE UPDATES
// ============================================================================

/**
 * Updates aggregate values for all categories
 * Called after transactions or price updates
 */
function updateAllCategoryAggregates() {
  const funcName = 'updateAllCategoryAggregates';
  logInfo('CategoryAggregator', funcName, 'Updating all category aggregates');

  const categories = getAllCategories();

  categories.forEach(category => {
    updateCategoryAggregates_(category.id);
  });

  logInfo('CategoryAggregator', funcName, 'Category aggregates updated');
}

/**
 * Updates aggregate values for a specific category
 * @param {string} categoryId - Category ID
 * @private
 */
function updateCategoryAggregates_(categoryId) {
  const sheet = getSheet_(SHEETS.CATEGORIES);
  const data = sheet.getDataRange().getValues();

  // Find category row
  let categoryRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.CATEGORIES.ID] === categoryId) {
      categoryRow = i + 1;
      break;
    }
  }

  if (categoryRow === -1) return;

  // Calculate aggregates
  const stocks = getStocksInCategory_(categoryId);

  let totalInvested = 0;
  let currentValue = 0;
  let stockCount = 0;

  stocks.forEach(stock => {
    const allocationFactor = getStockAllocationFactor_(stock, categoryId, DEFAULT_ALLOCATION_METHOD);

    totalInvested += (stock.totalInvested || 0) * allocationFactor;
    currentValue += (stock.currentValue || 0) * allocationFactor;
    stockCount++;
  });

  // Update sheet
  sheet.getRange(categoryRow, COLUMNS.CATEGORIES.STOCK_COUNT + 1).setValue(stockCount);
  sheet.getRange(categoryRow, COLUMNS.CATEGORIES.TOTAL_INVESTED + 1).setValue(totalInvested);
  sheet.getRange(categoryRow, COLUMNS.CATEGORIES.CURRENT_VALUE + 1).setValue(currentValue);
  sheet.getRange(categoryRow, COLUMNS.CATEGORIES.UPDATED_AT + 1).setValue(new Date());
}

// ============================================================================
// CATEGORY MANAGEMENT
// ============================================================================

/**
 * Adds a new category
 * @param {Object} params - Category parameters
 * @param {string} params.name - Category name
 * @param {string} params.description - Category description (optional)
 * @returns {Object} Result with category ID
 */
function addCategory(params) {
  const funcName = 'addCategory';

  // Validation
  if (!params.name || params.name.trim().length === 0) {
    throw new PortfolioError(ERROR_CODES.VALIDATION_ERROR, 'Category name is required');
  }

  // Check for duplicates
  const existing = getAllCategories();
  if (existing.some(c => c.name.toLowerCase() === params.name.toLowerCase())) {
    throw new PortfolioError(ERROR_CODES.DUPLICATE_ENTRY, 'Category already exists');
  }

  const sheet = getSheet_(SHEETS.CATEGORIES);
  const categoryId = generateCategoryId();
  const now = new Date();

  const row = [
    categoryId,
    params.name.trim(),
    params.description || '',
    now,
    now,
    0, // Stock count
    0, // Total invested
    0, // Current value
    true // Is active
  ];

  sheet.appendRow(row);

  logInfo('CategoryAggregator', funcName, `Category created: ${categoryId} - ${params.name}`);

  return {
    success: true,
    categoryId,
    name: params.name
  };
}

/**
 * Assigns categories to a stock
 * @param {string} stockId - Stock ID
 * @param {string[]} categoryIds - Array of category IDs
 * @returns {Object} Result
 */
function assignCategoriesToStock(stockId, categoryIds) {
  const funcName = 'assignCategoriesToStock';

  // Validate stock exists
  const stock = getStockById(stockId);
  if (!stock) {
    throw new PortfolioError(ERROR_CODES.STOCK_NOT_FOUND, 'Stock not found');
  }

  // Validate all categories exist
  const validCategories = [];
  categoryIds.forEach(catId => {
    const category = getCategoryById(catId);
    if (category) {
      validCategories.push(catId);
    } else {
      logWarn('CategoryAggregator', funcName, `Category not found: ${catId}`);
    }
  });

  // Update stock sheet
  const sheet = getSheet_(SHEETS.STOCKS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.STOCKS.ID] === stockId) {
      sheet.getRange(i + 1, COLUMNS.STOCKS.CATEGORY_IDS + 1)
        .setValue(validCategories.join(','));
      break;
    }
  }

  // Update category aggregates
  validCategories.forEach(catId => {
    updateCategoryAggregates_(catId);
  });

  logInfo('CategoryAggregator', funcName,
    `Assigned ${validCategories.length} categories to ${stockId}`
  );

  return {
    success: true,
    stockId,
    assignedCategories: validCategories
  };
}

// ============================================================================
// REPORT PERSISTENCE
// ============================================================================

/**
 * Saves category report to Reports sheet
 * @param {Object} result - CAGR result
 * @private
 */
function saveCategoryReport_(result) {
  if (result.xirr === null) return;

  const sheet = getSheet_(SHEETS.REPORTS);

  // Check if report exists for this category and period
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.REPORTS.TYPE] === REPORT_TYPES.CATEGORY_CAGR &&
        data[i][COLUMNS.REPORTS.ENTITY_ID] === result.categoryId &&
        data[i][COLUMNS.REPORTS.PERIOD] === result.period) {
      // Update existing
      const row = i + 1;
      sheet.getRange(row, COLUMNS.REPORTS.XIRR + 1).setValue(result.xirr);
      sheet.getRange(row, COLUMNS.REPORTS.CAGR + 1).setValue(result.cagr);
      sheet.getRange(row, COLUMNS.REPORTS.TOTAL_INVESTED + 1).setValue(result.totalInvested);
      sheet.getRange(row, COLUMNS.REPORTS.CURRENT_VALUE + 1).setValue(result.totalValue);
      sheet.getRange(row, COLUMNS.REPORTS.GENERATED_AT + 1).setValue(new Date());
      return;
    }
  }

  // Add new
  const reportRow = [
    generateReportId(),
    REPORT_TYPES.CATEGORY_CAGR,
    result.categoryId,
    result.categoryName,
    result.period,
    result.startDate,
    result.endDate,
    result.totalInvested,
    result.totalValue,
    result.totalValue,
    result.xirr,
    result.cagr,
    result.totalValue - result.totalInvested,
    result.totalInvested > 0 ? (result.totalValue - result.totalInvested) / result.totalInvested : 0,
    new Date()
  ];

  sheet.appendRow(reportRow);
}

// ============================================================================
// CATEGORY COMPARISON
// ============================================================================

/**
 * Gets performance comparison across all categories
 * @param {string} period - Period code
 * @returns {Object[]} Array of category performances sorted by CAGR
 */
function compareCategoryPerformance(period) {
  const categories = getAllCategories();
  const performances = [];

  categories.forEach(category => {
    try {
      const result = calculateCategoryCAGR(category.id, period);
      performances.push({
        categoryId: category.id,
        categoryName: category.name,
        xirr: result.xirr,
        cagr: result.cagr,
        totalInvested: result.totalInvested,
        totalValue: result.totalValue,
        stockCount: result.stockCount || 0
      });
    } catch (e) {
      logWarn('CategoryAggregator', 'compareCategoryPerformance',
        `Error for category ${category.name}: ${e.message}`
      );
    }
  });

  // Sort by CAGR descending
  performances.sort((a, b) => {
    const cagrA = a.cagr || -999;
    const cagrB = b.cagr || -999;
    return cagrB - cagrA;
  });

  return performances;
}

/**
 * Gets category allocation breakdown for portfolio
 * @returns {Object[]} Category allocations
 */
function getCategoryAllocation() {
  const categories = getAllCategories();
  const allocations = [];
  let totalValue = 0;

  categories.forEach(category => {
    const stocks = getStocksInCategory_(category.id);
    let categoryValue = 0;

    stocks.forEach(stock => {
      const factor = getStockAllocationFactor_(stock, category.id, DEFAULT_ALLOCATION_METHOD);
      categoryValue += (stock.currentValue || 0) * factor;
    });

    allocations.push({
      categoryId: category.id,
      categoryName: category.name,
      currentValue: categoryValue
    });

    totalValue += categoryValue;
  });

  // Calculate percentages
  allocations.forEach(alloc => {
    alloc.percentage = totalValue > 0 ? (alloc.currentValue / totalValue) * 100 : 0;
    alloc.percentageStr = alloc.percentage.toFixed(2) + '%';
  });

  // Sort by value descending
  allocations.sort((a, b) => b.currentValue - a.currentValue);

  return {
    allocations,
    totalValue
  };
}
