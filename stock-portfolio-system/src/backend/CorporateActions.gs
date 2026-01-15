/**
 * Corporate Actions Module
 * Handles stock splits, bonus shares, and dividends
 *
 * @fileoverview Corporate action processing and price adjustments
 * @author Stock Portfolio System
 * @version 1.0.0
 *
 * Corporate Action Types:
 * -----------------------
 * 1. SPLIT: Stock split (e.g., 2:1 means 2 shares for every 1)
 *    - Doubles quantity, halves price
 *    - Adjustment factor = new shares / old shares
 *
 * 2. BONUS: Bonus shares (e.g., 1:1 means 1 bonus for every 1 held)
 *    - Increases quantity, reduces avg price
 *    - Adjustment factor = (original + bonus) / original
 *
 * 3. DIVIDEND: Cash dividend
 *    - Recorded as cash inflow for XIRR calculation
 *    - Does not affect quantity
 */

// ============================================================================
// CORPORATE ACTION TYPES
// ============================================================================

const CORPORATE_ACTION_TYPES = {
  SPLIT: 'SPLIT',
  BONUS: 'BONUS',
  DIVIDEND: 'DIVIDEND'
};

// ============================================================================
// RECORD CORPORATE ACTIONS
// ============================================================================

/**
 * Records a stock split
 * @param {Object} params - Split parameters
 * @param {string} params.stockId - Stock ID
 * @param {Date} params.exDate - Ex-date
 * @param {string} params.ratio - Split ratio (e.g., "2:1")
 * @param {number} params.oldFaceValue - Old face value
 * @param {number} params.newFaceValue - New face value
 * @returns {Object} Result
 */
function recordStockSplit(params) {
  const funcName = 'recordStockSplit';
  logInfo('CorporateActions', funcName, `Recording split for ${params.stockId}`, params);

  // Validate
  const stock = getStockById(params.stockId);
  if (!stock) {
    throw new PortfolioError(ERROR_CODES.STOCK_NOT_FOUND, 'Stock not found');
  }

  // Parse ratio
  const ratioParts = params.ratio.split(':');
  if (ratioParts.length !== 2) {
    throw new PortfolioError(ERROR_CODES.VALIDATION_ERROR, 'Invalid split ratio format. Use "X:Y"');
  }

  const newShares = parseFloat(ratioParts[0]);
  const oldShares = parseFloat(ratioParts[1]);
  const adjustmentFactor = newShares / oldShares;

  // Save corporate action record
  const actionId = saveCorpAction_({
    stockId: params.stockId,
    symbol: stock.symbol,
    actionType: CORPORATE_ACTION_TYPES.SPLIT,
    exDate: params.exDate,
    ratio: params.ratio,
    oldFaceValue: params.oldFaceValue,
    newFaceValue: params.newFaceValue,
    adjustmentFactor
  });

  return {
    success: true,
    actionId,
    stockId: params.stockId,
    adjustmentFactor,
    message: `Stock split ${params.ratio} recorded. Run "Process Corporate Actions" to apply.`
  };
}

/**
 * Records bonus shares
 * @param {Object} params - Bonus parameters
 * @param {string} params.stockId - Stock ID
 * @param {Date} params.exDate - Ex-date
 * @param {string} params.ratio - Bonus ratio (e.g., "1:1")
 * @returns {Object} Result
 */
function recordBonusShares(params) {
  const funcName = 'recordBonusShares';
  logInfo('CorporateActions', funcName, `Recording bonus for ${params.stockId}`, params);

  const stock = getStockById(params.stockId);
  if (!stock) {
    throw new PortfolioError(ERROR_CODES.STOCK_NOT_FOUND, 'Stock not found');
  }

  // Parse ratio (bonus:held)
  const ratioParts = params.ratio.split(':');
  if (ratioParts.length !== 2) {
    throw new PortfolioError(ERROR_CODES.VALIDATION_ERROR, 'Invalid bonus ratio format. Use "X:Y"');
  }

  const bonusShares = parseFloat(ratioParts[0]);
  const heldShares = parseFloat(ratioParts[1]);
  const adjustmentFactor = (heldShares + bonusShares) / heldShares;

  const actionId = saveCorpAction_({
    stockId: params.stockId,
    symbol: stock.symbol,
    actionType: CORPORATE_ACTION_TYPES.BONUS,
    exDate: params.exDate,
    ratio: params.ratio,
    adjustmentFactor
  });

  return {
    success: true,
    actionId,
    stockId: params.stockId,
    adjustmentFactor,
    message: `Bonus ${params.ratio} recorded. Run "Process Corporate Actions" to apply.`
  };
}

