#!/usr/bin/env python3
"""Test script with sample data to verify analysis logic."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from analysis import FinancialAnalyzer
from reports import ReportGenerator

# Sample data simulating what would be scraped from websites
sample_screener_data = {
    'ratios': {
        'Market Cap': 45000,  # Cr
        'Stock PE': 18.5,
        'ROCE': 22.3,
        'ROE': 19.8,
        'Debt to equity': 0.45,
        'OPM': 32.5,
        'Current Price': 850
    },
    'profit_loss': [
        {
            'metric': 'Sales',
            'values': {
                '2024': 12500, '2023': 10800, '2022': 9200, '2021': 7800,
                '2020': 6500, '2019': 5800, '2018': 5200, '2017': 4500,
                '2016': 3900, '2015': 3400, '2014': 2900
            }
        },
        {
            'metric': 'Operating Profit',
            'values': {
                '2024': 4100, '2023': 3450, '2022': 2850, '2021': 2340,
                '2020': 1950, '2019': 1680, '2018': 1450, '2017': 1200,
                '2016': 1000, '2015': 850, '2014': 700
            }
        },
        {
            'metric': 'Net Profit',
            'values': {
                '2024': 2800, '2023': 2350, '2022': 1950, '2021': 1600,
                '2020': 1300, '2019': 1100, '2018': 950, '2017': 780,
                '2016': 650, '2015': 540, '2014': 450
            }
        },
        {
            'metric': 'EPS',
            'values': {
                '2024': 45.2, '2023': 38.5, '2022': 32.1, '2021': 26.8,
                '2020': 22.1, '2019': 18.5, '2018': 15.8, '2017': 13.2,
                '2016': 11.0, '2015': 9.2, '2014': 7.6
            }
        }
    ],
    'balance_sheet': [
        {
            'metric': 'Borrowings',
            'values': {
                '2024': 5500, '2023': 5200, '2022': 4800, '2021': 4500,
                '2020': 4200, '2019': 4000
            }
        },
        {
            'metric': 'Equity',
            'values': {
                '2024': 12200, '2023': 10800, '2022': 9500, '2021': 8200,
                '2020': 7100, '2019': 6200
            }
        }
    ],
    'cash_flow': [
        {
            'metric': 'Free Cash Flow',
            'values': {
                '2024': 1850, '2023': 1520, '2022': 1180, '2021': 920,
                '2020': -150, '2019': 680, '2018': 520, '2017': 380,
                '2016': 290, '2015': 210
            }
        }
    ],
    'shareholding': [
        {
            'holder_type': 'Promoters',
            'percentages': {'Dec 2024': 69.8, 'Sep 2024': 69.5, 'Jun 2024': 69.2,
                          'Mar 2024': 68.8, 'Dec 2023': 68.5, 'Sep 2023': 68.2,
                          'Jun 2023': 67.8, 'Mar 2023': 67.5}
        },
        {
            'holder_type': 'FIIs',
            'percentages': {'Dec 2024': 12.5, 'Sep 2024': 12.2, 'Jun 2024': 11.8,
                          'Mar 2024': 11.5, 'Dec 2023': 11.0, 'Sep 2023': 10.5,
                          'Jun 2023': 10.2, 'Mar 2023': 9.8}
        },
        {
            'holder_type': 'DIIs',
            'percentages': {'Dec 2024': 8.2, 'Sep 2024': 8.5, 'Jun 2024': 8.8,
                          'Mar 2024': 9.0, 'Dec 2023': 9.2, 'Sep 2023': 9.5,
                          'Jun 2023': 9.8, 'Mar 2023': 10.0}
        },
        {
            'holder_type': 'Public',
            'percentages': {'Dec 2024': 9.5, 'Sep 2024': 9.8, 'Jun 2024': 10.2,
                          'Mar 2024': 10.7, 'Dec 2023': 11.3, 'Sep 2023': 11.8,
                          'Jun 2023': 12.2, 'Mar 2023': 12.7}
        }
    ],
    'peers': [
        {'Name': 'ICICI Securities', 'CMP Rs.': 780, 'P/E': 15.2, 'Mar Cap Rs.Cr.': 25000, 'ROCE %': 18.5, 'ROE %': 16.2},
        {'Name': 'Angel One', 'CMP Rs.': 2450, 'P/E': 22.8, 'Mar Cap Rs.Cr.': 22000, 'ROCE %': 35.2, 'ROE %': 42.5},
        {'Name': 'HDFC Securities', 'CMP Rs.': 1250, 'P/E': 19.5, 'Mar Cap Rs.Cr.': 18500, 'ROCE %': 21.0, 'ROE %': 18.8},
        {'Name': 'Geojit Financial', 'CMP Rs.': 125, 'P/E': 12.8, 'Mar Cap Rs.Cr.': 3200, 'ROCE %': 15.5, 'ROE %': 14.2},
        {'Name': '5Paisa Capital', 'CMP Rs.': 520, 'P/E': 28.5, 'Mar Cap Rs.Cr.': 1500, 'ROCE %': 12.8, 'ROE %': 11.5}
    ]
}

sample_tickertape_data = {
    'overview': {
        'Current Price': 850,
        'Market Cap': 45000
    },
    'valuation': {
        'PE Ratio': 18.5,
        'PB Ratio': 3.2,
        'PEG Ratio': 0.85
    },
    'free_cash_flow': [
        {'year': '2024', 'fcf': 1850},
        {'year': '2023', 'fcf': 1520},
        {'year': '2022', 'fcf': 1180}
    ],
    'growth': {
        '3Y Revenue CAGR': 15.8,
        '5Y Revenue CAGR': 13.9
    }
}

sample_moneycontrol_data = {
    'overview': {
        'Current Price': 850,
        'Market Cap': 45000,
        'PE Ratio': 18.5,
        'Industry PE': 22.5,
        'EPS': 45.2,
        '52 Week High': 980,
        '52 Week Low': 620,
        'Book Value': 265,
        'Dividend Yield': 0.8
    },
    'price_data': {
        'stats': {
            '1 Year Return': 28.5,
            '3 Year Return': 95.2,
            '5 Year Return': 185.5
        }
    },
    'shareholding': []
}

def main():
    print("=" * 70)
    print("🧪 TESTING STOCK ANALYZER WITH SAMPLE DATA")
    print("=" * 70)
    print("\nThis test uses realistic sample data to verify the analysis logic.\n")

    # Create analyzer
    analyzer = FinancialAnalyzer()
    analyzer.set_data(sample_screener_data, sample_tickertape_data, sample_moneycontrol_data)

    # Run analysis
    print("🔄 Running financial analysis...")
    result = analyzer.analyze("Motilal Oswal Financial Services Ltd (SAMPLE DATA)")
    print("✅ Analysis complete!\n")

    # Generate text report
    report_generator = ReportGenerator()
    text_report = report_generator.generate_text_report(result)
    print(text_report)

    # Generate HTML report
    print("\n" + "-" * 50)
    html_path = report_generator.generate_html_report(result)
    print(f"📄 HTML Report saved to: {html_path}")
    print("\nYou can open this HTML file in a browser to see the formatted report.")

if __name__ == "__main__":
    main()
