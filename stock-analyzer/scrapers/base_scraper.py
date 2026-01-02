"""Base scraper class with common functionality."""

import requests
from bs4 import BeautifulSoup
import time
import random
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod


class BaseScraper(ABC):
    """Base class for all financial data scrapers."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
        })
        self.data = {}

    def fetch_page(self, url: str, retry_count: int = 3) -> Optional[BeautifulSoup]:
        """Fetch and parse a web page with retry logic."""
        for attempt in range(retry_count):
            try:
                # Add small random delay to avoid rate limiting
                time.sleep(random.uniform(0.5, 1.5))

                response = self.session.get(url, timeout=30)
                response.raise_for_status()

                return BeautifulSoup(response.content, 'lxml')

            except requests.RequestException as e:
                print(f"Attempt {attempt + 1} failed for {url}: {e}")
                if attempt < retry_count - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff

        return None

    def clean_number(self, value: str) -> Optional[float]:
        """Clean and convert a string number to float."""
        if not value or value.strip() in ['-', '', 'N/A', 'NA']:
            return None

        try:
            # Remove commas, percentage signs, and whitespace
            cleaned = value.strip().replace(',', '').replace('%', '').replace('₹', '').replace('Cr', '').replace('cr', '')
            cleaned = cleaned.strip()

            # Handle negative numbers in parentheses
            if cleaned.startswith('(') and cleaned.endswith(')'):
                cleaned = '-' + cleaned[1:-1]

            return float(cleaned)
        except (ValueError, AttributeError):
            return None

    def parse_cr_value(self, value: str) -> Optional[float]:
        """Parse values in Crores (Cr) or Lakhs (L)."""
        if not value:
            return None

        value = value.strip().upper()
        multiplier = 1

        if 'CR' in value:
            value = value.replace('CR', '')
        elif 'L' in value or 'LAC' in value or 'LAKH' in value:
            value = value.replace('L', '').replace('LAC', '').replace('LAKH', '')
            multiplier = 0.01  # Convert lakhs to crores
        elif 'K' in value:
            value = value.replace('K', '')
            multiplier = 0.00001  # Convert thousands to crores

        num = self.clean_number(value)
        return num * multiplier if num is not None else None

    @abstractmethod
    def scrape(self, url: str) -> Dict[str, Any]:
        """Scrape data from the source. Must be implemented by subclasses."""
        pass

    @abstractmethod
    def get_company_name(self) -> str:
        """Get the company name from scraped data."""
        pass
