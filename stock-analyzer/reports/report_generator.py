"""Report generation for stock analysis."""

from typing import Dict, Any, Optional
from datetime import datetime
import os


class ReportGenerator:
    """Generates formatted reports from analysis results."""

    def __init__(self):
        self.output_dir = os.path.join(os.path.dirname(__file__), '..', 'output')
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_html_report(self, analysis_result, output_path: Optional[str] = None) -> str:
        """Generate an HTML report from analysis results."""
        if output_path is None:
            safe_name = analysis_result.company_name.replace(' ', '_').replace('/', '_')
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_path = os.path.join(self.output_dir, f'{safe_name}_{timestamp}.html')

        html_content = self._build_html(analysis_result)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return output_path

    def generate_text_report(self, analysis_result) -> str:
        """Generate a plain text report."""
        lines = []
        lines.append("=" * 80)
        lines.append(f"STOCK ANALYSIS REPORT: {analysis_result.company_name}")
        lines.append(f"Generated: {analysis_result.analysis_date}")
        lines.append("=" * 80)

        # Executive Summary
        lines.append("\n📊 EXECUTIVE SUMMARY")
        lines.append("-" * 40)
        lines.append(analysis_result.summary)

        # Key Metrics
        lines.append("\n📈 KEY FINANCIAL METRICS")
        lines.append("-" * 40)

        metrics = analysis_result.metrics

        # Market Cap
        mc = metrics.get('market_cap', {})
        if mc.get('value_cr'):
            lines.append(f"Market Cap: ₹{mc['value_cr']:,.0f} Cr - {mc.get('category', 'N/A')}")

        # PE Ratio
        pe = metrics.get('pe_ratio', {})
        if pe.get('current'):
            lines.append(f"PE Ratio: {pe['current']:.2f}")
            if pe.get('industry_avg'):
                lines.append(f"  Industry PE: {pe['industry_avg']:.2f}")
            lines.append(f"  Assessment: {pe.get('assessment', 'N/A')}")

        # PEG Ratio
        peg = metrics.get('peg_ratio', {})
        if peg.get('current'):
            lines.append(f"PEG Ratio: {peg['current']:.2f} - {peg.get('assessment', 'N/A')}")

        # ROCE & ROE
        roce = metrics.get('roce', {})
        roe = metrics.get('roe', {})
        if roce.get('current') or roe.get('current'):
            lines.append(f"ROCE: {roce.get('current', 'N/A')}%  |  ROE: {roe.get('current', 'N/A')}%")

        # Debt/Equity
        de = metrics.get('debt_equity', {})
        if de.get('current') is not None:
            lines.append(f"Debt/Equity: {de['current']:.2f}")
            lines.append(f"  Trend: {de.get('trend', 'N/A')}")
            lines.append(f"  Assessment: {de.get('assessment', 'N/A')}")

        # EPS
        eps = metrics.get('eps', {})
        if eps.get('current'):
            lines.append(f"Current EPS: ₹{eps['current']:.2f}")
            if eps.get('growth_rate'):
                lines.append(f"  EPS Growth Rate: {eps['growth_rate']:.1f}%")

        # Operating Margin
        opm = metrics.get('operating_margin', {})
        if opm.get('current') or opm.get('10_year_avg'):
            lines.append(f"Operating Margin: {opm.get('current', opm.get('10_year_avg', 'N/A'))}%")
            lines.append(f"  10Y Average: {opm.get('10_year_avg', 'N/A')}%")
            lines.append(f"  Trend: {opm.get('trend', 'N/A')}")

        # Sales CAGR
        lines.append("\n📊 GROWTH METRICS (CAGR)")
        lines.append("-" * 40)
        sales_cagr = metrics.get('sales_cagr', {})
        lines.append(f"Sales CAGR:")
        lines.append(f"  3-Year: {sales_cagr.get('3_year', 'N/A')}%")
        lines.append(f"  5-Year: {sales_cagr.get('5_year', 'N/A')}%")
        lines.append(f"  10-Year: {sales_cagr.get('10_year', 'N/A')}%")

        # Stock Price CAGR
        price_cagr = metrics.get('stock_price_cagr', {})
        lines.append(f"Stock Price CAGR:")
        lines.append(f"  1-Year: {price_cagr.get('1_year', 'N/A')}%")
        lines.append(f"  3-Year: {price_cagr.get('3_year', 'N/A')}%")
        lines.append(f"  5-Year: {price_cagr.get('5_year', 'N/A')}%")

        # FCF Valuation
        lines.append("\n💰 FREE CASH FLOW VALUATION")
        lines.append("-" * 40)
        fcf = analysis_result.fcf_valuation
        if fcf.get('avg_fcf_3yr'):
            lines.append(f"Average FCF (3 Years): ₹{fcf['avg_fcf_3yr']:,.0f} Cr")
            lines.append(f"FCF-based Valuation (at 2% yield): ₹{fcf.get('valuation_at_2pct', 0):,.0f} Cr")
            lines.append(f"Current Market Cap: ₹{fcf.get('current_market_cap', 0):,.0f} Cr")
            lines.append(f"FCF Negative Years (past 10Y): {fcf.get('fcf_negative_years', 'N/A')}")
            lines.append(f"FCF Consistency: {fcf.get('fcf_consistency', 'N/A')}")
            if fcf.get('valuation_vs_market'):
                lines.append(f"Valuation Assessment: {fcf['valuation_vs_market']}")
        else:
            lines.append("FCF data not available")

        # Shareholding Analysis
        lines.append("\n👥 SHAREHOLDING PATTERN ANALYSIS (2 Year Change)")
        lines.append("-" * 40)
        sh = analysis_result.shareholding_analysis
        if sh.get('current_pattern'):
            for holder, pct in sh['current_pattern'].items():
                change = sh.get('changes_2yr', {}).get(holder)
                change_str = f" (Change: {change:+.1f}%)" if change is not None else ""
                lines.append(f"  {holder}: {pct:.1f}%{change_str}")
            lines.append(f"\nSummary: {sh.get('summary', 'N/A')}")
        else:
            lines.append("Shareholding data not available")

        # Peer Comparison
        lines.append("\n🏢 PEER COMPARISON")
        lines.append("-" * 40)
        peers = analysis_result.peer_comparison
        if peers:
            lines.append(f"{'Company':<30} {'PE':>8} {'ROCE':>8} {'Market Cap':>12}")
            lines.append("-" * 60)
            for peer in peers[:8]:
                name = str(peer.get('name', 'N/A'))[:28]
                pe_val = peer.get('pe')
                pe_str = f"{pe_val:.1f}" if pe_val else "N/A"
                roce_val = peer.get('roce')
                roce_str = f"{roce_val:.1f}" if roce_val else "N/A"
                mc_val = peer.get('market_cap')
                mc_str = f"₹{mc_val:,.0f}" if mc_val else "N/A"
                lines.append(f"{name:<30} {pe_str:>8} {roce_str:>8} {mc_str:>12}")
        else:
            lines.append("Peer data not available")

        # Red Flags and Positive Signals
        lines.append("\n⚠️  RED FLAGS")
        lines.append("-" * 40)
        if analysis_result.red_flags:
            for flag in analysis_result.red_flags:
                lines.append(f"  ❌ {flag}")
        else:
            lines.append("  No major red flags identified")

        lines.append("\n✅ POSITIVE SIGNALS")
        lines.append("-" * 40)
        if analysis_result.positive_signals:
            for signal in analysis_result.positive_signals:
                lines.append(f"  ✓ {signal}")
        else:
            lines.append("  No strong positive signals identified")

        lines.append("\n" + "=" * 80)
        lines.append("DISCLAIMER: This analysis is for educational purposes only.")
        lines.append("Always do your own research before making investment decisions.")
        lines.append("=" * 80)

        return '\n'.join(lines)

    def _build_html(self, analysis_result) -> str:
        """Build HTML content for the report."""
        metrics = analysis_result.metrics
        fcf = analysis_result.fcf_valuation
        sh = analysis_result.shareholding_analysis

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stock Analysis - {analysis_result.company_name}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #eee;
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        .header {{
            text-align: center;
            padding: 30px;
            background: rgba(255,255,255,0.05);
            border-radius: 15px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            font-size: 2.5em;
            color: #00d4ff;
            margin-bottom: 10px;
        }}
        .header .date {{
            color: #888;
        }}
        .summary-box {{
            background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
            padding: 25px;
            border-radius: 15px;
            margin-bottom: 30px;
            border-left: 4px solid #00d4ff;
        }}
        .summary-box h2 {{
            color: #00d4ff;
            margin-bottom: 15px;
        }}
        .summary-box pre {{
            white-space: pre-wrap;
            font-family: inherit;
            line-height: 1.6;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .metric-card {{
            background: rgba(255,255,255,0.05);
            padding: 20px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.1);
        }}
        .metric-card h3 {{
            color: #00d4ff;
            margin-bottom: 15px;
            font-size: 1.1em;
            border-bottom: 1px solid rgba(0,212,255,0.3);
            padding-bottom: 10px;
        }}
        .metric-row {{
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }}
        .metric-label {{
            color: #aaa;
        }}
        .metric-value {{
            font-weight: 600;
            color: #fff;
        }}
        .metric-value.positive {{
            color: #00ff88;
        }}
        .metric-value.negative {{
            color: #ff6b6b;
        }}
        .metric-value.neutral {{
            color: #ffd93d;
        }}
        .section {{
            background: rgba(255,255,255,0.03);
            padding: 25px;
            border-radius: 15px;
            margin-bottom: 25px;
        }}
        .section h2 {{
            color: #00d4ff;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(0,212,255,0.3);
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }}
        th {{
            background: rgba(0,212,255,0.1);
            color: #00d4ff;
        }}
        tr:hover {{
            background: rgba(255,255,255,0.03);
        }}
        .signals-container {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }}
        .red-flags {{
            background: rgba(255,107,107,0.1);
            border: 1px solid rgba(255,107,107,0.3);
            border-radius: 12px;
            padding: 20px;
        }}
        .red-flags h3 {{
            color: #ff6b6b;
            margin-bottom: 15px;
        }}
        .positive-signals {{
            background: rgba(0,255,136,0.1);
            border: 1px solid rgba(0,255,136,0.3);
            border-radius: 12px;
            padding: 20px;
        }}
        .positive-signals h3 {{
            color: #00ff88;
            margin-bottom: 15px;
        }}
        .signal-item {{
            padding: 8px 0;
            padding-left: 20px;
            position: relative;
        }}
        .signal-item::before {{
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }}
        .red-flags .signal-item::before {{
            background: #ff6b6b;
        }}
        .positive-signals .signal-item::before {{
            background: #00ff88;
        }}
        .disclaimer {{
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
            margin-top: 30px;
        }}
        @media (max-width: 768px) {{
            .signals-container {{
                grid-template-columns: 1fr;
            }}
            .metrics-grid {{
                grid-template-columns: 1fr;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 {analysis_result.company_name}</h1>
            <p class="date">Analysis Date: {analysis_result.analysis_date}</p>
        </div>

        <div class="summary-box">
            <h2>📋 Executive Summary</h2>
            <pre>{analysis_result.summary}</pre>
        </div>

        <div class="metrics-grid">
            {self._build_metric_card("Market & Valuation", [
                ("Market Cap", self._format_currency(metrics.get('market_cap', {}).get('value_cr')), "neutral"),
                ("Category", metrics.get('market_cap', {}).get('category', 'N/A'), "neutral"),
                ("PE Ratio", self._format_number(metrics.get('pe_ratio', {}).get('current')),
                 "negative" if metrics.get('pe_ratio', {}).get('current', 0) and metrics.get('pe_ratio', {}).get('current') > 40 else "positive"),
                ("Industry PE", self._format_number(metrics.get('pe_ratio', {}).get('industry_avg')), "neutral"),
                ("PEG Ratio", self._format_number(metrics.get('peg_ratio', {}).get('current')),
                 "positive" if metrics.get('peg_ratio', {}).get('current', 2) and metrics.get('peg_ratio', {}).get('current') < 1 else "neutral"),
                ("Assessment", metrics.get('pe_ratio', {}).get('assessment', 'N/A'), "neutral"),
            ])}

            {self._build_metric_card("Profitability Ratios", [
                ("ROCE", self._format_percent(metrics.get('roce', {}).get('current')),
                 "positive" if metrics.get('roce', {}).get('current', 0) and metrics.get('roce', {}).get('current') > 15 else "neutral"),
                ("ROE", self._format_percent(metrics.get('roe', {}).get('current')),
                 "positive" if metrics.get('roe', {}).get('current', 0) and metrics.get('roe', {}).get('current') > 15 else "neutral"),
                ("Operating Margin", self._format_percent(metrics.get('operating_margin', {}).get('current') or metrics.get('operating_margin', {}).get('10_year_avg')), "neutral"),
                ("OPM 10Y Avg", self._format_percent(metrics.get('operating_margin', {}).get('10_year_avg')), "neutral"),
                ("OPM Trend", metrics.get('operating_margin', {}).get('trend', 'N/A'),
                 "positive" if metrics.get('operating_margin', {}).get('trend') == 'Improving' else "negative" if metrics.get('operating_margin', {}).get('trend') == 'Declining' else "neutral"),
            ])}

            {self._build_metric_card("Financial Health", [
                ("Debt/Equity", self._format_number(metrics.get('debt_equity', {}).get('current')),
                 "positive" if metrics.get('debt_equity', {}).get('current', 1) and metrics.get('debt_equity', {}).get('current') < 0.5 else "negative" if metrics.get('debt_equity', {}).get('current', 0) and metrics.get('debt_equity', {}).get('current') > 1.5 else "neutral"),
                ("D/E Trend", metrics.get('debt_equity', {}).get('trend', 'N/A'), "neutral"),
                ("D/E Assessment", metrics.get('debt_equity', {}).get('assessment', 'N/A'), "neutral"),
                ("Current EPS", self._format_currency(metrics.get('eps', {}).get('current'), symbol='₹'), "neutral"),
                ("EPS Growth", self._format_percent(metrics.get('eps', {}).get('growth_rate')),
                 "positive" if metrics.get('eps', {}).get('growth_rate', 0) and metrics.get('eps', {}).get('growth_rate') > 10 else "neutral"),
            ])}

            {self._build_metric_card("Growth Metrics (CAGR)", [
                ("Sales 3Y CAGR", self._format_percent(metrics.get('sales_cagr', {}).get('3_year')),
                 "positive" if metrics.get('sales_cagr', {}).get('3_year', 0) and metrics.get('sales_cagr', {}).get('3_year') > 15 else "neutral"),
                ("Sales 5Y CAGR", self._format_percent(metrics.get('sales_cagr', {}).get('5_year')),
                 "positive" if metrics.get('sales_cagr', {}).get('5_year', 0) and metrics.get('sales_cagr', {}).get('5_year') > 12 else "neutral"),
                ("Sales 10Y CAGR", self._format_percent(metrics.get('sales_cagr', {}).get('10_year')), "neutral"),
                ("Price 1Y", self._format_percent(metrics.get('stock_price_cagr', {}).get('1_year')), "neutral"),
                ("Price 3Y CAGR", self._format_percent(metrics.get('stock_price_cagr', {}).get('3_year')), "neutral"),
                ("Price 5Y CAGR", self._format_percent(metrics.get('stock_price_cagr', {}).get('5_year')), "neutral"),
            ])}
        </div>

        <div class="section">
            <h2>💰 Free Cash Flow Based Valuation</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <h3>FCF Analysis</h3>
                    <div class="metric-row">
                        <span class="metric-label">Avg FCF (3 Years)</span>
                        <span class="metric-value">{self._format_currency(fcf.get('avg_fcf_3yr'))}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">FCF Valuation (at 2%)</span>
                        <span class="metric-value">{self._format_currency(fcf.get('valuation_at_2pct'))}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Current Market Cap</span>
                        <span class="metric-value">{self._format_currency(fcf.get('current_market_cap'))}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Negative FCF Years (10Y)</span>
                        <span class="metric-value {'negative' if fcf.get('fcf_negative_years', 0) > 2 else 'positive'}">{fcf.get('fcf_negative_years', 'N/A')}</span>
                    </div>
                </div>
                <div class="metric-card">
                    <h3>FCF Assessment</h3>
                    <div class="metric-row">
                        <span class="metric-label">Consistency</span>
                        <span class="metric-value">{fcf.get('fcf_consistency', 'N/A')}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Valuation vs Market</span>
                        <span class="metric-value">{fcf.get('valuation_vs_market', 'N/A')}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Overall Assessment</span>
                        <span class="metric-value {'positive' if fcf.get('assessment') == 'Attractive' else 'negative' if fcf.get('assessment') in ['Expensive', 'Very Expensive'] else 'neutral'}">{fcf.get('assessment', 'N/A')}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>👥 Shareholding Pattern Analysis (2 Year Change)</h2>
            {self._build_shareholding_table(sh)}
            <p style="margin-top: 15px; color: #aaa;"><strong>Summary:</strong> {sh.get('summary', 'N/A')}</p>
        </div>

        <div class="section">
            <h2>🏢 Peer Comparison</h2>
            {self._build_peer_table(analysis_result.peer_comparison)}
        </div>

        <div class="section">
            <h2>🔍 Analysis Signals</h2>
            <div class="signals-container">
                <div class="red-flags">
                    <h3>⚠️ Red Flags</h3>
                    {self._build_signals_list(analysis_result.red_flags, "No major red flags identified")}
                </div>
                <div class="positive-signals">
                    <h3>✅ Positive Signals</h3>
                    {self._build_signals_list(analysis_result.positive_signals, "No strong positive signals")}
                </div>
            </div>
        </div>

        <div class="disclaimer">
            <p>⚠️ <strong>DISCLAIMER:</strong> This analysis is for educational and informational purposes only.</p>
            <p>It does not constitute financial advice. Always conduct your own research and consult with a qualified financial advisor before making investment decisions.</p>
        </div>
    </div>
</body>
</html>"""

        return html

    def _build_metric_card(self, title: str, metrics: list) -> str:
        """Build a metric card HTML."""
        rows = ""
        for label, value, css_class in metrics:
            rows += f'''
            <div class="metric-row">
                <span class="metric-label">{label}</span>
                <span class="metric-value {css_class}">{value}</span>
            </div>'''

        return f'''
        <div class="metric-card">
            <h3>{title}</h3>
            {rows}
        </div>'''

    def _build_shareholding_table(self, sh: Dict) -> str:
        """Build shareholding pattern table."""
        if not sh.get('current_pattern'):
            return '<p>Shareholding data not available</p>'

        rows = ""
        for holder, pct in sh['current_pattern'].items():
            change = sh.get('changes_2yr', {}).get(holder)
            change_str = f"{change:+.1f}%" if change is not None else "N/A"
            change_class = "positive" if change and change > 0 else "negative" if change and change < 0 else ""

            rows += f'''
            <tr>
                <td>{holder}</td>
                <td>{pct:.1f}%</td>
                <td class="{change_class}">{change_str}</td>
            </tr>'''

        return f'''
        <table>
            <thead>
                <tr>
                    <th>Holder Type</th>
                    <th>Current %</th>
                    <th>2Y Change</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>'''

    def _build_peer_table(self, peers: list) -> str:
        """Build peer comparison table."""
        if not peers:
            return '<p>Peer comparison data not available</p>'

        rows = ""
        for peer in peers[:10]:
            name = str(peer.get('name', 'N/A'))[:35]
            pe = self._format_number(peer.get('pe'))
            roce = self._format_percent(peer.get('roce'))
            mc = self._format_currency(peer.get('market_cap'))

            rows += f'''
            <tr>
                <td>{name}</td>
                <td>{pe}</td>
                <td>{roce}</td>
                <td>{mc}</td>
            </tr>'''

        return f'''
        <table>
            <thead>
                <tr>
                    <th>Company</th>
                    <th>PE</th>
                    <th>ROCE</th>
                    <th>Market Cap</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>'''

    def _build_signals_list(self, signals: list, empty_message: str) -> str:
        """Build signals list HTML."""
        if not signals:
            return f'<div class="signal-item" style="color: #888;">{empty_message}</div>'

        items = ""
        for signal in signals:
            items += f'<div class="signal-item">{signal}</div>'

        return items

    def _format_number(self, value) -> str:
        """Format a number for display."""
        if value is None:
            return "N/A"
        if isinstance(value, (int, float)):
            return f"{value:.2f}"
        return str(value)

    def _format_percent(self, value) -> str:
        """Format a percentage for display."""
        if value is None:
            return "N/A"
        return f"{value:.1f}%"

    def _format_currency(self, value, symbol: str = '₹') -> str:
        """Format currency for display."""
        if value is None:
            return "N/A"
        if abs(value) >= 100000:
            return f"{symbol}{value:,.0f} Cr"
        elif abs(value) >= 1000:
            return f"{symbol}{value:,.0f} Cr"
        else:
            return f"{symbol}{value:,.2f}"