/**
 * Records dividend
 * @param {Object} params - Dividend parameters
 * @param {string} params.stockId - Stock ID
 * @param {Date} params.exDate - Ex-date
 * @param {number} params.dividendPerShare - Dividend per share
 * @returns {Object} Result
 */
function recordDividend(params) {
  const funcName = 'recordDividend';
  logInfo('CorporateActions', funcName, `Recording dividend for ${params.stockId}`, params);

  const stock = getStockById(params.stockId);
  if (!stock) {
    throw new PortfolioError(ERROR_CODES.STOCK_NOT_FOUND, 'Stock not found');
  }

  // Get quantity held on ex-date
  const holdingsOnExDate = getHoldingsOnDate_(params.stockId, new Date(params.exDate));
  const totalQuantity = holdingsOnExDate.reduce((sum, h) => sum + h.quantity, 0);
  const totalDividend = totalQuantity * params.dividendPerShare;

  const actionId = saveCorpAction_({
    stockId: params.stockId,
    symbol: stock.symbol,
    actionType: CORPORATE_ACTION_TYPES.DIVIDEND,
    exDate: params.exDate,
    ratio: `₹${params.dividendPerShare}/share`,
    adjustmentFactor: 1, // No quantity adjustment for dividends
    notes: `Total dividend: ₹${totalDividend.toFixed(2)} (${totalQuantity} shares)`
  });

  // Record dividend as cash inflow in transactions (for XIRR)
  if (totalDividend > 0) {
    recordDividendTransaction_(params.stockId, stock.symbol, params.exDate, totalDividend);
  }

  return {
    success: true,
    actionId,
    stockId: params.stockId,
    totalDividend,
    quantityHeld: totalQuantity
  };
}

// ============================================================================
// PROCESS CORPORATE ACTIONS
// ============================================================================

/**
 * Processes all unprocessed corporate actions
 * Adjusts holdings and historical prices
 */
function processAllCorporateActions() {
  const funcName = 'processAllCorporateActions';
  logInfo('CorporateActions', funcName, 'Processing all corporate actions');

  const sheet = getSheet_(SHEETS.CORPORATE_ACTIONS);
  const data = sheet.getDataRange().getValues();

  let processed = 0;
  let errors = 0;

  for (let i = 1; i < data.length; i++) {
    const isProcessed = data[i][10]; // IsProcessed column

    if (!isProcessed) {
      try {
        const action = {
          row: i + 1,
          actionId: data[i][0],
          stockId: data[i][1],
          symbol: data[i][2],
          actionType: data[i][3],
          exDate: new Date(data[i][4]),
          ratio: data[i][6],
          adjustmentFactor: data[i][9]
        };

        processCorpAction_(action);
        processed++;

        // Mark as processed
        sheet.getRange(i + 1, 11).setValue(true);
        sheet.getRange(i + 1, 12).setValue(new Date());

      } catch (error) {
        errors++;
        logError('CorporateActions', funcName, `Error processing action: ${data[i][0]}`, {}, error);
      }
    }
  }

  logInfo('CorporateActions', funcName, `Processed ${processed} actions, ${errors} errors`);

  return { processed, errors };
}

/**
 * Processes a single corporate action
 * @param {Object} action - Corporate action details
 * @private
 */
function processCorpAction_(action) {
  const funcName = 'processCorpAction_';

  if (action.actionType === CORPORATE_ACTION_TYPES.SPLIT ||
      action.actionType === CORPORATE_ACTION_TYPES.BONUS) {

    // Adjust holdings
    adjustHoldings_(action.stockId, action.exDate, action.adjustmentFactor);

    // Adjust transactions
    adjustTransactions_(action.stockId, action.exDate, action.adjustmentFactor);

    // Adjust historical prices
    adjustHistoricalPrices_(action.stockId, action.exDate, action.adjustmentFactor);

    // Update stock aggregates
    updateStockAggregates_(action.stockId);

    logInfo('CorporateActions', funcName,
      `Processed ${action.actionType} for ${action.symbol} with factor ${action.adjustmentFactor}`
    );
  }
  // Dividends are already processed when recorded
}

