#!/usr/bin/env python3
"""
Extrai todos os ZIPs e organiza CSVs + XLS + XLSX em pasta única.
Uso: python organizar_zips.py
Coloque na pasta dos ZIPs (C:\\Users\\Gustavo\\Desktop\\dados)
"""

import os, sys, zipfile, shutil
from pathlib import Path

PASTA_ZIPS = Path(os.path.dirname(os.path.abspath(__file__))) if len(sys.argv) < 2 else Path(sys.argv[1])
PASTA_SAIDA = PASTA_ZIPS / "dados_organizados"
PASTA_SAIDA.mkdir(exist_ok=True)

# Extensões de DADOS que queremos manter
MANTER = {'.csv', '.xls', '.xlsx', '.tsv'}
# Extensões para ignorar
IGNORAR = {'.sha1', '.sha512', '.pdf', '.json', '.jpg', '.jpeg', '.png', '.gif', '.xml', '.html', '.htm', '.txt', '.doc', '.docx', '.zip'}

print("=" * 70)
print(f"📂 Pasta de ZIPs: {PASTA_ZIPS}")
print(f"📁 Pasta de saída: {PASTA_SAIDA}")
print("=" * 70)

total_zips = 0
total_dados = 0
total_ignorados = 0
erros = []
arquivos_soltos = []

# 1) Processar ZIPs
zips = sorted(PASTA_ZIPS.glob("*.zip"))
print(f"\n🔍 {len(zips)} arquivos ZIP encontrados")

for zip_path in zips:
    total_zips += 1
    nome_zip = zip_path.stem
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as zf:
            dados_no_zip = 0
            
            for arquivo in zf.namelist():
                nome_arquivo = Path(arquivo).name
                if not nome_arquivo:
                    continue
                
                ext = Path(nome_arquivo).suffix.lower()
                
                if ext not in MANTER:
                    total_ignorados += 1
                    continue
                
                destino = PASTA_SAIDA / nome_arquivo
                if destino.exists():
                    nome_sem_ext = Path(nome_arquivo).stem
                    destino = PASTA_SAIDA / f"{nome_sem_ext}__{nome_zip}{ext}"
                
                with zf.open(arquivo) as src, open(destino, 'wb') as dst:
                    shutil.copyfileobj(src, dst)
                
                dados_no_zip += 1
                total_dados += 1
            
            status = f"✅ {dados_no_zip} arquivos" if dados_no_zip > 0 else "⚠️ vazio"
            print(f"  {nome_zip}.zip → {status}")
            
    except Exception as e:
        erros.append((zip_path.name, str(e)))
        print(f"  ❌ {nome_zip}.zip → ERRO: {e}")

# 2) Copiar arquivos soltos (CSV/XLS/XLSX que não estão em ZIP)
print(f"\n🔍 Procurando arquivos soltos (CSV/XLS/XLSX)...")
for ext in MANTER:
    for arquivo in sorted(PASTA_ZIPS.glob(f"*{ext}")):
        if arquivo.parent == PASTA_SAIDA:
            continue
        nome = arquivo.name
        destino = PASTA_SAIDA / nome
        if not destino.exists():
            shutil.copy2(arquivo, destino)
            arquivos_soltos.append(nome)
            total_dados += 1
            print(f"  📄 {nome} (solto)")
    for arquivo in sorted(PASTA_ZIPS.glob(f"*{ext.upper()}")):
        if arquivo.parent == PASTA_SAIDA:
            continue
        nome = arquivo.name
        destino = PASTA_SAIDA / nome
        if not destino.exists():
            shutil.copy2(arquivo, destino)
            arquivos_soltos.append(nome)
            total_dados += 1
            print(f"  📄 {nome} (solto)")

# === RESUMO ===
print("\n" + "=" * 70)
print(f"📦 ZIPs processados:    {total_zips}")
print(f"📄 Arquivos extraídos:  {total_dados}")
print(f"📄 Arquivos soltos:     {len(arquivos_soltos)}")
print(f"🚫 Ignorados:          {total_ignorados}")
print(f"❌ Erros:               {len(erros)}")
print(f"📁 Tudo em:             {PASTA_SAIDA}")
print("=" * 70)

# === INVENTÁRIO POR TIPO ===
todos = sorted(PASTA_SAIDA.iterdir())
por_ext = {}
por_dataset = {}

for f in todos:
    if not f.is_file():
        continue
    ext = f.suffix.lower()
    mb = f.stat().st_size / (1024 * 1024)
    
    por_ext.setdefault(ext, []).append((f.name, mb))
    
    nome = f.stem.lower()
    tipo = "outro"
    for prefixo in ['votacao_secao', 'votacao_candidato', 'votacao_partido',
                     'consulta_cand', 'bem_candidato', 'consulta_coligacao',
                     'consulta_vagas', 'rede_social', 'motivo_cassacao',
                     'prestacao_contas', 'receitas_candidato', 'despesas_contratadas',
                     'despesas_pagas', 'receitas_doadores', 'receitas_fornecedores',
                     'perfil_eleitorado', 'perfil_eleitor_secao', 'perfil_comparecimento',
                     'detalhe_votacao', 'comparecimento',
                     'bweb', 'boletim_urna', 'mesario', 'convocacao',
                     'filiados', 'pesquisa', 'consulta_legenda',
                     'eleitorado_local', 'local_votacao']:
        if prefixo in nome:
            tipo = prefixo
            break
    por_dataset.setdefault(tipo, []).append((f.name, mb))

print("\n📊 Por extensão:")
for ext, arqs in sorted(por_ext.items()):
    total_mb = sum(mb for _, mb in arqs)
    print(f"  {ext}: {len(arqs)} arquivos ({total_mb:.1f} MB)")

print("\n📊 Por dataset:")
for tipo in sorted(por_dataset.keys()):
    arqs = por_dataset[tipo]
    total_mb = sum(mb for _, mb in arqs)
    # Separar GO dos demais
    go_count = sum(1 for n, _ in arqs if '_GO' in n or '_go' in n)
    print(f"\n  📊 {tipo} ({len(arqs)} arquivos, {total_mb:.1f} MB, {go_count} de GO)")
    for nome, mb in sorted(arqs)[:3]:
        print(f"     - {nome} ({mb:.1f} MB)")
    if len(arqs) > 3:
        print(f"     ... e mais {len(arqs) - 3}")

if erros:
    print("\n⚠️ ZIPs com erro:")
    for nome, erro in erros:
        print(f"   - {nome}: {erro}")

print(f"\n✅ Pronto! {total_dados} arquivos organizados em: {PASTA_SAIDA}")
print("Cole o resumo acima no chat para próximo passo!")
