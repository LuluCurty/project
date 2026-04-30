#!/usr/bin/env python3
"""
generate_list_pdf.py

Reads JSON from stdin:
{
  "list_name": "...",
  "priority": "high|medium|low",
  "description": "...",
  "client": "...",
  "date": "DD/MM/YYYY",
  "items": [{ "supply_name": "...", "quantity": 10 }]
}

Writes PDF bytes to stdout.
"""
import sys
import json
import io
from datetime import datetime


def generate_pdf(data: dict) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm, mm
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle,
        Paragraph, Spacer, HRFlowable,
    )

    PRIMARY    = colors.HexColor('#1E3A5F')
    SECONDARY  = colors.HexColor('#2E6DA4')
    LIGHT_GREY = colors.HexColor('#F5F5F5')
    BORDER_C   = colors.HexColor('#C8D8E8')
    TEXT_DARK  = colors.HexColor('#1A1A2E')
    TEXT_MUTED = colors.HexColor('#5A6A7A')

    out  = io.BytesIO()
    PAGE = A4
    L, R, T, B = 2*cm, 2*cm, 2*cm, 2.5*cm

    def add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(TEXT_MUTED)
        w, _ = PAGE
        canvas.drawRightString(w - R, B - 6*mm, f'Página {doc.page}')
        canvas.drawString(L, B - 6*mm,
                          f'Gerado em {datetime.now().strftime("%d/%m/%Y %H:%M")}')
        canvas.setStrokeColor(BORDER_C)
        canvas.setLineWidth(0.5)
        canvas.line(L, B - 2*mm, w - R, B - 2*mm)
        canvas.restoreState()

    doc = SimpleDocTemplate(
        out, pagesize=PAGE,
        leftMargin=L, rightMargin=R, topMargin=T, bottomMargin=B,
    )

    title_style = ParagraphStyle(
        'Title', fontName='Helvetica-Bold', fontSize=16,
        textColor=PRIMARY, spaceAfter=4,
    )
    meta_style = ParagraphStyle(
        'Meta', fontName='Helvetica', fontSize=9,
        textColor=TEXT_MUTED, spaceAfter=2,
    )
    desc_style = ParagraphStyle(
        'Desc', fontName='Helvetica', fontSize=9,
        textColor=TEXT_DARK, spaceAfter=10,
    )
    hdr_cell_style = ParagraphStyle(
        'HdrCell', fontName='Helvetica-Bold', fontSize=9,
        textColor=colors.white,
    )
    cell_style = ParagraphStyle(
        'Cell', fontName='Helvetica', fontSize=9,
        textColor=TEXT_DARK,
    )

    PRIORITY_LABELS = {'high': 'Alta', 'medium': 'Média', 'low': 'Baixa'}
    priority_label = PRIORITY_LABELS.get(data.get('priority', ''), 'Média')

    meta_parts = [f'Data: {data.get("date", "")}', f'Prioridade: {priority_label}']
    if data.get('client'):
        meta_parts.insert(0, f'Cliente: {data["client"]}')

    items = data.get('items', [])

    printable_w = A4[0] - L - R
    col_widths = [
        printable_w * 0.55,   # Material
        printable_w * 0.10,   # Qtd
        printable_w * 0.175,  # Preço Unit.
        printable_w * 0.175,  # Total
    ]

    table_data = [[
        Paragraph('Material',    hdr_cell_style),
        Paragraph('Qtd',         hdr_cell_style),
        Paragraph('Preço Unit.', hdr_cell_style),
        Paragraph('Total',       hdr_cell_style),
    ]]

    for item in items:
        table_data.append([
            Paragraph(item.get('supply_name', ''), cell_style),
            Paragraph(str(item.get('quantity', '')), cell_style),
            Paragraph('', cell_style),
            Paragraph('', cell_style),
        ])

    zebra = [
        ('BACKGROUND', (0, i), (-1, i), LIGHT_GREY)
        for i in range(1, len(table_data))
        if i % 2 == 0
    ]

    tbl = Table(table_data, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),  PRIMARY),
        ('FONTSIZE',      (0, 0), (-1, -1), 9),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING',   (0, 0), (-1, -1), 6),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN',         (1, 0), (3, -1),  'RIGHT'),
        ('LINEBELOW',     (0, 0), (-1, 0),  1.5, SECONDARY),
        ('INNERGRID',     (0, 1), (-1, -1), 0.3, BORDER_C),
        ('BOX',           (0, 0), (-1, -1), 0.5, BORDER_C),
        *zebra,
    ]))

    elements = [
        Paragraph(data.get('list_name', 'Lista de Materiais'), title_style),
        Paragraph('  •  '.join(meta_parts), meta_style),
    ]

    if data.get('description'):
        elements.append(Paragraph(data['description'], desc_style))

    elements += [
        HRFlowable(width='100%', thickness=1.5, color=PRIMARY, spaceAfter=12),
        tbl,
        Spacer(1, 20*mm),
        Paragraph(
            'Assinatura do fornecedor: _________________________________'
            '   Data: ___/___/______',
            meta_style,
        ),
    ]

    doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)
    return out.getvalue()


def main():
    data = json.load(sys.stdin)
    sys.stdout.buffer.write(generate_pdf(data))


if __name__ == '__main__':
    main()
