#!/usr/bin/env python3
"""
parse_cdr.py <file_path>

Analisa o CSV de CDR exportado pelo Grandstream UCM e retorna estatísticas em JSON.

Saída:
  { summary, by_extension, by_trunk, by_day, period, count }  sucesso
  { "error": "mensagem" }                                      erro
"""
import sys
import json
import csv
import os
from collections import defaultdict


# ──────────────────────────────────────────────────────────────────────────────
# Direção da chamada (mesma lógica do TypeScript no ucm.ts)
# ──────────────────────────────────────────────────────────────────────────────
def get_direction(userfield: str, src_trunk: str, dst_trunk: str) -> str:
    uf = (userfield or '').strip().lower()
    if uf == 'inbound':  return 'inbound'
    if uf == 'outbound': return 'outbound'
    if uf == 'internal': return 'internal'
    # Fallback: análise de tronco
    if src_trunk: return 'inbound'
    if dst_trunk: return 'outbound'
    return 'internal'


def _int(val) -> int:
    try:
        return int(float(val or '0'))
    except (ValueError, TypeError):
        return 0


# ──────────────────────────────────────────────────────────────────────────────
# Deduplicação por uniqueid
# O UCM gera múltiplas linhas para o mesmo uniqueid em casos de:
#   - Ring groups
#   - Call forwarding
#   - ForkCDR
# Estratégia: usar a primeira linha como registro primário (contexto from-internal),
# mas considerar ANSWERED se QUALQUER linha do grupo for ANSWERED.
# ──────────────────────────────────────────────────────────────────────────────
def deduplicate(rows: list) -> list:
    by_uid = defaultdict(list)
    no_uid = []

    for row in rows:
        uid = row.get('uniqueid', '').strip()
        if uid:
            by_uid[uid].append(row)
        else:
            no_uid.append(row)

    canonical = []

    for uid, group in by_uid.items():
        primary = group[0]

        # Disposição final: ANSWERED se qualquer linha for
        if any(r.get('disposition', '').upper() == 'ANSWERED' for r in group):
            disposition = 'ANSWERED'
        else:
            disposition = primary.get('disposition', '').upper()

        # Quem atendeu: primeira linha ANSWERED com 'answer by' preenchido
        answer_by = ''
        for r in group:
            if r.get('disposition', '').upper() == 'ANSWERED':
                ab = r.get('answer by', '').strip()
                if ab:
                    answer_by = ab
                    break

        # ── IVR detection ────────────────────────────────────────────────────────
        # ivr_presented: alguma linha passou pelo IVR (action type = "IVR[...]")
        ivr_presented = any('IVR[' in r.get('action type', '') for r in group)

        # human_answered: alguma linha não-IVR teve talk_time > 0 (humano falou)
        human_answered = any(
            'IVR[' not in r.get('action type', '') and _int(r.get('talk time', '0')) > 0
            for r in group
        )

        # ivr_dropout: entrou no IVR mas nenhum humano atendeu
        ivr_dropout = ivr_presented and not human_answered
        # ─────────────────────────────────────────────────────────────────────────

        canonical.append({
            'src':           primary.get('caller number', ''),
            'dst':           primary.get('callee number', ''),
            'caller_name':   primary.get('caller name', ''),
            'answer_by':     answer_by,
            'start_time':    primary.get('start time', ''),
            'talk_time':     _int(primary.get('talk time', '0')),
            'call_time':     _int(primary.get('call time', '0')),
            'disposition':   disposition,
            'userfield':     primary.get('userfield', ''),
            'src_trunk':     primary.get('source trunk name', ''),
            'dst_trunk':     primary.get('dest trunk name', ''),
            'ivr_presented': ivr_presented,
            'human_answered': human_answered,
            'ivr_dropout':   ivr_dropout,
        })

    # Linhas sem uniqueid (raras): incluir como estão
    for row in no_uid:
        ivr_presented = 'IVR[' in row.get('action type', '')
        human_answered = not ivr_presented and _int(row.get('talk time', '0')) > 0
        canonical.append({
            'src':           row.get('caller number', ''),
            'dst':           row.get('callee number', ''),
            'caller_name':   row.get('caller name', ''),
            'answer_by':     row.get('answer by', ''),
            'start_time':    row.get('start time', ''),
            'talk_time':     _int(row.get('talk time', '0')),
            'call_time':     _int(row.get('call time', '0')),
            'disposition':   row.get('disposition', '').upper(),
            'userfield':     row.get('userfield', ''),
            'src_trunk':     row.get('source trunk name', ''),
            'dst_trunk':     row.get('dest trunk name', ''),
            'ivr_presented': ivr_presented,
            'human_answered': human_answered,
            'ivr_dropout':   ivr_presented and not human_answered,
        })

    return canonical


