/**
 * Transaction Handler Module
 * Handles buy/sell transactions with FIFO logic and validation
 *
 * @fileoverview Transaction processing, validation, and FIFO tracking
 * @author Stock Portfolio System
 * @version 1.0.0
 */

// ============================================================================
// BUY TRANSACTION
// ============================================================================

/**
 * Records a buy transaction
 * @param {Object} params - Transaction parameters
 * @param {string} params.stockId - Stock ID
 * @param {Date} params.date - Transaction date
 * @param {number} params.price - Price per share
 * @param {number} params.quantity - Number of shares
 * @param {number} params.brokerage - Brokerage fees (optional)
 * @param {number} params.stt - STT (optional)
 * @param {number} params.otherCharges - Other charges (optional)
 * @param {string} params.notes - Transaction notes (optional)
 * @returns {Object} Result with transaction ID
 */
function recordBuyTransaction(params) {
  const funcName = 'recordBuyTransaction';
  logInfo('TransactionHandler', funcName, 'Recording buy transaction', params);

  // Validate inputs
  validateBuyTransaction_(params);

  // Get stock details
  const stock = getStockById(params.stockId);
  if (!stock) {
    throw new PortfolioError(ERROR_CODES.STOCK_NOT_FOUND, 'Stock not found');
  }

  // Calculate values
  const totalValue = params.price * params.quantity;
  const brokerage = params.brokerage || 0;
  const stt = params.stt || 0;
  const otherCharges = params.otherCharges || 0;
  const netValue = totalValue + brokerage + stt + otherCharges;

  // Generate transaction ID
  const transactionId = generateTransactionId();

  // Create transaction record
  const transaction = [
    transactionId,
    params.stockId,
    stock.symbol,
    TRANSACTION_TYPES.BUY,
    params.date,
    params.price,
    params.quantity,
    totalValue,
    brokerage,
    stt,
    otherCharges,
    netValue,
    params.notes || '',
    '', // FIFO reference (not used for buy)
    params.quantity, // Remaining quantity (full amount for buy)
    new Date(),
    'USER'
  ];

  // Save to Transactions sheet
  const sheet = getSheet_(SHEETS.TRANSACTIONS);
  sheet.appendRow(transaction);

  // Update Holdings
  addHolding_(transactionId, params.stockId, stock.symbol, params.date, params.price, params.quantity);

  // Update Stock aggregates
  updateStockAggregates_(params.stockId);

  // Invalidate calculation caches
  invalidateCalculationCache(params.stockId);
  invalidateAllCalculations();

  logInfo('TransactionHandler', funcName,
    `Buy transaction recorded: ${transactionId}`,
    { transactionId, stockId: params.stockId, quantity: params.quantity, value: netValue }
  );

  return {
    success: true,
    transactionId,
    stockId: params.stockId,
    symbol: stock.symbol,
    quantity: params.quantity,
    totalValue,
    netValue
  };
}

// ============================================================================
// SELL TRANSACTION
// ============================================================================

/**
 * Records a sell transaction using FIFO allocation
 * @param {Object} params - Transaction parameters
 * @param {string} params.stockId - Stock ID
 * @param {Date} params.date - Transaction date
 * @param {number} params.price - Price per share
 * @param {number} params.quantity - Number of shares
 * @param {number} params.brokerage - Brokerage fees (optional)
 * @param {number} params.stt - STT (optional)
 * @param {number} params.otherCharges - Other charges (optional)
 * @param {string} params.notes - Transaction notes (optional)
 * @returns {Object} Result with transaction ID and FIFO details
 */
