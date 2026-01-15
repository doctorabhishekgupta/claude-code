/**
 * CAGR Calculator Module
 * Calculates XIRR-based returns for stocks, categories, and portfolio
 *
 * @fileoverview XIRR calculation using Newton-Raphson method
 * @author Stock Portfolio System
 * @version 1.0.0
 *
 * Mathematical Background:
 * ------------------------
 * XIRR (Extended Internal Rate of Return) solves for r in:
 *   Σ(CF_i / (1 + r)^(d_i/365)) = 0
 *
 * Where:
 *   CF_i = Cash flow at time i (negative for outflows, positive for inflows)
 *   d_i = Days from first date to date i
 *   r = Annual rate of return (XIRR)
 *
 * Newton-Raphson Method:
 *   r_new = r_old - f(r) / f'(r)
 *
 * Where:
 *   f(r) = Σ(CF_i / (1 + r)^(d_i/365))
 *   f'(r) = Σ(-d_i/365 * CF_i / (1 + r)^(d_i/365 + 1))
 */

// ============================================================================
// XIRR CALCULATION (Core Algorithm)
// ============================================================================

/**
 * Calculates XIRR for a series of cash flows
 * Uses Newton-Raphson iteration method
 *
 * @param {Object[]} cashFlows - Array of { date: Date, amount: number }
 *                               Negative amounts are outflows (investments)
 *                               Positive amounts are inflows (returns)
 * @param {number} guess - Initial rate guess (default 0.1 = 10%)
 * @returns {number|null} Annual rate of return or null if cannot converge
 */
function calculateXIRR(cashFlows, guess) {
  const funcName = 'calculateXIRR';

  // Validation
  if (!cashFlows || cashFlows.length < 2) {
    logWarn('CAGRCalculator', funcName, 'Need at least 2 cash flows for XIRR');
    return null;
  }

  // Sort cash flows by date
  const sortedFlows = cashFlows
    .map(cf => ({
      date: new Date(cf.date),
      amount: cf.amount
    }))
    .sort((a, b) => a.date - b.date);

  // Check that we have both positive and negative cash flows
  const hasNegative = sortedFlows.some(cf => cf.amount < 0);
  const hasPositive = sortedFlows.some(cf => cf.amount > 0);

  if (!hasNegative || !hasPositive) {
    logWarn('CAGRCalculator', funcName,
      'XIRR requires both positive and negative cash flows'
    );
    return null;
  }

  // Calculate days from first date
  const firstDate = sortedFlows[0].date;
  const flowsWithDays = sortedFlows.map(cf => ({
    amount: cf.amount,
    days: (cf.date - firstDate) / (1000 * 60 * 60 * 24)
  }));

  // Newton-Raphson iteration
  let rate = guess || XIRR_CONFIG.INITIAL_GUESS;

  for (let i = 0; i < XIRR_CONFIG.MAX_ITERATIONS; i++) {
    const { npv, dnpv } = calculateNPVAndDerivative_(flowsWithDays, rate);

    // Check for convergence
    if (Math.abs(npv) < XIRR_CONFIG.TOLERANCE) {
      logDebug('CAGRCalculator', funcName,
        `XIRR converged after ${i + 1} iterations: ${(rate * 100).toFixed(4)}%`
      );
      return rate;
    }

    // Check for zero derivative (shouldn't happen often)
    if (Math.abs(dnpv) < 1e-15) {
      logWarn('CAGRCalculator', funcName, 'Derivative too small, trying new guess');
      rate += 0.1; // Nudge and try again
      continue;
    }

    // Newton-Raphson step
    const newRate = rate - npv / dnpv;

    // Bound the rate to prevent divergence
    if (newRate < XIRR_CONFIG.MIN_RATE) {
      rate = XIRR_CONFIG.MIN_RATE;
    } else if (newRate > XIRR_CONFIG.MAX_RATE) {
      rate = XIRR_CONFIG.MAX_RATE;
    } else {
      rate = newRate;
    }
  }

  // Failed to converge - try bisection method as fallback
  logWarn('CAGRCalculator', funcName, 'Newton-Raphson failed, trying bisection');
  return calculateXIRRBisection_(flowsWithDays);
}

/**
 * Calculates NPV and its derivative at a given rate
 * @param {Object[]} flows - Cash flows with days
 * @param {number} rate - Current rate
 * @returns {Object} { npv, dnpv }
 * @private
 */
function calculateNPVAndDerivative_(flows, rate) {
  let npv = 0;
  let dnpv = 0;

  flows.forEach(flow => {
    const exponent = flow.days / 365;
    const factor = Math.pow(1 + rate, exponent);

    npv += flow.amount / factor;
    dnpv -= (exponent * flow.amount) / (factor * (1 + rate));
  });

  return { npv, dnpv };
}

