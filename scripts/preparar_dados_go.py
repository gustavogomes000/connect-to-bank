#!/usr/bin/env python3
"""
PREPARAÇÃO COMPLETA DOS DADOS ELEITORAIS - SOMENTE GOIÁS
=========================================================
1. Extrai TODOS os ZIPs (qualquer tipo de arquivo dentro)
2. Converte XLS, XLSX, TSV → CSV
3. Filtra SOMENTE dados de Goiás
4. Salva tudo como CSV UTF-8 pronto para subir

Uso: python preparar_dados_go.py
Rode na pasta dos ZIPs (C:\Users\Gustavo\Desktop\dados)
"""

import os, sys, zipfile, shutil, csv, glob
from pathlib import Path

# Tenta importar pandas (necessário para XLS/XLSX)
try:
    import pandas as pd
    TEM_PANDAS = True
except ImportError:
    TEM_PANDAS = False
    print("⚠️ pandas não instalado. Rode: pip install pandas openpyxl xlrd")
    print("   Sem pandas, arquivos XLS/XLSX serão IGNORADOS (só CSV/TSV processados)")
    print()

# === CONFIGURAÇÃO ===
PASTA_ZIPS = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(os.path.dirname(os.path.abspath(__file__))).parent / "dados" if not Path("*.zip").parent.exists() else Path(".")
# Se rodar da pasta dos dados:
if not list(PASTA_ZIPS.glob("*.zip")):
    PASTA_ZIPS = Path(".")
if not list(PASTA_ZIPS.glob("*.zip")):
    PASTA_ZIPS = Path(r"C:\Users\Gustavo\Desktop\dados")

PASTA_TEMP = PASTA_ZIPS / "_temp_extracao"
PASTA_SAIDA = PASTA_ZIPS / "dados_go_prontos"
PASTA_SAIDA.mkdir(exist_ok=True)

# Extensões de dados que sabemos processar
EXT_DADOS = {'.csv', '.tsv', '.xls', '.xlsx', '.txt'}

# === COLUNAS QUE IDENTIFICAM GOIÁS ===
# O TSE usa várias colunas diferentes dependendo do dataset
COLUNAS_UF = ['SG_UF', 'SG_UF_NASCIMENTO', 'SG_UE', 'UF', 'SIGLA_UF', 'SG_UF_VAGA']
COLUNAS_ESTADO = ['NM_UE', 'DS_UE', 'NOME_UE', 'NM_MUNICIPIO', 'NOME_MUNICIPIO', 'DS_MUNICIPIO']
COLUNAS_COD_UF = ['CD_UF', 'COD_UF', 'CODIGO_UF']  # GO = 52
COLUNAS_COD_MUN = ['CD_MUNICIPIO', 'COD_MUNICIPIO', 'SQ_CANDIDATO']

# Nomes que identificam Goiás
FILTROS_GO = ['GO', 'GOIÁS', 'GOIAS']

# === ESTATÍSTICAS ===
stats = {
    'zips_processados': 0,
    'arquivos_encontrados': 0,
    'arquivos_go': 0,
    'arquivos_brasil_filtrados': 0,
    'arquivos_sem_uf': 0,
    'arquivos_ignorados': 0,
    'linhas_total': 0,
    'linhas_go': 0,
    'erros': [],
    'tipos_arquivo': {},
    'datasets_go': {},
}


def detectar_separador(caminho, encoding='latin-1'):
    """Detecta se o CSV usa ; ou , ou \\t"""
    try:
        with open(caminho, 'r', encoding=encoding, errors='replace') as f:
            primeira_linha = f.readline()
            # Conta ocorrências de cada separador
            sep_counts = {
                ';': primeira_linha.count(';'),
                ',': primeira_linha.count(','),
                '\t': primeira_linha.count('\t'),
                '|': primeira_linha.count('|'),
            }
            return max(sep_counts, key=sep_counts.get)
    except:
        return ';'