function recordSellTransaction(params) {
  const funcName = 'recordSellTransaction';
  logInfo('TransactionHandler', funcName, 'Recording sell transaction', params);

  // Validate inputs
  validateSellTransaction_(params);

  // Get stock details
  const stock = getStockById(params.stockId);
  if (!stock) {
    throw new PortfolioError(ERROR_CODES.STOCK_NOT_FOUND, 'Stock not found');
  }

  // Check available holdings
  const availableQuantity = getAvailableQuantity_(params.stockId);
  if (params.quantity > availableQuantity) {
    throw new PortfolioError(
      ERROR_CODES.INSUFFICIENT_HOLDINGS,
      `Insufficient holdings. Available: ${availableQuantity}, Requested: ${params.quantity}`
    );
  }

  // Apply FIFO logic
  const fifoAllocation = allocateFIFO_(params.stockId, params.quantity, params.date);

  // Calculate values
  const totalValue = params.price * params.quantity;
  const brokerage = params.brokerage || 0;
  const stt = params.stt || 0;
  const otherCharges = params.otherCharges || 0;
  const netValue = totalValue - brokerage - stt - otherCharges;

  // Generate transaction ID
  const transactionId = generateTransactionId();

  // Create FIFO reference string
  const fifoReference = fifoAllocation.allocations
    .map(a => `${a.transactionId}:${a.quantity}`)
    .join(',');

  // Create transaction record
  const transaction = [
    transactionId,
    params.stockId,
    stock.symbol,
    TRANSACTION_TYPES.SELL,
    params.date,
    params.price,
    params.quantity,
    totalValue,
    brokerage,
    stt,
    otherCharges,
    netValue,
    params.notes || '',
    fifoReference,
    0, // Remaining quantity (0 for sell)
    new Date(),
    'USER'
  ];

  // Save to Transactions sheet
  const sheet = getSheet_(SHEETS.TRANSACTIONS);
  sheet.appendRow(transaction);

  // Update remaining quantities in buy transactions
  updateBuyRemainingQuantities_(fifoAllocation.allocations);

  // Update Holdings sheet
  updateHoldingsAfterSell_(fifoAllocation.allocations);

  // Update Stock aggregates
  updateStockAggregates_(params.stockId);

  // Invalidate calculation caches
  invalidateCalculationCache(params.stockId);
  invalidateAllCalculations();

  logInfo('TransactionHandler', funcName,
    `Sell transaction recorded: ${transactionId}`,
    {
      transactionId,
      stockId: params.stockId,
      quantity: params.quantity,
      fifoAllocations: fifoAllocation.allocations.length
    }
  );

  return {
    success: true,
    transactionId,
    stockId: params.stockId,
    symbol: stock.symbol,
    quantity: params.quantity,
    totalValue,
    netValue,
    fifoAllocation: fifoAllocation.allocations,
    realizedPL: calculateRealizedPL_(fifoAllocation.allocations, params.price)
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates buy transaction parameters
 * @param {Object} params - Transaction parameters
 * @private
 */
function validateBuyTransaction_(params) {
  // Required fields
  if (!params.stockId) {
    throw new PortfolioError(ERROR_CODES.INVALID_STOCK_ID, 'Stock ID is required');
  }

  if (!params.date) {
    throw new PortfolioError(ERROR_CODES.INVALID_DATE, 'Date is required');
  }

  // Validate date
  const txnDate = new Date(params.date);
  if (isNaN(txnDate.getTime())) {
    throw new PortfolioError(ERROR_CODES.INVALID_DATE, 'Invalid date format');
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (txnDate > today) {
    throw new PortfolioError(ERROR_CODES.FUTURE_DATE, 'Transaction date cannot be in the future');
  }

  // Validate price
  if (!params.price || params.price <= 0) {
    throw new PortfolioError(ERROR_CODES.INVALID_PRICE, 'Price must be greater than zero');
  }

  // Validate quantity
  if (!params.quantity || params.quantity <= 0 || !Number.isInteger(params.quantity)) {
    throw new PortfolioError(ERROR_CODES.INVALID_QUANTITY, 'Quantity must be a positive integer');
  }
}

/**
 * Validates sell transaction parameters
 * @param {Object} params - Transaction parameters
 * @private
 */
function validateSellTransaction_(params) {
  // Same validations as buy
  validateBuyTransaction_(params);

  // Additional sell-specific validation
  const availableQuantity = getAvailableQuantity_(params.stockId);
  if (params.quantity > availableQuantity) {
    throw new PortfolioError(
      ERROR_CODES.INSUFFICIENT_HOLDINGS,
      `Cannot sell ${params.quantity} shares. Only ${availableQuantity} available.`
    );
  }

  // Cannot sell before first buy
  const firstBuyDate = getFirstBuyDate_(params.stockId);
  if (firstBuyDate && new Date(params.date) < firstBuyDate) {
    throw new PortfolioError(
      ERROR_CODES.INVALID_DATE,
      'Sell date cannot be before the first buy date'
    );
  }
}

// ============================================================================
// FIFO ALLOCATION
// ============================================================================

/**
 * Allocates sell quantity to buy transactions using FIFO
 * @param {string} stockId - Stock ID
 * @param {number} sellQuantity - Quantity to sell
 * @param {Date} sellDate - Sell date (for validation)
 * @returns {Object} FIFO allocation result
 * @private
 */
function allocateFIFO_(stockId, sellQuantity, sellDate) {
  const funcName = 'allocateFIFO_';

  // Get all buy transactions for this stock, sorted by date (oldest first)
  const buyTransactions = getBuyTransactionsWithRemaining_(stockId);

  // Sort by date (FIFO - oldest first)
  buyTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  const allocations = [];
  let remainingToSell = sellQuantity;

  for (const buy of buyTransactions) {
    if (remainingToSell <= 0) break;

    // Skip if buy date is after sell date
    if (new Date(buy.date) > new Date(sellDate)) {
      continue;
    }

    if (buy.remainingQuantity > 0) {
      const allocationQty = Math.min(buy.remainingQuantity, remainingToSell);

      allocations.push({
        transactionId: buy.transactionId,
        buyDate: buy.date,
        buyPrice: buy.price,
        quantity: allocationQty,
        originalRemaining: buy.remainingQuantity
      });

      remainingToSell -= allocationQty;
    }
  }

  if (remainingToSell > 0) {
    throw new PortfolioError(
      ERROR_CODES.FIFO_ERROR,
      `FIFO allocation failed. Could not allocate ${remainingToSell} shares.`
    );
  }

  logDebug('TransactionHandler', funcName,
    `FIFO allocation complete for ${stockId}`,
    { sellQuantity, allocations: allocations.length }
  );

  return { allocations };
}

/**
 * Gets buy transactions with remaining quantity
 * @param {string} stockId - Stock ID
 * @returns {Object[]} Array of buy transactions
 * @private
 */
function getBuyTransactionsWithRemaining_(stockId) {
  const sheet = getSheet_(SHEETS.TRANSACTIONS);
  const data = sheet.getDataRange().getValues();
  const transactions = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.TRANSACTIONS.STOCK_ID] === stockId &&
        data[i][COLUMNS.TRANSACTIONS.TYPE] === TRANSACTION_TYPES.BUY) {

      const remainingQty = data[i][COLUMNS.TRANSACTIONS.REMAINING_QUANTITY];
      if (remainingQty > 0) {
        transactions.push({
          row: i + 1,
          transactionId: data[i][COLUMNS.TRANSACTIONS.ID],
          date: data[i][COLUMNS.TRANSACTIONS.DATE],
          price: data[i][COLUMNS.TRANSACTIONS.PRICE],
          quantity: data[i][COLUMNS.TRANSACTIONS.QUANTITY],
          remainingQuantity: remainingQty
        });
      }
    }
  }

  return transactions;
}

