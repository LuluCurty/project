#!/usr/bin/env python3
"""
cabine_rio.py  —  Parser for CABINE RIO COML. ELETRICA LTDA proposals

PDF layout (columns in order):
  Item | Quant. | U.N. | Descrição do produto | Marca | NCM/SH | Prç Unit | Total | ST | ICMS

We extract "Descrição do produto" and "Prç Unit".
Prices use Brazilian format with comma decimal: 7,34 / 235,44

Usage:  python3 cabine_rio.py <pdf_path>
Stdin:  JSON  [{"id": 1, "supply_name": "Cabo Flex 6mm"}, ...]
Stdout: JSON  [{"list_item_id": 1, "price": 7.34, "confidence": 0.92}, ...]
"""
import sys
import json
import re
import difflib


def normalize(text: str) -> str:
    return re.sub(r'\s+', ' ', (text or '')).strip().lower()


def parse_br_price(text: str) -> float | None:
    text = re.sub(r'[R$\s]', '', (text or ''))
    # Remove thousands dots, convert comma decimal
    m = re.match(r'^([\d]{1,3}(?:\.[\d]{3})*,[\d]{2})$', text) or \
        re.match(r'^([\d]+,[\d]{2})$', text)
    if m:
        try:
            return float(m.group(1).replace('.', '').replace(',', '.'))
        except ValueError:
            pass
    return None


def seq_ratio(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def word_overlap(a: str, b: str) -> float:
    """Jaccard on word tokens — handles partial/reordered descriptions."""
    a_words = set(normalize(a).split())
    b_words = set(normalize(b).split())
    if not a_words or not b_words:
        return 0.0
    return len(a_words & b_words) / len(a_words | b_words)


def score(supply: str, desc: str) -> float:
    return max(seq_ratio(supply, desc), word_overlap(supply, desc))


def is_empty(cell) -> bool:
    return not str(cell or '').strip()


def merge_rows(rows: list, item_col: int, desc_col: int, price_col: int) -> list:
    """
    Merge consecutive rows where the item-number cell is empty into the
    previous row. pdfplumber often splits one logical row across multiple
    physical rows when the description wraps.
    Returns list of (desc, price_raw) tuples.
    """
    merged = []
    for row in rows:
        item_cell = row[item_col] if item_col < len(row) else None
        desc_cell = str(row[desc_col]  if desc_col  < len(row) else '') or ''
        price_raw = str(row[price_col] if price_col < len(row) else '') or ''

        if merged and is_empty(item_cell):
            # Continuation row — append description text, keep first non-None price
            prev_desc, prev_price = merged[-1]
            combined_desc  = (prev_desc + ' ' + desc_cell).strip()
            combined_price = prev_price if prev_price else price_raw
            merged[-1] = (combined_desc, combined_price)
        else:
            merged.append((desc_cell, price_raw))

    return merged


def main():
    if len(sys.argv) < 2:
        print('Uso: python3 cabine_rio.py <pdf_path>', file=sys.stderr)
        sys.exit(1)

    import pdfplumber

    pdf_path = sys.argv[1]
    items    = json.load(sys.stdin)

    results = {item['id']: {'list_item_id': item['id'], 'price': None, 'confidence': 0.0}
               for item in items}

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            for tbl_num, table in enumerate(page.extract_tables() or []):
                if not table or len(table) < 2:
                    continue

                header = [normalize(str(c or '')) for c in table[0]]
                print(f'[cabine_rio] page={page_num+1} table={tbl_num+1} header={header}', file=sys.stderr)

                # Locate columns by header keyword
                desc_col  = next((i for i, h in enumerate(header) if 'descri' in h), None)
                price_col = next((i for i, h in enumerate(header) if 'pr' in h and 'unit' in h), None)
                item_col  = next((i for i, h in enumerate(header) if h in ('item', '#', 'n')), 0)

                # Positional fallback: Item=0 Quant=1 UN=2 Desc=3 Marca=4 NCM=5 PrçUnit=6
                if desc_col  is None and len(header) >= 4: desc_col  = 3
                if price_col is None and len(header) >= 7: price_col = 6

                if desc_col is None or price_col is None or desc_col == price_col:
                    print(f'[cabine_rio] skipping table — could not locate desc/price columns', file=sys.stderr)
                    continue

                merged = merge_rows(table[1:], item_col, desc_col, price_col)

                print(f'[cabine_rio] {len(merged)} merged rows:', file=sys.stderr)
                for i, (desc, raw_p) in enumerate(merged):
                    print(f'  [{i}] desc={repr(desc)} price_raw={repr(raw_p)} parsed={parse_br_price(raw_p)}', file=sys.stderr)

                for item in items:
                    best_i, best_sc = -1, 0.0
                    for i, (desc, _) in enumerate(merged):
                        s = score(item['supply_name'], desc)
                        if s > best_sc:
                            best_i, best_sc = i, s

                    print(f'[cabine_rio] item={item["supply_name"]!r} → best_score={best_sc:.2f} row={best_i}', file=sys.stderr)

                    if best_sc > 0.40 and best_i >= 0:
                        _, raw_p = merged[best_i]
                        price = parse_br_price(raw_p)
                        if price is not None and best_sc > results[item['id']]['confidence']:
                            results[item['id']] = {
                                'list_item_id': item['id'],
                                'price':        round(price, 2),
                                'confidence':   round(best_sc, 2),
                            }

    print(json.dumps(list(results.values())))


if __name__ == '__main__':
    main()
