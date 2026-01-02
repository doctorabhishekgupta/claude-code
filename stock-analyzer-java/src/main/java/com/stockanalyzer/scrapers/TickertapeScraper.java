package com.stockanalyzer.scrapers;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.stockanalyzer.models.FinancialData;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Scraper for Tickertape.in financial data.
 */
public class TickertapeScraper extends BaseScraper {

    @Override
    public FinancialData scrape(String url) {
        Document doc = fetchPage(url);
        if (doc == null) {
            logger.warn("Failed to fetch Tickertape.in page: {}", url);
            return data;
        }

        extractCompanyName(doc);
        extractOverview(doc);
        extractJsonData(doc);
        extractValuation(doc);
        extractGrowth(doc);
        extractCashFlowData(doc, url);

        return data;
    }

    private void extractCompanyName(Document doc) {
        Element nameElem = doc.selectFirst("h1[class*=security-name], h1[class*=stock-name], h1");
        if (nameElem != null && data.getCompanyName() == null) {
            data.setCompanyName(nameElem.text().trim());
        }
    }

    private void extractOverview(Document doc) {
        // Market price
        Element priceElem = doc.selectFirst("span[class*=current-price], span[class*=price]");
        if (priceElem != null) {
            Double price = cleanNumber(priceElem.text());
            if (price != null) {
                data.addRatio("Current Price", price);
            }
        }

        // Extract metrics from cards/sections
        Elements metricCards = doc.select("div[class*=metric], div[class*=stat], span[class*=info-item]");
        for (Element card : metricCards) {
            Element labelElem = card.selectFirst("span[class*=label], div[class*=title], span[class*=name]");
            Element valueElem = card.selectFirst("span[class*=value], div[class*=number]");
            if (labelElem != null && valueElem != null) {
                String label = labelElem.text().trim();
                Double value = cleanNumber(valueElem.text());
                if (value != null) {
                    data.addRatio(label, value);
                }
            }
        }

        // Extract from definition lists
        Elements dlElements = doc.select("dl");
        for (Element dl : dlElements) {
            Elements dts = dl.select("dt");
            Elements dds = dl.select("dd");
            for (int i = 0; i < Math.min(dts.size(), dds.size()); i++) {
                String label = dts.get(i).text().trim();
                Double value = cleanNumber(dds.get(i).text());
                if (value != null) {
                    data.addRatio(label, value);
                }
            }
        }
    }

    private void extractJsonData(Document doc) {
        // Look for JSON data in script tags
        Elements scripts = doc.select("script[type=application/json], script");
        for (Element script : scripts) {
            String content = script.data();
            if (content == null || content.isEmpty()) continue;

            // Try to find __INITIAL_STATE__ or similar
            Pattern pattern = Pattern.compile("window\\.__INITIAL_STATE__\\s*=\\s*(\\{.*?\\});", Pattern.DOTALL);
            Matcher matcher = pattern.matcher(content);
            if (matcher.find()) {
                try {
                    parseJsonFinancialData(JsonParser.parseString(matcher.group(1)).getAsJsonObject());
                } catch (Exception e) {
                    logger.debug("Failed to parse JSON state: {}", e.getMessage());
                }
            }

            // Also try parsing direct JSON
            if (content.trim().startsWith("{")) {
                try {
                    parseJsonFinancialData(JsonParser.parseString(content).getAsJsonObject());
                } catch (Exception e) {
                    // Not valid JSON, skip
                }
            }
        }
    }

    private void parseJsonFinancialData(JsonObject jsonData) {
        if (jsonData == null) return;

        // Look for cash flow data
        if (jsonData.has("cashFlow")) {
            extractFcfFromJson(jsonData.getAsJsonObject("cashFlow"));
        }
        if (jsonData.has("cash_flow")) {
            extractFcfFromJson(jsonData.getAsJsonObject("cash_flow"));
        }

        // Look for ratios
        if (jsonData.has("ratios")) {
            JsonObject ratios = jsonData.getAsJsonObject("ratios");
            for (String key : ratios.keySet()) {
                JsonElement elem = ratios.get(key);
                if (elem.isJsonPrimitive() && elem.getAsJsonPrimitive().isNumber()) {
                    data.addRatio(key, elem.getAsDouble());
                }
            }
        }

        // Recursively search nested objects
        for (String key : jsonData.keySet()) {
            JsonElement elem = jsonData.get(key);
            if (elem.isJsonObject()) {
                parseJsonFinancialData(elem.getAsJsonObject());
            } else if (elem.isJsonArray()) {
                JsonArray arr = elem.getAsJsonArray();
                for (JsonElement item : arr) {
                    if (item.isJsonObject()) {
                        parseJsonFinancialData(item.getAsJsonObject());
                    }
                }
            }
        }
    }

    private void extractFcfFromJson(JsonObject cfData) {
        if (cfData == null) return;

        Map<String, Double> fcfValues = new LinkedHashMap<>();

        // Look for yearly FCF data
        if (cfData.has("yearly")) {
            JsonArray yearly = cfData.getAsJsonArray("yearly");
            for (JsonElement elem : yearly) {
                if (elem.isJsonObject()) {
                    JsonObject yearData = elem.getAsJsonObject();
                    String year = yearData.has("year") ? yearData.get("year").getAsString() : null;
                    Double fcf = null;
                    if (yearData.has("fcf")) {
                        fcf = yearData.get("fcf").getAsDouble();
                    } else if (yearData.has("freeCashFlow")) {
                        fcf = yearData.get("freeCashFlow").getAsDouble();
                    }
                    if (year != null && fcf != null) {
                        fcfValues.put(year, fcf);
                    }
                }
            }
        }

        if (!fcfValues.isEmpty()) {
            data.addCashFlowMetric("Free Cash Flow", fcfValues);
        }
    }

