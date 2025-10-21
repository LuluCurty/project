import pandas as pd
import json
from datetime import datetime
import sys
import os

# Lê o caminho do arquivo a partir dos argumentos
if len(sys.argv) < 2:
    print("Uso: python excel_to_json.py <caminho_arquivo_excel>")
    sys.exit(1)

INPUT_FILE = sys.argv[1]  # agora o arquivo é dinâmico
OUTPUT_FILE = "supplies.json"
LOG_FILE = "import_supplies_log.txt"

def main():
    print(f"Lendo arquivo: {INPUT_FILE}")
    try:
        if not os.path.exists(INPUT_FILE):
            print(f"Arquivo {INPUT_FILE} não encontrado.")
            return False

        # Leitura inicial sem cabeçalho
        df_raw = pd.read_excel(INPUT_FILE, header=None)
        header_row = None

        # Detecta a linha onde começa a tabela
        for i, row in df_raw.iterrows():
            if "DESCRIÇÃO" in row.astype(str).values:
                header_row = i
                break

        if header_row is None:
            print('❌ Coluna "DESCRIÇÃO" inexistente!')
            return False

        # Lê a planilha a partir do cabeçalho correto
        df = pd.read_excel(INPUT_FILE, header=header_row)

        # Normaliza nomes das colunas
        df.columns = df.columns.str.strip().str.upper()

        # Identifica colunas de nome e quantidade
        col_name = None
        col_qtd = None

        for col in df.columns:
            if "DESCRIÇÃO" in col:
                col_name = col
            if "TOTAL" in col or "QTD" in col or "QTDE" in col:
                col_qtd = col

        if not col_name or not col_qtd:
            print("❌ Não foram identificadas as colunas 'DESCRIÇÃO' ou 'QUANTIDADE'.")
            return False

        # Filtragem e renomeação
        df = df[[col_name, col_qtd]].rename(columns={
            col_name: "supply_name",
            col_qtd: "quantity"
        })

        # Limpeza de dados
        df = df.dropna(subset=["supply_name"])
        df["supply_name"] = df["supply_name"].astype(str).str.strip().str.title()
        df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0).astype(int)

        # Remove duplicados
        duplicates = df[df.duplicated(subset=["supply_name"], keep=False)]
        df = df.drop_duplicates(subset=["supply_name"], keep="first")

        # Adiciona colunas extras (para compatibilidade)
        df["image_url"] = ""
        df["details"] = ""

        # Gera JSON
        records = df.to_dict(orient="records")
        with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
            json.dump(records, file, ensure_ascii=False, indent=2)

        # Gera log
        with open(LOG_FILE, "w", encoding="utf-8") as log:
            log.write(f"Relatório gerado em {datetime.now()}\n")
            log.write(f"Materiais válidos: {len(df)}\n")
            log.write(f"Duplicatas ignoradas: {len(duplicates)}\n")


        print("✅ Concluído com sucesso!")
        print(f"→ JSON: {OUTPUT_FILE}")
        print(f"→ Log: {LOG_FILE}")

    except Exception as e:
        print(f'Erro: ${e}')
        return False
    
if __name__ == "__main__":
    main()
