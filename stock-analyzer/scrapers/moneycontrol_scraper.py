"""Scraper for Moneycontrol.com financial data."""

from typing import Dict, Any, List, Optional
from .base_scraper import BaseScraper
import re
import json


class MoneycontrolScraper(BaseScraper):
    """Scraper for extracting financial data from Moneycontrol.com."""

    def __init__(self):
        super().__init__()
        self.company_name = ""
        self.data = {
            'overview': {},
            'key_ratios': {},
            'financials': {},
            'balance_sheet': {},
            'cash_flow': {},
            'shareholding': {},
            'price_data': {}
        }
        # Update headers for Moneycontrol
        self.session.headers.update({
            'Referer': 'https://www.moneycontrol.com/',
        })

    def scrape(self, url: str) -> Dict[str, Any]:
        """Scrape all financial data from Moneycontrol.com."""
        # Ensure URL has proper format
        if not url.startswith('http'):
            url = 'https://www.' + url

        soup = self.fetch_page(url)
        if not soup:
            return self.data

        # Extract company name
        self._extract_company_name(soup)

        # Extract overview metrics
        self._extract_overview(soup)

        # Extract key ratios
        self._extract_key_ratios(soup)

        # Extract financial data
        self._extract_financials(soup, url)

        # Extract shareholding
        self._extract_shareholding(soup, url)

        # Extract price data
        self._extract_price_data(soup)

        return self.data

    def _extract_company_name(self, soup) -> None:
        """Extract company name from page."""
        name_elem = soup.find('h1', class_='pcstname')
        if not name_elem:
            name_elem = soup.find('h1')
        if name_elem:
            self.company_name = name_elem.get_text(strip=True)

    def _extract_overview(self, soup) -> None:
        """Extract overview/key metrics."""
        overview = {}

        # Current price
        price_elem = soup.find('div', id='nsecp') or soup.find('div', id='bsecp')
        if price_elem:
            overview['Current Price'] = self.clean_number(price_elem.get_text(strip=True))

        # Market cap
        mc_elem = soup.find(string=re.compile(r'Market Cap', re.I))
        if mc_elem:
            parent = mc_elem.find_parent()
            if parent:
                value = parent.find_next(['td', 'span', 'div'])
                if value:
                    overview['Market Cap'] = self.parse_cr_value(value.get_text(strip=True))

        # 52 Week High/Low
        high_elem = soup.find(string=re.compile(r'52.*High', re.I))
        if high_elem:
            parent = high_elem.find_parent()
            if parent:
                value = parent.find_next(['td', 'span', 'div'])
                if value:
                    overview['52 Week High'] = self.clean_number(value.get_text(strip=True))

        low_elem = soup.find(string=re.compile(r'52.*Low', re.I))
        if low_elem:
            parent = low_elem.find_parent()
            if parent:
                value = parent.find_next(['td', 'span', 'div'])
                if value:
                    overview['52 Week Low'] = self.clean_number(value.get_text(strip=True))

        # Book Value
        bv_elem = soup.find(string=re.compile(r'Book Value', re.I))
        if bv_elem:
            parent = bv_elem.find_parent()
            if parent:
                value = parent.find_next(['td', 'span', 'div'])
                if value:
                    overview['Book Value'] = self.clean_number(value.get_text(strip=True))

        # Face Value
        fv_elem = soup.find(string=re.compile(r'Face Value', re.I))
        if fv_elem:
            parent = fv_elem.find_parent()
            if parent:
                value = parent.find_next(['td', 'span', 'div'])
                if value:
                    overview['Face Value'] = self.clean_number(value.get_text(strip=True))

        # P/E Ratio
        pe_elem = soup.find(string=re.compile(r'P/E', re.I))
        if pe_elem:
            parent = pe_elem.find_parent()
            if parent:
                value = parent.find_next(['td', 'span', 'div'])
                if value:
                    overview['PE Ratio'] = self.clean_number(value.get_text(strip=True))

        # Dividend Yield
        div_elem = soup.find(string=re.compile(r'Dividend Yield', re.I))
        if div_elem:
            parent = div_elem.find_parent()
            if parent:
                value = parent.find_next(['td', 'span', 'div'])
                if value:
                    overview['Dividend Yield'] = self.clean_number(value.get_text(strip=True))

        # EPS
        eps_elem = soup.find(string=re.compile(r'\bEPS\b', re.I))
        if eps_elem:
            parent = eps_elem.find_parent()
            if parent:
                value = parent.find_next(['td', 'span', 'div'])
                if value:
                    overview['EPS'] = self.clean_number(value.get_text(strip=True))

        # Industry PE
        ind_pe = soup.find(string=re.compile(r'Industry P/E|Sector P/E', re.I))
        if ind_pe:
            parent = ind_pe.find_parent()
            if parent:
                value = parent.find_next(['td', 'span', 'div'])
                if value:
                    overview['Industry PE'] = self.clean_number(value.get_text(strip=True))

        self.data['overview'] = overview

    def _extract_key_ratios(self, soup) -> None:
        """Extract key financial ratios."""
        ratios = {}

        # Find ratio tables
        ratio_tables = soup.find_all('table', class_=re.compile(r'mctable|data|ratio'))

        for table in ratio_tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    label = cells[0].get_text(strip=True)
                    value = cells[1].get_text(strip=True)
                    ratios[label] = self.clean_number(value) if self._is_number(value) else value

        # Also look for key metrics in specific divs
        ratio_divs = soup.find_all('div', class_=re.compile(r'ratio|key.*metric'))
        for div in ratio_divs:
            label_elem = div.find(['span', 'div'], class_=re.compile(r'name|label'))
            value_elem = div.find(['span', 'div'], class_=re.compile(r'value|number'))
            if label_elem and value_elem:
                label = label_elem.get_text(strip=True)
                value = value_elem.get_text(strip=True)
                ratios[label] = self.clean_number(value) if self._is_number(value) else value

        self.data['key_ratios'] = ratios

    def _extract_financials(self, soup, base_url: str) -> None:
        """Extract financial statement data."""
        # Try to find financial tables on current page
        self._parse_financial_tables(soup)

        # Try to get more detailed financials from sub-pages
        # Extract company code from URL for API calls
        match = re.search(r'/([A-Z0-9]+)/?$', base_url, re.I)
        if match:
            company_code = match.group(1)
            self._fetch_detailed_financials(company_code)

    def _parse_financial_tables(self, soup) -> None:
        """Parse financial tables on the page."""
        financials = {
            'profit_loss': [],
            'balance_sheet': [],
            'cash_flow': []
        }

        # Find all data tables
        tables = soup.find_all('table')

        for table in tables:
            # Determine table type by looking at headers or nearby headings
            header = table.find_previous(['h2', 'h3', 'h4'])
            table_type = None

            if header:
                header_text = header.get_text(strip=True).lower()
                if 'profit' in header_text or 'loss' in header_text or 'income' in header_text:
                    table_type = 'profit_loss'
                elif 'balance' in header_text:
                    table_type = 'balance_sheet'
                elif 'cash' in header_text:
                    table_type = 'cash_flow'

            if table_type:
                table_data = self._parse_table(table)
                financials[table_type] = table_data

        self.data['financials'] = financials

    def _parse_table(self, table) -> List[Dict]:
        """Parse a data table and return structured data."""
        data = []

        # Get headers
        headers = []
        thead = table.find('thead')
        if thead:
            ths = thead.find_all(['th', 'td'])
            headers = [th.get_text(strip=True) for th in ths]

        # If no thead, try first row
        if not headers:
            first_row = table.find('tr')
            if first_row:
                ths = first_row.find_all(['th', 'td'])
                headers = [th.get_text(strip=True) for th in ths]

        # Parse data rows
        rows = table.find_all('tr')
        start_idx = 1 if headers else 0

        for row in rows[start_idx:]:
            cells = row.find_all(['td', 'th'])
            if cells:
                row_data = {
                    'metric': cells[0].get_text(strip=True),
                    'values': {}
                }
                for i, cell in enumerate(cells[1:], 1):
                    header_key = headers[i] if i < len(headers) else f'col_{i}'
                    row_data['values'][header_key] = self.clean_number(cell.get_text(strip=True))
                data.append(row_data)

        return data

    def _fetch_detailed_financials(self, company_code: str) -> None:
        """Fetch detailed financials from Moneycontrol API/pages."""
        # This would typically use the company code to fetch more data
        # For now, we'll rely on the main page data
        pass

    def _extract_shareholding(self, soup, base_url: str) -> None:
        """Extract shareholding pattern data."""
        shareholding = []

        # Find shareholding section
        sh_section = soup.find(['section', 'div'], id=re.compile(r'shareholding', re.I))
        if not sh_section:
            sh_section = soup.find(['section', 'div'], class_=re.compile(r'shareholding', re.I))

        if sh_section:
            table = sh_section.find('table')
            if table:
                headers = []
                thead = table.find('thead')
                if thead:
                    headers = [th.get_text(strip=True) for th in thead.find_all(['th', 'td'])]

                tbody = table.find('tbody') or table
                for row in tbody.find_all('tr'):
                    cells = row.find_all(['td', 'th'])
                    if cells:
                        holder_type = cells[0].get_text(strip=True)
                        percentages = {}
                        for i, cell in enumerate(cells[1:], 1):
                            header = headers[i] if i < len(headers) else f'q{i}'
                            percentages[header] = self.clean_number(cell.get_text(strip=True))
                        shareholding.append({
                            'holder_type': holder_type,
                            'percentages': percentages
                        })

        self.data['shareholding'] = shareholding

    def _extract_price_data(self, soup) -> None:
        """Extract historical price data."""
        price_data = {}

        # Try to extract from JavaScript data on page
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string:
                # Look for price history data
                matches = re.findall(r'priceData\s*[=:]\s*(\[.*?\])', script.string, re.DOTALL)
                for match in matches:
                    try:
                        data = json.loads(match)
                        price_data['history'] = data
                    except json.JSONDecodeError:
                        continue

        # Also extract displayed price stats
        price_stats = {}

        # 1 Year Return
        yr_return = soup.find(string=re.compile(r'1.*Year.*Return|52.*Week.*Return', re.I))
        if yr_return:
            parent = yr_return.find_parent()
            if parent:
                value = parent.find_next(['td', 'span', 'div'])
                if value:
                    price_stats['1 Year Return'] = self.clean_number(value.get_text(strip=True))

        # 3 Year Return
        yr3_return = soup.find(string=re.compile(r'3.*Year.*Return', re.I))
        if yr3_return:
            parent = yr3_return.find_parent()
            if parent:
                value = parent.find_next(['td', 'span', 'div'])
                if value:
                    price_stats['3 Year Return'] = self.clean_number(value.get_text(strip=True))

        # 5 Year Return
        yr5_return = soup.find(string=re.compile(r'5.*Year.*Return', re.I))
        if yr5_return:
            parent = yr5_return.find_parent()
            if parent:
                value = parent.find_next(['td', 'span', 'div'])
                if value:
                    price_stats['5 Year Return'] = self.clean_number(value.get_text(strip=True))

        price_data['stats'] = price_stats
        self.data['price_data'] = price_data

    def _is_number(self, value: str) -> bool:
        """Check if string is a number."""
        try:
            cleaned = value.replace(',', '').replace('%', '').replace('₹', '').strip()
            float(cleaned)
            return True
        except (ValueError, AttributeError):
            return False

    def get_company_name(self) -> str:
        """Return the company name."""
        return self.company_name

    def get_pe_ratio(self) -> Optional[float]:
        """Get PE ratio."""
        return self.data.get('overview', {}).get('PE Ratio')

    def get_eps(self) -> Optional[float]:
        """Get EPS."""
        return self.data.get('overview', {}).get('EPS')

    def get_market_cap(self) -> Optional[float]:
        """Get market cap."""
        return self.data.get('overview', {}).get('Market Cap')

    def get_shareholding(self) -> List[Dict]:
        """Get shareholding pattern."""
        return self.data.get('shareholding', [])