    private void extractValuation(Document doc) {
        Map<String, Pattern> patterns = Map.of(
                "PE Ratio", Pattern.compile("P/E|PE\\s*Ratio", Pattern.CASE_INSENSITIVE),
                "PB Ratio", Pattern.compile("P/B|PB\\s*Ratio", Pattern.CASE_INSENSITIVE),
                "PEG Ratio", Pattern.compile("PEG", Pattern.CASE_INSENSITIVE),
                "EV/EBITDA", Pattern.compile("EV/EBITDA", Pattern.CASE_INSENSITIVE),
                "Dividend Yield", Pattern.compile("Dividend\\s*Yield", Pattern.CASE_INSENSITIVE)
        );

        for (Map.Entry<String, Pattern> entry : patterns.entrySet()) {
            Elements elements = doc.getElementsMatchingOwnText(entry.getValue());
            for (Element elem : elements) {
                Element parent = elem.parent();
                if (parent != null) {
                    Element valueElem = parent.selectFirst("span[class*=value], div[class*=number]");
                    if (valueElem != null) {
                        Double value = cleanNumber(valueElem.text());
                        if (value != null) {
                            data.addRatio(entry.getKey(), value);
                            break;
                        }
                    }
                }
            }
        }

        // Also check tables
        Elements tables = doc.select("table");
        for (Element table : tables) {
            for (Element row : table.select("tr")) {
                Elements cells = row.select("td, th");
                if (cells.size() >= 2) {
                    String label = cells.get(0).text().trim();
                    for (Map.Entry<String, Pattern> entry : patterns.entrySet()) {
                        if (entry.getValue().matcher(label).find()) {
                            Double value = cleanNumber(cells.get(1).text());
                            if (value != null) {
                                data.addRatio(entry.getKey(), value);
                            }
                        }
                    }
                }
            }
        }
    }

    private void extractGrowth(Document doc) {
        Map<String, Pattern> patterns = Map.of(
                "Revenue Growth", Pattern.compile("Revenue\\s*Growth|Sales\\s*Growth", Pattern.CASE_INSENSITIVE),
                "Profit Growth", Pattern.compile("Profit\\s*Growth|PAT\\s*Growth", Pattern.CASE_INSENSITIVE),
                "EPS Growth", Pattern.compile("EPS\\s*Growth", Pattern.CASE_INSENSITIVE),
                "3Y Revenue CAGR", Pattern.compile("3.*Revenue.*CAGR|Revenue.*3.*CAGR", Pattern.CASE_INSENSITIVE),
                "5Y Revenue CAGR", Pattern.compile("5.*Revenue.*CAGR|Revenue.*5.*CAGR", Pattern.CASE_INSENSITIVE)
        );

        for (Map.Entry<String, Pattern> entry : patterns.entrySet()) {
            Elements elements = doc.getElementsMatchingOwnText(entry.getValue());
            for (Element elem : elements) {
                Element parent = elem.parent();
                if (parent != null) {
                    Element valueElem = parent.selectFirst("span[class*=value], div[class*=number]");
                    if (valueElem != null) {
                        Double value = cleanNumber(valueElem.text());
                        if (value != null) {
                            data.addRatio(entry.getKey(), value);
                            break;
                        }
                    }
                }
            }
        }
    }

    private void extractCashFlowData(Document doc, String baseUrl) {
        // Try to find cash flow section on main page
        Element cfSection = doc.selectFirst("section[id*=cash-flow], div[id*=cash-flow]");
        if (cfSection != null) {
            parseCashFlowTable(cfSection);
            return;
        }

        // Try to fetch cash flow sub-page
        if (baseUrl.contains("/stocks/")) {
            String cfUrl = baseUrl.replaceAll("/$", "") + "/financials?checklist=basic&statement=cashflow";
            Document cfDoc = fetchPage(cfUrl);
            if (cfDoc != null) {
                parseCashFlowPage(cfDoc);
            }
        }
    }

    private void parseCashFlowTable(Element section) {
        Element table = section.selectFirst("table");
        if (table == null) return;

        for (Element row : table.select("tr")) {
            Elements cells = row.select("td, th");
            if (cells.isEmpty()) continue;

            String metric = cells.first().text().toLowerCase();
            if (metric.contains("free cash flow") || metric.equals("fcf")) {
                Map<String, Double> fcfValues = new LinkedHashMap<>();
                for (int i = 1; i < cells.size(); i++) {
                    Double value = cleanNumber(cells.get(i).text());
                    if (value != null) {
                        fcfValues.put("Year" + i, value);
                    }
                }
                if (!fcfValues.isEmpty()) {
                    data.addCashFlowMetric("Free Cash Flow", fcfValues);
                }
            }
        }
    }

    private void parseCashFlowPage(Document doc) {
        Elements tables = doc.select("table");
        for (Element table : tables) {
            for (Element row : table.select("tr")) {
                Elements cells = row.select("td, th");
                if (cells.size() > 1) {
                    String metric = cells.first().text().toLowerCase();
                    if (metric.contains("free cash flow") || metric.equals("fcf")) {
                        Map<String, Double> fcfValues = new LinkedHashMap<>();
                        for (int i = 1; i < cells.size(); i++) {
                            Double value = cleanNumber(cells.get(i).text());
                            if (value != null) {
                                fcfValues.put("Year" + i, value);
                            }
                        }
                        if (!fcfValues.isEmpty()) {
                            data.addCashFlowMetric("Free Cash Flow", fcfValues);
                        }
                    }
                }
            }
        }
    }
}
