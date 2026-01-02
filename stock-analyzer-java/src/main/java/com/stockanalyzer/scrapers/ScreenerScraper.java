package com.stockanalyzer.scrapers;

import com.stockanalyzer.models.FinancialData;
import com.stockanalyzer.models.PeerData;
import com.stockanalyzer.models.ShareholdingData;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.util.*;

/**
 * Scraper for Screener.in financial data.
 */
public class ScreenerScraper extends BaseScraper {

    @Override
    public FinancialData scrape(String url) {
        Document doc = fetchPage(url);
        if (doc == null) {
            logger.warn("Failed to fetch Screener.in page: {}", url);
            return data;
        }

        extractCompanyName(doc);
        extractKeyRatios(doc);
        extractProfitLoss(doc);
        extractBalanceSheet(doc);
        extractCashFlow(doc);
        extractShareholding(doc);
        extractPeers(doc);

        return data;
    }

    private void extractCompanyName(Document doc) {
        Element nameElem = doc.selectFirst("h1.margin-0, h1");
        if (nameElem != null) {
            data.setCompanyName(nameElem.text().trim());
        }
    }

    private void extractKeyRatios(Document doc) {
        // Extract from top-ratios section
        Element ratioList = doc.selectFirst("ul#top-ratios");
        if (ratioList != null) {
            for (Element item : ratioList.select("li")) {
                Element nameElem = item.selectFirst("span.name");
                Element valueElem = item.selectFirst("span.number");
                if (nameElem != null && valueElem != null) {
                    Double value = cleanNumber(valueElem.text());
                    if (value != null) {
                        data.addRatio(nameElem.text().trim(), value);
                    }
                }
            }
        }

        // Extract specific metrics
        extractSpecificRatio(doc, "Market Cap", "Market Cap");
        extractSpecificRatio(doc, "Stock P/E", "Stock PE");
        extractSpecificRatio(doc, "ROCE", "ROCE");
        extractSpecificRatio(doc, "ROE", "ROE");
        extractSpecificRatio(doc, "Book Value", "Book Value");
        extractSpecificRatio(doc, "Debt to equity", "Debt to equity");

        // Current price
        Element priceElem = doc.selectFirst("span.current-price, #quote-top .price");
        if (priceElem != null) {
            Double price = cleanNumber(priceElem.text());
            if (price != null) {
                data.addRatio("Current Price", price);
            }
        }
    }

    private void extractSpecificRatio(Document doc, String searchText, String ratioName) {
        Elements elements = doc.getElementsContainingOwnText(searchText);
        for (Element elem : elements) {
            Element parent = elem.parent();
            if (parent != null) {
                Element valueElem = parent.selectFirst("span.number, .value");
                if (valueElem != null) {
                    Double value = cleanNumber(valueElem.text());
                    if (value != null) {
                        data.addRatio(ratioName, value);
                        return;
                    }
                }
            }
        }
    }

    private void extractProfitLoss(Document doc) {
        extractTableData(doc, "profit-loss", "profitLoss");
    }

    private void extractBalanceSheet(Document doc) {
        extractTableData(doc, "balance-sheet", "balanceSheet");
    }

    private void extractCashFlow(Document doc) {
        extractTableData(doc, "cash-flow", "cashFlow");
    }

    private void extractTableData(Document doc, String sectionId, String dataType) {
        Element section = doc.selectFirst("section#" + sectionId);
        if (section == null) {
            section = doc.selectFirst("section[data-result-table=" + sectionId + "]");
        }
        if (section == null) return;

        Element table = section.selectFirst("table");
        if (table == null) return;

        // Get headers (years)
        List<String> headers = new ArrayList<>();
        Element thead = table.selectFirst("thead");
        if (thead != null) {
            for (Element th : thead.select("th")) {
                headers.add(th.text().trim());
            }
        }

        // Get data rows
        Element tbody = table.selectFirst("tbody");
        if (tbody == null) tbody = table;

        for (Element row : tbody.select("tr")) {
            Elements cells = row.select("td, th");
            if (cells.isEmpty()) continue;

            String metric = cells.first().text().trim();
            Map<String, Double> values = new LinkedHashMap<>();

            for (int i = 1; i < cells.size() && i < headers.size(); i++) {
                Double value = cleanNumber(cells.get(i).text());
                if (value != null) {
                    values.put(headers.get(i), value);
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
        Element section = doc.selectFirst("section#shareholding");
        if (section == null) return;

        Element table = section.selectFirst("table");
        if (table == null) return;

        // Get headers (quarters)
        List<String> headers = new ArrayList<>();
        Element thead = table.selectFirst("thead");
        if (thead != null) {
            for (Element th : thead.select("th")) {
                headers.add(th.text().trim());
            }
        }

        // Get shareholding data
        Element tbody = table.selectFirst("tbody");
        if (tbody == null) tbody = table;

        for (Element row : tbody.select("tr")) {
            Elements cells = row.select("td, th");
            if (cells.isEmpty()) continue;

            String holderType = cells.first().text().trim();
            ShareholdingData shData = new ShareholdingData(holderType);

            for (int i = 1; i < cells.size() && i < headers.size(); i++) {
                Double value = cleanNumber(cells.get(i).text());
                if (value != null) {
                    shData.addPercentage(headers.get(i), value);
                }
            }

            if (!shData.getPercentages().isEmpty()) {
                data.addShareholding(shData);
            }
        }
    }

    private void extractPeers(Document doc) {
        Element section = doc.selectFirst("section#peers, section[id*=peer]");
        if (section == null) return;

        Element table = section.selectFirst("table");
        if (table == null) return;

        // Get headers
        List<String> headers = new ArrayList<>();
        Element thead = table.selectFirst("thead");
        if (thead != null) {
            for (Element th : thead.select("th")) {
                headers.add(th.text().trim().toLowerCase());
            }
        }

        // Get peer data
        Element tbody = table.selectFirst("tbody");
        if (tbody == null) tbody = table;

        for (Element row : tbody.select("tr")) {
            Elements cells = row.select("td, th");
            if (cells.isEmpty()) continue;

            PeerData peer = new PeerData();

            for (int i = 0; i < cells.size() && i < headers.size(); i++) {
                String header = headers.get(i);
                String cellText = cells.get(i).text().trim();

                if (header.contains("name") || header.contains("s.no") || i == 0) {
                    // Check if first cell contains a link with company name
                    Element link = cells.get(i).selectFirst("a");
                    peer.setName(link != null ? link.text().trim() : cellText);
                } else if (header.contains("cmp") || header.contains("price")) {
                    peer.setCurrentPrice(cleanNumber(cellText));
                } else if (header.contains("p/e") || header.contains("pe")) {
                    peer.setPeRatio(cleanNumber(cellText));
                } else if (header.contains("mar cap") || header.contains("market cap")) {
                    peer.setMarketCap(cleanNumber(cellText));
                } else if (header.contains("roce")) {
                    peer.setRoce(cleanNumber(cellText));
                } else if (header.contains("roe")) {
                    peer.setRoe(cleanNumber(cellText));
                }
            }

            if (peer.getName() != null && !peer.getName().isEmpty()) {
                data.addPeer(peer);
            }
        }
    }
}
