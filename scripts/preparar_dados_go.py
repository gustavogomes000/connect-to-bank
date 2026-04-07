# -*- coding: utf-8 -*-
# PREPARACAO COMPLETA DOS DADOS ELEITORAIS - SOMENTE GOIAS
# Extrai ZIPs, converte XLS/XLSX/TSV para CSV, filtra so Goias
# Uso: py preparar_dados_go.py

import os, sys, zipfile, shutil, csv
from pathlib import Path

try:
    import pandas as pd
    TEM_PANDAS = True
except ImportError:
    TEM_PANDAS = False
    print("pandas nao instalado. Rode: pip install pandas openpyxl xlrd")
    print("Sem pandas, arquivos XLS/XLSX serao IGNORADOS")
    print()

PASTA_ZIPS = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(os.path.dirname(os.path.abspath(__file__)))
if not list(PASTA_ZIPS.glob("*.zip")):
    PASTA_ZIPS = Path(".")

PASTA_TEMP = PASTA_ZIPS / "_temp_extracao"
PASTA_SAIDA = PASTA_ZIPS / "dados_go_prontos"
PASTA_SAIDA.mkdir(exist_ok=True)

EXT_DADOS = {'.csv', '.tsv', '.xls', '.xlsx', '.txt'}

COLUNAS_UF = ['SG_UF', 'SG_UF_NASCIMENTO', 'SG_UE', 'UF', 'SIGLA_UF', 'SG_UF_VAGA']
COLUNAS_ESTADO = ['NM_UE', 'DS_UE', 'NOME_UE', 'NM_MUNICIPIO', 'NOME_MUNICIPIO', 'DS_MUNICIPIO']
COLUNAS_COD_UF = ['CD_UF', 'COD_UF', 'CODIGO_UF']
FILTROS_GO = ['GO', 'GOIAS']

stats = {
    'zips_processados': 0, 'arquivos_encontrados': 0, 'arquivos_go': 0,
    'arquivos_brasil_filtrados': 0, 'arquivos_sem_uf': 0, 'arquivos_ignorados': 0,
    'linhas_total': 0, 'linhas_go': 0, 'erros': [], 'tipos_arquivo': {}, 'datasets_go': {},
}

def detectar_separador(caminho, encoding='latin-1'):
    try:
        with open(caminho, 'r', encoding=encoding, errors='replace') as f:
            linha = f.readline()
            sep_counts = {';': linha.count(';'), ',': linha.count(','), '\t': linha.count('\t'), '|': linha.count('|')}
            return max(sep_counts, key=sep_counts.get)
    except:
        return ';'

def detectar_encoding(caminho):
    for enc in ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']:
        try:
            with open(caminho, 'r', encoding=enc) as f:
                f.read(10000)
            return enc
        except (UnicodeDecodeError, UnicodeError):
            continue
    return 'latin-1'

def arquivo_ja_eh_go(nome_arquivo):
    nome = nome_arquivo.upper()
    return '_GO.' in nome or '_GO_' in nome