def detectar_encoding(caminho):
    """Tenta detectar encoding do arquivo"""
    for enc in ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']:
        try:
            with open(caminho, 'r', encoding=enc) as f:
                f.read(10000)
            return enc
        except (UnicodeDecodeError, UnicodeError):
            continue
    return 'latin-1'


def arquivo_ja_eh_go(nome_arquivo):
    """Verifica se o nome do arquivo já indica que é de GO"""
    nome = nome_arquivo.upper()
    indicadores = ['_GO.', '_GO_', '_GO.CSV', '_GO.TSV', '_GO.XLS', '_GO.XLSX', '_GO.TXT']
    return any(ind in nome + '.' for ind in indicadores)


def filtrar_csv_go(caminho_entrada, caminho_saida, ja_eh_go=False):
    """Lê CSV/TSV, filtra linhas de GO, salva como CSV UTF-8"""
    encoding = detectar_encoding(str(caminho_entrada))
    sep = detectar_separador(str(caminho_entrada), encoding)
    
    linhas_entrada = 0
    linhas_saida = 0
    
    try:
        with open(caminho_entrada, 'r', encoding=encoding, errors='replace') as fin:
            reader = csv.reader(fin, delimiter=sep)
            
            # Ler cabeçalho
            try:
                header = next(reader)
            except StopIteration:
                return 0, 0
            
            # Limpar cabeçalho (remover BOM, aspas, espaços)
            header = [h.strip().strip('"').strip("'").replace('\ufeff', '') for h in header]
            header_upper = [h.upper() for h in header]
            
            # Encontrar colunas de UF
            idx_uf = []
            for col in COLUNAS_UF:
                if col in header_upper:
                    idx_uf.append(header_upper.index(col))
            
            # Encontrar colunas de estado/município  
            idx_estado = []
            for col in COLUNAS_ESTADO:
                if col in header_upper:
                    idx_estado.append(header_upper.index(col))
            
            # Encontrar colunas de código UF (52 = GO)
            idx_cod_uf = []
            for col in COLUNAS_COD_UF:
                if col in header_upper:
                    idx_cod_uf.append(header_upper.index(col))
            
            # Se arquivo já é de GO OU não tem coluna de UF, manter tudo
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
                    
                    # Verificar se a linha é de GO
                    eh_go = False
                    
                    # Checar UF = GO
                    for idx in idx_uf:
                        if idx < len(row):
                            valor = row[idx].strip().strip('"').upper()
                            if valor in ('GO', 'GOIÁS', 'GOIAS'):
                                eh_go = True
                                break
                    
                    # Checar código UF = 52
                    if not eh_go:
                        for idx in idx_cod_uf:
                            if idx < len(row):
                                valor = row[idx].strip().strip('"')
                                if valor == '52':
                                    eh_go = True
                                    break
                    
                    # Checar nome do estado/município contém GOIÁS
                    if not eh_go:
                        for idx in idx_estado:
                            if idx < len(row):
                                valor = row[idx].strip().strip('"').upper()
                                if any(f in valor for f in FILTROS_GO):
                                    eh_go = True
                                    break
                    
                    if eh_go:
                        writer.writerow(row)
                        linhas_saida += 1
        
        if not manter_tudo and linhas_saida == 0:
            # Nenhuma linha de GO encontrada - remover arquivo vazio
            os.remove(caminho_saida)
        
        return linhas_entrada, linhas_saida
        
    except Exception as e:
        stats['erros'].append(f"CSV {caminho_entrada.name}: {e}")
        return 0, 0


