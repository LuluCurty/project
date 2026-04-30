#!/usr/bin/env python3
"""
cabine_rio.py  —  Parser for CABINE RIO COML. ELETRICA LTDA proposals

pdfplumber's table extractor does NOT detect the product table in this PDF
(it only picks up the footer notes). We parse raw text lines instead.

Line format (space-separated columns):
  <Item#> <Qty> <Unit> <Description...> <Brand> <NCM 8-digits> <PrçUnit> <Total> <ST> <ICMS%>

The 8-digit NCM code is the reliable right-anchor for splitting
description+brand from the trailing numeric columns.

Usage:  python3 cabine_rio.py <pdf_path>
Stdin:  JSON  [{"id": 1, "supply_name": "Cabo Flex 6mm"}, ...]
Stdout: JSON  [{"list_item_id": 1, "price": 7.34, "confidence": 0.92}, ...]
"""
import sys
import json
import re
import difflib

# A product line starts with item#, qty, unit and ends with ncm, price, total, ST, ICMS%
# The lazy (.+?) captures description+brand; (\S+) immediately before the NCM is the brand.
LINE_RE = re.compile(
    r'^\s*(\d+)\s+(\d+(?:[.,]\d+)?)\s+(\S+)\s+'   # item#  qty  unit
    r'(.+?)\s+(\S+)\s+'                              # desc (lazy)  brand
    r'(\d{8})\s+'                                    # NCM/SH — 8-digit anchor
    r'([\d.]+,\d{2})\s+'                             # Prç Unit
    r'([\d.,]+,\d{2})\s+'                            # Total
    r'([\d.,]+,\d{2})\s+'                            # ST
    r'(\d+%)',                                        # ICMS
    re.IGNORECASE,
)


def normalize(text: str) -> str:
    return re.sub(r'\s+', ' ', (text or '')).strip().lower()


def parse_br_price(text: str) -> float | None:
    text = re.sub(r'[R$\s]', '', (text or ''))
    m = re.match(r'^([\d]{1,3}(?:\.[\d]{3})*,[\d]{2})$', text) or \
        re.match(r'^([\d]+,[\d]{2})$', text)
    if m:
        try:
            return float(m.group(1).replace('.', '').replace(',', '.'))
        except ValueError:
            pass
    return None


def score(supply: str, desc: str) -> float:
    a, b = normalize(supply), normalize(desc)
    seq  = difflib.SequenceMatcher(None, a, b).ratio()
    a_w  = set(a.split())
    b_w  = set(b.split())
    jaccard = len(a_w & b_w) / len(a_w | b_w) if (a_w or b_w) else 0.0
    return max(seq, jaccard)


def main():
    if len(sys.argv) < 2:
        print('Uso: python3 cabine_rio.py <pdf_path>', file=sys.stderr)
        sys.exit(1)

    import pdfplumber

    pdf_path = sys.argv[1]
    items    = json.load(sys.stdin)

    results = {item['id']: {'list_item_id': item['id'], 'price': None, 'confidence': 0.0}
               for item in items}

    rows: list[tuple[str, float | None]] = []  # (description, unit_price)

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text() or ''
            for line in text.splitlines():
                m = LINE_RE.match(line)
                if not m:
                    continue
                desc      = re.sub(r'\s+', ' ', m.group(4)).strip()
                price_raw = m.group(7)
                price     = parse_br_price(price_raw)
                print(f'[cabine_rio] p{page_num+1} matched: desc={desc!r} price_raw={price_raw!r} → {price}', file=sys.stderr)
                rows.append((desc, price))

    print(f'[cabine_rio] {len(rows)} product row(s) found', file=sys.stderr)
    if not rows:
        print('[cabine_rio] WARNING: no rows matched — PDF layout may have changed', file=sys.stderr)

    for item in items:
        best_sc, best_price = 0.0, None
        for desc, price in rows:
            s = score(item['supply_name'], desc)
            if s > best_sc:
                best_sc    = s
                best_price = price

        print(f'[cabine_rio] item={item["supply_name"]!r} → score={best_sc:.2f} price={best_price}', file=sys.stderr)

        if best_sc > 0.40 and best_price is not None:
            results[item['id']] = {
                'list_item_id': item['id'],
                'price':        round(best_price, 2),
                'confidence':   round(best_sc, 2),
            }

    print(json.dumps(list(results.values())))


if __name__ == '__main__':
    main()