def filtrar_csv_go(caminho_entrada, caminho_saida, ja_eh_go=False):
    encoding = detectar_encoding(str(caminho_entrada))
    sep = detectar_separador(str(caminho_entrada), encoding)
    linhas_entrada = 0
    linhas_saida = 0
    try:
        with open(caminho_entrada, 'r', encoding=encoding, errors='replace') as fin:
            reader = csv.reader(fin, delimiter=sep)
            try:
                header = next(reader)
            except StopIteration:
                return 0, 0
            header = [h.strip().strip('"').strip("'").replace('\ufeff', '') for h in header]
            header_upper = [h.upper() for h in header]
            idx_uf = [header_upper.index(c) for c in COLUNAS_UF if c in header_upper]
            idx_estado = [header_upper.index(c) for c in COLUNAS_ESTADO if c in header_upper]
            idx_cod_uf = [header_upper.index(c) for c in COLUNAS_COD_UF if c in header_upper]
            manter_tudo = ja_eh_go or (not idx_uf and not idx_estado and not idx_cod_uf)
            with open(caminho_saida, 'w', encoding='utf-8', newline='') as fout:
                writer = csv.writer(fout, delimiter=';')
                writer.writerow(header)
                for row in reader:
                    linhas_entrada += 1
                    if manter_tudo:
                        writer.writerow(row)
                        linhas_saida += 1
                        continue
                    eh_go = False
                    for idx in idx_uf:
                        if idx < len(row):
                            valor = row[idx].strip().strip('"').upper()
                            if valor in ('GO', 'GOIAS'):
                                eh_go = True
                                break
                    if not eh_go:
                        for idx in idx_cod_uf:
                            if idx < len(row):
                                if row[idx].strip().strip('"') == '52':
                                    eh_go = True
                                    break
                    if not eh_go:
                        for idx in idx_estado:
                            if idx < len(row):
                                valor = row[idx].strip().strip('"').upper()
                                if 'GOI' in valor:
                                    eh_go = True
                                    break
                    if eh_go:
                        writer.writerow(row)
                        linhas_saida += 1
        if not manter_tudo and linhas_saida == 0:
            os.remove(caminho_saida)
        return linhas_entrada, linhas_saida
    except Exception as e:
        stats['erros'].append("CSV %s: %s" % (caminho_entrada.name, e))
        return 0, 0

def converter_excel_para_csv(caminho_excel, pasta_destino, ja_eh_go=False):
    if not TEM_PANDAS:
        stats['arquivos_ignorados'] += 1
        return
    try:
        xls = pd.ExcelFile(caminho_excel)
        for sheet_name in xls.sheet_names:
            try:
                df = pd.read_excel(xls, sheet_name=sheet_name, dtype=str)
                if df.empty:
                    continue
                if not ja_eh_go:
                    df_go = filtrar_dataframe_go(df)
                else:
                    df_go = df
                if df_go is not None and not df_go.empty:
                    sufixo = "_%s" % sheet_name if len(xls.sheet_names) > 1 else ""
                    nome_csv = "%s%s.csv" % (caminho_excel.stem, sufixo)
                    caminho_saida = pasta_destino / nome_csv
                    df_go.to_csv(caminho_saida, sep=';', index=False, encoding='utf-8')
                    stats['arquivos_go'] += 1
                    stats['linhas_total'] += len(df)
                    stats['linhas_go'] += len(df_go)
                    registrar_dataset(nome_csv, len(df_go))
            except Exception as e:
                stats['erros'].append("Sheet %s de %s: %s" % (sheet_name, caminho_excel.name, e))
    except Exception as e:
        stats['erros'].append("Excel %s: %s" % (caminho_excel.name, e))

def filtrar_dataframe_go(df):
    colunas = [c.upper() for c in df.columns]
    mascara = None
    for col_busca in COLUNAS_UF:
        if col_busca in colunas:
            col_real = df.columns[colunas.index(col_busca)]
            m = df[col_real].astype(str).str.strip().str.upper().isin(['GO', 'GOIAS'])
            mascara = m if mascara is None else (mascara | m)
    for col_busca in COLUNAS_COD_UF:
        if col_busca in colunas:
            col_real = df.columns[colunas.index(col_busca)]
            m = df[col_real].astype(str).str.strip() == '52'
            mascara = m if mascara is None else (mascara | m)
    for col_busca in COLUNAS_ESTADO:
        if col_busca in colunas:
            col_real = df.columns[colunas.index(col_busca)]
            m = df[col_real].astype(str).str.upper().str.contains('GOI', na=False)
            mascara = m if mascara is None else (mascara | m)
    if mascara is None:
        stats['arquivos_sem_uf'] += 1
        return df
    return df[mascara]

