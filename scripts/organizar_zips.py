#!/usr/bin/env python3
"""
Script para extrair todos os ZIPs e organizar CSVs em pasta única.
Uso: python organizar_zips.py

Coloque na mesma pasta dos ZIPs (C:\Users\Gustavo\Desktop\dados)
"""

import os
import sys
import zipfile
import shutil
from pathlib import Path
from datetime import datetime

# === CONFIGURAÇÃO ===
PASTA_ZIPS = Path(os.path.dirname(os.path.abspath(__file__))) if len(sys.argv) < 2 else Path(sys.argv[1])
PASTA_SAIDA = PASTA_ZIPS / "csvs_organizados"
PASTA_SAIDA.mkdir(exist_ok=True)

# Extensões para ignorar
IGNORAR = {'.sha1', '.sha512', '.pdf', '.json', '.jpg', '.jpeg', '.png', '.gif', '.xml', '.html', '.htm', '.txt'}

print("=" * 70)
print(f"📂 Pasta de ZIPs: {PASTA_ZIPS}")
print(f"📁 Pasta de saída: {PASTA_SAIDA}")
print("=" * 70)

total_zips = 0
total_csvs = 0
total_ignorados = 0
erros = []

# Listar todos os ZIPs
zips = sorted(PASTA_ZIPS.glob("*.zip"))
print(f"\n🔍 Encontrados {len(zips)} arquivos ZIP\n")

for zip_path in zips:
    total_zips += 1
    nome_zip = zip_path.stem  # nome sem .zip
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as zf:
            arquivos = zf.namelist()
            csvs_no_zip = 0
            
            for arquivo in arquivos:
                # Pegar só o nome do arquivo (sem pastas internas)
                nome_arquivo = Path(arquivo).name
                
                if not nome_arquivo:  # é diretório
                    continue
                
                ext = Path(nome_arquivo).suffix.lower()
                
                if ext in IGNORAR:
                    total_ignorados += 1
                    continue
                
                if ext not in ('.csv', '.CSV'):
                    total_ignorados += 1
                    continue
                
                # Extrair o CSV para a pasta de saída
                # Se já existe, adiciona sufixo do ZIP para evitar conflito
                destino = PASTA_SAIDA / nome_arquivo
                
                if destino.exists():
                    # Renomear com prefixo do ZIP
                    nome_sem_ext = Path(nome_arquivo).stem
                    destino = PASTA_SAIDA / f"{nome_sem_ext}__{nome_zip}{ext}"
                
                # Extrair
                with zf.open(arquivo) as src, open(destino, 'wb') as dst:
                    shutil.copyfileobj(src, dst)
                
                csvs_no_zip += 1
                total_csvs += 1
            
            status = f"✅ {csvs_no_zip} CSVs" if csvs_no_zip > 0 else "⚠️ sem CSVs"
            print(f"  {nome_zip}.zip → {status}")
            
    except Exception as e:
        erros.append((zip_path.name, str(e)))
        print(f"  ❌ {nome_zip}.zip → ERRO: {e}")

# === RESUMO ===
print("\n" + "=" * 70)
print(f"📦 ZIPs processados:  {total_zips}")
print(f"📄 CSVs extraídos:    {total_csvs}")
print(f"🚫 Arquivos ignorados: {total_ignorados}")
print(f"❌ Erros:             {len(erros)}")
print(f"📁 Tudo em:           {PASTA_SAIDA}")
print("=" * 70)

if erros:
    print("\n⚠️ ZIPs com erro:")
    for nome, erro in erros:
        print(f"   - {nome}: {erro}")

# === LISTAR CSVS ORGANIZADOS ===
csvs_finais = sorted(PASTA_SAIDA.glob("*.csv")) + sorted(PASTA_SAIDA.glob("*.CSV"))
print(f"\n📋 {len(csvs_finais)} arquivos CSV na pasta de saída:")

# Agrupar por dataset
datasets = {}
for csv in csvs_finais:
    # Tentar identificar o dataset
    nome = csv.stem.lower()
    tamanho_mb = csv.stat().st_size / (1024 * 1024)
    
    # Identificar tipo
    tipo = "outro"
    for prefixo in ['votacao_secao', 'votacao_candidato', 'votacao_partido', 
                     'consulta_cand', 'bem_candidato', 'consulta_coligacao',
                     'consulta_vagas', 'rede_social', 'motivo_cassacao',
                     'prestacao_contas', 'receitas', 'despesas',
                     'perfil_eleitorado', 'perfil_eleitor_secao',
                     'detalhe_votacao', 'comparecimento',
                     'bweb', 'boletim_urna', 'mesario', 'convocacao',
                     'filiados', 'pesquisa']:
        if prefixo in nome:
            tipo = prefixo
            break
    
    if tipo not in datasets:
        datasets[tipo] = []
    datasets[tipo].append((csv.name, tamanho_mb))

for tipo in sorted(datasets.keys()):
    arquivos = datasets[tipo]
    total_mb = sum(mb for _, mb in arquivos)
    print(f"\n  📊 {tipo} ({len(arquivos)} arquivos, {total_mb:.1f} MB)")
    for nome, mb in sorted(arquivos)[:5]:
        print(f"     - {nome} ({mb:.1f} MB)")
    if len(arquivos) > 5:
        print(f"     ... e mais {len(arquivos) - 5} arquivos")

print(f"\n✅ Pronto! Todos os CSVs estão em: {PASTA_SAIDA}")
print("Próximo passo: me envie o resumo acima para organizarmos a importação.")
