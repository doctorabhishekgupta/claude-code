# Stock Portfolio System - Maintenance Guide

## 1. Regular Maintenance Tasks

### Daily Tasks (Automated)
- ✅ Price updates at 6:00 PM IST
- ✅ Log cleanup at 2:00 AM
- ✅ Error digest email at 9:00 AM

### Weekly Tasks (Automated)
- ✅ Full report generation on Sunday
- ✅ Category aggregates update

### Monthly Tasks (Manual Recommended)
- [ ] Review error logs in **Logs** sheet
- [ ] Check for pending corporate actions
- [ ] Verify price data accuracy
- [ ] Backup spreadsheet (File → Make a copy)

### Quarterly Tasks (Manual)
- [ ] Review and clean up old logs
- [ ] Update Screener.in URL patterns if needed
- [ ] Check trigger execution history
- [ ] Validate CAGR calculations against external sources

---

## 2. Monitoring

### Check System Health

**Via Sheets:**
1. Open **Logs** sheet
2. Filter by Level = "ERROR"
3. Review recent errors

**Via Apps Script:**
1. Extensions → Apps Script
2. Click ⏱️ (Executions) in left panel
3. Review recent executions for failures

### Key Metrics to Monitor

| Metric | Where to Check | Healthy Range |
|--------|----------------|---------------|
| Daily price updates | Logs sheet | 0 errors |
| Trigger executions | Apps Script executions | All successful |
| Cache hit rate | Logs (DEBUG level) | >50% |
| Request count | Logs (rate limit warnings) | <80/hour |

---

## 3. Common Issues & Solutions

### Issue: Prices Not Updating

**Symptoms:**
- LastPriceUpdate dates are old
- CurrentPrice shows 0 or stale value

**Diagnosis:**
1. Check **Logs** sheet for SCREENER errors
2. Verify Screener.in URLs are accessible

**Solutions:**
1. **URL Changed:** Update ScreenerURL in Stocks sheet
2. **Rate Limited:** Wait 1 hour, then retry
3. **Site Down:** Wait and retry later
4. **Manual Entry:** Use `manualPriceEntry()` function

### Issue: Triggers Not Running

**Symptoms:**
- No new logs at scheduled times
- Prices not auto-updating

**Diagnosis:**
1. Extensions → Apps Script → Triggers
2. Check for "Failed" status

**Solutions:**
1. Delete all triggers
2. Re-run `setupAllTriggers()`
3. Re-authorize if prompted

### Issue: XIRR Returns N/A

**Symptoms:**
- CAGR shows "N/A" for a stock

**Diagnosis:**
- Insufficient cash flows
- All same-type transactions (only buys or only sells)

**Solutions:**
1. Ensure there's a current value (price × quantity)
2. Check transactions exist for the period
3. Manually run `calculateStockCAGR(stockId, 'ALL')`

### Issue: Holdings Mismatch

**Symptoms:**
- Holdings sheet doesn't match expected quantities

**Diagnosis:**
- FIFO allocations may have errors
- Missing transactions

**Solutions:**
1. Review all transactions in **Transactions** sheet
2. Check **RemainingQuantity** column in transactions
3. Rebuild holdings by running:
   ```javascript
   function rebuildHoldings() {
     // Delete all holdings
     // Re-process all buy transactions
   }
   ```

### Issue: Duplicate Entries

**Symptoms:**
- Same stock appears twice
- Same transaction duplicated

**Solutions:**
1. Manually delete duplicates from relevant sheet
2. Refresh aggregates with `updateStockAggregates_(stockId)`

---

## 4. Performance Optimization

### If Scraping is Slow

1. **Increase delay between requests:**
   ```javascript
   // In Config.gs
   MIN_DELAY_MS: 3000  // Increase to 3 seconds
   ```

2. **Reduce batch size:**
   - Fetch fewer stocks per run
   - Split into multiple triggers

### If Calculations are Slow

1. **Enable caching:**
   - Already implemented via CacheService
   - Verify cache is working in logs

