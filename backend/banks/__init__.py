from .base import BankExtractor
from .kuda import KudaExtractor

def get_extractor(text_sample: str) -> BankExtractor:
    """
    Detect the bank from a sample of text and return the appropriate extractor.
    """
    sample_lower = text_sample.lower()
    
    if "kuda" in sample_lower:
        return KudaExtractor()
    
    # Add more detection logic here as more banks are added:
    # if "guaranty trust" in sample_lower: return GTBankExtractor()
    
    return BankExtractor()
