package com.stockanalyzer.reports;

import com.stockanalyzer.models.AnalysisResult;
import com.stockanalyzer.models.PeerData;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * Generates HTML and text reports from analysis results.
 */
public class ReportGenerator {

    private static final String OUTPUT_DIR = "output";

    public ReportGenerator() {
        // Create output directory if it doesn't exist
        try {
            Files.createDirectories(Paths.get(OUTPUT_DIR));
        } catch (IOException e) {
            // Fallback to current directory
        }
    }

    public String generateHtmlReport(AnalysisResult result) throws IOException {
        return generateHtmlReport(result, null);
    }

    public String generateHtmlReport(AnalysisResult result, String outputPath) throws IOException {
        if (outputPath == null) {
            String safeName = result.getCompanyName().replaceAll("[^a-zA-Z0-9]", "_");
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            outputPath = Paths.get(OUTPUT_DIR, safeName + "_" + timestamp + ".html").toString();
        }

        String html = buildHtml(result);
        Files.writeString(Paths.get(outputPath), html, StandardCharsets.UTF_8);
        return outputPath;
    }

    public String generateTextReport(AnalysisResult result) {
        StringBuilder sb = new StringBuilder();

        sb.append("=".repeat(80)).append("\n");
        sb.append("STOCK ANALYSIS REPORT: ").append(result.getCompanyName()).append("\n");
        sb.append("Generated: ").append(result.getAnalysisDate()).append("\n");
        sb.append("=".repeat(80)).append("\n");

        // Executive Summary
        sb.append("\n📊 EXECUTIVE SUMMARY\n");
        sb.append("-".repeat(40)).append("\n");
        sb.append(result.getExecutiveSummary()).append("\n");

        // Key Metrics
        sb.append("\n📈 KEY FINANCIAL METRICS\n");
        sb.append("-".repeat(40)).append("\n");

        appendMetric(sb, "Market Cap", result.getMarketCap(), true, " Cr");
        appendMetric(sb, "PE Ratio", result.getPeRatio(), false, "");
        appendMetric(sb, "PEG Ratio", result.getPegRatio(), false, "");
        appendMetric(sb, "ROCE", result.getRoce(), false, "%");
        appendMetric(sb, "ROE", result.getRoe(), false, "%");
        appendMetric(sb, "Debt/Equity", result.getDebtEquity(), false, "");
        appendMetric(sb, "EPS", result.getEps(), false, "");
        appendMetric(sb, "Operating Margin", result.getOperatingMargin(), false, "%");

        // Growth Metrics
        sb.append("\n📊 GROWTH METRICS (CAGR)\n");
        sb.append("-".repeat(40)).append("\n");
        sb.append("Sales CAGR:\n");
        sb.append("  3-Year: ").append(formatValue(result.getSalesCagr().getYear3())).append("%\n");
        sb.append("  5-Year: ").append(formatValue(result.getSalesCagr().getYear5())).append("%\n");
        sb.append("  10-Year: ").append(formatValue(result.getSalesCagr().getYear10())).append("%\n");

        sb.append("Stock Price CAGR:\n");
        sb.append("  1-Year: ").append(formatValue(result.getStockPriceCagr().getCurrent())).append("%\n");
        sb.append("  3-Year: ").append(formatValue(result.getStockPriceCagr().getYear3())).append("%\n");
        sb.append("  5-Year: ").append(formatValue(result.getStockPriceCagr().getYear5())).append("%\n");

        // FCF Valuation
        sb.append("\n💰 FREE CASH FLOW VALUATION\n");
        sb.append("-".repeat(40)).append("\n");
        if (result.getAvgFcf3Year() != null) {
            sb.append(String.format("Average FCF (3 Years): ₹%.0f Cr\n", result.getAvgFcf3Year()));
            sb.append(String.format("FCF-based Valuation (at 2%% yield): ₹%.0f Cr\n", result.getFcfValuation()));
            sb.append("FCF Negative Years (past 10Y): ").append(result.getFcfNegativeYears()).append("\n");
            sb.append("FCF Consistency: ").append(result.getFcfConsistency()).append("\n");
            if (result.getFcfAssessment() != null) {
                sb.append("Assessment: ").append(result.getFcfAssessment()).append("\n");
            }
        } else {
            sb.append("FCF data not available\n");
        }

        // Shareholding
        sb.append("\n👥 SHAREHOLDING PATTERN ANALYSIS (2 Year Change)\n");
        sb.append("-".repeat(40)).append("\n");
        if (!result.getCurrentShareholding().isEmpty()) {
            for (Map.Entry<String, Double> entry : result.getCurrentShareholding().entrySet()) {
                Double change = result.getShareholdingChange().get(entry.getKey());
                String changeStr = change != null ? String.format(" (Change: %+.1f%%)", change) : "";
                sb.append(String.format("  %s: %.1f%%%s\n", entry.getKey(), entry.getValue(), changeStr));
            }
            sb.append("\nSummary: ").append(result.getShareholdingSummary()).append("\n");
        } else {
            sb.append("Shareholding data not available\n");
        }

        // Peer Comparison
        sb.append("\n🏢 PEER COMPARISON\n");
        sb.append("-".repeat(40)).append("\n");
        if (!result.getPeers().isEmpty()) {
            sb.append(String.format("%-30s %8s %8s %12s\n", "Company", "PE", "ROCE", "Market Cap"));
            sb.append("-".repeat(60)).append("\n");
            for (PeerData peer : result.getPeers().subList(0, Math.min(8, result.getPeers().size()))) {
                String name = peer.getName() != null ? peer.getName() : "N/A";
                if (name.length() > 28) name = name.substring(0, 28);
                sb.append(String.format("%-30s %8s %8s %12s\n",
                        name,
                        formatValue(peer.getPeRatio()),
                        formatValue(peer.getRoce()),
                        peer.getMarketCap() != null ? String.format("₹%.0f", peer.getMarketCap()) : "N/A"));
            }
        } else {
            sb.append("Peer data not available\n");
        }

        // Red Flags
        sb.append("\n⚠️ RED FLAGS\n");
        sb.append("-".repeat(40)).append("\n");
        if (!result.getRedFlags().isEmpty()) {
            for (String flag : result.getRedFlags()) {
                sb.append("  ❌ ").append(flag).append("\n");
            }
        } else {
            sb.append("  No major red flags identified\n");
        }

        // Positive Signals
        sb.append("\n✅ POSITIVE SIGNALS\n");
        sb.append("-".repeat(40)).append("\n");
        if (!result.getPositiveSignals().isEmpty()) {
            for (String signal : result.getPositiveSignals()) {
                sb.append("  ✓ ").append(signal).append("\n");
            }
        } else {
            sb.append("  No strong positive signals identified\n");
        }

        sb.append("\n").append("=".repeat(80)).append("\n");
        sb.append("DISCLAIMER: This analysis is for educational purposes only.\n");
        sb.append("Always do your own research before making investment decisions.\n");
        sb.append("=".repeat(80)).append("\n");

        return sb.toString();
    }

