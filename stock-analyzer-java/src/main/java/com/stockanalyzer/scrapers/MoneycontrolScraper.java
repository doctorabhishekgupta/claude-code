package com.stockanalyzer.scrapers;

import com.stockanalyzer.models.FinancialData;
import com.stockanalyzer.models.ShareholdingData;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Scraper for Moneycontrol.com financial data.
 */
public class MoneycontrolScraper extends BaseScraper {

    @Override
    public FinancialData scrape(String url) {
        // Ensure URL has proper format
        if (!url.startsWith("http")) {
            url = "https://www." + url;
        }

        Document doc = fetchPage(url);
        if (doc == null) {
            logger.warn("Failed to fetch Moneycontrol page: {}", url);
            return data;
        }

        extractCompanyName(doc);
        extractOverview(doc);
        extractKeyRatios(doc);
        extractFinancials(doc);
        extractShareholding(doc);
        extractPriceData(doc);

        return data;
    }

    private void extractCompanyName(Document doc) {
        Element nameElem = doc.selectFirst("h1.pcstname, h1");
        if (nameElem != null && data.getCompanyName() == null) {
            data.setCompanyName(nameElem.text().trim());
        }
    }

    private void extractOverview(Document doc) {
        // Current price
        Element priceElem = doc.selectFirst("div#nsecp, div#bsecp, span.nseprice, span.bseprice");
        if (priceElem != null) {
            Double price = cleanNumber(priceElem.text());
            if (price != null) {
                data.addRatio("Current Price", price);
            }
        }

        // Extract common metrics
        Map<String, String> metricPatterns = Map.of(
                "Market Cap", "Market Cap",
                "52 Week High", "52.*High",
                "52 Week Low", "52.*Low",
                "Book Value", "Book Value",
                "Face Value", "Face Value",
                "PE Ratio", "P/E",
                "Dividend Yield", "Dividend Yield",
                "EPS", "\\bEPS\\b",
                "Industry PE", "Industry P/E|Sector P/E"
        );

        for (Map.Entry<String, String> entry : metricPatterns.entrySet()) {
            extractMetric(doc, entry.getValue(), entry.getKey());
        }
    }

    private void extractMetric(Document doc, String searchPattern, String ratioName) {
        Pattern pattern = Pattern.compile(searchPattern, Pattern.CASE_INSENSITIVE);
        Elements elements = doc.getElementsMatchingOwnText(pattern);

        for (Element elem : elements) {
            Element parent = elem.parent();
            if (parent != null) {
                Element valueElem = parent.selectFirst("td, span, div");
                if (valueElem != null && !valueElem.equals(elem)) {
                    Double value = ratioName.contains("Cap") ?
                            parseCroreValue(valueElem.text()) :
                            cleanNumber(valueElem.text());
                    if (value != null) {
                        data.addRatio(ratioName, value);
                        return;
                    }
                }

                // Try next sibling
                Element sibling = elem.nextElementSibling();
                if (sibling != null) {
                    Double value = ratioName.contains("Cap") ?
                            parseCroreValue(sibling.text()) :
                            cleanNumber(sibling.text());
                    if (value != null) {
                        data.addRatio(ratioName, value);
                        return;
                    }
                }
            }
        }
    }

    private void extractKeyRatios(Document doc) {
        // Find ratio tables
        Elements ratioTables = doc.select("table.mctable, table.data, table[class*=ratio]");
        for (Element table : ratioTables) {
            for (Element row : table.select("tr")) {
                Elements cells = row.select("td, th");
                if (cells.size() >= 2) {
                    String label = cells.get(0).text().trim();
                    Double value = cleanNumber(cells.get(1).text());
                    if (value != null && !label.isEmpty()) {
                        data.addRatio(label, value);
                    }
                }
            }
        }

        // Also look for key metrics in specific divs
        Elements ratioDivs = doc.select("div[class*=ratio], div[class*=key-metric]");
        for (Element div : ratioDivs) {
            Element labelElem = div.selectFirst("span[class*=name], div[class*=label]");
            Element valueElem = div.selectFirst("span[class*=value], div[class*=number]");
            if (labelElem != null && valueElem != null) {
                String label = labelElem.text().trim();
                Double value = cleanNumber(valueElem.text());
                if (value != null) {
                    data.addRatio(label, value);
                }
            }
        }
    }

