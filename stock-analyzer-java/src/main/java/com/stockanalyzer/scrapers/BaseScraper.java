package com.stockanalyzer.scrapers;

import com.stockanalyzer.models.FinancialData;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Base class for all financial data scrapers.
 */
public abstract class BaseScraper {
    protected static final Logger logger = LoggerFactory.getLogger(BaseScraper.class);

    protected static final String USER_AGENT =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    protected static final int TIMEOUT_MS = 30000;
    protected static final int MAX_RETRIES = 3;

    protected FinancialData data;

    public BaseScraper() {
        this.data = new FinancialData();
    }

    /**
     * Fetch and parse a web page with retry logic.
     */
    protected Document fetchPage(String url) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                // Add small random delay to avoid rate limiting
                Thread.sleep(500 + new Random().nextInt(1000));

                Document doc = Jsoup.connect(url)
                        .userAgent(USER_AGENT)
                        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                        .header("Accept-Language", "en-US,en;q=0.5")
                        .timeout(TIMEOUT_MS)
                        .get();

                return doc;

            } catch (IOException e) {
                logger.warn("Attempt {} failed for {}: {}", attempt, url, e.getMessage());
                if (attempt < MAX_RETRIES) {
                    try {
                        Thread.sleep((long) Math.pow(2, attempt) * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logger.error("Thread interrupted while fetching {}", url);
            }
        }
        return null;
    }

    /**
     * Clean and convert a string number to Double.
     */
    protected Double cleanNumber(String value) {
        if (value == null || value.trim().isEmpty() ||
            value.equals("-") || value.equalsIgnoreCase("N/A") || value.equalsIgnoreCase("NA")) {
            return null;
        }

        try {
            // Remove commas, percentage signs, currency symbols, and whitespace
            String cleaned = value.trim()
                    .replace(",", "")
                    .replace("%", "")
                    .replace("₹", "")
                    .replace("Cr", "")
                    .replace("cr", "")
                    .replace("Rs.", "")
                    .replace("Rs", "")
                    .trim();

            // Handle negative numbers in parentheses
            if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
                cleaned = "-" + cleaned.substring(1, cleaned.length() - 1);
            }

            return Double.parseDouble(cleaned);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Parse values with Cr (Crores) or L (Lakhs) suffix.
     */
    protected Double parseCroreValue(String value) {
        if (value == null) return null;

        String upper = value.toUpperCase().trim();
        double multiplier = 1.0;

        if (upper.contains("CR")) {
            upper = upper.replace("CR", "");
        } else if (upper.contains("LAKH") || upper.contains("LAC") || upper.contains("L")) {
            upper = upper.replaceAll("LAKH|LAC|L", "");
            multiplier = 0.01; // Convert lakhs to crores
        } else if (upper.contains("K")) {
            upper = upper.replace("K", "");
            multiplier = 0.00001; // Convert thousands to crores
        }

        Double num = cleanNumber(upper);
        return num != null ? num * multiplier : null;
    }

    /**
     * Extract number from text using regex.
     */
    protected Double extractNumber(String text) {
        if (text == null) return null;

        Pattern pattern = Pattern.compile("-?[\\d,]+\\.?\\d*");
        Matcher matcher = pattern.matcher(text.replace(",", ""));

        if (matcher.find()) {
            try {
                return Double.parseDouble(matcher.group());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Abstract method to scrape data from a URL.
     */
    public abstract FinancialData scrape(String url);

    /**
     * Get the scraped data.
     */
    public FinancialData getData() {
        return data;
    }
}
