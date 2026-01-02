package com.stockanalyzer.analysis;

import com.stockanalyzer.models.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Performs comprehensive financial analysis on scraped data.
 */
public class FinancialAnalyzer {

    private FinancialData screenerData;
    private FinancialData tickertapeData;
    private FinancialData moneycontrolData;

    public FinancialAnalyzer() {
    }

    public void setData(FinancialData screener, FinancialData tickertape, FinancialData moneycontrol) {
        this.screenerData = screener != null ? screener : new FinancialData();
        this.tickertapeData = tickertape != null ? tickertape : new FinancialData();
        this.moneycontrolData = moneycontrol != null ? moneycontrol : new FinancialData();
    }

    public AnalysisResult analyze(String companyName) {
        AnalysisResult result = new AnalysisResult(companyName);

        // Calculate all metrics
        result.setOperatingMargin(calculateOperatingMargin());
        result.setSalesCagr(calculateSalesCagr());
        result.setRoce(getRoce());
        result.setRoe(getRoe());
        result.setPeRatio(getPeRatio());
        result.setPegRatio(getPegRatio());
        result.setDebtEquity(calculateDebtEquity());
        result.setEps(getEpsHistory());
        result.setStockPriceCagr(calculateStockPriceCagr());
        result.setMarketCap(getMarketCap());

        // FCF Valuation
        calculateFcfValuation(result);

        // Shareholding Analysis
        analyzeShareholding(result);

        // Peer Comparison
        result.setPeers(screenerData.getPeers());

        // Identify Signals
        identifySignals(result);

        // Generate Summary
        generateExecutiveSummary(result);

        return result;
    }

    private AnalysisResult.MetricResult calculateOperatingMargin() {
        AnalysisResult.MetricResult result = new AnalysisResult.MetricResult();

        // Get from ratios
        Double opm = getFirstAvailable("OPM", "Operating Margin");
        result.setCurrent(opm);

        // Calculate from P&L data
        Map<String, Double> sales = findMetricValues(screenerData.getProfitLoss(), "sales", "revenue", "net sales");
        Map<String, Double> opProfit = findMetricValues(screenerData.getProfitLoss(), "operating profit", "ebit");

        if (!sales.isEmpty() && !opProfit.isEmpty()) {
            List<Double> margins = new ArrayList<>();
            Map<String, Double> yearlyMargins = new LinkedHashMap<>();

            for (String year : sales.keySet()) {
                Double salesVal = sales.get(year);
                Double opVal = opProfit.get(year);
                if (salesVal != null && opVal != null && salesVal != 0) {
                    double margin = (opVal / salesVal) * 100;
                    yearlyMargins.put(year, margin);
                    margins.add(margin);
                }
            }

            result.setYearlyData(yearlyMargins);

            if (!margins.isEmpty()) {
                result.setAverage(margins.stream().mapToDouble(d -> d).average().orElse(0));

                // Determine trend
                if (margins.size() >= 3) {
                    double recentAvg = margins.subList(0, Math.min(3, margins.size())).stream()
                            .mapToDouble(d -> d).average().orElse(0);
                    double olderAvg = margins.subList(Math.max(0, margins.size() - 3), margins.size()).stream()
                            .mapToDouble(d -> d).average().orElse(0);

                    if (recentAvg > olderAvg * 1.1) {
                        result.setTrend("Improving");
                    } else if (recentAvg < olderAvg * 0.9) {
                        result.setTrend("Declining");
                    } else {
                        result.setTrend("Stable");
                    }
                }
            }
        }

        return result;
    }

    private AnalysisResult.MetricResult calculateSalesCagr() {
        AnalysisResult.MetricResult result = new AnalysisResult.MetricResult();

        Map<String, Double> sales = findMetricValues(screenerData.getProfitLoss(), "sales", "revenue", "net sales");
        if (sales.isEmpty()) return result;

        // Sort years in descending order
        List<String> years = new ArrayList<>(sales.keySet());
        years.sort((a, b) -> {
            try {
                return Integer.parseInt(b) - Integer.parseInt(a);
            } catch (NumberFormatException e) {
                return b.compareTo(a);
            }
        });

        if (years.size() < 2) return result;

        String latestYear = years.get(0);
        Double latestSales = sales.get(latestYear);

        // Calculate CAGR for different periods
        for (int period : new int[]{3, 5, 10}) {
            if (years.size() > period) {
                String startYear = years.get(period);
                Double startSales = sales.get(startYear);
                if (latestSales != null && startSales != null && startSales > 0) {
                    double cagr = calculateCagr(startSales, latestSales, period);
                    switch (period) {
                        case 3 -> result.setYear3(cagr);
                        case 5 -> result.setYear5(cagr);
                        case 10 -> result.setYear10(cagr);
                    }
                }
            }
        }

        // Calculate yearly growth
        Map<String, Double> yearlyGrowth = new LinkedHashMap<>();
        for (int i = 0; i < years.size() - 1; i++) {
            Double current = sales.get(years.get(i));
            Double prev = sales.get(years.get(i + 1));
            if (current != null && prev != null && prev != 0) {
                double growth = ((current - prev) / prev) * 100;
                yearlyGrowth.put(years.get(i), growth);
            }
        }
        result.setYearlyData(yearlyGrowth);

        return result;
    }

