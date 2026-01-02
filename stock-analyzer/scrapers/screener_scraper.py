"""Scraper for Screener.in financial data."""

from typing import Dict, Any, List, Optional
from .base_scraper import BaseScraper
import re


class ScreenerScraper(BaseScraper):
    """Scraper for extracting financial data from Screener.in."""

    def __init__(self):
        super().__init__()
        self.company_name = ""
        self.data = {
            'ratios': {},
            'quarterly_results': [],
            'annual_results': [],
            'balance_sheet': [],
            'cash_flow': [],
            'shareholding': [],
            'peers': []
        }

    def scrape(self, url: str) -> Dict[str, Any]:
        """Scrape all financial data from Screener.in."""
        soup = self.fetch_page(url)
        if not soup:
            return self.data

        # Extract company name
        self._extract_company_name(soup)

        # Extract key ratios from the top section
        self._extract_key_ratios(soup)

        # Extract profit & loss data
        self._extract_profit_loss(soup)

        # Extract balance sheet data
        self._extract_balance_sheet(soup)

        # Extract cash flow data
        self._extract_cash_flow(soup)

        # Extract shareholding pattern
        self._extract_shareholding(soup)

        # Extract peer comparison
        self._extract_peers(soup)

        return self.data

    def _extract_company_name(self, soup) -> None:
        """Extract company name from page."""
        name_elem = soup.find('h1', class_='margin-0')
        if name_elem:
            self.company_name = name_elem.get_text(strip=True)
        else:
            # Try alternative selector
            name_elem = soup.find('h1')
            if name_elem:
                self.company_name = name_elem.get_text(strip=True)

    def _extract_key_ratios(self, soup) -> None:
        """Extract key financial ratios from the top section."""
        ratios = {}

        # Find the ratios list (top-ratios section)
        ratio_list = soup.find('ul', id='top-ratios')
        if ratio_list:
            items = ratio_list.find_all('li')
            for item in items:
                name_elem = item.find('span', class_='name')
                value_elem = item.find('span', class_='number')
                if name_elem and value_elem:
                    name = name_elem.get_text(strip=True)
                    value = self.clean_number(value_elem.get_text(strip=True))
                    ratios[name] = value

        # Also extract from the warehouse data section
        warehouse = soup.find('div', id='warehouse-data')
        if warehouse:
            data_items = warehouse.find_all(['span', 'li'])
            for item in data_items:
                text = item.get_text(strip=True)
                if ':' in text:
                    parts = text.split(':')
                    if len(parts) == 2:
                        ratios[parts[0].strip()] = self.clean_number(parts[1].strip())

        # Extract specific metrics from different areas
        # Market Cap
        market_cap_elem = soup.find(string=re.compile(r'Market Cap'))
        if market_cap_elem:
            parent = market_cap_elem.find_parent()
            if parent:
                value = parent.find_next('span', class_='number')
                if value:
                    ratios['Market Cap'] = self.parse_cr_value(value.get_text(strip=True))

        # Current Price
        price_elem = soup.find('span', class_='current-price')
        if price_elem:
            ratios['Current Price'] = self.clean_number(price_elem.get_text(strip=True))

        # Stock PE
        pe_match = soup.find(string=re.compile(r'Stock P/E'))
        if pe_match:
            parent = pe_match.find_parent()
            if parent:
                value = parent.find_next('span', class_='number')
                if value:
                    ratios['Stock PE'] = self.clean_number(value.get_text(strip=True))

        # ROCE and ROE from ranges section
        for metric in ['ROCE', 'ROE', 'Book Value', 'Dividend Yield', 'Face Value']:
            metric_elem = soup.find(string=re.compile(f'^{metric}'))
            if metric_elem:
                parent = metric_elem.find_parent()
                if parent:
                    value_elem = parent.find('span', class_='number')
                    if value_elem:
                        ratios[metric] = self.clean_number(value_elem.get_text(strip=True))

        self.data['ratios'] = ratios

    def _extract_table_data(self, soup, section_id: str) -> List[Dict[str, Any]]:
        """Extract data from a Screener data table."""
        data_rows = []

        section = soup.find('section', id=section_id)
        if not section:
            # Try finding by data-result-table attribute
            section = soup.find('section', {'data-result-table': section_id})
        if not section:
            return data_rows

        table = section.find('table')
        if not table:
            return data_rows

        # Get headers (years)
        headers = []
        header_row = table.find('thead')
        if header_row:
            ths = header_row.find_all('th')
            for th in ths:
                headers.append(th.get_text(strip=True))

        # Get data rows
        tbody = table.find('tbody')
        if tbody:
            rows = tbody.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if cells:
                    row_data = {
                        'metric': cells[0].get_text(strip=True) if cells else '',
                        'values': {}
                    }
                    for i, cell in enumerate(cells[1:], 1):
                        if i < len(headers):
                            row_data['values'][headers[i]] = self.clean_number(cell.get_text(strip=True))
                    data_rows.append(row_data)

        return data_rows

    def _extract_profit_loss(self, soup) -> None:
        """Extract profit & loss statement data."""
        self.data['profit_loss'] = self._extract_table_data(soup, 'profit-loss')

        # Also try extracting from the annual/quarterly sections
        annual_section = soup.find('section', id='profit-loss')
        if annual_section:
            # Try to get the 10-year data
            table = annual_section.find('table', class_='data-table')
            if table:
                self._parse_financial_table(table, 'annual_results')

    def _extract_balance_sheet(self, soup) -> None:
        """Extract balance sheet data."""
        self.data['balance_sheet'] = self._extract_table_data(soup, 'balance-sheet')

    def _extract_cash_flow(self, soup) -> None:
        """Extract cash flow statement data."""
        self.data['cash_flow'] = self._extract_table_data(soup, 'cash-flow')

    def _extract_shareholding(self, soup) -> None:
        """Extract shareholding pattern data."""
        shareholding_section = soup.find('section', id='shareholding')
        if not shareholding_section:
            return

        table = shareholding_section.find('table')
        if not table:
            return

        headers = []
        header_row = table.find('thead')
        if header_row:
            ths = header_row.find_all('th')
            for th in ths:
                headers.append(th.get_text(strip=True))

        shareholding_data = []
        tbody = table.find('tbody')
        if tbody:
            rows = tbody.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if cells:
                    holder_type = cells[0].get_text(strip=True)
                    percentages = {}
                    for i, cell in enumerate(cells[1:], 1):
                        if i < len(headers):
                            percentages[headers[i]] = self.clean_number(cell.get_text(strip=True))
                    shareholding_data.append({
                        'holder_type': holder_type,
                        'percentages': percentages
                    })

        self.data['shareholding'] = shareholding_data

    def _extract_peers(self, soup) -> None:
        """Extract peer comparison data."""
        peers_section = soup.find('section', id='peers')
        if not peers_section:
            # Try alternative selectors
            peers_section = soup.find('section', {'id': re.compile(r'peer')})

        if not peers_section:
            return

        table = peers_section.find('table')
        if not table:
            return

        # Get headers
        headers = []
        header_row = table.find('thead')
        if header_row:
            ths = header_row.find_all('th')
            for th in ths:
                headers.append(th.get_text(strip=True))

        # Get peer data
        peers = []
        tbody = table.find('tbody')
        if tbody:
            rows = tbody.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if cells:
                    peer_data = {}
                    for i, cell in enumerate(cells):
                        if i < len(headers):
                            header = headers[i]
                            value = cell.get_text(strip=True)
                            # Store company name as-is, numbers cleaned
                            if i == 0 or header.lower() in ['name', 'company', 's.no.']:
                                peer_data[header] = value
                            else:
                                peer_data[header] = self.clean_number(value)
                    peers.append(peer_data)

        self.data['peers'] = peers

    def _parse_financial_table(self, table, data_key: str) -> None:
        """Parse a financial data table and store results."""
        if not table:
            return

        # Get all headers (years/quarters)
        headers = []
        thead = table.find('thead')
        if thead:
            for th in thead.find_all('th'):
                headers.append(th.get_text(strip=True))

        # Parse each row
        results = []
        tbody = table.find('tbody')
        if tbody:
            for row in tbody.find_all('tr'):
                cells = row.find_all(['td', 'th'])
                if cells:
                    metric = cells[0].get_text(strip=True)
                    values = {}
                    for i, cell in enumerate(cells[1:], 1):
                        if i < len(headers):
                            values[headers[i]] = self.clean_number(cell.get_text(strip=True))
                    results.append({'metric': metric, 'values': values})

        self.data[data_key] = results

    def get_company_name(self) -> str:
        """Return the company name."""
        return self.company_name

    def get_sales_data(self) -> Dict[str, float]:
        """Extract sales/revenue data by year."""
        sales = {}
        for item in self.data.get('profit_loss', []):
            if item.get('metric', '').lower() in ['sales', 'revenue', 'revenue from operations', 'net sales']:
                sales = item.get('values', {})
                break
        return sales

    def get_profit_data(self) -> Dict[str, float]:
        """Extract net profit data by year."""
        profit = {}
        for item in self.data.get('profit_loss', []):
            if 'net profit' in item.get('metric', '').lower() or 'pat' in item.get('metric', '').lower():
                profit = item.get('values', {})
                break
        return profit

    def get_operating_profit(self) -> Dict[str, float]:
        """Extract operating profit data by year."""
        op_profit = {}
        for item in self.data.get('profit_loss', []):
            metric = item.get('metric', '').lower()
            if 'operating profit' in metric or 'ebit' in metric:
                op_profit = item.get('values', {})
                break
        return op_profit

    def get_eps_data(self) -> Dict[str, float]:
        """Extract EPS data by year."""
        eps = {}
        for item in self.data.get('profit_loss', []):
            if 'eps' in item.get('metric', '').lower():
                eps = item.get('values', {})
                break
        return eps

    def get_debt_data(self) -> Dict[str, float]:
        """Extract total debt/borrowings data by year."""
        debt = {}
        for item in self.data.get('balance_sheet', []):
            metric = item.get('metric', '').lower()
            if 'borrowing' in metric or 'debt' in metric:
                debt = item.get('values', {})
                break
        return debt

    def get_equity_data(self) -> Dict[str, float]:
        """Extract shareholder equity data by year."""
        equity = {}
        for item in self.data.get('balance_sheet', []):
            metric = item.get('metric', '').lower()
            if 'equity' in metric and 'share' not in metric:
                equity = item.get('values', {})
                break
        return equity