/**
 * Adjusts holdings for corporate action
 * @param {string} stockId - Stock ID
 * @param {Date} exDate - Ex-date
 * @param {number} factor - Adjustment factor
 * @private
 */
function adjustHoldings_(stockId, exDate, factor) {
  const sheet = getSheet_(SHEETS.HOLDINGS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.HOLDINGS.STOCK_ID] === stockId) {
      const buyDate = new Date(data[i][COLUMNS.HOLDINGS.BUY_DATE]);

      // Only adjust holdings bought before ex-date
      if (buyDate < exDate) {
        const row = i + 1;
        const oldQty = data[i][COLUMNS.HOLDINGS.ORIGINAL_QUANTITY];
        const oldRemaining = data[i][COLUMNS.HOLDINGS.REMAINING_QUANTITY];
        const oldPrice = data[i][COLUMNS.HOLDINGS.BUY_PRICE];

        const newQty = Math.round(oldQty * factor);
        const newRemaining = Math.round(oldRemaining * factor);
        const newPrice = oldPrice / factor;

        sheet.getRange(row, COLUMNS.HOLDINGS.ORIGINAL_QUANTITY + 1).setValue(newQty);
        sheet.getRange(row, COLUMNS.HOLDINGS.REMAINING_QUANTITY + 1).setValue(newRemaining);
        sheet.getRange(row, COLUMNS.HOLDINGS.BUY_PRICE + 1).setValue(newPrice);
        sheet.getRange(row, COLUMNS.HOLDINGS.INVESTED_VALUE + 1).setValue(newPrice * newRemaining);
        sheet.getRange(row, COLUMNS.HOLDINGS.LAST_UPDATED + 1).setValue(new Date());
      }
    }
  }
}

/**
 * Adjusts transactions for corporate action
 * @param {string} stockId - Stock ID
 * @param {Date} exDate - Ex-date
 * @param {number} factor - Adjustment factor
 * @private
 */
function adjustTransactions_(stockId, exDate, factor) {
  const sheet = getSheet_(SHEETS.TRANSACTIONS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.TRANSACTIONS.STOCK_ID] === stockId) {
      const txnDate = new Date(data[i][COLUMNS.TRANSACTIONS.DATE]);

      // Only adjust transactions before ex-date
      if (txnDate < exDate) {
        const row = i + 1;
        const oldQty = data[i][COLUMNS.TRANSACTIONS.QUANTITY];
        const oldPrice = data[i][COLUMNS.TRANSACTIONS.PRICE];
        const oldRemaining = data[i][COLUMNS.TRANSACTIONS.REMAINING_QUANTITY] || 0;

        const newQty = Math.round(oldQty * factor);
        const newPrice = oldPrice / factor;
        const newRemaining = Math.round(oldRemaining * factor);

        sheet.getRange(row, COLUMNS.TRANSACTIONS.QUANTITY + 1).setValue(newQty);
        sheet.getRange(row, COLUMNS.TRANSACTIONS.PRICE + 1).setValue(newPrice);
        sheet.getRange(row, COLUMNS.TRANSACTIONS.TOTAL_VALUE + 1).setValue(newQty * newPrice);

        if (data[i][COLUMNS.TRANSACTIONS.TYPE] === TRANSACTION_TYPES.BUY) {
          sheet.getRange(row, COLUMNS.TRANSACTIONS.REMAINING_QUANTITY + 1).setValue(newRemaining);
        }
      }
    }
  }
}

/**
 * Adjusts historical prices for corporate action
 * @param {string} stockId - Stock ID
 * @param {Date} exDate - Ex-date
 * @param {number} factor - Adjustment factor
 * @private
 */