    private double calculateCagr(double startValue, double endValue, int years) {
        if (startValue <= 0 || years <= 0) return 0;
        return (Math.pow(endValue / startValue, 1.0 / years) - 1) * 100;
    }

    private AnalysisResult.MetricResult getRoce() {
        AnalysisResult.MetricResult result = new AnalysisResult.MetricResult();
        result.setCurrent(getFirstAvailable("ROCE"));
        return result;
    }

    private AnalysisResult.MetricResult getRoe() {
        AnalysisResult.MetricResult result = new AnalysisResult.MetricResult();
        result.setCurrent(getFirstAvailable("ROE"));
        return result;
    }

    private AnalysisResult.MetricResult getPeRatio() {
        AnalysisResult.MetricResult result = new AnalysisResult.MetricResult();
        result.setCurrent(getFirstAvailable("Stock PE", "PE Ratio", "P/E"));

        Double industryPe = getFirstAvailable("Industry PE", "Sector PE");

        // Assessment
        if (result.getCurrent() != null) {
            if (industryPe != null) {
                if (result.getCurrent() < industryPe * 0.8) {
                    result.setAssessment("Potentially Undervalued");
                } else if (result.getCurrent() > industryPe * 1.2) {
                    result.setAssessment("Potentially Overvalued");
                } else {
                    result.setAssessment("Fairly Valued");
                }
            } else {
                result.setAssessment("Fairly Valued");
            }
        }

        return result;
    }

    private AnalysisResult.MetricResult getPegRatio() {
        AnalysisResult.MetricResult result = new AnalysisResult.MetricResult();

        // Try from Tickertape
        result.setCurrent(getFirstAvailable("PEG Ratio", "PEG"));

        // Calculate if not available
        if (result.getCurrent() == null) {
            Double pe = getFirstAvailable("Stock PE", "PE Ratio");
            AnalysisResult.MetricResult salesCagr = calculateSalesCagr();
            Double growth = salesCagr.getYear3();

            if (pe != null && growth != null && growth > 0) {
                result.setCurrent(pe / growth);
            }
        }

        // Assessment
        if (result.getCurrent() != null) {
            if (result.getCurrent() < 1) {
                result.setAssessment("Undervalued relative to growth");
            } else if (result.getCurrent() > 2) {
                result.setAssessment("Overvalued relative to growth");
            } else {
                result.setAssessment("Fairly valued relative to growth");
            }
        }

        return result;
    }

    private AnalysisResult.MetricResult calculateDebtEquity() {
        AnalysisResult.MetricResult result = new AnalysisResult.MetricResult();

        result.setCurrent(getFirstAvailable("Debt to equity", "D/E", "Debt/Equity"));

        // Try calculating from balance sheet
        Map<String, Double> debt = findMetricValues(screenerData.getBalanceSheet(), "borrowing", "debt");
        Map<String, Double> equity = findMetricValues(screenerData.getBalanceSheet(), "equity");

        if (!debt.isEmpty() && !equity.isEmpty()) {
            List<Double> deValues = new ArrayList<>();
            Map<String, Double> yearlyDe = new LinkedHashMap<>();

            for (String year : debt.keySet()) {
                Double debtVal = debt.get(year);
                Double equityVal = equity.get(year);
                if (debtVal != null && equityVal != null && equityVal != 0) {
                    double de = debtVal / equityVal;
                    yearlyDe.put(year, de);
                    deValues.add(de);
                }
            }

            result.setYearlyData(yearlyDe);

            // Determine trend
            if (deValues.size() >= 2) {
                double recent = deValues.get(0);
                double older = deValues.get(deValues.size() - 1);
                if (recent > older * 1.2) {
                    result.setTrend("Increasing (Negative)");
                } else if (recent < older * 0.8) {
                    result.setTrend("Decreasing (Positive)");
                } else {
                    result.setTrend("Stable");
                }
            }
        }

        // Assessment
        if (result.getCurrent() != null) {
            if (result.getCurrent() < 0.5) {
                result.setAssessment("Conservative - Low leverage");
            } else if (result.getCurrent() < 1) {
                result.setAssessment("Moderate leverage");
            } else if (result.getCurrent() < 2) {
                result.setAssessment("High leverage - Monitor closely");
            } else {
                result.setAssessment("Very high leverage - Risk");
            }
        }

        return result;
    }

