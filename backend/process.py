"""
process.py — Merge, clean, and compute analytics across all extracted pages.
"""
import logging
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)


def merge_page_results(page_results: List[Dict]) -> Dict[str, Any]:
    """
    Combine raw model output from multiple pages into a single
    normalized result dict.
    """
    all_transactions = []
    meta = {}

    for result in page_results:
        txns = result.get("transactions", [])
        all_transactions.extend(txns)

        # Grab metadata from the first page that has it
        for key in ("bank", "account_number", "detected_headers", "statement_period", "opening_balance", "closing_balance"):
            if key not in meta and result.get(key) is not None:
                meta[key] = result[key]

    # Build DataFrame for cleaning & deduplication
    df = pd.DataFrame(all_transactions)
    if df.empty:
        return {**meta, "transactions": [], "summary": _empty_summary()}

    df = _clean_transactions(df)
    summary = _compute_summary(df, meta)

    return {
        **meta,
        "transactions": df.to_dict(orient="records"),
        "summary": summary,
    }


def _clean_transactions(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize types, sort by date, remove exact duplicates."""

    # Parse dates
    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    # Coerce amounts to float
    for col in ["debit", "credit", "balance"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
        else:
            df[col] = 0.0

    # Drop completely empty rows
    df = df.dropna(subset=["date", "description"])

    # Remove exact duplicates (same date + description + debit + credit)
    df = df.drop_duplicates(subset=["date", "description", "debit", "credit"])

    # Sort chronologically
    df = df.sort_values("date").reset_index(drop=True)

    # Serialize date back to ISO string
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")

    return df


def _compute_summary(df: pd.DataFrame, meta: Dict) -> Dict:
    """Compute aggregate statistics and detect anomalies."""

    total_credits = df["credit"].sum()
    total_debits  = df["debit"].sum()
    transaction_count = len(df)

    # Category spend (heuristic keyword mapping)
    categories = _categorize(df)
    category_totals = (
        df.assign(category=categories)
          .groupby("category")["debit"]
          .sum()
          .sort_values(ascending=False)
          .to_dict()
    )

    anomalies = _detect_anomalies(df)

    return {
        "transaction_count": transaction_count,
        "total_credits":  round(total_credits, 2),
        "total_debits":   round(total_debits,  2),
        "net_flow":       round(total_credits - total_debits, 2),
        "opening_balance": meta.get("opening_balance"),
        "closing_balance": meta.get("closing_balance"),
        "category_totals": {k: round(v, 2) for k, v in category_totals.items()},
        "anomalies": anomalies,
    }


def _empty_summary() -> Dict:
    return {
        "transaction_count": 0,
        "total_credits": 0.0,
        "total_debits": 0.0,
        "net_flow": 0.0,
        "opening_balance": None,
        "closing_balance": None,
        "category_totals": {},
        "anomalies": [],
    }


CATEGORY_KEYWORDS = {
    "Transport":     ["uber", "bolt", "taxify", "okada", "bus", "fuel", "petrol"],
    "Food":          ["chicken", "restaurant", "domino", "shoprite", "food", "kanteen", "eatery", "cafe"],
    "Utilities":     ["dstv", "startimes", "electricity", "ekedc", "ikedc", "airtime", "mtn", "glo", "airtel", "9mobile"],
    "Entertainment": ["netflix", "spotify", "apple", "prime", "youtube", "cinema", "show"],
    "Transfer":      ["transfer", "trf", "nip", "mobile", "send", "remit"],
    "Income":        ["salary", "payroll", "income", "credit alert", "reversal", "refund"],
    "Shopping":      ["pos", "purchase", "buy", "order", "amazon", "jumia", "konga"],
    "Bank Charges":  ["charge", "fee", "sms", "vat", "stamp", "maintenance"],
    "ATM":           ["atm", "withdrawal", "cash"],
}


def _categorize(df: pd.DataFrame) -> List[str]:
    """Assign a category to each transaction based on description keywords."""
    categories = []
    for _, row in df.iterrows():
        desc = str(row.get("description", "")).lower()
        matched = "Other"
        for cat, keywords in CATEGORY_KEYWORDS.items():
            if any(kw in desc for kw in keywords):
                matched = cat
                break
        # Credits with no keyword match are likely income
        if matched == "Other" and row.get("credit", 0) > 0 and row.get("debit", 0) == 0:
            matched = "Income"
        categories.append(matched)
    return categories


def _detect_anomalies(df: pd.DataFrame) -> List[Dict]:
    """Flag suspicious transactions."""
    anomalies = []
    if df.empty:
        return anomalies

    # 1. Unusually large debits (> 3 std deviations above mean)
    mean_debit = df["debit"][df["debit"] > 0].mean()
    std_debit  = df["debit"][df["debit"] > 0].std()
    threshold  = mean_debit + (3 * std_debit)

    large = df[(df["debit"] > threshold) & (df["debit"] > 0)]
    for _, row in large.iterrows():
        anomalies.append({
            "type": "large_debit",
            "severity": "high",
            "date": row["date"],
            "description": row["description"],
            "amount": row["debit"],
            "note": f"Unusually large debit (>{threshold:,.0f})",
        })

    # 2. Rapid duplicate transfers (same amount to same description within 10 rows)
    debit_df = df[df["debit"] > 0].copy()
    debit_df["prev_desc"]   = debit_df["description"].shift(1)
    debit_df["prev_debit"]  = debit_df["debit"].shift(1)

    dupes = debit_df[
        (debit_df["description"] == debit_df["prev_desc"]) &
        (debit_df["debit"] == debit_df["prev_debit"])
    ]
    for _, row in dupes.iterrows():
        anomalies.append({
            "type": "duplicate_transaction",
            "severity": "medium",
            "date": row["date"],
            "description": row["description"],
            "amount": row["debit"],
            "note": "Possible duplicate — identical consecutive debit",
        })

    return anomalies