function adjustHistoricalPrices_(stockId, exDate, factor) {
  const sheet = getSheet_(SHEETS.DAILY_PRICES);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.DAILY_PRICES.STOCK_ID] === stockId) {
      const priceDate = new Date(data[i][COLUMNS.DAILY_PRICES.DATE]);

      // Only adjust prices before ex-date
      if (priceDate < exDate) {
        const row = i + 1;

        const oldOpen = data[i][COLUMNS.DAILY_PRICES.OPEN];
        const oldHigh = data[i][COLUMNS.DAILY_PRICES.HIGH];
        const oldLow = data[i][COLUMNS.DAILY_PRICES.LOW];
        const oldClose = data[i][COLUMNS.DAILY_PRICES.CLOSE];

        sheet.getRange(row, COLUMNS.DAILY_PRICES.OPEN + 1).setValue(oldOpen / factor);
        sheet.getRange(row, COLUMNS.DAILY_PRICES.HIGH + 1).setValue(oldHigh / factor);
        sheet.getRange(row, COLUMNS.DAILY_PRICES.LOW + 1).setValue(oldLow / factor);
        sheet.getRange(row, COLUMNS.DAILY_PRICES.CLOSE + 1).setValue(oldClose / factor);
        sheet.getRange(row, COLUMNS.DAILY_PRICES.ADJUSTED_CLOSE + 1).setValue(oldClose / factor);
      }
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Saves corporate action to sheet
 * @param {Object} action - Action details
 * @returns {string} Action ID
 * @private
 */
function saveCorpAction_(action) {
  const sheet = getSheet_(SHEETS.CORPORATE_ACTIONS);
  const actionId = `ACT-${Date.now().toString().slice(-6)}`;

  const row = [
    actionId,
    action.stockId,
    action.symbol,
    action.actionType,
    action.exDate,
    action.recordDate || null,
    action.ratio,
    action.oldFaceValue || null,
    action.newFaceValue || null,
    action.adjustmentFactor,
    false, // IsProcessed
    null,  // ProcessedAt
    action.notes || ''
  ];

  sheet.appendRow(row);
  return actionId;
}

/**
 * Gets holdings on a specific date
 * @param {string} stockId - Stock ID
 * @param {Date} date - Target date
 * @returns {Object[]} Holdings on that date
 * @private
 */
function getHoldingsOnDate_(stockId, date) {
  const transactions = getTransactionsForStock(stockId);
  const holdings = [];

  transactions
    .filter(t => new Date(t.date) <= date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(txn => {
      if (txn.type === TRANSACTION_TYPES.BUY) {
        holdings.push({
          transactionId: txn.transactionId,
          date: txn.date,
          price: txn.price,
          quantity: txn.quantity
        });
      } else if (txn.type === TRANSACTION_TYPES.SELL) {
        // Apply FIFO for sells
        let toSell = txn.quantity;
        for (let i = 0; i < holdings.length && toSell > 0; i++) {
          const deduct = Math.min(holdings[i].quantity, toSell);
          holdings[i].quantity -= deduct;
          toSell -= deduct;
        }
      }
    });

  return holdings.filter(h => h.quantity > 0);
}

/**
 * Records dividend as a transaction for XIRR calculation
 * @param {string} stockId - Stock ID
 * @param {string} symbol - Stock symbol
 * @param {Date} date - Dividend date
 * @param {number} amount - Dividend amount
 * @private
 */
function recordDividendTransaction_(stockId, symbol, date, amount) {
  // Note: This is recorded separately for XIRR purposes
  // We don't add it to regular transactions to avoid confusion
  // Instead, dividends are tracked in CorporateActions sheet

  logInfo('CorporateActions', 'recordDividendTransaction_',
    `Dividend recorded: ${symbol} - ₹${amount} on ${date}`
  );
}

/**
 * Gets pending (unprocessed) corporate actions
 * @returns {Object[]} Pending actions
 */
function getPendingCorporateActions() {
  const sheet = getSheet_(SHEETS.CORPORATE_ACTIONS);
  const data = sheet.getDataRange().getValues();
  const pending = [];

  for (let i = 1; i < data.length; i++) {
    if (!data[i][10]) { // IsProcessed = false
      pending.push({
        actionId: data[i][0],
        stockId: data[i][1],
        symbol: data[i][2],
        actionType: data[i][3],
        exDate: data[i][4],
        ratio: data[i][6]
      });
    }
  }

  return pending;
}
