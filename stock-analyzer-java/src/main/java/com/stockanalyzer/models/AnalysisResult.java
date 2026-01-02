package com.stockanalyzer.models;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Contains all analysis results for a stock.
 */
public class AnalysisResult {
    private String companyName;
    private String analysisDate;

    // Key Metrics
    private MetricResult operatingMargin;
    private MetricResult salesCagr;
    private MetricResult roce;
    private MetricResult roe;
    private MetricResult peRatio;
    private MetricResult pegRatio;
    private MetricResult debtEquity;
    private MetricResult eps;
    private MetricResult stockPriceCagr;
    private MetricResult marketCap;

    // FCF Valuation
    private Double avgFcf3Year;
    private Double fcfValuation;
    private Integer fcfNegativeYears;
    private String fcfConsistency;
    private String fcfAssessment;
    private Map<String, Double> fcfHistory = new LinkedHashMap<>();

    // Shareholding
    private Map<String, Double> currentShareholding = new LinkedHashMap<>();
    private Map<String, Double> shareholdingChange = new LinkedHashMap<>();
    private String shareholdingSummary;

    // Peers
    private List<PeerData> peers = new ArrayList<>();

    // Signals
    private List<String> redFlags = new ArrayList<>();
    private List<String> positiveSignals = new ArrayList<>();

    // Summary
    private String executiveSummary;

    public AnalysisResult(String companyName) {
        this.companyName = companyName;
        this.analysisDate = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
    }

    // Getters and Setters
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getAnalysisDate() { return analysisDate; }

    public MetricResult getOperatingMargin() { return operatingMargin; }
    public void setOperatingMargin(MetricResult operatingMargin) { this.operatingMargin = operatingMargin; }

    public MetricResult getSalesCagr() { return salesCagr; }
    public void setSalesCagr(MetricResult salesCagr) { this.salesCagr = salesCagr; }

    public MetricResult getRoce() { return roce; }
    public void setRoce(MetricResult roce) { this.roce = roce; }

    public MetricResult getRoe() { return roe; }
    public void setRoe(MetricResult roe) { this.roe = roe; }

    public MetricResult getPeRatio() { return peRatio; }
    public void setPeRatio(MetricResult peRatio) { this.peRatio = peRatio; }

    public MetricResult getPegRatio() { return pegRatio; }
    public void setPegRatio(MetricResult pegRatio) { this.pegRatio = pegRatio; }

    public MetricResult getDebtEquity() { return debtEquity; }
    public void setDebtEquity(MetricResult debtEquity) { this.debtEquity = debtEquity; }

    public MetricResult getEps() { return eps; }
    public void setEps(MetricResult eps) { this.eps = eps; }

    public MetricResult getStockPriceCagr() { return stockPriceCagr; }
    public void setStockPriceCagr(MetricResult stockPriceCagr) { this.stockPriceCagr = stockPriceCagr; }

    public MetricResult getMarketCap() { return marketCap; }
    public void setMarketCap(MetricResult marketCap) { this.marketCap = marketCap; }

    public Double getAvgFcf3Year() { return avgFcf3Year; }
    public void setAvgFcf3Year(Double avgFcf3Year) { this.avgFcf3Year = avgFcf3Year; }

    public Double getFcfValuation() { return fcfValuation; }
    public void setFcfValuation(Double fcfValuation) { this.fcfValuation = fcfValuation; }

    public Integer getFcfNegativeYears() { return fcfNegativeYears; }
    public void setFcfNegativeYears(Integer fcfNegativeYears) { this.fcfNegativeYears = fcfNegativeYears; }

    public String getFcfConsistency() { return fcfConsistency; }
    public void setFcfConsistency(String fcfConsistency) { this.fcfConsistency = fcfConsistency; }

    public String getFcfAssessment() { return fcfAssessment; }
    public void setFcfAssessment(String fcfAssessment) { this.fcfAssessment = fcfAssessment; }

    public Map<String, Double> getFcfHistory() { return fcfHistory; }
    public void setFcfHistory(Map<String, Double> fcfHistory) { this.fcfHistory = fcfHistory; }

    public Map<String, Double> getCurrentShareholding() { return currentShareholding; }
    public void setCurrentShareholding(Map<String, Double> currentShareholding) { this.currentShareholding = currentShareholding; }

    public Map<String, Double> getShareholdingChange() { return shareholdingChange; }
    public void setShareholdingChange(Map<String, Double> shareholdingChange) { this.shareholdingChange = shareholdingChange; }

    public String getShareholdingSummary() { return shareholdingSummary; }
    public void setShareholdingSummary(String shareholdingSummary) { this.shareholdingSummary = shareholdingSummary; }

    public List<PeerData> getPeers() { return peers; }
    public void setPeers(List<PeerData> peers) { this.peers = peers; }

    public List<String> getRedFlags() { return redFlags; }
    public void setRedFlags(List<String> redFlags) { this.redFlags = redFlags; }
    public void addRedFlag(String flag) { this.redFlags.add(flag); }

    public List<String> getPositiveSignals() { return positiveSignals; }
    public void setPositiveSignals(List<String> positiveSignals) { this.positiveSignals = positiveSignals; }
    public void addPositiveSignal(String signal) { this.positiveSignals.add(signal); }

    public String getExecutiveSummary() { return executiveSummary; }
    public void setExecutiveSummary(String executiveSummary) { this.executiveSummary = executiveSummary; }

    /**
     * Inner class to hold metric results with multiple values.
     */
    public static class MetricResult {
        private Double current;
        private Double year3;
        private Double year5;
        private Double year10;
        private Double average;
        private String trend;
        private String assessment;
        private Map<String, Double> yearlyData = new LinkedHashMap<>();

        public MetricResult() {}

        public MetricResult(Double current) {
            this.current = current;
        }

        public Double getCurrent() { return current; }
        public void setCurrent(Double current) { this.current = current; }

        public Double getYear3() { return year3; }
        public void setYear3(Double year3) { this.year3 = year3; }

        public Double getYear5() { return year5; }
        public void setYear5(Double year5) { this.year5 = year5; }

        public Double getYear10() { return year10; }
        public void setYear10(Double year10) { this.year10 = year10; }

        public Double getAverage() { return average; }
        public void setAverage(Double average) { this.average = average; }

        public String getTrend() { return trend; }
        public void setTrend(String trend) { this.trend = trend; }

        public String getAssessment() { return assessment; }
        public void setAssessment(String assessment) { this.assessment = assessment; }

        public Map<String, Double> getYearlyData() { return yearlyData; }
        public void setYearlyData(Map<String, Double> yearlyData) { this.yearlyData = yearlyData; }

        public String format() {
            if (current == null) return "N/A";
            return String.format("%.2f", current);
        }

        public String formatPercent() {
            if (current == null) return "N/A";
            return String.format("%.1f%%", current);
        }
    }
}