/**
 * Updates remaining quantities in buy transactions after FIFO allocation
 * @param {Object[]} allocations - FIFO allocations
 * @private
 */
function updateBuyRemainingQuantities_(allocations) {
  const sheet = getSheet_(SHEETS.TRANSACTIONS);
  const data = sheet.getDataRange().getValues();

  allocations.forEach(allocation => {
    for (let i = 1; i < data.length; i++) {
      if (data[i][COLUMNS.TRANSACTIONS.ID] === allocation.transactionId) {
        const newRemaining = allocation.originalRemaining - allocation.quantity;
        sheet.getRange(i + 1, COLUMNS.TRANSACTIONS.REMAINING_QUANTITY + 1)
          .setValue(newRemaining);
        break;
      }
    }
  });
}

// ============================================================================
// HOLDINGS MANAGEMENT
// ============================================================================

/**
 * Adds a new holding record
 * @param {string} transactionId - Buy transaction ID
 * @param {string} stockId - Stock ID
 * @param {string} symbol - Stock symbol
 * @param {Date} buyDate - Purchase date
 * @param {number} buyPrice - Purchase price
 * @param {number} quantity - Quantity purchased
 * @private
 */
function addHolding_(transactionId, stockId, symbol, buyDate, buyPrice, quantity) {
  const sheet = getSheet_(SHEETS.HOLDINGS);
  const holdingId = generateHoldingId();
  const currentPrice = getLatestPrice(stockId) || buyPrice;

  const investedValue = buyPrice * quantity;
  const currentValue = currentPrice * quantity;
  const unrealizedPL = currentValue - investedValue;
  const holdingDays = Math.floor((new Date() - new Date(buyDate)) / (1000 * 60 * 60 * 24));

  const holdingRow = [
    holdingId,
    stockId,
    symbol,
    transactionId,
    buyDate,
    buyPrice,
    quantity,
    quantity, // Remaining quantity (same as original for new holding)
    investedValue,
    currentPrice,
    currentValue,
    unrealizedPL,
    holdingDays,
    new Date()
  ];

  sheet.appendRow(holdingRow);
}