    private AnalysisResult.MetricResult getEpsHistory() {
        AnalysisResult.MetricResult result = new AnalysisResult.MetricResult();

        Map<String, Double> eps = findMetricValues(screenerData.getProfitLoss(), "eps");
        if (!eps.isEmpty()) {
            result.setYearlyData(eps);

            List<String> years = new ArrayList<>(eps.keySet());
            if (!years.isEmpty()) {
                result.setCurrent(eps.get(years.get(0)));

                // Calculate growth rate
                if (years.size() >= 5) {
                    Double startEps = eps.get(years.get(years.size() - 1));
                    Double endEps = eps.get(years.get(0));
                    if (startEps != null && endEps != null && startEps > 0) {
                        double growthRate = calculateCagr(startEps, endEps, years.size() - 1);
                        result.setYear5(growthRate);
                    }
                }
            }
        }

        // Fallback to Moneycontrol
        if (result.getCurrent() == null) {
            result.setCurrent(getFirstAvailable("EPS"));
        }

        return result;
    }

    private AnalysisResult.MetricResult calculateStockPriceCagr() {
        AnalysisResult.MetricResult result = new AnalysisResult.MetricResult();

        Map<String, Double> priceData = moneycontrolData.getPriceData();

        Double yr1Return = priceData.get("1 Year Return");
        if (yr1Return != null) {
            result.setCurrent(yr1Return);
        }

        Double yr3Return = priceData.get("3 Year Return");
        if (yr3Return != null) {
            result.setYear3(totalToCagr(yr3Return, 3));
        }

        Double yr5Return = priceData.get("5 Year Return");
        if (yr5Return != null) {
            result.setYear5(totalToCagr(yr5Return, 5));
        }

        return result;
    }

    private double totalToCagr(double totalReturnPct, int years) {
        if (years <= 0) return 0;
        double multiplier = 1 + (totalReturnPct / 100);
        return (Math.pow(multiplier, 1.0 / years) - 1) * 100;
    }

    private AnalysisResult.MetricResult getMarketCap() {
        AnalysisResult.MetricResult result = new AnalysisResult.MetricResult();
        result.setCurrent(getFirstAvailable("Market Cap"));

        if (result.getCurrent() != null) {
            if (result.getCurrent() >= 100000) {
                result.setAssessment("Large Cap (>₹1,00,000 Cr)");
            } else if (result.getCurrent() >= 20000) {
                result.setAssessment("Mid Cap (₹20,000-1,00,000 Cr)");
            } else {
                result.setAssessment("Small Cap (<₹20,000 Cr)");
            }
        }

        return result;
    }

