#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║  RODAR TUDO — Orquestrador v1.0                                  ║
║  Importa TUDO que falta: TSE (P1+P2) + Externas (P1+P2)          ║
║  Usa --resume para pular o que já subiu                           ║
║  Limpa cache de downloads corrompidos antes de começar             ║
╚══════════════════════════════════════════════════════════════════╝

Uso:
  python rodar_tudo.py              # Roda tudo que falta
  python rodar_tudo.py --limpar     # Limpa cache de falhas e roda tudo
  python rodar_tudo.py --status     # Mostra status sem importar
"""

import subprocess, sys, os, time, json
from pathlib import Path
from datetime import datetime

SCRIPTS_DIR = Path(__file__).parent

class C:
    RST="\033[0m"; B="\033[1m"; R="\033[91m"; G="\033[92m"
    Y="\033[93m"; CY="\033[96m"; GR="\033[90m"
    BG_G="\033[42m"; BG_R="\033[41m"; W="\033[97m"

def banner(text):
    w = max(len(text)+6, 70)
    print(f"\n  {C.B}{C.CY}{'═'*w}{C.RST}")
    print(f"  {C.B}{C.CY}║{C.RST}  {C.B}{text}{C.RST}")
    print(f"  {C.B}{C.CY}{'═'*w}{C.RST}\n")

def ts():
    return datetime.now().strftime("%H:%M:%S")

def log(msg, color=C.W):
    print(f"  {C.GR}{ts()}{C.RST} {color}{msg}{C.RST}", flush=True)

def run_script(script, args):
    """Roda um script Python e retorna (sucesso, output_resumo)"""
    cmd = [sys.executable, str(SCRIPTS_DIR / script)] + args
    log(f"$ {' '.join(cmd)}", C.CY)
    
    result = subprocess.run(cmd, cwd=str(SCRIPTS_DIR), capture_output=False)
    return result.returncode == 0

def limpar_cache_falhas():
    """Remove ZIPs potencialmente corrompidos do cache"""
    cache_tse = SCRIPTS_DIR / ".cache_tse"
    cache_ext = SCRIPTS_DIR / ".cache_externas"
    removed = 0
    
    for cache_dir in [cache_tse, cache_ext]:
        if not cache_dir.exists():
            continue
        for f in cache_dir.iterdir():
            if f.is_file() and f.stat().st_size < 1000:
                log(f"Removendo cache corrompido: {f.name} ({f.stat().st_size} bytes)", C.Y)
                f.unlink()
                removed += 1
    
    if removed:
        log(f"Removidos {removed} arquivos corrompidos do cache", C.Y)
    else:
        log(f"Cache limpo — nenhum arquivo corrompido", C.G)

def contar_tabelas_config():
    """Conta total de tabelas configuradas"""
    tse_config = SCRIPTS_DIR / "sources.json"
    ext_config = SCRIPTS_DIR / "sources_externas.json"
    
    tse_total = tse_p1 = tse_p2 = 0
    ext_total = ext_p1 = ext_p2 = 0
    
    if tse_config.exists():
        data = json.loads(tse_config.read_text("utf-8"))
        for it in data.get("items", []):
            p = it.get("prioridade", 1)
            tse_total += 1
            if p <= 1: tse_p1 += 1
            else: tse_p2 += 1
    
    if ext_config.exists():
        data = json.loads(ext_config.read_text("utf-8"))
        for it in data.get("items", []):
            p = it.get("prioridade", 1)
            ext_total += 1
            if p <= 1: ext_p1 += 1
            else: ext_p2 += 1
    
    return {
        "tse_p1": tse_p1, "tse_p2": tse_p2, "tse_total": tse_total,
        "ext_p1": ext_p1, "ext_p2": ext_p2, "ext_total": ext_total,
        "total": tse_total + ext_total,
    }

def contar_manifest():
    """Conta quantas tabelas já subiram com sucesso"""
    tse_ok = ext_ok = 0
    
    manifest_tse = SCRIPTS_DIR / ".state" / "manifest.jsonl"
    manifest_ext = SCRIPTS_DIR / ".state" / "manifest_externas.jsonl"
    
    for path, counter_name in [(manifest_tse, "tse"), (manifest_ext, "ext")]:
        if not path.exists():
            continue
        for line in path.read_text("utf-8").splitlines():
            if not line.strip(): continue
            try:
                obj = json.loads(line)
                if obj.get("status") == "ok":
                    if counter_name == "tse":
                        tse_ok += 1
                    else:
                        ext_ok += 1
            except: pass
    
    return tse_ok, ext_ok

def cmd_status():
    banner("STATUS GERAL — O que subiu e o que falta")
    
    counts = contar_tabelas_config()
    tse_ok, ext_ok = contar_manifest()
    
    tse_falta = counts["tse_total"] - tse_ok
    ext_falta = counts["ext_total"] - ext_ok
    total_falta = tse_falta + ext_falta
    
    print(f"  {C.B}{'Pipeline':<25} {'Config':>8} {'✓ OK':>8} {'Falta':>8}{C.RST}")
    print(f"  {'─'*55}")
    
    tse_color = C.G if tse_falta == 0 else C.Y
    ext_color = C.G if ext_falta == 0 else C.Y
    
    print(f"  {tse_color}{'TSE P1':<25} {counts['tse_p1']:>8} {'—':>8} {'—':>8}{C.RST}")
    print(f"  {tse_color}{'TSE P2':<25} {counts['tse_p2']:>8} {'—':>8} {'—':>8}{C.RST}")
    print(f"  {tse_color}{'TSE Total':<25} {counts['tse_total']:>8} {tse_ok:>8} {tse_falta:>8}{C.RST}")
    print(f"  {ext_color}{'Externas P1':<25} {counts['ext_p1']:>8} {'—':>8} {'—':>8}{C.RST}")
    print(f"  {ext_color}{'Externas P2':<25} {counts['ext_p2']:>8} {'—':>8} {'—':>8}{C.RST}")
    print(f"  {ext_color}{'Externas Total':<25} {counts['ext_total']:>8} {ext_ok:>8} {ext_falta:>8}{C.RST}")
    print(f"  {'─'*55}")
    
    total_color = C.G if total_falta == 0 else (C.R if total_falta > 10 else C.Y)
    print(f"  {C.B}{'TOTAL':<25} {counts['total']:>8} {tse_ok+ext_ok:>8} {total_color}{total_falta:>8}{C.RST}")
    
    if total_falta == 0:
        print(f"\n  {C.G}{C.B}🎉 TUDO IMPORTADO! Nada faltando.{C.RST}\n")
    else:
        print(f"\n  {C.Y}→ Faltam {total_falta} tabelas. Rode: python rodar_tudo.py{C.RST}\n")
    
    # Mostrar detalhes do BigQuery se possível
    print(f"\n  Para detalhes do BigQuery:")
    print(f"    python importar_bigquery.py status")
    print(f"    python importar_externas.py status\n")

def cmd_rodar_tudo(limpar=False):
    t_start = time.time()
    
    banner("RODAR TUDO — Importador Completo v1.0")
    
    counts = contar_tabelas_config()
    tse_ok, ext_ok = contar_manifest()
    
    print(f"  {C.B}Configurado:{C.RST}")
    print(f"    TSE:      {counts['tse_total']} tabelas ({counts['tse_p1']} P1 + {counts['tse_p2']} P2) — {tse_ok} já OK")
    print(f"    Externas: {counts['ext_total']} tabelas ({counts['ext_p1']} P1 + {counts['ext_p2']} P2) — {ext_ok} já OK")
    print(f"    TOTAL:    {counts['total']} tabelas — {counts['total'] - tse_ok - ext_ok} faltando")
    print()
    
    if counts['total'] - tse_ok - ext_ok == 0:
        log("🎉 Tudo já importado! Nada para fazer.", C.G)
        return
    
    # Limpar cache se pedido
    if limpar:
        banner("LIMPANDO CACHE DE FALHAS")
        limpar_cache_falhas()
    
    etapas = []
    
    # ═══════════════════════════════════════════════════════════
    #  ETAPA 1: TSE P1 (--resume pula os 44 já OK, tenta os 7 que falharam)
    # ═══════════════════════════════════════════════════════════
    if tse_ok < counts['tse_total']:
        etapas.append(("TSE Prioridade 1", "importar_bigquery.py", ["importar", "--prioridade", "1", "--resume"]))
        etapas.append(("TSE Prioridade 2", "importar_bigquery.py", ["importar", "--prioridade", "2", "--resume"]))
    
    # ═══════════════════════════════════════════════════════════
    #  ETAPA 2: Externas P1 + P2
    # ═══════════════════════════════════════════════════════════
    if ext_ok < counts['ext_total']:
        etapas.append(("Externas Prioridade 1", "importar_externas.py", ["importar", "--prioridade", "1", "--resume"]))
        etapas.append(("Externas Prioridade 2", "importar_externas.py", ["importar", "--prioridade", "2", "--resume"]))
    
    resultados = []
    
    for i, (nome, script, args) in enumerate(etapas, 1):
        banner(f"ETAPA {i}/{len(etapas)} — {nome}")
        
        ok = run_script(script, args)
        resultados.append((nome, ok))
        
        if ok:
            log(f"✓ {nome} concluída com sucesso", C.G)
        else:
            log(f"⚠ {nome} concluída com erros (continuando...)", C.Y)
        
        # Pausa entre etapas para não sobrecarregar
        if i < len(etapas):
            log("Pausa de 5s entre etapas...", C.GR)
            time.sleep(5)
    
    # ═══════════════════════════════════════════════════════════
    #  RELATÓRIO FINAL UNIFICADO
    # ═══════════════════════════════════════════════════════════
    dur = time.time() - t_start
    
    banner("RELATÓRIO FINAL UNIFICADO")
    
    tse_ok_final, ext_ok_final = contar_manifest()
    
    total_ok = tse_ok_final + ext_ok_final
    total_falta = counts['total'] - total_ok
    
    w = 55
    print(f"\n  {C.G}┌{'─'*w}┐{C.RST}")
    print(f"  {C.G}│{C.RST} {C.B}{'Resumo Final':<{w-2}}{C.RST} {C.G}│{C.RST}")
    print(f"  {C.G}├{'─'*w}┤{C.RST}")
    
    linhas = [
        f"Duração total:   {int(dur//3600)}h{int(dur%3600//60):02d}m{int(dur%60):02d}s" if dur >= 3600 else f"Duração total:   {int(dur//60)}m{int(dur%60):02d}s",
        f"",
        f"TSE:             {tse_ok_final}/{counts['tse_total']} tabelas OK",
        f"Externas:        {ext_ok_final}/{counts['ext_total']} tabelas OK",
        f"",
        f"TOTAL:           {total_ok}/{counts['total']} tabelas importadas",
        f"FALTANDO:        {total_falta}",
    ]
    
    for l in linhas:
        print(f"  {C.G}│{C.RST} {l:<{w-2}} {C.G}│{C.RST}")
    
    print(f"  {C.G}└{'─'*w}┘{C.RST}")
    
    print(f"\n  {C.B}Etapas:{C.RST}")
    for nome, ok in resultados:
        icon = f"{C.G}✓" if ok else f"{C.Y}⚠"
        print(f"    {icon} {nome}{C.RST}")
    
    if total_falta == 0:
        print(f"\n  {C.G}{C.B}🎉 TUDO IMPORTADO COM SUCESSO! 99 tabelas no BigQuery!{C.RST}")
    elif total_falta <= 5:
        print(f"\n  {C.Y}⚠ Quase lá! Faltam {total_falta} tabelas.")
        print(f"  Rode novamente: python rodar_tudo.py --limpar{C.RST}")
    else:
        print(f"\n  {C.R}✗ Faltam {total_falta} tabelas. Verifique os logs em .logs/{C.RST}")
        print(f"  Rode novamente: python rodar_tudo.py --limpar")
    
    print()

def main():
    import argparse
    ap = argparse.ArgumentParser(description="Orquestrador — Importa TUDO que falta para o BigQuery")
    ap.add_argument("--limpar", action="store_true", help="Limpar cache de downloads corrompidos antes de rodar")
    ap.add_argument("--status", action="store_true", help="Mostrar status sem importar nada")
    args = ap.parse_args()
    
    if args.status:
        cmd_status()
    else:
        cmd_rodar_tudo(limpar=args.limpar)

if __name__ == "__main__":
    main()