/**
 * Updates holdings after a sell transaction
 * @param {Object[]} allocations - FIFO allocations
 * @private
 */
function updateHoldingsAfterSell_(allocations) {
  const sheet = getSheet_(SHEETS.HOLDINGS);
  const data = sheet.getDataRange().getValues();

  allocations.forEach(allocation => {
    for (let i = 1; i < data.length; i++) {
      if (data[i][COLUMNS.HOLDINGS.BUY_TRANSACTION_ID] === allocation.transactionId) {
        const currentRemaining = data[i][COLUMNS.HOLDINGS.REMAINING_QUANTITY];
        const newRemaining = currentRemaining - allocation.quantity;

        if (newRemaining <= 0) {
          // Delete the holding row (fully sold)
          sheet.deleteRow(i + 1);
        } else {
          // Update remaining quantity and recalculate values
          const row = i + 1;
          const buyPrice = data[i][COLUMNS.HOLDINGS.BUY_PRICE];
          const currentPrice = data[i][COLUMNS.HOLDINGS.CURRENT_PRICE];

          sheet.getRange(row, COLUMNS.HOLDINGS.REMAINING_QUANTITY + 1).setValue(newRemaining);
          sheet.getRange(row, COLUMNS.HOLDINGS.INVESTED_VALUE + 1).setValue(buyPrice * newRemaining);
          sheet.getRange(row, COLUMNS.HOLDINGS.CURRENT_VALUE + 1).setValue(currentPrice * newRemaining);
          sheet.getRange(row, COLUMNS.HOLDINGS.UNREALIZED_PL + 1).setValue((currentPrice - buyPrice) * newRemaining);
          sheet.getRange(row, COLUMNS.HOLDINGS.LAST_UPDATED + 1).setValue(new Date());
        }
        break;
      }
    }
  });
}

/**
 * Refreshes all holdings with current prices
 * Called after price updates
 */
