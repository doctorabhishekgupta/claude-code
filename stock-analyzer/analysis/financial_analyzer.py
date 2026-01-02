"""Financial analysis calculations for stock analysis."""

from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import math


@dataclass
class AnalysisResult:
    """Container for analysis results."""
    company_name: str
    analysis_date: str
    metrics: Dict[str, Any]
    peer_comparison: List[Dict]
    shareholding_analysis: Dict[str, Any]
    fcf_valuation: Dict[str, Any]
    red_flags: List[str]
    positive_signals: List[str]
    summary: str


class FinancialAnalyzer:
    """Performs financial analysis on scraped stock data."""

    def __init__(self):
        self.screener_data = {}
        self.tickertape_data = {}
        self.moneycontrol_data = {}

    def set_data(self, screener_data: Dict, tickertape_data: Dict, moneycontrol_data: Dict):
        """Set the scraped data for analysis."""
        self.screener_data = screener_data or {}
        self.tickertape_data = tickertape_data or {}
        self.moneycontrol_data = moneycontrol_data or {}

    def analyze(self, company_name: str) -> AnalysisResult:
        """Perform comprehensive financial analysis."""
        metrics = self._calculate_all_metrics()
        peer_comparison = self._analyze_peers()
        shareholding_analysis = self._analyze_shareholding()
        fcf_valuation = self._calculate_fcf_valuation()
        red_flags, positive_signals = self._identify_signals(metrics, shareholding_analysis)
        summary = self._generate_summary(metrics, fcf_valuation, red_flags, positive_signals)

        return AnalysisResult(
            company_name=company_name,
            analysis_date=datetime.now().strftime("%Y-%m-%d %H:%M"),
            metrics=metrics,
            peer_comparison=peer_comparison,
            shareholding_analysis=shareholding_analysis,
            fcf_valuation=fcf_valuation,
            red_flags=red_flags,
            positive_signals=positive_signals,
            summary=summary
        )

    def _calculate_all_metrics(self) -> Dict[str, Any]:
        """Calculate all requested financial metrics."""
        metrics = {
            'operating_margin': self._calculate_operating_margin(),
            'sales_cagr': self._calculate_sales_cagr(),
            'roce': self._get_roce(),
            'roe': self._get_roe(),
            'pe_ratio': self._get_pe_ratio(),
            'peg_ratio': self._get_peg_ratio(),
            'debt_equity': self._calculate_debt_equity(),
            'eps': self._get_eps_history(),
            'stock_price_cagr': self._calculate_stock_price_cagr(),
            'market_cap': self._get_market_cap()
        }
        return metrics

    def _calculate_operating_margin(self) -> Dict[str, Any]:
        """Calculate operating margin over the years."""
        result = {
            'current': None,
            'yearly_data': {},
            '10_year_avg': None,
            'trend': 'Stable'
        }

        # Get from Screener data
        ratios = self.screener_data.get('ratios', {})
        if 'OPM' in ratios:
            result['current'] = ratios['OPM']

        # Try to calculate from profit/loss data
        profit_loss = self.screener_data.get('profit_loss', [])

        sales_data = {}
        operating_profit_data = {}

        for item in profit_loss:
            metric = item.get('metric', '').lower()
            if metric in ['sales', 'revenue', 'revenue from operations']:
                sales_data = item.get('values', {})
            elif 'operating profit' in metric or metric == 'ebit':
                operating_profit_data = item.get('values', {})

        # Calculate yearly operating margins
        if sales_data and operating_profit_data:
            margins = []
            for year in sales_data:
                if year in operating_profit_data:
                    sales = sales_data.get(year)
                    op_profit = operating_profit_data.get(year)
                    if sales and op_profit and sales != 0:
                        margin = (op_profit / sales) * 100
                        result['yearly_data'][year] = round(margin, 2)
                        margins.append(margin)

            if margins:
                result['10_year_avg'] = round(sum(margins) / len(margins), 2)
                # Determine trend
                if len(margins) >= 3:
                    recent_avg = sum(margins[:3]) / 3
                    older_avg = sum(margins[-3:]) / 3
                    if recent_avg > older_avg * 1.1:
                        result['trend'] = 'Improving'
                    elif recent_avg < older_avg * 0.9:
                        result['trend'] = 'Declining'

        return result

    def _calculate_sales_cagr(self) -> Dict[str, Any]:
        """Calculate CAGR of sales/revenue."""
        result = {
            '3_year': None,
            '5_year': None,
            '10_year': None,
            'yearly_growth': {}
        }

        # Get sales data from Screener
        profit_loss = self.screener_data.get('profit_loss', [])
        sales_data = {}

        for item in profit_loss:
            metric = item.get('metric', '').lower()
            if metric in ['sales', 'revenue', 'revenue from operations', 'net sales']:
                sales_data = item.get('values', {})
                break

        if not sales_data:
            return result

        # Sort years
        years = sorted([y for y in sales_data.keys() if sales_data[y] is not None], reverse=True)

        if len(years) < 2:
            return result

        # Calculate yearly growth
        for i in range(len(years) - 1):
            current_year = years[i]
            prev_year = years[i + 1]
            current_sales = sales_data.get(current_year)
            prev_sales = sales_data.get(prev_year)
            if current_sales and prev_sales and prev_sales != 0:
                growth = ((current_sales - prev_sales) / prev_sales) * 100
                result['yearly_growth'][current_year] = round(growth, 2)

        # Calculate CAGR for different periods
        latest_year = years[0]
        latest_sales = sales_data.get(latest_year)

        for period, key in [(3, '3_year'), (5, '5_year'), (10, '10_year')]:
            if len(years) > period:
                start_year = years[period]
                start_sales = sales_data.get(start_year)
                if latest_sales and start_sales and start_sales > 0:
                    cagr = self._calculate_cagr(start_sales, latest_sales, period)
                    result[key] = round(cagr, 2)

        return result

    def _calculate_cagr(self, start_value: float, end_value: float, years: int) -> float:
        """Calculate Compound Annual Growth Rate."""
        if start_value <= 0 or years <= 0:
            return 0
        return (((end_value / start_value) ** (1 / years)) - 1) * 100

    def _get_roce(self) -> Dict[str, Any]:
        """Get Return on Capital Employed data."""
        result = {
            'current': None,
            'yearly_data': {},
            '10_year_avg': None
        }

        # From Screener ratios
        ratios = self.screener_data.get('ratios', {})
        if 'ROCE' in ratios:
            result['current'] = ratios['ROCE']

        # Try to get historical ROCE
        # Usually available in the ratios section or can be calculated

        return result

    def _get_roe(self) -> Dict[str, Any]:
        """Get Return on Equity data."""
        result = {
            'current': None,
            'yearly_data': {},
            '10_year_avg': None
        }

        # From Screener ratios
        ratios = self.screener_data.get('ratios', {})
        if 'ROE' in ratios:
            result['current'] = ratios['ROE']

        return result

    def _get_pe_ratio(self) -> Dict[str, Any]:
        """Get Price to Earnings ratio."""
        result = {
            'current': None,
            'industry_avg': None,
            'historical_avg': None,
            'assessment': 'Fairly Valued'
        }

        # From Screener
        ratios = self.screener_data.get('ratios', {})
        result['current'] = ratios.get('Stock PE') or ratios.get('PE')

        # From Moneycontrol
        mc_overview = self.moneycontrol_data.get('overview', {})
        if not result['current']:
            result['current'] = mc_overview.get('PE Ratio')

        result['industry_avg'] = mc_overview.get('Industry PE')

        # Assessment
        if result['current'] and result['industry_avg']:
            if result['current'] < result['industry_avg'] * 0.8:
                result['assessment'] = 'Potentially Undervalued'
            elif result['current'] > result['industry_avg'] * 1.2:
                result['assessment'] = 'Potentially Overvalued'

        return result

    def _get_peg_ratio(self) -> Dict[str, Any]:
        """Get PEG ratio (PE to Growth)."""
        result = {
            'current': None,
            'assessment': 'N/A'
        }

        # Try from Tickertape
        tt_valuation = self.tickertape_data.get('valuation', {})
        result['current'] = tt_valuation.get('PEG Ratio')

        # If not available, calculate from PE and growth
        if not result['current']:
            pe = self._get_pe_ratio()['current']
            growth = self._calculate_sales_cagr()['3_year']
            if pe and growth and growth > 0:
                result['current'] = round(pe / growth, 2)

        # Assessment
        if result['current']:
            if result['current'] < 1:
                result['assessment'] = 'Undervalued relative to growth'
            elif result['current'] > 2:
                result['assessment'] = 'Overvalued relative to growth'
            else:
                result['assessment'] = 'Fairly valued relative to growth'

        return result

    def _calculate_debt_equity(self) -> Dict[str, Any]:
        """Calculate Debt to Equity ratio."""
        result = {
            'current': None,
            'yearly_data': {},
            'trend': 'Stable',
            'assessment': 'N/A'
        }

        # From Screener ratios
        ratios = self.screener_data.get('ratios', {})
        if 'Debt to equity' in ratios:
            result['current'] = ratios['Debt to equity']
        elif 'D/E' in ratios:
            result['current'] = ratios['D/E']

        # Try to calculate from balance sheet
        balance_sheet = self.screener_data.get('balance_sheet', [])

        debt_data = {}
        equity_data = {}

        for item in balance_sheet:
            metric = item.get('metric', '').lower()
            if 'borrowing' in metric or 'debt' in metric:
                debt_data = item.get('values', {})
            elif 'equity' in metric and 'share capital' not in metric:
                equity_data = item.get('values', {})

        # Calculate yearly D/E
        if debt_data and equity_data:
            de_values = []
            for year in debt_data:
                if year in equity_data:
                    debt = debt_data.get(year, 0) or 0
                    equity = equity_data.get(year)
                    if equity and equity != 0:
                        de = debt / equity
                        result['yearly_data'][year] = round(de, 2)
                        de_values.append(de)

            # Determine trend
            if len(de_values) >= 3:
                recent = sum(de_values[:2]) / 2
                older = sum(de_values[-2:]) / 2
                if recent > older * 1.2:
                    result['trend'] = 'Increasing (Negative)'
                elif recent < older * 0.8:
                    result['trend'] = 'Decreasing (Positive)'

        # Assessment
        if result['current'] is not None:
            if result['current'] < 0.5:
                result['assessment'] = 'Conservative - Low leverage'
            elif result['current'] < 1:
                result['assessment'] = 'Moderate leverage'
            elif result['current'] < 2:
                result['assessment'] = 'High leverage - Monitor closely'
            else:
                result['assessment'] = 'Very high leverage - Risk'

        return result

    def _get_eps_history(self) -> Dict[str, Any]:
        """Get Earnings Per Share history."""
        result = {
            'current': None,
            'yearly_data': {},
            'growth_rate': None
        }

        # From profit/loss
        profit_loss = self.screener_data.get('profit_loss', [])
        for item in profit_loss:
            metric = item.get('metric', '').lower()
            if 'eps' in metric:
                result['yearly_data'] = item.get('values', {})
                break

        # Calculate growth rate
        years = sorted([y for y in result['yearly_data'].keys()
                       if result['yearly_data'][y] is not None], reverse=True)
        if years:
            result['current'] = result['yearly_data'].get(years[0])

            if len(years) >= 5:
                start_eps = result['yearly_data'].get(years[-1])
                end_eps = result['yearly_data'].get(years[0])
                if start_eps and end_eps and start_eps > 0:
                    result['growth_rate'] = self._calculate_cagr(start_eps, end_eps, len(years) - 1)

        # Also try from Moneycontrol
        mc_overview = self.moneycontrol_data.get('overview', {})
        if not result['current']:
            result['current'] = mc_overview.get('EPS')

        return result

    def _calculate_stock_price_cagr(self) -> Dict[str, Any]:
        """Calculate stock price CAGR."""
        result = {
            '1_year': None,
            '3_year': None,
            '5_year': None,
            '10_year': None
        }

        # Try from Moneycontrol
        price_stats = self.moneycontrol_data.get('price_data', {}).get('stats', {})

        if '1 Year Return' in price_stats:
            result['1_year'] = price_stats['1 Year Return']
        if '3 Year Return' in price_stats:
            # Convert total return to CAGR
            total_return = price_stats['3 Year Return']
            if total_return:
                result['3_year'] = round(self._total_to_cagr(total_return, 3), 2)
        if '5 Year Return' in price_stats:
            total_return = price_stats['5 Year Return']
            if total_return:
                result['5_year'] = round(self._total_to_cagr(total_return, 5), 2)

        return result

    def _total_to_cagr(self, total_return_pct: float, years: int) -> float:
        """Convert total return percentage to CAGR."""
        if years <= 0:
            return 0
        # total_return_pct is like 50 for 50%
        multiplier = 1 + (total_return_pct / 100)
        return ((multiplier ** (1 / years)) - 1) * 100

    def _get_market_cap(self) -> Dict[str, Any]:
        """Get current market capitalization."""
        result = {
            'value_cr': None,
            'category': 'Unknown'
        }

        # From Screener
        ratios = self.screener_data.get('ratios', {})
        result['value_cr'] = ratios.get('Market Cap')

        # From Moneycontrol
        if not result['value_cr']:
            mc_overview = self.moneycontrol_data.get('overview', {})
            result['value_cr'] = mc_overview.get('Market Cap')

        # Categorize
        if result['value_cr']:
            if result['value_cr'] >= 100000:
                result['category'] = 'Large Cap (>₹1,00,000 Cr)'
            elif result['value_cr'] >= 20000:
                result['category'] = 'Mid Cap (₹20,000-1,00,000 Cr)'
            else:
                result['category'] = 'Small Cap (<₹20,000 Cr)'

        return result

    def _calculate_fcf_valuation(self) -> Dict[str, Any]:
        """Calculate Free Cash Flow based valuation."""
        result = {
            'avg_fcf_3yr': None,
            'valuation_at_2pct': None,
            'current_market_cap': None,
            'valuation_vs_market': None,
            'fcf_negative_years': 0,
            'fcf_history': {},
            'assessment': 'N/A'
        }

        # Get FCF data from Tickertape
        fcf_data = self.tickertape_data.get('free_cash_flow', [])
        cash_flow = self.tickertape_data.get('cash_flow', {})

        # Also try from Screener cash flow
        screener_cf = self.screener_data.get('cash_flow', [])

        fcf_values = []

        # Extract FCF from Tickertape
        if fcf_data:
            for item in fcf_data:
                if isinstance(item, dict):
                    fcf = item.get('fcf')
                    year = item.get('year')
                    if fcf is not None:
                        fcf_values.append(fcf)
                        if year:
                            result['fcf_history'][year] = fcf
                elif isinstance(item, (int, float)):
                    fcf_values.append(item)

        # Try from Tickertape cash_flow
        if not fcf_values and 'fcf' in cash_flow:
            fcf_values = cash_flow['fcf']

        # Try from Screener
        if not fcf_values:
            for item in screener_cf:
                metric = item.get('metric', '').lower()
                if 'free cash flow' in metric or 'fcf' in metric:
                    values = item.get('values', {})
                    for year, val in values.items():
                        if val is not None:
                            fcf_values.append(val)
                            result['fcf_history'][year] = val

        # Count negative FCF years (in past 10 years)
        for val in fcf_values[:10]:
            if val is not None and val < 0:
                result['fcf_negative_years'] += 1

        # Calculate 3-year average FCF (most recent 3 years)
        recent_fcf = [v for v in fcf_values[:3] if v is not None]
        if recent_fcf:
            result['avg_fcf_3yr'] = sum(recent_fcf) / len(recent_fcf)

            # Valuation at 2% yield = FCF / 0.02
            result['valuation_at_2pct'] = result['avg_fcf_3yr'] / 0.02

        # Get market cap for comparison
        market_cap = self._get_market_cap()['value_cr']
        result['current_market_cap'] = market_cap

        # Compare valuation to market cap
        if result['valuation_at_2pct'] and market_cap:
            ratio = result['valuation_at_2pct'] / market_cap
            if ratio > 1.5:
                result['valuation_vs_market'] = f'FCF valuation {ratio:.1f}x higher than market cap - Potentially undervalued'
                result['assessment'] = 'Attractive'
            elif ratio > 1:
                result['valuation_vs_market'] = f'FCF valuation {ratio:.1f}x higher than market cap'
                result['assessment'] = 'Fair'
            elif ratio > 0.5:
                result['valuation_vs_market'] = f'FCF valuation {ratio:.1f}x of market cap'
                result['assessment'] = 'Expensive'
            else:
                result['valuation_vs_market'] = f'FCF valuation only {ratio:.1f}x of market cap - Potentially overvalued'
                result['assessment'] = 'Very Expensive'

        # Add FCF consistency comment
        if result['fcf_negative_years'] == 0:
            result['fcf_consistency'] = 'Excellent - No negative FCF years in available data'
        elif result['fcf_negative_years'] <= 2:
            result['fcf_consistency'] = f'Good - Only {result["fcf_negative_years"]} negative FCF year(s)'
        else:
            result['fcf_consistency'] = f'Concerning - {result["fcf_negative_years"]} negative FCF years'

        return result

    def _analyze_peers(self) -> List[Dict]:
        """Analyze peer comparison data."""
        peers = self.screener_data.get('peers', [])
        analyzed_peers = []

        for peer in peers[:10]:  # Top 10 peers
            peer_analysis = {
                'name': peer.get('Name') or peer.get('S.No.', 'Unknown'),
                'cmp': peer.get('CMP Rs.') or peer.get('Price'),
                'pe': peer.get('P/E') or peer.get('PE'),
                'market_cap': peer.get('Mar Cap Rs.Cr.') or peer.get('Market Cap'),
                'roce': peer.get('ROCE %') or peer.get('ROCE'),
                'roe': peer.get('ROE %') or peer.get('ROE')
            }
            analyzed_peers.append(peer_analysis)

        return analyzed_peers

    def _analyze_shareholding(self) -> Dict[str, Any]:
        """Analyze shareholding pattern for red flags or positive signals."""
        result = {
            'current_pattern': {},
            'changes_2yr': {},
            'red_flags': [],
            'positive_signals': [],
            'summary': ''
        }

        # Get shareholding from Screener
        shareholding = self.screener_data.get('shareholding', [])

        if not shareholding:
            # Try Moneycontrol
            shareholding = self.moneycontrol_data.get('shareholding', [])

        if not shareholding:
            result['summary'] = 'Shareholding data not available'
            return result

        for holder in shareholding:
            holder_type = holder.get('holder_type', '')
            percentages = holder.get('percentages', {})

            if not percentages:
                continue

            # Get latest and historical percentages
            quarters = sorted(percentages.keys(), reverse=True)
            if not quarters:
                continue

            current_pct = percentages.get(quarters[0])
            result['current_pattern'][holder_type] = current_pct

            # Calculate 2-year change if data available
            if len(quarters) >= 8:  # ~2 years of quarterly data
                old_pct = percentages.get(quarters[7])
                if current_pct is not None and old_pct is not None:
                    change = current_pct - old_pct
                    result['changes_2yr'][holder_type] = round(change, 2)

                    # Analyze changes
                    holder_lower = holder_type.lower()

                    if 'promoter' in holder_lower:
                        if change < -5:
                            result['red_flags'].append(
                                f'Promoter holding decreased by {abs(change):.1f}% over 2 years'
                            )
                        elif change > 2:
                            result['positive_signals'].append(
                                f'Promoter holding increased by {change:.1f}% over 2 years'
                            )

                    elif 'fii' in holder_lower or 'foreign' in holder_lower:
                        if change > 5:
                            result['positive_signals'].append(
                                f'FII holding increased by {change:.1f}% - Institutional confidence'
                            )
                        elif change < -5:
                            result['red_flags'].append(
                                f'FII holding decreased by {abs(change):.1f}%'
                            )

                    elif 'dii' in holder_lower or 'domestic' in holder_lower:
                        if change > 3:
                            result['positive_signals'].append(
                                f'DII holding increased by {change:.1f}%'
                            )

                    elif 'public' in holder_lower:
                        if change > 10:
                            result['red_flags'].append(
                                f'Public holding increased significantly by {change:.1f}% - Check for promoter selling'
                            )

        # Generate summary
        if result['red_flags']:
            result['summary'] = 'Caution: ' + '; '.join(result['red_flags'][:2])
        elif result['positive_signals']:
            result['summary'] = 'Positive: ' + '; '.join(result['positive_signals'][:2])
        else:
            result['summary'] = 'Shareholding pattern appears stable'

        return result

    def _identify_signals(self, metrics: Dict, shareholding: Dict) -> Tuple[List[str], List[str]]:
        """Identify red flags and positive signals from the analysis."""
        red_flags = []
        positive_signals = []

        # Check PE ratio
        pe_data = metrics.get('pe_ratio', {})
        if pe_data.get('current'):
            pe = pe_data['current']
            if pe > 50:
                red_flags.append(f'Very high PE ratio ({pe:.1f}) - Expensive valuation')
            elif pe < 10:
                positive_signals.append(f'Low PE ratio ({pe:.1f}) - Potentially undervalued')

        # Check Debt/Equity
        de_data = metrics.get('debt_equity', {})
        if de_data.get('current'):
            de = de_data['current']
            if de > 2:
                red_flags.append(f'High Debt/Equity ratio ({de:.2f}) - Financial risk')
            elif de < 0.3:
                positive_signals.append(f'Low Debt/Equity ratio ({de:.2f}) - Strong balance sheet')

        # Check ROCE
        roce_data = metrics.get('roce', {})
        if roce_data.get('current'):
            roce = roce_data['current']
            if roce > 20:
                positive_signals.append(f'Strong ROCE ({roce:.1f}%) - Efficient capital use')
            elif roce < 10:
                red_flags.append(f'Low ROCE ({roce:.1f}%) - Poor capital efficiency')

        # Check ROE
        roe_data = metrics.get('roe', {})
        if roe_data.get('current'):
            roe = roe_data['current']
            if roe > 20:
                positive_signals.append(f'Strong ROE ({roe:.1f}%) - Good shareholder returns')
            elif roe < 10:
                red_flags.append(f'Low ROE ({roe:.1f}%)')

        # Check Sales Growth
        sales_cagr = metrics.get('sales_cagr', {})
        if sales_cagr.get('5_year'):
            growth = sales_cagr['5_year']
            if growth > 15:
                positive_signals.append(f'Strong 5-year sales CAGR ({growth:.1f}%)')
            elif growth < 5:
                red_flags.append(f'Slow revenue growth ({growth:.1f}% 5Y CAGR)')

        # Check Operating Margin trend
        opm = metrics.get('operating_margin', {})
        if opm.get('trend') == 'Declining':
            red_flags.append('Declining operating margins')
        elif opm.get('trend') == 'Improving':
            positive_signals.append('Improving operating margins')

        # Add shareholding signals
        red_flags.extend(shareholding.get('red_flags', []))
        positive_signals.extend(shareholding.get('positive_signals', []))

        return red_flags, positive_signals

    def _generate_summary(self, metrics: Dict, fcf_valuation: Dict,
                          red_flags: List[str], positive_signals: List[str]) -> str:
        """Generate an executive summary of the analysis."""
        lines = []

        # Overall assessment
        if len(positive_signals) > len(red_flags) + 2:
            lines.append("OVERALL: Stock shows strong fundamentals with multiple positive indicators.")
        elif len(red_flags) > len(positive_signals) + 2:
            lines.append("OVERALL: Caution advised - Multiple concerns identified.")
        else:
            lines.append("OVERALL: Mixed signals - Detailed analysis recommended.")

        # Key metrics summary
        market_cap = metrics.get('market_cap', {})
        if market_cap.get('value_cr'):
            lines.append(f"Market Cap: ₹{market_cap['value_cr']:,.0f} Cr ({market_cap['category']})")

        pe = metrics.get('pe_ratio', {})
        if pe.get('current'):
            lines.append(f"PE Ratio: {pe['current']:.1f} ({pe['assessment']})")

        # FCF Valuation
        if fcf_valuation.get('valuation_at_2pct'):
            lines.append(f"FCF-based Valuation (at 2% yield): ₹{fcf_valuation['valuation_at_2pct']:,.0f} Cr")
            if fcf_valuation.get('valuation_vs_market'):
                lines.append(f"  → {fcf_valuation['valuation_vs_market']}")

        # Growth
        sales_cagr = metrics.get('sales_cagr', {})
        if sales_cagr.get('5_year'):
            lines.append(f"5-Year Revenue CAGR: {sales_cagr['5_year']:.1f}%")

        return '\n'.join(lines)