/**
 * Fallback XIRR calculation using bisection method
 * Slower but more robust
 * @param {Object[]} flows - Cash flows with days
 * @returns {number|null} Rate or null
 * @private
 */
function calculateXIRRBisection_(flows) {
  let low = XIRR_CONFIG.MIN_RATE;
  let high = XIRR_CONFIG.MAX_RATE;

  const calculateNPV = (rate) => {
    let npv = 0;
    flows.forEach(flow => {
      npv += flow.amount / Math.pow(1 + rate, flow.days / 365);
    });
    return npv;
  };

  // Check if solution exists in range
  const npvLow = calculateNPV(low);
  const npvHigh = calculateNPV(high);

  if (npvLow * npvHigh > 0) {
    // No sign change, no solution in range
    return null;
  }

  // Bisection
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const npvMid = calculateNPV(mid);

    if (Math.abs(npvMid) < XIRR_CONFIG.TOLERANCE) {
      return mid;
    }

    if (npvMid * npvLow < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}

// ============================================================================
// STOCK-LEVEL CAGR
// ============================================================================

/**
 * Calculates XIRR-based CAGR for a specific stock
 *
 * @param {string} stockId - Stock ID
 * @param {string} period - Period code ('3M', '6M', '1Y', '3Y', '5Y', 'ALL')
 * @returns {Object} CAGR result
 */
function calculateStockCAGR(stockId, period) {
  const funcName = 'calculateStockCAGR';

  // Check cache
  const cached = getCachedCalculation('xirr', stockId, period);
  if (cached) {
    return cached;
  }

  logInfo('CAGRCalculator', funcName, `Calculating CAGR for ${stockId}, period: ${period}`);

  // Get stock data
  const stock = getStockById(stockId);
  if (!stock) {
    throw new PortfolioError(ERROR_CODES.STOCK_NOT_FOUND, 'Stock not found');
  }

  // Determine date range
  const endDate = new Date();
  const startDate = getPeriodStartDate_(period);

  // Get all transactions for this stock within the period
  const transactions = getTransactionsForStock(stockId);
  const filteredTransactions = transactions.filter(t => {
    const txnDate = new Date(t.date);
    return txnDate >= startDate && txnDate <= endDate;
  });

  if (filteredTransactions.length === 0) {
    logInfo('CAGRCalculator', funcName, `No transactions in period for ${stockId}`);
    return {
      stockId,
      period,
      xirr: null,
      cagr: null,
      message: 'No transactions in period'
    };
  }

  // Build cash flows
  const cashFlows = buildStockCashFlows_(stockId, filteredTransactions, endDate);

  if (cashFlows.length < 2) {
    return {
      stockId,
      period,
      xirr: null,
      cagr: null,
      message: 'Insufficient cash flows'
    };
  }

  // Calculate XIRR
  const xirr = calculateXIRR(cashFlows);

  // XIRR is already annualized, so CAGR = XIRR
  const result = {
    stockId,
    stockName: stock.name,
    symbol: stock.symbol,
    period,
    periodLabel: PERIOD_LABELS[period],
    startDate,
    endDate,
    xirr,
    cagr: xirr, // XIRR is the annualized return
    xirrPercent: xirr !== null ? (xirr * 100).toFixed(2) + '%' : 'N/A',
    cashFlowCount: cashFlows.length,
    totalInvested: Math.abs(cashFlows.filter(cf => cf.amount < 0).reduce((sum, cf) => sum + cf.amount, 0)),
    totalReturned: cashFlows.filter(cf => cf.amount > 0).reduce((sum, cf) => sum + cf.amount, 0)
  };

  // Cache the result
  setCachedCalculation('xirr', stockId, period, result);

  return result;
}

/**
 * Builds cash flows for a stock's XIRR calculation
 * @param {string} stockId - Stock ID
 * @param {Object[]} transactions - Filtered transactions
 * @param {Date} endDate - End date for current value calculation
 * @returns {Object[]} Cash flows array
 * @private
 */
function buildStockCashFlows_(stockId, transactions, endDate) {
  const cashFlows = [];

  // Add transaction cash flows
  transactions.forEach(txn => {
    if (txn.type === TRANSACTION_TYPES.BUY) {
      // Buy = cash outflow (negative)
      cashFlows.push({
        date: new Date(txn.date),
        amount: -(txn.netValue || txn.totalValue)
      });
    } else if (txn.type === TRANSACTION_TYPES.SELL) {
      // Sell = cash inflow (positive)
      cashFlows.push({
        date: new Date(txn.date),
        amount: txn.netValue || txn.totalValue
      });
    }
  });

  // Add current value of remaining holdings as final inflow
  const holdings = getHoldingsForStock_(stockId);
  const totalRemainingQuantity = holdings.reduce((sum, h) => sum + h.remainingQuantity, 0);

  if (totalRemainingQuantity > 0) {
    const currentPrice = getLatestPrice(stockId);
    if (currentPrice > 0) {
      cashFlows.push({
        date: endDate,
        amount: totalRemainingQuantity * currentPrice
      });
    }
  }

  return cashFlows;
}

// ============================================================================
// PORTFOLIO-LEVEL CAGR
// ============================================================================

/**
 * Calculates XIRR-based CAGR for the entire portfolio
 *
 * @param {string} period - Period code
 * @returns {Object} Portfolio CAGR result
 */
function calculatePortfolioCAGR(period) {
  const funcName = 'calculatePortfolioCAGR';

  // Check cache
  const cached = getCachedCalculation('xirr', 'PORTFOLIO', period);
  if (cached) {
    return cached;
  }

  logInfo('CAGRCalculator', funcName, `Calculating portfolio CAGR, period: ${period}`);

  const endDate = new Date();
  const startDate = getPeriodStartDate_(period);

  // Get all transactions within the period
  const allTransactions = getAllTransactions();
  const filteredTransactions = allTransactions.filter(t => {
    const txnDate = new Date(t.date);
    return txnDate >= startDate && txnDate <= endDate;
  });

  if (filteredTransactions.length === 0) {
    return {
      period,
      xirr: null,
      cagr: null,
      message: 'No transactions in period'
    };
  }

  // Build portfolio cash flows
  const cashFlows = buildPortfolioCashFlows_(filteredTransactions, endDate);

  if (cashFlows.length < 2) {
    return {
      period,
      xirr: null,
      cagr: null,
      message: 'Insufficient cash flows'
    };
  }

  // Calculate XIRR
  const xirr = calculateXIRR(cashFlows);

  const result = {
    period,
    periodLabel: PERIOD_LABELS[period],
    startDate,
    endDate,
    xirr,
    cagr: xirr,
    xirrPercent: xirr !== null ? (xirr * 100).toFixed(2) + '%' : 'N/A',
    cashFlowCount: cashFlows.length,
    totalInvested: Math.abs(cashFlows.filter(cf => cf.amount < 0).reduce((sum, cf) => sum + cf.amount, 0)),
    totalValue: getCurrentPortfolioValue_()
  };

  // Cache the result
  setCachedCalculation('xirr', 'PORTFOLIO', period, result);

  return result;
}

/**
 * Builds cash flows for portfolio XIRR calculation
 * @param {Object[]} transactions - All transactions
 * @param {Date} endDate - End date
 * @returns {Object[]} Cash flows array
 * @private
 */
function buildPortfolioCashFlows_(transactions, endDate) {
  const cashFlows = [];

  // Add transaction cash flows
  transactions.forEach(txn => {
    if (txn.type === TRANSACTION_TYPES.BUY) {
      cashFlows.push({
        date: new Date(txn.date),
        amount: -(txn.netValue || txn.totalValue)
      });
    } else if (txn.type === TRANSACTION_TYPES.SELL) {
      cashFlows.push({
        date: new Date(txn.date),
        amount: txn.netValue || txn.totalValue
      });
    }
  });

  // Add current portfolio value as final inflow
  const currentValue = getCurrentPortfolioValue_();
  if (currentValue > 0) {
    cashFlows.push({
      date: endDate,
      amount: currentValue
    });
  }

  return cashFlows;
}

/**
 * Gets current total portfolio value
 * @returns {number} Total current value
 * @private
 */
function getCurrentPortfolioValue_() {
  const sheet = getSheet_(SHEETS.STOCKS);
  const data = sheet.getDataRange().getValues();
  let totalValue = 0;

  for (let i = 1; i < data.length; i++) {
    const currentValue = data[i][COLUMNS.STOCKS.CURRENT_VALUE];
    if (currentValue && currentValue > 0) {
      totalValue += currentValue;
    }
  }

  return totalValue;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets start date for a period
 * @param {string} period - Period code
 * @returns {Date} Start date
 * @private
 */
function getPeriodStartDate_(period) {
  const today = new Date();
  const days = PERIODS[period];

  if (days === -1) {
    // ALL - return earliest possible date
    return new Date(2000, 0, 1);
  }

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);
  return startDate;
}

// ============================================================================
// SIMPLE CAGR CALCULATION (Alternative)
// ============================================================================

/**
 * Calculates simple CAGR (not XIRR-based)
 * Formula: CAGR = (Ending Value / Beginning Value)^(1/Years) - 1
 *
 * @param {number} beginningValue - Initial investment
 * @param {number} endingValue - Final value
 * @param {number} years - Number of years
 * @returns {number} CAGR as decimal
 */
function calculateSimpleCAGR(beginningValue, endingValue, years) {
  if (beginningValue <= 0 || years <= 0) {
    return null;
  }

  return Math.pow(endingValue / beginningValue, 1 / years) - 1;
}

/**
 * Converts XIRR to CAGR (they are the same for annual returns)
 * This function exists for clarity and documentation
 *
 * @param {number} xirr - XIRR value (already annualized)
 * @returns {number} CAGR (same as XIRR)
 */
function xirrToCAGR(xirr) {
  // XIRR is already an annualized rate, so CAGR = XIRR
  // This function is provided for API clarity
  return xirr;
}

// ============================================================================
// ABSOLUTE RETURNS
// ============================================================================

/**
 * Calculates absolute return (simple percentage)
 * @param {number} invested - Total invested amount
 * @param {number} currentValue - Current value
 * @returns {Object} Return metrics
 */
function calculateAbsoluteReturn(invested, currentValue) {
  if (invested <= 0) {
    return {
      absoluteReturn: 0,
      absoluteReturnPercent: 0
    };
  }

  const absoluteReturn = currentValue - invested;
  const absoluteReturnPercent = absoluteReturn / invested;

  return {
    absoluteReturn,
    absoluteReturnPercent,
    absoluteReturnPercentStr: (absoluteReturnPercent * 100).toFixed(2) + '%'
  };
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generates all CAGR reports and saves to Reports sheet
 */
function generateAllReports() {
  const funcName = 'generateAllReports';
  logInfo('CAGRCalculator', funcName, 'Generating all CAGR reports');

  const sheet = getSheet_(SHEETS.REPORTS);

  // Clear existing reports (keep header)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  const periods = Object.keys(PERIODS);
  const stocks = getAllActiveStocks();
  const now = new Date();

  // Generate stock-wise reports
  stocks.forEach(stock => {
    periods.forEach(period => {
      try {
        const result = calculateStockCAGR(stock.id, period);

        if (result.xirr !== null) {
          const reportRow = [
            generateReportId(),
            REPORT_TYPES.STOCK_CAGR,
            stock.id,
            stock.name,
            period,
            result.startDate,
            result.endDate,
            result.totalInvested,
            result.totalReturned,
            stock.currentPrice * (getHoldingsForStock_(stock.id).reduce((sum, h) => sum + h.remainingQuantity, 0)),
            result.xirr,
            result.cagr,
            result.totalReturned - result.totalInvested,
            result.totalInvested > 0 ? (result.totalReturned - result.totalInvested) / result.totalInvested : 0,
            now
          ];
          sheet.appendRow(reportRow);
        }
      } catch (e) {
        logError('CAGRCalculator', funcName,
          `Error generating report for ${stock.symbol}`,
          { period, error: e.message }, e
        );
      }
    });
  });

  // Generate portfolio reports
  periods.forEach(period => {
    try {
      const result = calculatePortfolioCAGR(period);

      if (result.xirr !== null) {
        const reportRow = [
          generateReportId(),
          REPORT_TYPES.PORTFOLIO_CAGR,
          '',
          'Full Portfolio',
          period,
          result.startDate,
          result.endDate,
          result.totalInvested,
          result.totalValue,
          result.totalValue,
          result.xirr,
          result.cagr,
          result.totalValue - result.totalInvested,
          result.totalInvested > 0 ? (result.totalValue - result.totalInvested) / result.totalInvested : 0,
          now
        ];
        sheet.appendRow(reportRow);
      }
    } catch (e) {
      logError('CAGRCalculator', funcName,
        `Error generating portfolio report`,
        { period, error: e.message }, e
      );
    }
  });

  // Generate category reports (using CategoryAggregator)
  generateCategoryReports_();

  logInfo('CAGRCalculator', funcName, 'Report generation complete');
}

/**
 * Placeholder for category report generation
 * Full implementation in CategoryAggregator.gs
 * @private
 */
function generateCategoryReports_() {
  // This will be called from CategoryAggregator
  // Placeholder to avoid circular dependency
  if (typeof calculateCategoryCAGR === 'function') {
    const categories = getAllCategories();
    const periods = Object.keys(PERIODS);

    categories.forEach(category => {
      periods.forEach(period => {
        try {
          calculateCategoryCAGR(category.id, period);
        } catch (e) {
          // Log but continue
          logError('CAGRCalculator', 'generateCategoryReports_',
            `Error for category ${category.name}`, { period }, e
          );
        }
      });
    });
  }
}

/**
 * Gets all categories
 * @returns {Object[]} Array of categories
 */
function getAllCategories() {
  const sheet = getSheet_(SHEETS.CATEGORIES);
  const data = sheet.getDataRange().getValues();
  const categories = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.CATEGORIES.IS_ACTIVE] !== false) {
      categories.push({
        id: data[i][COLUMNS.CATEGORIES.ID],
        name: data[i][COLUMNS.CATEGORIES.NAME],
        description: data[i][COLUMNS.CATEGORIES.DESCRIPTION]
      });
    }
  }

  return categories;
}