function refreshHoldings() {
  const sheet = getSheet_(SHEETS.HOLDINGS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return;

  for (let i = 1; i < data.length; i++) {
    const stockId = data[i][COLUMNS.HOLDINGS.STOCK_ID];
    const buyPrice = data[i][COLUMNS.HOLDINGS.BUY_PRICE];
    const remainingQty = data[i][COLUMNS.HOLDINGS.REMAINING_QUANTITY];
    const buyDate = data[i][COLUMNS.HOLDINGS.BUY_DATE];

    const currentPrice = getLatestPrice(stockId);
    if (currentPrice > 0) {
      const row = i + 1;
      const currentValue = currentPrice * remainingQty;
      const unrealizedPL = currentValue - (buyPrice * remainingQty);
      const holdingDays = Math.floor((new Date() - new Date(buyDate)) / (1000 * 60 * 60 * 24));

      sheet.getRange(row, COLUMNS.HOLDINGS.CURRENT_PRICE + 1).setValue(currentPrice);
      sheet.getRange(row, COLUMNS.HOLDINGS.CURRENT_VALUE + 1).setValue(currentValue);
      sheet.getRange(row, COLUMNS.HOLDINGS.UNREALIZED_PL + 1).setValue(unrealizedPL);
      sheet.getRange(row, COLUMNS.HOLDINGS.HOLDING_DAYS + 1).setValue(holdingDays);
      sheet.getRange(row, COLUMNS.HOLDINGS.LAST_UPDATED + 1).setValue(new Date());
    }
  }

  logInfo('TransactionHandler', 'refreshHoldings', 'Holdings refreshed with current prices');
}

// ============================================================================
// STOCK AGGREGATES
// ============================================================================

/**
 * Updates aggregate values in Stocks sheet
 * @param {string} stockId - Stock ID
 * @private
 */
function updateStockAggregates_(stockId) {
  const sheet = getSheet_(SHEETS.STOCKS);
  const data = sheet.getDataRange().getValues();

  // Find the stock row
  let stockRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.STOCKS.ID] === stockId) {
      stockRow = i + 1;
      break;
    }
  }

  if (stockRow === -1) return;

  // Calculate aggregates from Holdings
  const holdings = getHoldingsForStock_(stockId);

  let totalQuantity = 0;
  let totalInvested = 0;

  holdings.forEach(holding => {
    totalQuantity += holding.remainingQuantity;
    totalInvested += holding.buyPrice * holding.remainingQuantity;
  });

  const avgBuyPrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0;
  const currentPrice = getLatestPrice(stockId) || 0;
  const currentValue = totalQuantity * currentPrice;
  const unrealizedPL = currentValue - totalInvested;
  const unrealizedPLPercent = totalInvested > 0 ? unrealizedPL / totalInvested : 0;

  // Update the stock row
  sheet.getRange(stockRow, COLUMNS.STOCKS.TOTAL_QUANTITY + 1).setValue(totalQuantity);
  sheet.getRange(stockRow, COLUMNS.STOCKS.AVG_BUY_PRICE + 1).setValue(avgBuyPrice);
  sheet.getRange(stockRow, COLUMNS.STOCKS.TOTAL_INVESTED + 1).setValue(totalInvested);
  sheet.getRange(stockRow, COLUMNS.STOCKS.CURRENT_VALUE + 1).setValue(currentValue);
  sheet.getRange(stockRow, COLUMNS.STOCKS.UNREALIZED_PL + 1).setValue(unrealizedPL);
  sheet.getRange(stockRow, COLUMNS.STOCKS.UNREALIZED_PL_PERCENT + 1).setValue(unrealizedPLPercent);
}

/**
 * Gets holdings for a specific stock
 * @param {string} stockId - Stock ID
 * @returns {Object[]} Array of holdings
 * @private
 */
function getHoldingsForStock_(stockId) {
  const sheet = getSheet_(SHEETS.HOLDINGS);
  const data = sheet.getDataRange().getValues();
  const holdings = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.HOLDINGS.STOCK_ID] === stockId) {
      holdings.push({
        holdingId: data[i][COLUMNS.HOLDINGS.ID],
        buyTransactionId: data[i][COLUMNS.HOLDINGS.BUY_TRANSACTION_ID],
        buyDate: data[i][COLUMNS.HOLDINGS.BUY_DATE],
        buyPrice: data[i][COLUMNS.HOLDINGS.BUY_PRICE],
        originalQuantity: data[i][COLUMNS.HOLDINGS.ORIGINAL_QUANTITY],
        remainingQuantity: data[i][COLUMNS.HOLDINGS.REMAINING_QUANTITY]
      });
    }
  }

  return holdings;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets available quantity for a stock (total remaining from buys)
 * @param {string} stockId - Stock ID
 * @returns {number} Available quantity
 * @private
 */
function getAvailableQuantity_(stockId) {
  const holdings = getHoldingsForStock_(stockId);
  return holdings.reduce((sum, h) => sum + h.remainingQuantity, 0);
}

/**
 * Gets the first buy date for a stock
 * @param {string} stockId - Stock ID
 * @returns {Date|null} First buy date or null
 * @private
 */
