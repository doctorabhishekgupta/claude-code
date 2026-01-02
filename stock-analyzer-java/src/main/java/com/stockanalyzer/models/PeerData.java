package com.stockanalyzer.models;

/**
 * Represents peer comparison data.
 */
public class PeerData {
    private String name;
    private Double currentPrice;
    private Double peRatio;
    private Double marketCap;
    private Double roce;
    private Double roe;

    public PeerData() {}

    public PeerData(String name) {
        this.name = name;
    }

    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Double getCurrentPrice() { return currentPrice; }
    public void setCurrentPrice(Double currentPrice) { this.currentPrice = currentPrice; }

    public Double getPeRatio() { return peRatio; }
    public void setPeRatio(Double peRatio) { this.peRatio = peRatio; }

    public Double getMarketCap() { return marketCap; }
    public void setMarketCap(Double marketCap) { this.marketCap = marketCap; }

    public Double getRoce() { return roce; }
    public void setRoce(Double roce) { this.roce = roce; }

    public Double getRoe() { return roe; }
    public void setRoe(Double roe) { this.roe = roe; }

    @Override
    public String toString() {
        return String.format("%s | PE: %.1f | ROCE: %.1f%% | MCap: %.0f Cr",
                name != null ? name : "N/A",
                peRatio != null ? peRatio : 0,
                roce != null ? roce : 0,
                marketCap != null ? marketCap : 0);
    }
}
