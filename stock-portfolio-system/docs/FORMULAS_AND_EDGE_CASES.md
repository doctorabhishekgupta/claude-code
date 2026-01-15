# Stock Portfolio System - Mathematical Formulas & Edge Cases

## 1. Mathematical Formulas

### 1.1 XIRR (Extended Internal Rate of Return)

XIRR is the annualized return that accounts for irregular cash flows.

**Mathematical Definition:**

XIRR solves for `r` in:

```
Σ(CF_i / (1 + r)^(d_i/365)) = 0
```

Where:
- `CF_i` = Cash flow at time `i` (negative for outflows/buys, positive for inflows/sells)
- `d_i` = Days from the first transaction date to date `i`
- `r` = Annual rate of return (the XIRR we're solving for)

**Newton-Raphson Implementation:**

```javascript
// NPV function
f(r) = Σ(CF_i / (1 + r)^(d_i/365))

// Derivative
f'(r) = Σ(-d_i/365 * CF_i / (1 + r)^(d_i/365 + 1))

// Newton-Raphson iteration
r_new = r_old - f(r) / f'(r)

// Continue until |f(r)| < tolerance (1e-10)
```

**Code Reference:** `CAGRCalculator.gs:calculateXIRR()`

### 1.2 CAGR (Compound Annual Growth Rate)

For this system, **CAGR equals XIRR** because XIRR already produces an annualized rate.

**Simple CAGR (for reference):**

```
CAGR = (Ending Value / Beginning Value)^(1/Years) - 1
```

**Why XIRR is Used:**
- Simple CAGR assumes a single investment at the start
- XIRR handles multiple buys/sells at different times
- XIRR accounts for the timing of each cash flow

### 1.3 Weighted Average Buy Price

**Formula:**

```
Avg Buy Price = Σ(Price_i × Quantity_i) / Σ(Quantity_i)
```

**Example:**
- Buy 1: 100 shares @ ₹1500 = ₹150,000
- Buy 2: 50 shares @ ₹1600 = ₹80,000
- Total: 150 shares, ₹230,000
- Avg Buy Price = 230,000 / 150 = ₹1,533.33

### 1.4 Unrealized P/L

```
Unrealized P/L = (Current Price × Holding Quantity) - (Avg Buy Price × Holding Quantity)
Unrealized P/L % = Unrealized P/L / Total Invested × 100
```

### 1.5 Realized P/L (FIFO-based)

When selling, P/L is calculated against the oldest buy (FIFO):

```
For each FIFO allocation:
  Cost Basis = Buy Price × Quantity Sold
  Sale Proceeds = Sell Price × Quantity Sold
  Realized P/L = Sale Proceeds - Cost Basis

Total Realized P/L = Σ(Individual Realized P/L)
```

### 1.6 Category-wise CAGR with Allocation

For stocks in multiple categories:

**Equal Weight Method:**
```
Allocation Factor = 1 / Number of Categories
Allocated Investment = Investment × Allocation Factor
Allocated Cash Flow = Cash Flow × Allocation Factor
```

**Example:**
- Stock X invested ₹100,000, in 2 categories (A, B)
- Category A allocation = ₹50,000
- Category B allocation = ₹50,000

**Proportional Method:**
```
Category Weight = Category Value / Total Portfolio Value
Allocation Factor = Category Weight / Sum of Weights for Stock's Categories
```

---

## 2. FIFO (First In, First Out) Logic

### 2.1 Algorithm

```
FUNCTION allocateFIFO(stockId, sellQuantity, sellDate):
    buys = GET all BUY transactions for stockId
    SORT buys by date (ascending - oldest first)

    allocations = []
    remainingToSell = sellQuantity

    FOR each buy in buys:
        IF buy.date > sellDate:
            SKIP (can't sell before buying)

        IF buy.remainingQuantity > 0:
            allocationQty = MIN(buy.remainingQuantity, remainingToSell)
            allocations.PUSH({
                transactionId: buy.id,
                quantity: allocationQty,
                buyPrice: buy.price
            })
            remainingToSell -= allocationQty

        IF remainingToSell <= 0:
            BREAK

    IF remainingToSell > 0:
        THROW "Insufficient holdings"

    RETURN allocations
```

### 2.2 FIFO Example

**Holdings (after buys):**
| Date | Qty | Price | Remaining |
|------|-----|-------|-----------|
| Jan 1 | 100 | ₹1500 | 100 |
| Jan 15 | 50 | ₹1550 | 50 |
| Feb 1 | 75 | ₹1480 | 75 |

**Sell on Feb 15: 120 shares @ ₹1600**

FIFO Allocation:
1. First, allocate from Jan 1 buy: 100 shares
2. Then, allocate from Jan 15 buy: 20 shares
3. Total: 120 shares allocated

**Result:**
- Jan 1: Remaining = 0 (100 sold)
- Jan 15: Remaining = 30 (20 sold)
- Feb 1: Remaining = 75 (unchanged)

**Realized P/L:**
```
From Jan 1: (1600 - 1500) × 100 = ₹10,000
From Jan 15: (1600 - 1550) × 20 = ₹1,000
Total: ₹11,000
```

---

## 3. Edge Cases

### 3.1 Stock Split Handling

**Scenario:** 2:1 stock split (2 shares for every 1)

**Adjustment Factor:** `2.0`

**Actions Required:**
1. **Double** all quantities in holdings bought before ex-date
2. **Halve** all prices in transactions before ex-date
3. **Halve** all historical prices before ex-date

**Example:**
- Before split: 100 shares @ ₹3000
- After split: 200 shares @ ₹1500
- Total value unchanged: ₹300,000

**Code Reference:** `CorporateActions.gs:recordStockSplit()`

### 3.2 Bonus Shares Handling

**Scenario:** 1:1 bonus (1 free share for every 1 held)

**Adjustment Factor:** `2.0` (same as 2:1 split)

**Treatment:** Similar to stock split
- Quantity doubles
- Average price halves
- Historical prices adjusted

### 3.3 Partial Sells

**Scenario:** Sell only part of a holding

**Handling:** FIFO allocates from oldest purchases first

**Example:**
- Own 100 shares (50 from Buy A, 50 from Buy B)
- Sell 70 shares
- Result: All of Buy A consumed (50), 20 from Buy B consumed
- Buy B remaining: 30 shares

### 3.4 Missing Historical Prices

**Scenario:** Price data unavailable for some dates

**Handling:**
1. Use most recent available price
2. Log warning for missing dates
3. Mark price as estimated

**For XIRR:**
- Use last known price for current value calculation
- May affect accuracy of CAGR

### 3.5 Duplicate Data Prevention

**Checks:**
1. **Duplicate Transaction:** Same stock, date, quantity, price within 1 minute
2. **Duplicate Stock:** Same symbol (case-insensitive)
3. **Duplicate Category:** Same name (case-insensitive)
4. **Duplicate Price:** Same stock + date combination

### 3.6 Future Date Transactions

**Rule:** Transactions cannot have future dates

**Validation:**
```javascript
if (transactionDate > today) {
    throw new Error("Transaction date cannot be in the future");
}
```

### 3.7 Negative CAGR / XIRR

**Valid Scenario:** Losses result in negative returns

**Example:**
- Invested ₹100,000
- Current value ₹80,000
- Negative XIRR indicates loss

**Display:** Shown in red with negative sign

### 3.8 Cannot Calculate XIRR

**Scenarios where XIRR fails:**
1. No transactions in period
2. All buys, no sells, no current holdings
3. Mathematical non-convergence (rare)

**Handling:**
- Return `null` for XIRR
- Display "N/A" to user
- Log for debugging

### 3.9 Stock in Multiple Categories

**Problem:** Avoid double-counting when aggregating

**Solution:** Allocation-based splitting

```javascript
// Stock in 3 categories
allocationFactor = 1 / 3;  // Equal weight

// Category A gets 1/3 of the investment
categoryAInvestment = totalInvestment * allocationFactor;
```

### 3.10 Corporate Action Before First Buy

**Rule:** Corporate actions only affect transactions/prices before the ex-date

**Check:**
```javascript
if (transactionDate >= exDate) {
    // No adjustment needed
    continue;
}
```

### 3.11 Sell Before Any Buy

**Rule:** Cannot sell stock never bought

**Validation:**
```javascript
const firstBuyDate = getFirstBuyDate(stockId);
if (sellDate < firstBuyDate) {
    throw new Error("Cannot sell before first purchase");
}
```

### 3.12 Sell More Than Owned

**Rule:** Quantity validation before sell

**Validation:**
```javascript
const available = getAvailableQuantity(stockId);
if (sellQuantity > available) {
    throw new Error(`Insufficient holdings. Available: ${available}`);
}
```

### 3.13 Rate Limit Exceeded

**Scenario:** Too many Screener.in requests

**Handling:**
1. Track requests per hour
2. Enforce minimum delay between requests
3. Stop fetching when limit approached
4. Resume in next hour

### 3.14 Screener.in Page Structure Changes

**Risk:** HTML parsing may break

**Mitigation:**
1. Multiple fallback regex patterns
2. Graceful error handling
3. Manual price entry fallback
4. Detailed error logging

### 3.15 Very Long Investment Periods

**Scenario:** XIRR with cash flows spanning many years

**Handling:**
- Newton-Raphson may need more iterations
- Bisection method as fallback
- Bounded rate range (-99% to +1000%)

### 3.16 Zero Quantity After All Sells

**Scenario:** Stock fully exited

**Handling:**
1. Holdings row deleted (not hidden)
2. Stock still exists in Stocks sheet (for history)
3. Historical transactions preserved
4. CAGR calculated with zero current value

---

## 4. Validation Rules Summary

| Field | Rule | Error Code |
|-------|------|------------|
| Stock ID | Format: STK-XXX | INVALID_STOCK_ID |
| Category ID | Format: CAT-XXX | INVALID_CATEGORY_ID |
| Transaction Date | Not future | FUTURE_DATE |
| Price | > 0 | INVALID_PRICE |
| Quantity | > 0, integer | INVALID_QUANTITY |
| Sell Quantity | ≤ Available | INSUFFICIENT_HOLDINGS |
| Screener URL | Valid format | VALIDATION_ERROR |

---

## 5. Calculation Accuracy Notes

1. **Floating Point:** All monetary calculations use `number` type; rounding applied for display

2. **Date Calculations:** Days calculated using milliseconds for precision

3. **XIRR Tolerance:** Converges when |NPV| < 1e-10

4. **Rounding Display:** Prices to 2 decimals, percentages to 2 decimals

5. **Currency:** All values in INR (₹)
