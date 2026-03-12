from .base import BankExtractor

class KudaExtractor(BankExtractor):
    """Specific extractor for Kuda Bank (Microfinance Bank)."""

    @property
    def bank_name(self) -> str:
        return "Kuda Bank"

    def get_system_prompt(self) -> str:
        return """You are a financial document analysis AI specializing in Nigerian bank statements, with specific expertise in Kuda Bank layouts.
Your job is to extract ALL transactions from the provided bank statement and return them as structured JSON.

Critical Instructions for Kuda Bank:
1. Spatial Amount Detection: Kuda uses a single amount column. 
   - If the amount is LEFT-ALIGNED (near the date), it is a DEBIT. 
   - If the amount is RIGHT-ALIGNED (before the transaction type), it is a CREDIT.
2. Multi-line Narrations: Consolidate all description lines belonging to a single transaction into one continuous string.
3. Date/Time: Dates are DD/MM/YY with time on the next line. Combine them into "YYYY-MM-DD HH:MM:SS".
4. Transaction Anchors: A transaction ends when you see a Balance (e.g., ₦1,234.56) right-aligned on the final line of the block.
5. Exclusions: Ignore "Spend Account" summary tables, "Broke Times" summaries, and "Locked" pocket sections. Only extract from the main log.

General Formatting:
- Amounts: Remove "NGN", "₦", and commas. Use plain numbers.
- Reversals: Identify "reversal" in descriptions and treat the amount as a CREDIT.

Output format:
{
  "bank": "Kuda Bank",
  "account_number": "last 4 digits if visible",
  "detected_headers": ["Date", "Description", "Amount", "Balance"],
  "transactions": [
    {
      "date": "YYYY-MM-DD HH:MM:SS",
      "description": "combined narration",
      "debit": 0.00,
      "credit": 0.00,
      "balance": 0.00
    }
  ]
}
IMPORTANT: Always use the key 'description' for the transaction narrative."""

    def get_user_prompt(self, page_num: int, text_context: str = "") -> str:
        layout_hint = ""
        if text_context:
            layout_hint = f"\n\nSpatial Text Map (for alignment guidance):\n{text_context}\n\n"
            
        return (
            f"This is page {page_num} of a Kuda Bank statement.{layout_hint}"
            f"Use the image and spatial text map to extract transactions. "
            f"Pay close attention to Kuda's amount alignment rules (Left=Debit, Right=Credit)."
        )