def converter_excel_para_csv(caminho_excel, pasta_destino, ja_eh_go=False):
    """Converte XLS/XLSX para CSV filtrado por GO"""
    if not TEM_PANDAS:
        stats['arquivos_ignorados'] += 1
        return
    
    try:
        # Ler todas as sheets
        xls = pd.ExcelFile(caminho_excel)
        
        for sheet_name in xls.sheet_names:
            try:
                df = pd.read_excel(xls, sheet_name=sheet_name, dtype=str)
                
                if df.empty:
                    continue
                
                # Filtrar GO
                if not ja_eh_go:
                    df_go = filtrar_dataframe_go(df)
                else:
                    df_go = df
                
                if df_go is not None and not df_go.empty:
                    sufixo = f"_{sheet_name}" if len(xls.sheet_names) > 1 else ""
                    nome_csv = f"{caminho_excel.stem}{sufixo}.csv"
                    caminho_saida = pasta_destino / nome_csv
                    
                    df_go.to_csv(caminho_saida, sep=';', index=False, encoding='utf-8')
                    
                    stats['arquivos_go'] += 1
                    stats['linhas_total'] += len(df)
                    stats['linhas_go'] += len(df_go)
                    
                    registrar_dataset(nome_csv, len(df_go))
                    
            except Exception as e:
                stats['erros'].append(f"Sheet {sheet_name} de {caminho_excel.name}: {e}")
                
    except Exception as e:
        stats['erros'].append(f"Excel {caminho_excel.name}: {e}")


def filtrar_dataframe_go(df):
    """Filtra DataFrame pandas para linhas de GO"""
    colunas = [c.upper() for c in df.columns]
    
    mascara = None
    
    # Checar colunas de UF
    for col_busca in COLUNAS_UF:
        if col_busca in colunas:
            idx = colunas.index(col_busca)
            col_real = df.columns[idx]
            m = df[col_real].astype(str).str.strip().str.upper().isin(['GO', 'GOIÁS', 'GOIAS'])
            mascara = m if mascara is None else (mascara | m)
    
    # Checar código UF = 52
    for col_busca in COLUNAS_COD_UF:
        if col_busca in colunas:
            idx = colunas.index(col_busca)
            col_real = df.columns[idx]
            m = df[col_real].astype(str).str.strip() == '52'
            mascara = m if mascara is None else (mascara | m)
    
    # Checar nome estado/município
    for col_busca in COLUNAS_ESTADO:
        if col_busca in colunas:
            idx = colunas.index(col_busca)
            col_real = df.columns[idx]
            m = df[col_real].astype(str).str.upper().str.contains('GOI', na=False)
            mascara = m if mascara is None else (mascara | m)
    
    if mascara is None:
        # Sem coluna de UF - manter tudo (pode ser arquivo que não tem UF)
        stats['arquivos_sem_uf'] += 1
        return df
    
    return df[mascara]


def registrar_dataset(nome_arquivo, linhas):
    """Registra arquivo no inventário por dataset"""
    nome = nome_arquivo.lower()
    tipo = "outro"
    prefixos = [
        'votacao_secao', 'votacao_candidato', 'votacao_partido',
        'consulta_cand', 'bem_candidato', 'consulta_coligacao',
        'consulta_vagas', 'rede_social', 'motivo_cassacao',
        'prestacao', 'receitas', 'despesas',
        'perfil_eleitorado', 'perfil_eleitor_secao', 'perfil_filiacao',
        'detalhe_votacao', 'bweb', 'boletim_urna',
        'pesquisa', 'eleitorado_local', 'local_votacao',
        'extrato_campanha', 'orgao_partidario', 'delegado',
        'historico_totalizacao', 'relatorio_resultado',
    ]
    for p in prefixos:
        if p in nome:
            tipo = p
            break
    
    if tipo not in stats['datasets_go']:
        stats['datasets_go'][tipo] = {'arquivos': 0, 'linhas': 0}
    stats['datasets_go'][tipo]['arquivos'] += 1
    stats['datasets_go'][tipo]['linhas'] += linhas


