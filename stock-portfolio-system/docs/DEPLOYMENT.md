# Stock Portfolio System - Deployment Guide

## 1. Prerequisites

Before deploying, ensure you have:
- A Google account
- Access to Google Sheets and Apps Script
- Basic understanding of Google Sheets

## 2. Step-by-Step Deployment

### Step 1: Create a New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **+ Blank** to create a new spreadsheet
3. Name it: "Stock Portfolio Tracker"

### Step 2: Open Apps Script Editor

1. In your spreadsheet, go to **Extensions → Apps Script**
2. This opens the Apps Script editor
3. Delete any default code in `Code.gs`

### Step 3: Create Script Files

Create the following `.gs` files by clicking **+ (Add file) → Script**:

| File Name | Purpose |
|-----------|---------|
| Code.gs | Main entry points |
| Config.gs | Configuration constants |
| ErrorHandler.gs | Logging and error handling |
| CacheManager.gs | Caching layer |
| PriceScraper.gs | Screener.in scraping |
| TransactionHandler.gs | Buy/Sell logic |
| CAGRCalculator.gs | XIRR calculations |
| CategoryAggregator.gs | Category management |
| CorporateActions.gs | Splits, bonus handling |

### Step 4: Create HTML Files

Create the following `.html` files by clicking **+ (Add file) → HTML**:

| File Name | Purpose |
|-----------|---------|
| WebApp.html | Main web app |
| Styles.html | CSS styles |
| Scripts.html | JavaScript |
| AddStockDialog.html | Add stock dialog |
| AddCategoryDialog.html | Add category dialog |
| BuyDialog.html | Buy transaction dialog |
| SellDialog.html | Sell transaction dialog |
| AssignCategoriesDialog.html | Category assignment |

### Step 5: Copy Code

Copy the contents of each file from the `src/backend/` and `src/frontend/` directories to the corresponding files in Apps Script.

### Step 6: Initialize the System

1. In Apps Script, select **Code.gs** in the file list
2. Select `initializeAllSheets` from the function dropdown
3. Click **Run**
4. When prompted, **Review permissions** and **Allow**

This will:
- Create all required sheets with headers
- Set up default configuration

### Step 7: Set Up Triggers

1. Go back to your spreadsheet
2. Refresh the page
3. You should see a new menu: **📈 Portfolio**
4. Click **📈 Portfolio → ⚙️ Settings → 🕐 Setup Triggers**

This creates:
- Daily price update (6:00 PM IST)
- Weekly report generation (Sunday 8:00 AM)
- Log cleanup (2:00 AM daily)
- Error digest email (9:00 AM daily)

### Step 8: Configure Email (Optional)

1. Go to the **Config** sheet
2. Add a row: `OWNER_EMAIL` | `your-email@example.com` | `Email for notifications`

### Step 9: Deploy Web App (Optional)

1. In Apps Script, click **Deploy → New deployment**
2. Click the gear icon → **Web app**
3. Configure:
   - Description: "Portfolio Tracker v1.0"
   - Execute as: **Me**
   - Who has access: **Anyone** (or **Anyone with Google Account**)
4. Click **Deploy**
5. Copy the Web app URL

## 3. Initial Setup

### Adding Your First Category

1. Click **📈 Portfolio → 📦 Manage → 🏷️ Add Category**
2. Enter:
   - Name: "Large Cap"
   - Description: "Blue-chip companies"
3. Click **Add Category**

Repeat for other categories (Banking, IT, Pharma, etc.)

### Adding Your First Stock

1. Click **📈 Portfolio → 📦 Manage → ➕ Add Stock**
2. Fill in:
   - Stock Name: "HDFC Bank Ltd"
   - Symbol: "HDFCBANK"
   - Screener URL: `https://www.screener.in/company/HDFCBANK/`
   - Sector: "Banking"
   - Categories: Select "Large Cap", "Banking"
3. Click **Add Stock**

### Recording a Buy Transaction

1. Click **📈 Portfolio → 📝 Transactions → ➕ Add Buy Transaction**
2. Fill in:
   - Stock: Select your stock
   - Date: Transaction date
   - Quantity: Number of shares
   - Price: Price per share
   - Brokerage/STT/Other: Enter charges
3. Click **Record Buy**

### Recording a Sell Transaction

1. Click **📈 Portfolio → 📝 Transactions → ➖ Add Sell Transaction**
2. Select the stock
3. Note the available quantity
4. Enter sell details
5. Click **Record Sell**

FIFO allocation happens automatically.

## 4. Daily Operations

### Manual Price Refresh

Click **📈 Portfolio → 🔄 Refresh All Prices**

### Generate Reports

Click **📈 Portfolio → 📊 Generate Reports**

### View Web App

Click **📈 Portfolio → 🌐 Open Web App**

## 5. Troubleshooting

### "Authorization required" Error

1. Run `initializeAllSheets` manually from Apps Script
2. Review and approve permissions

### Prices Not Fetching

1. Check the **Logs** sheet for errors
2. Verify Screener URLs are correct
3. Ensure rate limits aren't exceeded (wait 1 hour)

### Triggers Not Running

1. Go to **Extensions → Apps Script → Triggers**
2. Verify triggers are listed
3. Check for failed executions

### "Cannot sell more than X shares" Error

- The FIFO system tracks exact quantities
- Check the **Holdings** sheet for available shares
- Ensure previous sells were recorded correctly

## 6. Backup & Recovery

### Export Data

1. **File → Download → Comma Separated Values (.csv)**
2. Or use **File → Make a copy** for full backup

### Restore from Backup

1. Create new spreadsheet from backup
2. Re-run `initializeAllSheets`
3. Re-setup triggers

## 7. Customization

### Change Price Fetch Schedule

1. Go to **Extensions → Apps Script → Triggers**
2. Edit the `dailyPriceUpdate` trigger
3. Change the time as needed

### Add Custom Columns

1. Add columns to the right of existing ones
2. Do NOT modify column positions of existing headers
3. Update `COLUMNS` in `Config.gs` if needed

### Adjust Rate Limits

Edit `Config.gs`:
```javascript
const SCREENER_CONFIG = {
  MIN_DELAY_MS: 3000,  // Increase to 3 seconds
  MAX_REQUESTS_PER_HOUR: 50  // Reduce to 50
};
```

## 8. Security Notes

- Screener URLs contain no sensitive data
- Transaction data stays in your Google account
- Web app can be restricted to specific users
- No external services store your data

## 9. Quota Limits

| Resource | Daily Limit | Your Usage |
|----------|-------------|------------|
| UrlFetch calls | 20,000 | ~100 per price refresh |
| Script runtime | 6 min/execution | ~1-2 min typical |
| Email | 100/day | 1-2 per day |
| Triggers | 20 | 4 used |

## 10. Support

For issues:
1. Check the **Logs** sheet
2. Review Apps Script execution logs
3. Verify configuration in **Config** sheet