    private void extractFinancials(Document doc) {
        // Find financial tables
        Elements tables = doc.select("table");
        for (Element table : tables) {
            Element header = table.previousElementSibling();
            if (header == null) {
                header = table.parent().selectFirst("h2, h3, h4");
            }

            if (header != null) {
                String headerText = header.text().toLowerCase();
                if (headerText.contains("profit") || headerText.contains("loss") || headerText.contains("income")) {
                    parseFinancialTable(table, "profitLoss");
                } else if (headerText.contains("balance")) {
                    parseFinancialTable(table, "balanceSheet");
                } else if (headerText.contains("cash")) {
                    parseFinancialTable(table, "cashFlow");
                }
            }
        }
    }

    private void parseFinancialTable(Element table, String dataType) {
        // Get headers
        java.util.List<String> headers = new java.util.ArrayList<>();
        Element thead = table.selectFirst("thead");
        if (thead != null) {
            for (Element th : thead.select("th, td")) {
                headers.add(th.text().trim());
            }
        }

        // If no thead, try first row
        if (headers.isEmpty()) {
            Element firstRow = table.selectFirst("tr");
            if (firstRow != null) {
                for (Element cell : firstRow.select("th, td")) {
                    headers.add(cell.text().trim());
                }
            }
        }

        // Parse data rows
        Elements rows = table.select("tr");
        int startIdx = headers.isEmpty() ? 0 : 1;

        for (int i = startIdx; i < rows.size(); i++) {
            Elements cells = rows.get(i).select("td, th");
            if (cells.isEmpty()) continue;

            String metric = cells.first().text().trim();
            Map<String, Double> values = new LinkedHashMap<>();

            for (int j = 1; j < cells.size(); j++) {
                String headerKey = j < headers.size() ? headers.get(j) : "Col" + j;
                Double value = cleanNumber(cells.get(j).text());
                if (value != null) {
                    values.put(headerKey, value);
                }
            }

            if (!values.isEmpty()) {
                switch (dataType) {
                    case "profitLoss":
                        data.addProfitLossMetric(metric, values);
                        break;
                    case "balanceSheet":
                        data.addBalanceSheetMetric(metric, values);
                        break;
                    case "cashFlow":
                        data.addCashFlowMetric(metric, values);
                        break;
                }
            }
        }
    }

    private void extractShareholding(Document doc) {
        Element shSection = doc.selectFirst("section[id*=shareholding], div[id*=shareholding], div[class*=shareholding]");
        if (shSection == null) return;

        Element table = shSection.selectFirst("table");
        if (table == null) return;

        // Get headers
        java.util.List<String> headers = new java.util.ArrayList<>();
        Element thead = table.selectFirst("thead");
        if (thead != null) {
            for (Element th : thead.select("th, td")) {
                headers.add(th.text().trim());
            }
        }

        Element tbody = table.selectFirst("tbody");
        if (tbody == null) tbody = table;

        for (Element row : tbody.select("tr")) {
            Elements cells = row.select("td, th");
            if (cells.isEmpty()) continue;

            String holderType = cells.first().text().trim();
            ShareholdingData shData = new ShareholdingData(holderType);

            for (int i = 1; i < cells.size(); i++) {
                String header = i < headers.size() ? headers.get(i) : "Q" + i;
                Double value = cleanNumber(cells.get(i).text());
                if (value != null) {
                    shData.addPercentage(header, value);
                }
            }

            if (!shData.getPercentages().isEmpty()) {
                data.addShareholding(shData);
            }
        }
    }

    private void extractPriceData(Document doc) {
        // Try to extract returns data
        Map<String, String> returnPatterns = Map.of(
                "1 Year Return", "1.*Year.*Return|52.*Week.*Return",
                "3 Year Return", "3.*Year.*Return",
                "5 Year Return", "5.*Year.*Return"
        );

        for (Map.Entry<String, String> entry : returnPatterns.entrySet()) {
            Pattern pattern = Pattern.compile(entry.getValue(), Pattern.CASE_INSENSITIVE);
            Elements elements = doc.getElementsMatchingOwnText(pattern);

            for (Element elem : elements) {
                Element parent = elem.parent();
                if (parent != null) {
                    Element valueElem = parent.selectFirst("td, span, div");
                    if (valueElem != null && !valueElem.equals(elem)) {
                        Double value = cleanNumber(valueElem.text());
                        if (value != null) {
                            data.addPriceData(entry.getKey(), value);
                            break;
                        }
                    }
                }
            }
        }

        // Also try to find in script data
        Elements scripts = doc.select("script");
        for (Element script : scripts) {
            String content = script.data();
            if (content != null && content.contains("priceData")) {
                Pattern pattern = Pattern.compile("priceData\\s*[=:]\\s*\\[(.*?)\\]", Pattern.DOTALL);
                Matcher matcher = pattern.matcher(content);
                if (matcher.find()) {
                    // Found price data - could parse if needed
                    logger.debug("Found price data in script");
                }
            }
        }
    }
}