# ============================================================
# EXECUÇÃO PRINCIPAL
# ============================================================
print("=" * 70)
print("🗳️  PREPARAÇÃO DADOS ELEITORAIS - SOMENTE GOIÁS")
print("=" * 70)
print(f"📂 Pasta ZIPs: {PASTA_ZIPS}")
print(f"📁 Saída:      {PASTA_SAIDA}")
print(f"🐍 Pandas:     {'✅ Sim' if TEM_PANDAS else '❌ Não (XLS/XLSX ignorados)'}")
print("=" * 70)

# ETAPA 1: Extrair todos os ZIPs
print("\n📦 ETAPA 1: Extraindo ZIPs...")
PASTA_TEMP.mkdir(exist_ok=True)

zips = sorted(PASTA_ZIPS.glob("*.zip"))
print(f"   {len(zips)} ZIPs encontrados\n")

for i, zip_path in enumerate(zips, 1):
    nome_zip = zip_path.stem
    pct = f"[{i}/{len(zips)}]"
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as zf:
            # Extrair para pasta temp com nome do ZIP
            pasta_zip = PASTA_TEMP / nome_zip
            pasta_zip.mkdir(exist_ok=True)
            zf.extractall(pasta_zip)
            
            # Contar arquivos extraídos
            arquivos = list(pasta_zip.rglob("*"))
            arquivos = [a for a in arquivos if a.is_file()]
            
            for a in arquivos:
                ext = a.suffix.lower()
                stats['tipos_arquivo'][ext] = stats['tipos_arquivo'].get(ext, 0) + 1
            
            stats['zips_processados'] += 1
            stats['arquivos_encontrados'] += len(arquivos)
            print(f"   {pct} ✅ {nome_zip}.zip → {len(arquivos)} arquivos")
            
    except Exception as e:
        stats['erros'].append(f"ZIP {zip_path.name}: {e}")
        print(f"   {pct} ❌ {nome_zip}.zip → ERRO: {e}")

# ETAPA 2: Processar todos os arquivos extraídos
print(f"\n📊 ETAPA 2: Convertendo e filtrando para GO...")
print(f"   Tipos encontrados: {stats['tipos_arquivo']}")

todos_arquivos = sorted(PASTA_TEMP.rglob("*"))
todos_arquivos = [a for a in todos_arquivos if a.is_file()]

for i, arq in enumerate(todos_arquivos, 1):
    ext = arq.suffix.lower()
    
    if ext not in EXT_DADOS:
        stats['arquivos_ignorados'] += 1
        continue
    
    # Determinar se arquivo já é de GO pelo nome
    ja_go = arquivo_ja_eh_go(arq.name)
    
    # Nome do ZIP de origem (pasta pai)
    zip_origem = arq.relative_to(PASTA_TEMP).parts[0]
    
    if i % 50 == 0 or i == len(todos_arquivos):
        print(f"   Processando {i}/{len(todos_arquivos)}...")
    
    if ext in ('.csv', '.tsv', '.txt'):
        # CSV/TSV/TXT → filtrar e salvar
        nome_saida = f"{arq.stem}.csv"
        caminho_saida = PASTA_SAIDA / nome_saida
        
        # Evitar conflito de nomes
        if caminho_saida.exists():
            nome_saida = f"{arq.stem}__{zip_origem}.csv"
            caminho_saida = PASTA_SAIDA / nome_saida
        
        linhas_in, linhas_out = filtrar_csv_go(arq, caminho_saida, ja_go)
        stats['linhas_total'] += linhas_in
        stats['linhas_go'] += linhas_out
        
        if linhas_out > 0:
            stats['arquivos_go'] += 1
            registrar_dataset(nome_saida, linhas_out)
            if ja_go:
                tipo_msg = "GO direto"
            elif linhas_in == linhas_out:
                tipo_msg = "sem UF (mantido)"
                stats['arquivos_sem_uf'] += 1
            else:
                tipo_msg = f"filtrado {linhas_in}→{linhas_out}"
                stats['arquivos_brasil_filtrados'] += 1
        else:
            if linhas_in > 0:
                stats['arquivos_brasil_filtrados'] += 1
    
    elif ext in ('.xls', '.xlsx'):
        converter_excel_para_csv(arq, PASTA_SAIDA, ja_go)