    private void calculateFcfValuation(AnalysisResult result) {
        Map<String, Double> fcf = screenerData.getFreeCashFlow();
        if (fcf.isEmpty()) {
            fcf = tickertapeData.getFreeCashFlow();
        }

        if (fcf.isEmpty()) return;

        List<Double> fcfValues = new ArrayList<>(fcf.values());

        // Count negative FCF years
        int negativeYears = 0;
        for (Double val : fcfValues) {
            if (val != null && val < 0) {
                negativeYears++;
            }
        }
        result.setFcfNegativeYears(negativeYears);

        // Calculate 3-year average FCF
        List<Double> recent3 = fcfValues.stream()
                .filter(Objects::nonNull)
                .limit(3)
                .collect(Collectors.toList());

        if (!recent3.isEmpty()) {
            double avgFcf = recent3.stream().mapToDouble(d -> d).average().orElse(0);
            result.setAvgFcf3Year(avgFcf);

            // Valuation at 2% yield = FCF / 0.02
            result.setFcfValuation(avgFcf / 0.02);
        }

        result.setFcfHistory(fcf);

        // FCF Consistency assessment
        if (negativeYears == 0) {
            result.setFcfConsistency("Excellent - No negative FCF years");
        } else if (negativeYears <= 2) {
            result.setFcfConsistency("Good - Only " + negativeYears + " negative FCF year(s)");
        } else {
            result.setFcfConsistency("Concerning - " + negativeYears + " negative FCF years");
        }

        // Compare with market cap
        Double marketCap = getFirstAvailable("Market Cap");
        if (result.getFcfValuation() != null && marketCap != null && marketCap > 0) {
            double ratio = result.getFcfValuation() / marketCap;
            if (ratio > 1.5) {
                result.setFcfAssessment("Attractive - FCF valuation " + String.format("%.1f", ratio) + "x higher than market cap");
            } else if (ratio > 1) {
                result.setFcfAssessment("Fair - FCF valuation " + String.format("%.1f", ratio) + "x of market cap");
            } else if (ratio > 0.5) {
                result.setFcfAssessment("Expensive - FCF valuation only " + String.format("%.1f", ratio) + "x of market cap");
            } else {
                result.setFcfAssessment("Very Expensive - FCF valuation only " + String.format("%.1f", ratio) + "x of market cap");
            }
        }
    }

    private void analyzeShareholding(AnalysisResult result) {
        List<ShareholdingData> shareholding = screenerData.getShareholding();
        if (shareholding.isEmpty()) {
            shareholding = moneycontrolData.getShareholding();
        }

        if (shareholding.isEmpty()) {
            result.setShareholdingSummary("Shareholding data not available");
            return;
        }

        List<String> redFlags = new ArrayList<>();
        List<String> positives = new ArrayList<>();

        for (ShareholdingData sh : shareholding) {
            String holderType = sh.getHolderType().toLowerCase();
            Double current = sh.getLatestPercentage();
            Double change = sh.getChange(8); // ~2 years of quarterly data

            if (current != null) {
                result.getCurrentShareholding().put(sh.getHolderType(), current);
            }

            if (change != null) {
                result.getShareholdingChange().put(sh.getHolderType(), change);

                if (holderType.contains("promoter")) {
                    if (change < -5) {
                        redFlags.add("Promoter holding decreased by " + String.format("%.1f", Math.abs(change)) + "% over 2 years");
                    } else if (change > 2) {
                        positives.add("Promoter holding increased by " + String.format("%.1f", change) + "% over 2 years");
                    }
                } else if (holderType.contains("fii") || holderType.contains("foreign")) {
                    if (change > 5) {
                        positives.add("FII holding increased by " + String.format("%.1f", change) + "% - Institutional confidence");
                    } else if (change < -5) {
                        redFlags.add("FII holding decreased by " + String.format("%.1f", Math.abs(change)) + "%");
                    }
                } else if (holderType.contains("dii") || holderType.contains("domestic")) {
                    if (change > 3) {
                        positives.add("DII holding increased by " + String.format("%.1f", change) + "%");
                    }
                } else if (holderType.contains("public")) {
                    if (change > 10) {
                        redFlags.add("Public holding increased significantly by " + String.format("%.1f", change) + "% - Check for promoter selling");
                    }
                }
            }
        }

        // Generate summary
        if (!redFlags.isEmpty()) {
            result.setShareholdingSummary("Caution: " + String.join("; ", redFlags.subList(0, Math.min(2, redFlags.size()))));
            result.getRedFlags().addAll(redFlags);
        } else if (!positives.isEmpty()) {
            result.setShareholdingSummary("Positive: " + String.join("; ", positives.subList(0, Math.min(2, positives.size()))));
            result.getPositiveSignals().addAll(positives);
        } else {
            result.setShareholdingSummary("Shareholding pattern appears stable");
        }
    }