function getFirstBuyDate_(stockId) {
  const sheet = getSheet_(SHEETS.TRANSACTIONS);
  const data = sheet.getDataRange().getValues();
  let firstDate = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.TRANSACTIONS.STOCK_ID] === stockId &&
        data[i][COLUMNS.TRANSACTIONS.TYPE] === TRANSACTION_TYPES.BUY) {
      const txnDate = new Date(data[i][COLUMNS.TRANSACTIONS.DATE]);
      if (!firstDate || txnDate < firstDate) {
        firstDate = txnDate;
      }
    }
  }

  return firstDate;
}

/**
 * Calculates realized P/L from FIFO allocations
 * @param {Object[]} allocations - FIFO allocations
 * @param {number} sellPrice - Sell price per share
 * @returns {Object} Realized P/L breakdown
 * @private
 */
function calculateRealizedPL_(allocations, sellPrice) {
  let totalCost = 0;
  let totalProceeds = 0;
  const details = [];

  allocations.forEach(allocation => {
    const cost = allocation.buyPrice * allocation.quantity;
    const proceeds = sellPrice * allocation.quantity;
    const pl = proceeds - cost;

    totalCost += cost;
    totalProceeds += proceeds;

    details.push({
      buyDate: allocation.buyDate,
      buyPrice: allocation.buyPrice,
      quantity: allocation.quantity,
      cost,
      proceeds,
      profitLoss: pl
    });
  });

  return {
    totalCost,
    totalProceeds,
    realizedPL: totalProceeds - totalCost,
    realizedPLPercent: totalCost > 0 ? ((totalProceeds - totalCost) / totalCost) : 0,
    details
  };
}

/**
 * Gets all transactions for a stock
 * @param {string} stockId - Stock ID
 * @param {string} type - Transaction type (optional)
 * @returns {Object[]} Array of transactions
 */
function getTransactionsForStock(stockId, type) {
  const sheet = getSheet_(SHEETS.TRANSACTIONS);
  const data = sheet.getDataRange().getValues();
  const transactions = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.TRANSACTIONS.STOCK_ID] === stockId) {
      if (!type || data[i][COLUMNS.TRANSACTIONS.TYPE] === type) {
        transactions.push({
          transactionId: data[i][COLUMNS.TRANSACTIONS.ID],
          stockId: data[i][COLUMNS.TRANSACTIONS.STOCK_ID],
          symbol: data[i][COLUMNS.TRANSACTIONS.STOCK_SYMBOL],
          type: data[i][COLUMNS.TRANSACTIONS.TYPE],
          date: data[i][COLUMNS.TRANSACTIONS.DATE],
          price: data[i][COLUMNS.TRANSACTIONS.PRICE],
          quantity: data[i][COLUMNS.TRANSACTIONS.QUANTITY],
          totalValue: data[i][COLUMNS.TRANSACTIONS.TOTAL_VALUE],
          netValue: data[i][COLUMNS.TRANSACTIONS.NET_VALUE],
          fifoReference: data[i][COLUMNS.TRANSACTIONS.FIFO_REFERENCE],
          remainingQuantity: data[i][COLUMNS.TRANSACTIONS.REMAINING_QUANTITY]
        });
      }
    }
  }

  return transactions;
}

/**
 * Gets all transactions across all stocks
 * @returns {Object[]} Array of all transactions
 */
function getAllTransactions() {
  const sheet = getSheet_(SHEETS.TRANSACTIONS);
  const data = sheet.getDataRange().getValues();
  const transactions = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.TRANSACTIONS.ID]) {
      transactions.push({
        transactionId: data[i][COLUMNS.TRANSACTIONS.ID],
        stockId: data[i][COLUMNS.TRANSACTIONS.STOCK_ID],
        symbol: data[i][COLUMNS.TRANSACTIONS.STOCK_SYMBOL],
        type: data[i][COLUMNS.TRANSACTIONS.TYPE],
        date: data[i][COLUMNS.TRANSACTIONS.DATE],
        price: data[i][COLUMNS.TRANSACTIONS.PRICE],
        quantity: data[i][COLUMNS.TRANSACTIONS.QUANTITY],
        totalValue: data[i][COLUMNS.TRANSACTIONS.TOTAL_VALUE],
        netValue: data[i][COLUMNS.TRANSACTIONS.NET_VALUE]
      });
    }
  }

  return transactions;
}
