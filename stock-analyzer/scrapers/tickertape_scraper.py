"""Scraper for Tickertape.in financial data."""

from typing import Dict, Any, List, Optional
from .base_scraper import BaseScraper
import re
import json


class TickertapeScraper(BaseScraper):
    """Scraper for extracting financial data from Tickertape.in."""

    def __init__(self):
        super().__init__()
        self.company_name = ""
        self.data = {
            'overview': {},
            'financials': {},
            'cash_flow': {},
            'free_cash_flow': [],
            'valuation': {},
            'growth': {},
            'price_history': {}
        }

    def scrape(self, url: str) -> Dict[str, Any]:
        """Scrape all financial data from Tickertape.in."""
        soup = self.fetch_page(url)
        if not soup:
            return self.data

        # Extract company name
        self._extract_company_name(soup)

        # Extract overview metrics
        self._extract_overview(soup)

        # Extract financial data from embedded JSON
        self._extract_json_data(soup)

        # Extract valuation metrics
        self._extract_valuation(soup)

        # Extract growth metrics
        self._extract_growth(soup)

        # Try to get cash flow data from financials tab
        self._extract_cash_flow_data(soup, url)

        return self.data

    def _extract_company_name(self, soup) -> None:
        """Extract company name from page."""
        # Try various selectors for company name
        name_elem = soup.find('h1', class_=re.compile(r'security-name|stock-name'))
        if not name_elem:
            name_elem = soup.find('h1')
        if name_elem:
            self.company_name = name_elem.get_text(strip=True)

    def _extract_overview(self, soup) -> None:
        """Extract overview/summary metrics."""
        overview = {}

        # Market price
        price_elem = soup.find('span', class_=re.compile(r'current-price|price'))
        if price_elem:
            overview['Current Price'] = self.clean_number(price_elem.get_text(strip=True))

        # Try to find key metrics sections
        metric_cards = soup.find_all(['div', 'span'], class_=re.compile(r'metric|stat|info-item'))
        for card in metric_cards:
            label_elem = card.find(['span', 'div'], class_=re.compile(r'label|title|name'))
            value_elem = card.find(['span', 'div'], class_=re.compile(r'value|number'))
            if label_elem and value_elem:
                label = label_elem.get_text(strip=True)
                value = value_elem.get_text(strip=True)
                overview[label] = self.clean_number(value) if self._is_numeric(value) else value

        # Extract from definition lists
        dl_elements = soup.find_all('dl')
        for dl in dl_elements:
            dts = dl.find_all('dt')
            dds = dl.find_all('dd')
            for dt, dd in zip(dts, dds):
                label = dt.get_text(strip=True)
                value = dd.get_text(strip=True)
                overview[label] = self.clean_number(value) if self._is_numeric(value) else value

        self.data['overview'] = overview

    def _extract_json_data(self, soup) -> None:
        """Extract financial data from embedded JSON scripts."""
        # Look for script tags containing JSON data
        scripts = soup.find_all('script', type='application/json')
        for script in scripts:
            try:
                data = json.loads(script.string)
                self._parse_json_financial_data(data)
            except (json.JSONDecodeError, TypeError):
                continue

        # Also try to find inline JavaScript data
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string:
                # Look for JSON-like structures
                json_matches = re.findall(r'window\.__INITIAL_STATE__\s*=\s*({.*?});', script.string, re.DOTALL)
                for match in json_matches:
                    try:
                        data = json.loads(match)
                        self._parse_json_financial_data(data)
                    except json.JSONDecodeError:
                        continue

    def _parse_json_financial_data(self, data: Dict) -> None:
        """Parse financial data from JSON structure."""
        if not isinstance(data, dict):
            return

        # Look for cash flow data
        if 'cashFlow' in data or 'cash_flow' in data:
            cf_data = data.get('cashFlow') or data.get('cash_flow', {})
            self._extract_fcf_from_json(cf_data)

        # Look for financial ratios
        if 'ratios' in data:
            self.data['financials'].update(data['ratios'])

        # Look for stock info
        if 'stock' in data:
            stock_data = data['stock']
            if isinstance(stock_data, dict):
                self.data['overview'].update(stock_data)

        # Recursively search for relevant data
        for key, value in data.items():
            if isinstance(value, dict):
                self._parse_json_financial_data(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        self._parse_json_financial_data(item)

    def _extract_fcf_from_json(self, cf_data: Dict) -> None:
        """Extract Free Cash Flow data from JSON."""
        if not isinstance(cf_data, dict):
            return

        fcf_list = []

        # Look for yearly FCF data
        if 'yearly' in cf_data:
            for year_data in cf_data['yearly']:
                if isinstance(year_data, dict):
                    fcf_list.append({
                        'year': year_data.get('year'),
                        'fcf': year_data.get('fcf') or year_data.get('freeCashFlow')
                    })

        # Alternative structure
        if 'fcf' in cf_data:
            if isinstance(cf_data['fcf'], list):
                self.data['free_cash_flow'] = cf_data['fcf']
            else:
                fcf_list.append({'fcf': cf_data['fcf']})

        if fcf_list:
            self.data['free_cash_flow'] = fcf_list

    def _extract_valuation(self, soup) -> None:
        """Extract valuation metrics."""
        valuation = {}

        # Look for PE, PB, PEG ratios
        ratio_patterns = {
            'PE Ratio': re.compile(r'P/E|PE\s*Ratio', re.I),
            'PB Ratio': re.compile(r'P/B|PB\s*Ratio', re.I),
            'PEG Ratio': re.compile(r'PEG', re.I),
            'EV/EBITDA': re.compile(r'EV/EBITDA', re.I),
            'Dividend Yield': re.compile(r'Dividend\s*Yield', re.I)
        }

        for ratio_name, pattern in ratio_patterns.items():
            elem = soup.find(string=pattern)
            if elem:
                parent = elem.find_parent()
                if parent:
                    # Look for value in sibling or child elements
                    value_elem = parent.find_next(['span', 'div'], class_=re.compile(r'value|number'))
                    if value_elem:
                        valuation[ratio_name] = self.clean_number(value_elem.get_text(strip=True))

        # Also try to find in table format
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    label = cells[0].get_text(strip=True)
                    value = cells[1].get_text(strip=True)
                    for ratio_name, pattern in ratio_patterns.items():
                        if pattern.search(label):
                            valuation[ratio_name] = self.clean_number(value)

        self.data['valuation'] = valuation

    def _extract_growth(self, soup) -> None:
        """Extract growth metrics."""
        growth = {}

        growth_patterns = {
            'Revenue Growth': re.compile(r'Revenue\s*Growth|Sales\s*Growth', re.I),
            'Profit Growth': re.compile(r'Profit\s*Growth|PAT\s*Growth', re.I),
            'EPS Growth': re.compile(r'EPS\s*Growth', re.I),
            '3Y Revenue CAGR': re.compile(r'3.*Revenue.*CAGR|Revenue.*3.*CAGR', re.I),
            '5Y Revenue CAGR': re.compile(r'5.*Revenue.*CAGR|Revenue.*5.*CAGR', re.I),
            '10Y Revenue CAGR': re.compile(r'10.*Revenue.*CAGR|Revenue.*10.*CAGR', re.I)
        }

        for metric_name, pattern in growth_patterns.items():
            elem = soup.find(string=pattern)
            if elem:
                parent = elem.find_parent()
                if parent:
                    value_elem = parent.find_next(['span', 'div'], class_=re.compile(r'value|number'))
                    if value_elem:
                        growth[metric_name] = self.clean_number(value_elem.get_text(strip=True))

        self.data['growth'] = growth

    def _extract_cash_flow_data(self, soup, base_url: str) -> None:
        """Extract cash flow data, potentially from financials sub-page."""
        # Try to find cash flow section on main page
        cf_section = soup.find(['section', 'div'], id=re.compile(r'cash-flow', re.I))
        if cf_section:
            self._parse_cash_flow_table(cf_section)
            return

        # Try to fetch cash flow page if exists
        if '/stocks/' in base_url:
            cf_url = base_url.rstrip('/') + '/financials?checklist=basic&statement=cashflow'
            cf_soup = self.fetch_page(cf_url)
            if cf_soup:
                self._parse_cash_flow_page(cf_soup)

    def _parse_cash_flow_table(self, section) -> None:
        """Parse cash flow data from a table section."""
        table = section.find('table')
        if not table:
            return

        cash_flow_data = {}
        rows = table.find_all('tr')

        for row in rows:
            cells = row.find_all(['td', 'th'])
            if cells:
                metric = cells[0].get_text(strip=True).lower()

                if 'free cash flow' in metric or 'fcf' in metric:
                    fcf_values = []
                    for i, cell in enumerate(cells[1:]):
                        value = self.clean_number(cell.get_text(strip=True))
                        fcf_values.append(value)
                    cash_flow_data['fcf'] = fcf_values

                if 'operating' in metric and 'cash' in metric:
                    ocf_values = []
                    for cell in cells[1:]:
                        ocf_values.append(self.clean_number(cell.get_text(strip=True)))
                    cash_flow_data['operating_cash_flow'] = ocf_values

        self.data['cash_flow'] = cash_flow_data

    def _parse_cash_flow_page(self, soup) -> None:
        """Parse dedicated cash flow page."""
        # Find all tables
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if cells and len(cells) > 1:
                    metric = cells[0].get_text(strip=True).lower()
                    if 'free cash flow' in metric or 'fcf' in metric:
                        fcf_list = []
                        for cell in cells[1:]:
                            value = self.clean_number(cell.get_text(strip=True))
                            fcf_list.append(value)
                        self.data['free_cash_flow'] = [{'fcf': v} for v in fcf_list if v is not None]

    def _is_numeric(self, value: str) -> bool:
        """Check if a string represents a numeric value."""
        cleaned = value.strip().replace(',', '').replace('%', '').replace('₹', '').replace('-', '')
        try:
            float(cleaned)
            return True
        except ValueError:
            return False

    def get_company_name(self) -> str:
        """Return the company name."""
        return self.company_name

    def get_free_cash_flow(self) -> List[Dict]:
        """Get free cash flow data."""
        return self.data.get('free_cash_flow', [])

    def get_peg_ratio(self) -> Optional[float]:
        """Get PEG ratio."""
        return self.data.get('valuation', {}).get('PEG Ratio')

    def get_price_history(self) -> Dict:
        """Get historical price data."""
        return self.data.get('price_history', {})
