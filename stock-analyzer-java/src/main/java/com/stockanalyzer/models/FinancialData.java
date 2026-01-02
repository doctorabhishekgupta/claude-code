package com.stockanalyzer.models;

import java.util.*;

/**
 * Container for all financial data scraped from various sources.
 */
public class FinancialData {
    private String companyName;
    private Map<String, Double> ratios = new HashMap<>();
    private Map<String, Map<String, Double>> profitLoss = new LinkedHashMap<>();
    private Map<String, Map<String, Double>> balanceSheet = new LinkedHashMap<>();
    private Map<String, Map<String, Double>> cashFlow = new LinkedHashMap<>();
    private List<ShareholdingData> shareholding = new ArrayList<>();
    private List<PeerData> peers = new ArrayList<>();
    private Map<String, Double> priceData = new HashMap<>();

    // Getters and Setters
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public Map<String, Double> getRatios() { return ratios; }
    public void setRatios(Map<String, Double> ratios) { this.ratios = ratios; }
    public void addRatio(String key, Double value) { this.ratios.put(key, value); }

    public Map<String, Map<String, Double>> getProfitLoss() { return profitLoss; }
    public void setProfitLoss(Map<String, Map<String, Double>> profitLoss) { this.profitLoss = profitLoss; }
    public void addProfitLossMetric(String metric, Map<String, Double> values) {
        this.profitLoss.put(metric, values);
    }

    public Map<String, Map<String, Double>> getBalanceSheet() { return balanceSheet; }
    public void setBalanceSheet(Map<String, Map<String, Double>> balanceSheet) { this.balanceSheet = balanceSheet; }
    public void addBalanceSheetMetric(String metric, Map<String, Double> values) {
        this.balanceSheet.put(metric, values);
    }

    public Map<String, Map<String, Double>> getCashFlow() { return cashFlow; }
    public void setCashFlow(Map<String, Map<String, Double>> cashFlow) { this.cashFlow = cashFlow; }
    public void addCashFlowMetric(String metric, Map<String, Double> values) {
        this.cashFlow.put(metric, values);
    }

    public List<ShareholdingData> getShareholding() { return shareholding; }
    public void setShareholding(List<ShareholdingData> shareholding) { this.shareholding = shareholding; }
    public void addShareholding(ShareholdingData data) { this.shareholding.add(data); }

    public List<PeerData> getPeers() { return peers; }
    public void setPeers(List<PeerData> peers) { this.peers = peers; }
    public void addPeer(PeerData peer) { this.peers.add(peer); }

    public Map<String, Double> getPriceData() { return priceData; }
    public void setPriceData(Map<String, Double> priceData) { this.priceData = priceData; }
    public void addPriceData(String key, Double value) { this.priceData.put(key, value); }

    /**
     * Get a specific metric's yearly values from profit/loss data.
     */
    public Map<String, Double> getMetricValues(String metricName) {
        for (Map.Entry<String, Map<String, Double>> entry : profitLoss.entrySet()) {
            if (entry.getKey().toLowerCase().contains(metricName.toLowerCase())) {
                return entry.getValue();
            }
        }
        return new HashMap<>();
    }

    /**
     * Get free cash flow values.
     */
    public Map<String, Double> getFreeCashFlow() {
        for (Map.Entry<String, Map<String, Double>> entry : cashFlow.entrySet()) {
            String key = entry.getKey().toLowerCase();
            if (key.contains("free cash flow") || key.equals("fcf")) {
                return entry.getValue();
            }
        }
        return new HashMap<>();
    }
}
