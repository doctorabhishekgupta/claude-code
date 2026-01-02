#!/usr/bin/env python3
"""
Stock Analyzer - Comprehensive Financial Analysis Tool

A desktop application for analyzing Indian stocks using data from:
- Screener.in
- Tickertape.in
- Moneycontrol.com

Usage:
    python main.py          # Launch GUI application
    python main.py --cli    # Run in CLI mode (interactive)

Author: Stock Analyzer Tool
"""

import argparse
import sys
import os

# Ensure the package directory is in the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def run_gui():
    """Launch the graphical user interface."""
    try:
        from gui import StockAnalyzerApp
        app = StockAnalyzerApp()
        app.mainloop()
    except ImportError as e:
        print(f"Error: Could not import GUI module. {e}")
        print("Make sure customtkinter is installed: pip install customtkinter")
        sys.exit(1)


def run_cli():
    """Run in command-line interface mode."""
    from scrapers import ScreenerScraper, TickertapeScraper, MoneycontrolScraper
    from analysis import FinancialAnalyzer
    from reports import ReportGenerator

    print("=" * 60)
    print("📊 STOCK ANALYZER - CLI Mode")
    print("=" * 60)

    # Get inputs
    company_name = input("\nEnter Company Name: ").strip()

    print("\nEnter the following URLs:")
    screener_url = input("1. Screener.in URL: ").strip()
    tickertape_url = input("2. Tickertape.in URL: ").strip()
    moneycontrol_url = input("3. Moneycontrol.com URL: ").strip()

    if not all([company_name, screener_url, tickertape_url, moneycontrol_url]):
        print("Error: All fields are required!")
        sys.exit(1)

    print("\n" + "-" * 40)
    print("Starting analysis...")
    print("-" * 40)

    try:
        # Fetch data
        print("\n🔄 Fetching data from Screener.in...")
        screener_scraper = ScreenerScraper()
        screener_data = screener_scraper.scrape(screener_url)
        print("✅ Screener.in data fetched")

        print("🔄 Fetching data from Tickertape.in...")
        tickertape_scraper = TickertapeScraper()
        tickertape_data = tickertape_scraper.scrape(tickertape_url)
        print("✅ Tickertape.in data fetched")

        print("🔄 Fetching data from Moneycontrol...")
        moneycontrol_scraper = MoneycontrolScraper()
        moneycontrol_data = moneycontrol_scraper.scrape(moneycontrol_url)
        print("✅ Moneycontrol data fetched")

        # Analyze
        print("\n🔄 Analyzing financial data...")
        analyzer = FinancialAnalyzer()
        analyzer.set_data(screener_data, tickertape_data, moneycontrol_data)
        result = analyzer.analyze(company_name)
        print("✅ Analysis complete")

        # Generate reports
        report_generator = ReportGenerator()

        # Text report
        text_report = report_generator.generate_text_report(result)
        print("\n" + text_report)

        # Ask if user wants HTML report
        save_html = input("\n\nSave HTML report? (y/n): ").strip().lower()
        if save_html == 'y':
            html_path = report_generator.generate_html_report(result)
            print(f"\n✅ HTML report saved to: {html_path}")

    except KeyboardInterrupt:
        print("\n\nAnalysis cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error during analysis: {e}")
        sys.exit(1)


def run_quick_analysis(args):
    """Run quick analysis with provided arguments."""
    from scrapers import ScreenerScraper, TickertapeScraper, MoneycontrolScraper
    from analysis import FinancialAnalyzer
    from reports import ReportGenerator

    print(f"Analyzing {args.company}...")

    try:
        # Fetch data
        screener_scraper = ScreenerScraper()
        screener_data = screener_scraper.scrape(args.screener)

        tickertape_scraper = TickertapeScraper()
        tickertape_data = tickertape_scraper.scrape(args.tickertape)

        moneycontrol_scraper = MoneycontrolScraper()
        moneycontrol_data = moneycontrol_scraper.scrape(args.moneycontrol)

        # Analyze
        analyzer = FinancialAnalyzer()
        analyzer.set_data(screener_data, tickertape_data, moneycontrol_data)
        result = analyzer.analyze(args.company)

        # Generate reports
        report_generator = ReportGenerator()

        if args.output == 'text' or not args.output:
            text_report = report_generator.generate_text_report(result)
            print(text_report)

        if args.output == 'html' or args.html_file:
            output_path = args.html_file if args.html_file else None
            html_path = report_generator.generate_html_report(result, output_path)
            print(f"\nHTML report saved to: {html_path}")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Stock Analyzer - Comprehensive Financial Analysis Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                    # Launch GUI
  python main.py --cli              # Interactive CLI mode
  python main.py --company "XYZ Ltd" --screener URL --tickertape URL --moneycontrol URL

For more information, visit: https://github.com/stock-analyzer
        """
    )

    parser.add_argument(
        '--cli',
        action='store_true',
        help='Run in interactive CLI mode'
    )

    parser.add_argument(
        '--company',
        type=str,
        help='Company name for quick analysis'
    )

    parser.add_argument(
        '--screener',
        type=str,
        help='Screener.in URL'
    )

    parser.add_argument(
        '--tickertape',
        type=str,
        help='Tickertape.in URL'
    )

    parser.add_argument(
        '--moneycontrol',
        type=str,
        help='Moneycontrol.com URL'
    )

    parser.add_argument(
        '--output',
        choices=['text', 'html'],
        default='text',
        help='Output format (default: text)'
    )

    parser.add_argument(
        '--html-file',
        type=str,
        help='Path for HTML output file'
    )

    args = parser.parse_args()

    # If all URLs provided, run quick analysis
    if args.company and args.screener and args.tickertape and args.moneycontrol:
        run_quick_analysis(args)
    elif args.cli:
        run_cli()
    else:
        run_gui()


if __name__ == "__main__":
    main()