# ETAPA 3: Copiar arquivos soltos da pasta raiz
print(f"\n📄 ETAPA 3: Verificando arquivos soltos...")
for ext in EXT_DADOS:
    for arq in sorted(PASTA_ZIPS.glob(f"*{ext}")):
        if arq.parent in (PASTA_SAIDA, PASTA_TEMP):
            continue
        ja_go = arquivo_ja_eh_go(arq.name)
        nome_saida = f"{arq.stem}.csv"
        caminho_saida = PASTA_SAIDA / nome_saida
        if not caminho_saida.exists():
            if ext in ('.csv', '.tsv', '.txt'):
                linhas_in, linhas_out = filtrar_csv_go(arq, caminho_saida, ja_go)
                if linhas_out > 0:
                    stats['arquivos_go'] += 1
                    registrar_dataset(nome_saida, linhas_out)
            elif ext in ('.xls', '.xlsx') and TEM_PANDAS:
                converter_excel_para_csv(arq, PASTA_SAIDA, ja_go)

# Limpar pasta temp
print(f"\n🧹 Limpando temporários...")
try:
    shutil.rmtree(PASTA_TEMP)
    print("   ✅ Pasta temp removida")
except:
    print("   ⚠️ Não conseguiu remover pasta temp (pode deletar manualmente)")

# ============================================================
# RESUMO FINAL
# ============================================================
print("\n" + "=" * 70)
print("📊 RESUMO FINAL")
print("=" * 70)
print(f"📦 ZIPs processados:         {stats['zips_processados']}")
print(f"📄 Arquivos encontrados:     {stats['arquivos_encontrados']}")
print(f"✅ Arquivos GO gerados:      {stats['arquivos_go']}")
print(f"🔍 Brasil → filtrado GO:     {stats['arquivos_brasil_filtrados']}")
print(f"📋 Sem coluna UF (mantidos): {stats['arquivos_sem_uf']}")
print(f"🚫 Ignorados (não-dados):    {stats['arquivos_ignorados']}")
print(f"📊 Linhas totais lidas:      {stats['linhas_total']:,}")
print(f"📊 Linhas GO salvas:         {stats['linhas_go']:,}")
print(f"❌ Erros:                    {len(stats['erros'])}")
print(f"📁 Tudo em:                  {PASTA_SAIDA}")

# Inventário por dataset
print("\n" + "=" * 70)
print("📊 INVENTÁRIO POR DATASET (somente GO)")
print("=" * 70)
for tipo in sorted(stats['datasets_go'].keys()):
    info = stats['datasets_go'][tipo]
    print(f"  📊 {tipo}: {info['arquivos']} arquivos, {info['linhas']:,} linhas")

# Listar arquivos finais
print("\n" + "=" * 70)
print("📁 ARQUIVOS GERADOS")
print("=" * 70)
arquivos_finais = sorted(PASTA_SAIDA.glob("*.csv"))
total_mb = 0
for f in arquivos_finais:
    mb = f.stat().st_size / (1024 * 1024)
    total_mb += mb
    print(f"  {f.name} ({mb:.1f} MB)")

print(f"\n  TOTAL: {len(arquivos_finais)} arquivos, {total_mb:.1f} MB")

if stats['erros']:
    print("\n⚠️ ERROS:")
    for e in stats['erros'][:20]:
        print(f"   - {e}")
    if len(stats['erros']) > 20:
        print(f"   ... e mais {len(stats['erros']) - 20} erros")

print(f"\n✅ PRONTO! {stats['arquivos_go']} arquivos CSV de Goiás em: {PASTA_SAIDA}")
print("Cole o resultado aqui para o próximo passo (subida para o banco)!")
