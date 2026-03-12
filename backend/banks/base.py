from typing import List, Dict, Optional
from PIL import Image

class BankExtractor:
    """Base class for bank-specific extraction logic."""
    
    @property
    def bank_name(self) -> str:
        return "Generic Bank"

    def get_system_prompt(self) -> str:
        """Return the system instructions for the LLM."""
        return """You are a financial document analysis AI specializing in Nigerian bank statements.
Your job is to extract ALL transactions from the provided bank statement and return them as structured JSON.

1. Identify the Transaction Table.
2. Spot Headers: (Date, Description, Debit, Credit, Balance).
3. Map Rows to Headers.
4. Normalize: Dates to YYYY-MM-DD, Amounts to plain numbers (remove ₦ and commas).

Output format:
{
  "bank": "bank name",
  "account_number": "last 4 digits if visible",
  "detected_headers": ["list", "of", "headers"],
  "statement_period": {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD"},
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "narration",
      "debit": 0.00,
      "credit": 0.00,
      "balance": 0.00
    }
  ]
}"""

    def get_user_prompt(self, page_num: int, text_context: str = "") -> str:
        """Return the user prompt for the LLM."""
        layout_hint = ""
        if text_context:
            layout_hint = f"\n\nSpatial Text Map:\n{text_context}\n\n"
            
        return (
            f"This is page {page_num} of a {self.bank_name} statement.{layout_hint}"
            f"Extract all transactions into the specified JSON format."
        )

    def preprocess_page(self, page_plumber) -> Dict:
        """Extract image and text from a pdfplumber page object."""
        from config import PDF_DPI
        return {
            "image": page_plumber.to_image(resolution=PDF_DPI).original.convert("RGB"),
            "text": page_plumber.extract_text(layout=True) or ""
        }