2. **Reduce report frequency:**
   - Generate reports weekly instead of daily

### If Sheet is Slow

1. **Archive old data:**
   - Move old logs to archive sheet
   - Move old price data to separate sheet

2. **Limit rows:**
   ```javascript
   // In Config.gs
   MAX_LOG_ROWS: 5000  // Reduce from 10000
   ```

---

## 5. Backup & Recovery

### Creating Backups

**Method 1: Full Copy**
1. File → Make a copy
2. Save with date: "Portfolio_Backup_2024-01-20"

**Method 2: Export Data**
1. Each sheet → Download as CSV
2. Store in cloud or local backup

**Method 3: Script Backup**
1. Apps Script → Project Settings → Copy ID
2. Use Google Takeout for full backup

### Recovery Procedure

1. **Create new spreadsheet**
2. **Copy Scripts:**
   - Create all .gs files
   - Copy code from backup or source
3. **Run initialization:**
   ```javascript
   initializeAllSheets();
   ```
4. **Import data:**
   - Paste data into each sheet
   - Ensure headers match
5. **Re-setup triggers:**
   ```javascript
   setupAllTriggers();
   ```
6. **Verify:**
   - Run report generation
   - Check price fetching

---

## 6. Updating the System

### Adding New Features

1. Create feature branch (if using version control)
2. Test in a copy of the spreadsheet
3. Deploy to production

### Updating Screener.in Parsing

If Screener.in changes their HTML structure:

1. **Identify the change:**
   - Open Screener.in company page
   - Inspect HTML for price element

2. **Update regex in `PriceScraper.gs`:**
   ```javascript
   SELECTORS: {
     CURRENT_PRICE: /new-regex-pattern/
   }
   ```

3. **Test:**
   ```javascript
   // Run manually
   fetchCurrentPrice('STK-001', false);
   ```

### Upgrading Google Apps Script

Google may deprecate old methods:

1. Check Apps Script release notes
2. Update deprecated method calls
3. Test all functionality

---

## 7. Log Analysis

### Log Format

```
LogID | Timestamp | Level | Module | Function | Message | Details | StackTrace
```

### Common Log Patterns

**Healthy:**
```
INFO | PriceScraper | fetchCurrentPrice | Fetched price for STK-001: 1650.50
INFO | CAGRCalculator | calculateStockCAGR | Calculating CAGR for STK-001
```

**Warning:**
```
WARN | CacheManager | canMakeRequest | Rate limit approaching
WARN | PriceScraper | parseCurrentPrice_ | Falling back to secondary regex
```

**Error:**
```
ERROR | PriceScraper | fetchScreenerPage_ | HTTP 429 - Rate limited
ERROR | TransactionHandler | recordSellTransaction | Insufficient holdings
```

### Analyzing Errors

1. Filter Logs sheet: Level = "ERROR"
2. Group by Module to find problem area
3. Check Details column for context
4. Review StackTrace for code location

---

## 8. Security Maintenance

### Regular Security Checks

1. **Review authorized apps:**
   - Google Account → Security → Third-party apps
   - Revoke access for unused apps

2. **Check trigger permissions:**
   - Triggers should only run as "Me"
   - Web app should require Google sign-in (if sensitive)

3. **Review sharing settings:**
   - Spreadsheet should not be publicly shared
   - Apps Script should not expose sensitive URLs

### If Credentials Compromised

1. Revoke all access tokens
2. Change Google password
3. Review recent activity
4. Re-authorize Apps Script

---

## 9. Contact & Support

### Self-Help Resources
- Google Apps Script documentation
- Screener.in API changes (check their blog)
- Stack Overflow for Apps Script questions

### Debug Information to Collect

When troubleshooting:
1. Error message from Logs sheet
2. Last successful execution time
3. Recent changes made
4. Steps to reproduce

---

## 10. Deprecation Plan

### End-of-Life Preparation

If discontinuing the system:

1. Export all data to CSV
2. Generate final reports
3. Disable all triggers
4. Archive the spreadsheet
5. Document final state