def registrar_dataset(nome_arquivo, linhas):
    nome = nome_arquivo.lower()
    tipo = "outro"
    for p in ['votacao_secao', 'votacao_candidato', 'votacao_partido', 'consulta_cand',
              'bem_candidato', 'consulta_coligacao', 'consulta_vagas', 'rede_social',
              'motivo_cassacao', 'prestacao', 'receitas', 'despesas', 'perfil_eleitorado',
              'perfil_eleitor_secao', 'perfil_filiacao', 'detalhe_votacao', 'bweb',
              'pesquisa', 'eleitorado_local', 'extrato_campanha', 'orgao_partidario',
              'delegado', 'historico_totalizacao', 'relatorio_resultado']:
        if p in nome:
            tipo = p
            break
    if tipo not in stats['datasets_go']:
        stats['datasets_go'][tipo] = {'arquivos': 0, 'linhas': 0}
    stats['datasets_go'][tipo]['arquivos'] += 1
    stats['datasets_go'][tipo]['linhas'] += linhas

print("=" * 70)
print("PREPARACAO DADOS ELEITORAIS - SOMENTE GOIAS")
print("=" * 70)
print("Pasta ZIPs: %s" % PASTA_ZIPS)
print("Saida:      %s" % PASTA_SAIDA)
print("Pandas:     %s" % ("Sim" if TEM_PANDAS else "Nao (XLS/XLSX ignorados)"))
print("=" * 70)

print("\nETAPA 1: Extraindo ZIPs...")
PASTA_TEMP.mkdir(exist_ok=True)
zips = sorted(PASTA_ZIPS.glob("*.zip"))
print("   %d ZIPs encontrados\n" % len(zips))

for i, zip_path in enumerate(zips, 1):
    nome_zip = zip_path.stem
    try:
        with zipfile.ZipFile(zip_path, 'r') as zf:
            pasta_zip = PASTA_TEMP / nome_zip
            pasta_zip.mkdir(exist_ok=True)
            zf.extractall(pasta_zip)
            arquivos = [a for a in pasta_zip.rglob("*") if a.is_file()]
            for a in arquivos:
                ext = a.suffix.lower()
                stats['tipos_arquivo'][ext] = stats['tipos_arquivo'].get(ext, 0) + 1
            stats['zips_processados'] += 1
            stats['arquivos_encontrados'] += len(arquivos)
            print("   [%d/%d] %s.zip -> %d arquivos" % (i, len(zips), nome_zip, len(arquivos)))
    except Exception as e:
        stats['erros'].append("ZIP %s: %s" % (zip_path.name, e))
        print("   [%d/%d] ERRO %s.zip: %s" % (i, len(zips), nome_zip, e))

print("\nETAPA 2: Convertendo e filtrando para GO...")
print("   Tipos encontrados: %s" % stats['tipos_arquivo'])

todos_arquivos = [a for a in sorted(PASTA_TEMP.rglob("*")) if a.is_file()]

for i, arq in enumerate(todos_arquivos, 1):
    ext = arq.suffix.lower()
    if ext not in EXT_DADOS:
        stats['arquivos_ignorados'] += 1
        continue
    ja_go = arquivo_ja_eh_go(arq.name)
    zip_origem = arq.relative_to(PASTA_TEMP).parts[0]
    if i % 50 == 0 or i == len(todos_arquivos):
        print("   Processando %d/%d..." % (i, len(todos_arquivos)))
    if ext in ('.csv', '.tsv', '.txt'):
        nome_saida = "%s.csv" % arq.stem
        caminho_saida = PASTA_SAIDA / nome_saida
        if caminho_saida.exists():
            nome_saida = "%s__%s.csv" % (arq.stem, zip_origem)
            caminho_saida = PASTA_SAIDA / nome_saida
        linhas_in, linhas_out = filtrar_csv_go(arq, caminho_saida, ja_go)
        stats['linhas_total'] += linhas_in
        stats['linhas_go'] += linhas_out
        if linhas_out > 0:
            stats['arquivos_go'] += 1
            registrar_dataset(nome_saida, linhas_out)
            if not ja_go and linhas_in == linhas_out:
                stats['arquivos_sem_uf'] += 1
            elif not ja_go:
                stats['arquivos_brasil_filtrados'] += 1
        else:
            if linhas_in > 0:
                stats['arquivos_brasil_filtrados'] += 1
    elif ext in ('.xls', '.xlsx'):
        converter_excel_para_csv(arq, PASTA_SAIDA, ja_go)