# ──────────────────────────────────────────────────────────────────────────────
# Função principal de análise
# ──────────────────────────────────────────────────────────────────────────────
def parse_cdr(file_path: str) -> dict:
    rows = []
    with open(file_path, 'r', encoding='utf-8-sig', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Limpa espaços em chaves e valores
            cleaned = {k.strip(): (v or '').strip() for k, v in row.items() if k}
            rows.append(cleaned)

    canonical = deduplicate(rows)

    # ── Acumuladores ──────────────────────────────────────────────────────────
    summary = {
        'total': 0, 'answered': 0, 'no_answer': 0, 'busy': 0, 'failed': 0,
        'inbound': 0, 'outbound': 0, 'internal': 0, 'answer_rate': 0.0,
    }

    by_extension = {}  # ext_num → dict
    ext_names    = {}  # ext_num → caller name (melhor esforço)
    by_trunk     = {}  # trunk_name → dict
    by_day       = {}  # YYYY-MM-DD → dict

    def add_ext(num: str, field: str):
        if not num:
            return
        if num not in by_extension:
            by_extension[num] = {
                'number': num, 'name': '',
                'received': 0, 'made': 0, 'internal': 0, 'total': 0,
            }
        by_extension[num][field] += 1
        by_extension[num]['total'] += 1

    def add_trunk(name: str, field: str):
        if not name:
            return
        if name not in by_trunk:
            by_trunk[name] = {
                'name': name,
                'inbound': 0, 'outbound': 0, 'total': 0,
                'ivr_presented': 0, 'ivr_dropout': 0, 'human_answered': 0,
            }
        by_trunk[name][field] += 1
        by_trunk[name]['total'] += 1

    for r in canonical:
        direction   = get_direction(r['userfield'], r['src_trunk'], r['dst_trunk'])
        disposition = r['disposition']
        day         = r['start_time'][:10] if len(r['start_time']) >= 10 else None

        # Mapa de nomes de ramal (para exibição)
        if r['src'] and r['caller_name']:
            ext_names[r['src']] = r['caller_name']

        # Summary
        summary['total']     += 1
        summary[direction]   += 1
        if   disposition == 'ANSWERED':  summary['answered']  += 1
        elif disposition == 'NO ANSWER': summary['no_answer'] += 1
        elif disposition == 'BUSY':      summary['busy']      += 1
        else:                            summary['failed']     += 1

        # Por dia
        if day:
            if day not in by_day:
                by_day[day] = {
                    'date': day, 'total': 0,
                    'inbound': 0, 'outbound': 0, 'internal': 0, 'answered': 0,
                }
            by_day[day]['total']   += 1
            by_day[day][direction] += 1
            if disposition == 'ANSWERED':
                by_day[day]['answered'] += 1

        # Por ramal
        if direction == 'inbound':
            # Quem atendeu a chamada externa
            add_ext(r['answer_by'] or r['dst'], 'received')
        elif direction == 'outbound':
            add_ext(r['src'], 'made')
        elif direction == 'internal':
            add_ext(r['src'], 'internal')

        # Por tronco
        if direction == 'inbound':
            trunk = r['src_trunk']
            add_trunk(trunk, 'inbound')
            if trunk:
                if r['ivr_presented']:
                    by_trunk[trunk]['ivr_presented'] += 1
                if r['ivr_dropout']:
                    by_trunk[trunk]['ivr_dropout'] += 1
                if r['human_answered']:
                    by_trunk[trunk]['human_answered'] += 1
        elif direction == 'outbound':
            add_trunk(r['dst_trunk'], 'outbound')

    # Preenche nomes dos ramais
    for num, entry in by_extension.items():
        entry['name'] = ext_names.get(num, '')

    # Taxa de atendimento
    if summary['total'] > 0:
        summary['answer_rate'] = round(summary['answered'] / summary['total'], 4)

    # Período coberto pelo arquivo
    dates = [r['start_time'][:10] for r in canonical if len(r.get('start_time', '')) >= 10]
    period = {
        'from': min(dates) if dates else '',
        'to':   max(dates) if dates else '',
    }

    return {
        'summary':      summary,
        'by_extension': sorted(by_extension.values(), key=lambda x: -x['total']),
        'by_trunk':     sorted(by_trunk.values(),     key=lambda x: -x['total']),
        'by_day':       sorted(by_day.values(),       key=lambda x:  x['date']),
        'period':       period,
        'count':        len(canonical),
    }


# ──────────────────────────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Caminho do arquivo não fornecido.'}))
        sys.exit(1)

    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(json.dumps({'error': f'Arquivo não encontrado: {file_path}'}))
        sys.exit(1)

    try:
        result = parse_cdr(file_path)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        import traceback
        print(json.dumps({
            'error': f'Erro ao processar arquivo: {str(e)}',
            'detail': traceback.format_exc(),
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()