    private void identifySignals(AnalysisResult result) {
        // PE Ratio
        if (result.getPeRatio().getCurrent() != null) {
            double pe = result.getPeRatio().getCurrent();
            if (pe > 50) {
                result.addRedFlag("Very high PE ratio (" + String.format("%.1f", pe) + ") - Expensive valuation");
            } else if (pe < 10) {
                result.addPositiveSignal("Low PE ratio (" + String.format("%.1f", pe) + ") - Potentially undervalued");
            }
        }

        // Debt/Equity
        if (result.getDebtEquity().getCurrent() != null) {
            double de = result.getDebtEquity().getCurrent();
            if (de > 2) {
                result.addRedFlag("High Debt/Equity ratio (" + String.format("%.2f", de) + ") - Financial risk");
            } else if (de < 0.3) {
                result.addPositiveSignal("Low Debt/Equity ratio (" + String.format("%.2f", de) + ") - Strong balance sheet");
            }
        }

        // ROCE
        if (result.getRoce().getCurrent() != null) {
            double roce = result.getRoce().getCurrent();
            if (roce > 20) {
                result.addPositiveSignal("Strong ROCE (" + String.format("%.1f", roce) + "%) - Efficient capital use");
            } else if (roce < 10) {
                result.addRedFlag("Low ROCE (" + String.format("%.1f", roce) + "%) - Poor capital efficiency");
            }
        }

        // ROE
        if (result.getRoe().getCurrent() != null) {
            double roe = result.getRoe().getCurrent();
            if (roe > 20) {
                result.addPositiveSignal("Strong ROE (" + String.format("%.1f", roe) + "%) - Good shareholder returns");
            } else if (roe < 10) {
                result.addRedFlag("Low ROE (" + String.format("%.1f", roe) + "%)");
            }
        }

        // Sales Growth
        if (result.getSalesCagr().getYear5() != null) {
            double growth = result.getSalesCagr().getYear5();
            if (growth > 15) {
                result.addPositiveSignal("Strong 5-year sales CAGR (" + String.format("%.1f", growth) + "%)");
            } else if (growth < 5) {
                result.addRedFlag("Slow revenue growth (" + String.format("%.1f", growth) + "% 5Y CAGR)");
            }
        }

        // Operating Margin Trend
        if (result.getOperatingMargin().getTrend() != null) {
            if ("Declining".equals(result.getOperatingMargin().getTrend())) {
                result.addRedFlag("Declining operating margins");
            } else if ("Improving".equals(result.getOperatingMargin().getTrend())) {
                result.addPositiveSignal("Improving operating margins");
            }
        }
    }

    private void generateExecutiveSummary(AnalysisResult result) {
        StringBuilder summary = new StringBuilder();

        // Overall assessment
        int positiveCount = result.getPositiveSignals().size();
        int redFlagCount = result.getRedFlags().size();

        if (positiveCount > redFlagCount + 2) {
            summary.append("OVERALL: Stock shows strong fundamentals with multiple positive indicators.\n");
        } else if (redFlagCount > positiveCount + 2) {
            summary.append("OVERALL: Caution advised - Multiple concerns identified.\n");
        } else {
            summary.append("OVERALL: Mixed signals - Detailed analysis recommended.\n");
        }

        // Market Cap
        if (result.getMarketCap().getCurrent() != null) {
            summary.append(String.format("Market Cap: ₹%.0f Cr (%s)\n",
                    result.getMarketCap().getCurrent(),
                    result.getMarketCap().getAssessment()));
        }

        // PE Ratio
        if (result.getPeRatio().getCurrent() != null) {
            summary.append(String.format("PE Ratio: %.1f (%s)\n",
                    result.getPeRatio().getCurrent(),
                    result.getPeRatio().getAssessment()));
        }

        // FCF Valuation
        if (result.getFcfValuation() != null) {
            summary.append(String.format("FCF-based Valuation (at 2%% yield): ₹%.0f Cr\n", result.getFcfValuation()));
            if (result.getFcfAssessment() != null) {
                summary.append("  → ").append(result.getFcfAssessment()).append("\n");
            }
        }

        // Growth
        if (result.getSalesCagr().getYear5() != null) {
            summary.append(String.format("5-Year Revenue CAGR: %.1f%%\n", result.getSalesCagr().getYear5()));
        }

        result.setExecutiveSummary(summary.toString().trim());
    }

    // Helper methods
    private Double getFirstAvailable(String... keys) {
        for (String key : keys) {
            Double val = screenerData.getRatios().get(key);
            if (val != null) return val;

            val = tickertapeData.getRatios().get(key);
            if (val != null) return val;

            val = moneycontrolData.getRatios().get(key);
            if (val != null) return val;
        }
        return null;
    }

    private Map<String, Double> findMetricValues(Map<String, Map<String, Double>> data, String... keywords) {
        for (Map.Entry<String, Map<String, Double>> entry : data.entrySet()) {
            String key = entry.getKey().toLowerCase();
            for (String keyword : keywords) {
                if (key.contains(keyword.toLowerCase())) {
                    return entry.getValue();
                }
            }
        }
        return new HashMap<>();
    }
}
