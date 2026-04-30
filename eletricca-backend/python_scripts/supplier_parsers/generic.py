#!/usr/bin/env python3
"""
generic.py  —  Generic PDF price extractor

Called by the SvelteKit server for suppliers that have no dedicated parser.

Usage:  python3 generic.py <pdf_path>
Stdin:  JSON list of items  [{"id": 1, "supply_name": "Cabo 10mm"}, ...]
Stdout: JSON list           [{"list_item_id": 1, "price": 150.0, "confidence": 0.95}, ...]

Strategy
--------
1. Extract tables from every page using pdfplumber.
2. Detect description + unit-price columns heuristically.
3. Fuzzy-match each item name against the description column.
4. If tables yield nothing useful, fall back to line-by-line text scan.

To create a supplier-specific parser, copy this file, rename it to
<supplier_slug>.py and adjust the column-detection / extraction logic
to match that supplier's exact PDF layout.  Then set supplier.pdf_parser
to '<supplier_slug>' in the database.
"""
import sys
import json
import re
import difflib


# ── Helpers ──────────────────────────────────────────────────────────────────

def normalize(text: str) -> str:
    return re.sub(r'\s+', ' ', (text or '')).strip().lower()


def extract_price(text: str) -> float | None:
    """Parse Brazilian (R$ 1.234,56) or plain (1234.56) price strings."""
    text = (text or '').strip()
    # Remove currency symbol and leading/trailing whitespace
    text = re.sub(r'R\$\s*', '', text)
    candidates = [
        r'^([\d]{1,3}(?:\.[\d]{3})*,[\d]{2})$',   # 1.234,56
        r'^([\d]+,[\d]{2})$',                       # 1234,56
        r'^([\d]+\.[\d]{2})$',                      # 1234.56
        r'([\d]{1,3}(?:\.[\d]{3})*,[\d]{2})',       # embedded BR
        r'([\d]+,[\d]{2})',                          # embedded plain
    ]
    for pat in candidates:
        m = re.search(pat, text)
        if m:
            raw = m.group(1).replace('.', '').replace(',', '.')
            try:
                val = float(raw)
                if val > 0:
                    return val
            except ValueError:
                pass
    return None


def fuzzy(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def best_match(name: str, candidates: list[str]) -> tuple[int, float]:
    best_i, best_s = -1, 0.0
    norm_name = normalize(name)
    for i, c in enumerate(candidates):
        s = difflib.SequenceMatcher(None, norm_name, normalize(c)).ratio()
        if s > best_s:
            best_i, best_s = i, s
    return best_i, best_s


# ── Table-based extraction ────────────────────────────────────────────────────

PRICE_HEADERS   = ['preço', 'preco', 'valor', 'unit', 'price', 'vl.unit', 'vlr']
DESC_HEADERS    = ['descri', 'material', 'produto', 'item', 'especif', 'serviç', 'servi']

def _col_index(header: list[str], keywords: list[str]) -> int | None:
    for i, h in enumerate(header):
        if any(k in h for k in keywords):
            return i
    return None


def parse_tables(pdf_path: str, items: list[dict]) -> list[dict]:
    import pdfplumber

    results = {item['id']: {'list_item_id': item['id'], 'price': None, 'confidence': 0.0}
               for item in items}

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in (page.extract_tables() or []):
                if not table or len(table) < 2:
                    continue

                header = [str(c or '').strip().lower() for c in table[0]]

                desc_col  = _col_index(header, DESC_HEADERS)
                price_col = _col_index(header, PRICE_HEADERS)

                # Fallback: first column is description, rightmost numeric column is price
                if desc_col is None:
                    desc_col = 0
                if price_col is None:
                    for ci in range(len(header) - 1, -1, -1):
                        sample = [
                            str(table[r][ci]) if ci < len(table[r]) else ''
                            for r in range(1, min(6, len(table)))
                        ]
                        if sum(1 for v in sample if extract_price(v) is not None) >= 2:
                            price_col = ci
                            break

                if price_col is None or desc_col == price_col:
                    continue

                row_descs  = [str(row[desc_col]  if desc_col  < len(row) else '') for row in table[1:]]
                row_prices = [extract_price(str(row[price_col] if price_col < len(row) else '')) for row in table[1:]]

                for item in items:
                    idx, score = best_match(item['supply_name'], row_descs)
                    if score > 0.52 and row_prices[idx] is not None:
                        if score > results[item['id']]['confidence']:
                            results[item['id']] = {
                                'list_item_id': item['id'],
                                'price':        round(row_prices[idx], 2),
                                'confidence':   round(score, 2),
                            }

    return list(results.values())


# ── Text-line fallback ────────────────────────────────────────────────────────

def parse_text(pdf_path: str, items: list[dict]) -> list[dict]:
    import pdfplumber

    results = {item['id']: {'list_item_id': item['id'], 'price': None, 'confidence': 0.0}
               for item in items}

    lines: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            lines.extend((page.extract_text() or '').splitlines())

    for item in items:
        idx, score = best_match(item['supply_name'], lines)
        if score < 0.45:
            continue
        # Search the matched line + 3 following lines for a price
        for li in range(idx, min(idx + 4, len(lines))):
            price = extract_price(lines[li])
            if price is not None:
                results[item['id']] = {
                    'list_item_id': item['id'],
                    'price':        round(price, 2),
                    'confidence':   round(score * 0.75, 2),   # penalise text fallback
                }
                break

    return list(results.values())


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print('Uso: python3 generic.py <pdf_path>', file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    items    = json.load(sys.stdin)

    if not items:
        print('[]')
        return

    try:
        results = parse_tables(pdf_path, items)
        found   = sum(1 for r in results if r['price'] is not None)
        # If tables found nothing, try text fallback
        if found == 0:
            results = parse_text(pdf_path, items)
    except Exception as exc:
        print(f'Parser error: {exc}', file=sys.stderr)
        results = [{'list_item_id': item['id'], 'price': None, 'confidence': 0.0}
                   for item in items]

    print(json.dumps(results))


if __name__ == '__main__':
    main()