print("\nETAPA 3: Verificando arquivos soltos...")
for ext in EXT_DADOS:
    for arq in sorted(PASTA_ZIPS.glob("*%s" % ext)):
        if arq.parent in (PASTA_SAIDA, PASTA_TEMP):
            continue
        ja_go = arquivo_ja_eh_go(arq.name)
        nome_saida = "%s.csv" % arq.stem
        caminho_saida = PASTA_SAIDA / nome_saida
        if not caminho_saida.exists():
            if ext in ('.csv', '.tsv', '.txt'):
                linhas_in, linhas_out = filtrar_csv_go(arq, caminho_saida, ja_go)
                if linhas_out > 0:
                    stats['arquivos_go'] += 1
                    registrar_dataset(nome_saida, linhas_out)
            elif ext in ('.xls', '.xlsx') and TEM_PANDAS:
                converter_excel_para_csv(arq, PASTA_SAIDA, ja_go)

print("\nLimpando temporarios...")
try:
    shutil.rmtree(PASTA_TEMP)
    print("   Pasta temp removida")
except:
    print("   Nao conseguiu remover pasta temp (pode deletar manualmente)")

print("\n" + "=" * 70)
print("RESUMO FINAL")
print("=" * 70)
print("ZIPs processados:         %d" % stats['zips_processados'])
print("Arquivos encontrados:     %d" % stats['arquivos_encontrados'])
print("Arquivos GO gerados:      %d" % stats['arquivos_go'])
print("Brasil filtrado GO:       %d" % stats['arquivos_brasil_filtrados'])
print("Sem coluna UF (mantidos): %d" % stats['arquivos_sem_uf'])
print("Ignorados (nao-dados):    %d" % stats['arquivos_ignorados'])
print("Linhas totais lidas:      %s" % format(stats['linhas_total'], ','))
print("Linhas GO salvas:         %s" % format(stats['linhas_go'], ','))
print("Erros:                    %d" % len(stats['erros']))
print("Tudo em:                  %s" % PASTA_SAIDA)

print("\n" + "=" * 70)
print("INVENTARIO POR DATASET (somente GO)")
print("=" * 70)
for tipo in sorted(stats['datasets_go'].keys()):
    info = stats['datasets_go'][tipo]
    print("  %s: %d arquivos, %s linhas" % (tipo, info['arquivos'], format(info['linhas'], ',')))

print("\n" + "=" * 70)
print("ARQUIVOS GERADOS")
print("=" * 70)
arquivos_finais = sorted(PASTA_SAIDA.glob("*.csv"))
total_mb = 0
for f in arquivos_finais:
    mb = f.stat().st_size / (1024 * 1024)
    total_mb += mb
    print("  %s (%.1f MB)" % (f.name, mb))
print("\n  TOTAL: %d arquivos, %.1f MB" % (len(arquivos_finais), total_mb))

if stats['erros']:
    print("\nERROS:")
    for e in stats['erros'][:20]:
        print("   - %s" % e)
    if len(stats['erros']) > 20:
        print("   ... e mais %d erros" % (len(stats['erros']) - 20))

print("\nPRONTO! %d arquivos CSV de Goias em: %s" % (stats['arquivos_go'], PASTA_SAIDA))
print("Cole o resultado aqui para o proximo passo!")
