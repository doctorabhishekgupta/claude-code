package com.stockanalyzer.models;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Represents shareholding pattern data for a holder type.
 */
public class ShareholdingData {
    private String holderType;
    private Map<String, Double> percentages = new LinkedHashMap<>();

    public ShareholdingData() {}

    public ShareholdingData(String holderType) {
        this.holderType = holderType;
    }

    public String getHolderType() { return holderType; }
    public void setHolderType(String holderType) { this.holderType = holderType; }

    public Map<String, Double> getPercentages() { return percentages; }
    public void setPercentages(Map<String, Double> percentages) { this.percentages = percentages; }
    public void addPercentage(String period, Double value) { this.percentages.put(period, value); }

    /**
     * Get the latest percentage value.
     */
    public Double getLatestPercentage() {
        if (percentages.isEmpty()) return null;
        return percentages.values().iterator().next();
    }

    /**
     * Calculate the change over a given number of quarters.
     */
    public Double getChange(int quarters) {
        if (percentages.size() <= quarters) return null;

        Double[] values = percentages.values().toArray(new Double[0]);
        if (values[0] == null || values[Math.min(quarters, values.length - 1)] == null) {
            return null;
        }
        return values[0] - values[Math.min(quarters, values.length - 1)];
    }
}