    private void appendMetric(StringBuilder sb, String name, AnalysisResult.MetricResult metric, boolean isCurrency, String suffix) {
        if (metric == null || metric.getCurrent() == null) {
            sb.append(name).append(": N/A\n");
            return;
        }

        String value = isCurrency ?
                String.format("₹%.0f", metric.getCurrent()) :
                String.format("%.2f", metric.getCurrent());

        sb.append(name).append(": ").append(value).append(suffix);

        if (metric.getAssessment() != null) {
            sb.append(" - ").append(metric.getAssessment());
        }
        if (metric.getTrend() != null) {
            sb.append(" (Trend: ").append(metric.getTrend()).append(")");
        }
        sb.append("\n");
    }

    private String formatValue(Double value) {
        return value != null ? String.format("%.1f", value) : "N/A";
    }

    private String buildHtml(AnalysisResult result) {
        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stock Analysis - %s</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%%, #16213e 100%%);
            color: #eee;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            text-align: center;
            padding: 30px;
            background: rgba(255,255,255,0.05);
            border-radius: 15px;
            margin-bottom: 30px;
        }
        .header h1 { font-size: 2.5em; color: #00d4ff; margin-bottom: 10px; }
        .header .date { color: #888; }
        .summary-box {
            background: linear-gradient(135deg, #0f3460 0%%, #16213e 100%%);
            padding: 25px;
            border-radius: 15px;
            margin-bottom: 30px;
            border-left: 4px solid #00d4ff;
        }
        .summary-box h2 { color: #00d4ff; margin-bottom: 15px; }
        .summary-box pre { white-space: pre-wrap; font-family: inherit; line-height: 1.6; }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: rgba(255,255,255,0.05);
            padding: 20px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .metric-card h3 {
            color: #00d4ff;
            margin-bottom: 15px;
            font-size: 1.1em;
            border-bottom: 1px solid rgba(0,212,255,0.3);
            padding-bottom: 10px;
        }
        .metric-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .metric-label { color: #aaa; }
        .metric-value { font-weight: 600; color: #fff; }
        .metric-value.positive { color: #00ff88; }
        .metric-value.negative { color: #ff6b6b; }
        .metric-value.neutral { color: #ffd93d; }
        .section {
            background: rgba(255,255,255,0.03);
            padding: 25px;
            border-radius: 15px;
            margin-bottom: 25px;
        }
        .section h2 {
            color: #00d4ff;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(0,212,255,0.3);
        }
        table { width: 100%%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
        th { background: rgba(0,212,255,0.1); color: #00d4ff; }
        tr:hover { background: rgba(255,255,255,0.03); }
        .signals-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .red-flags {
            background: rgba(255,107,107,0.1);
            border: 1px solid rgba(255,107,107,0.3);
            border-radius: 12px;
            padding: 20px;
        }
        .red-flags h3 { color: #ff6b6b; margin-bottom: 15px; }
        .positive-signals {
            background: rgba(0,255,136,0.1);
            border: 1px solid rgba(0,255,136,0.3);
            border-radius: 12px;
            padding: 20px;
        }
        .positive-signals h3 { color: #00ff88; margin-bottom: 15px; }
        .signal-item { padding: 8px 0; padding-left: 20px; position: relative; }
        .signal-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%%;
            transform: translateY(-50%%);
            width: 8px;
            height: 8px;
            border-radius: 50%%;
        }
        .red-flags .signal-item::before { background: #ff6b6b; }
        .positive-signals .signal-item::before { background: #00ff88; }
        .disclaimer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
            margin-top: 30px;
        }
        @media (max-width: 768px) {
            .signals-container { grid-template-columns: 1fr; }
            .metrics-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 %s</h1>
            <p class="date">Analysis Date: %s</p>
        </div>

        <div class="summary-box">
            <h2>📋 Executive Summary</h2>
            <pre>%s</pre>
        </div>

        <div class="metrics-grid">
            %s
        </div>

        <div class="section">
            <h2>💰 Free Cash Flow Based Valuation</h2>
            %s
        </div>

        <div class="section">
            <h2>👥 Shareholding Pattern Analysis</h2>
            %s
        </div>

        <div class="section">
            <h2>🏢 Peer Comparison</h2>
            %s
        </div>

        <div class="section">
            <h2>🔍 Analysis Signals</h2>
            <div class="signals-container">
                <div class="red-flags">
                    <h3>⚠️ Red Flags</h3>
                    %s
                </div>
                <div class="positive-signals">
                    <h3>✅ Positive Signals</h3>
                    %s
                </div>
            </div>
        </div>

        <div class="disclaimer">
            <p>⚠️ <strong>DISCLAIMER:</strong> This analysis is for educational purposes only.</p>
            <p>Always conduct your own research before making investment decisions.</p>
        </div>
    </div>
</body>
</html>
""".formatted(
                result.getCompanyName(),
                result.getCompanyName(),
                result.getAnalysisDate(),
                result.getExecutiveSummary(),
                buildMetricCards(result),
                buildFcfSection(result),
                buildShareholdingSection(result),
                buildPeerTable(result),
                buildSignalsList(result.getRedFlags(), "No major red flags identified"),
                buildSignalsList(result.getPositiveSignals(), "No strong positive signals")
        );
    }

    private String buildMetricCards(AnalysisResult result) {
        StringBuilder sb = new StringBuilder();

        // Market & Valuation Card
        sb.append(buildMetricCard("Market & Valuation",
                "Market Cap", formatCurrency(result.getMarketCap().getCurrent()),
                result.getMarketCap().getAssessment() != null ? result.getMarketCap().getAssessment() : "",
                "PE Ratio", formatValue(result.getPeRatio().getCurrent()),
                result.getPeRatio().getAssessment() != null ? result.getPeRatio().getAssessment() : "",
                "PEG Ratio", formatValue(result.getPegRatio().getCurrent()),
                result.getPegRatio().getAssessment() != null ? result.getPegRatio().getAssessment() : ""
        ));

        // Profitability Card
        sb.append(buildMetricCard("Profitability Ratios",
                "ROCE", formatPercent(result.getRoce().getCurrent()), "",
                "ROE", formatPercent(result.getRoe().getCurrent()), "",
                "Operating Margin", formatPercent(result.getOperatingMargin().getCurrent()),
                result.getOperatingMargin().getTrend() != null ? "Trend: " + result.getOperatingMargin().getTrend() : ""
        ));

        // Financial Health Card
        sb.append(buildMetricCard("Financial Health",
                "Debt/Equity", formatValue(result.getDebtEquity().getCurrent()),
                result.getDebtEquity().getAssessment() != null ? result.getDebtEquity().getAssessment() : "",
                "EPS", formatValue(result.getEps().getCurrent()), "",
                "EPS Growth", formatPercent(result.getEps().getYear5()), ""
        ));

        // Growth Card
        sb.append(buildMetricCard("Growth Metrics (CAGR)",
                "Sales 3Y CAGR", formatPercent(result.getSalesCagr().getYear3()), "",
                "Sales 5Y CAGR", formatPercent(result.getSalesCagr().getYear5()), "",
                "Price 1Y", formatPercent(result.getStockPriceCagr().getCurrent()), ""
        ));

        return sb.toString();
    }

    private String buildMetricCard(String title, String... metrics) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"metric-card\"><h3>").append(title).append("</h3>");

        for (int i = 0; i < metrics.length; i += 3) {
            String label = metrics[i];
            String value = metrics[i + 1];
            String extra = metrics[i + 2];

            sb.append("<div class=\"metric-row\">");
            sb.append("<span class=\"metric-label\">").append(label).append("</span>");
            sb.append("<span class=\"metric-value\">").append(value);
            if (!extra.isEmpty()) {
                sb.append(" <small style=\"color:#888\">(").append(extra).append(")</small>");
            }
            sb.append("</span></div>");
        }

        sb.append("</div>");
        return sb.toString();
    }

    private String buildFcfSection(AnalysisResult result) {
        if (result.getAvgFcf3Year() == null) {
            return "<p>FCF data not available</p>";
        }

        return """
            <div class="metrics-grid">
                <div class="metric-card">
                    <h3>FCF Analysis</h3>
                    <div class="metric-row"><span class="metric-label">Avg FCF (3 Years)</span><span class="metric-value">%s</span></div>
                    <div class="metric-row"><span class="metric-label">FCF Valuation (at 2%%)</span><span class="metric-value">%s</span></div>
                    <div class="metric-row"><span class="metric-label">Negative FCF Years</span><span class="metric-value">%d</span></div>
                </div>
                <div class="metric-card">
                    <h3>FCF Assessment</h3>
                    <div class="metric-row"><span class="metric-label">Consistency</span><span class="metric-value">%s</span></div>
                    <div class="metric-row"><span class="metric-label">Assessment</span><span class="metric-value">%s</span></div>
                </div>
            </div>
            """.formatted(
                formatCurrency(result.getAvgFcf3Year()),
                formatCurrency(result.getFcfValuation()),
                result.getFcfNegativeYears() != null ? result.getFcfNegativeYears() : 0,
                result.getFcfConsistency() != null ? result.getFcfConsistency() : "N/A",
                result.getFcfAssessment() != null ? result.getFcfAssessment() : "N/A"
        );
    }

    private String buildShareholdingSection(AnalysisResult result) {
        if (result.getCurrentShareholding().isEmpty()) {
            return "<p>Shareholding data not available</p>";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("<table><thead><tr><th>Holder Type</th><th>Current %</th><th>2Y Change</th></tr></thead><tbody>");

        for (Map.Entry<String, Double> entry : result.getCurrentShareholding().entrySet()) {
            Double change = result.getShareholdingChange().get(entry.getKey());
            String changeStr = change != null ? String.format("%+.1f%%", change) : "N/A";
            String changeClass = change != null ? (change > 0 ? "positive" : "negative") : "";

            sb.append("<tr>");
            sb.append("<td>").append(entry.getKey()).append("</td>");
            sb.append("<td>").append(String.format("%.1f%%", entry.getValue())).append("</td>");
            sb.append("<td class=\"").append(changeClass).append("\">").append(changeStr).append("</td>");
            sb.append("</tr>");
        }

        sb.append("</tbody></table>");
        sb.append("<p style=\"margin-top:15px;color:#aaa\"><strong>Summary:</strong> ").append(result.getShareholdingSummary()).append("</p>");
        return sb.toString();
    }

    private String buildPeerTable(AnalysisResult result) {
        if (result.getPeers().isEmpty()) {
            return "<p>Peer data not available</p>";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("<table><thead><tr><th>Company</th><th>PE</th><th>ROCE</th><th>Market Cap</th></tr></thead><tbody>");

        for (PeerData peer : result.getPeers().subList(0, Math.min(10, result.getPeers().size()))) {
            sb.append("<tr>");
            sb.append("<td>").append(peer.getName() != null ? peer.getName() : "N/A").append("</td>");
            sb.append("<td>").append(formatValue(peer.getPeRatio())).append("</td>");
            sb.append("<td>").append(formatPercent(peer.getRoce())).append("</td>");
            sb.append("<td>").append(formatCurrency(peer.getMarketCap())).append("</td>");
            sb.append("</tr>");
        }

        sb.append("</tbody></table>");
        return sb.toString();
    }

    private String buildSignalsList(java.util.List<String> signals, String emptyMessage) {
        if (signals.isEmpty()) {
            return "<div class=\"signal-item\" style=\"color:#888\">" + emptyMessage + "</div>";
        }

        StringBuilder sb = new StringBuilder();
        for (String signal : signals) {
            sb.append("<div class=\"signal-item\">").append(signal).append("</div>");
        }
        return sb.toString();
    }

    private String formatCurrency(Double value) {
        return value != null ? String.format("₹%.0f Cr", value) : "N/A";
    }

    private String formatPercent(Double value) {
        return value != null ? String.format("%.1f%%", value) : "N/A";
    }
}
