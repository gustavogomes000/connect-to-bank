<#
.SYNOPSIS
    Organiza TODOS os dados TSE locais em CSVs limpos por tabela, filtrados para Goias.
.NOTES
    Rodar: powershell -ExecutionPolicy Bypass -File organizar_dados_local.ps1
#>

param(
    [string]$PastaDados = "C:\Users\Gustavo\Desktop\dados",
    [string]$PastaSaida = "C:\Users\Gustavo\Desktop\dados_organizados",
    [string]$PastaTemp  = "C:\Users\Gustavo\Desktop\dados_temp"
)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Identificar-Tabela([string]$nome) {
    $n = $nome.ToLower()
    
    # Ordem importa: padroes mais especificos primeiro
    if ($n -match "consulta_cand_complementar")          { return "candidatos_complementar" }
    if ($n -match "rede_social_candidato")               { return "redes_sociais" }
    if ($n -match "consulta_cand")                       { return "candidatos" }
    if ($n -match "bem_candidato")                       { return "bens_candidatos" }
    if ($n -match "votacao_candidato_munzona")            { return "votacao_munzona" }
    if ($n -match "votacao_partido_munzona")              { return "votacao_partido_munzona" }
    if ($n -match "votacao_secao")                        { return "votacao_secao" }
    if ($n -match "detalhe_votacao_munzona")              { return "comparecimento_munzona" }
    if ($n -match "detalhe_votacao_secao")                { return "comparecimento_secao" }
    if ($n -match "perfil_eleitor_secao")                 { return "perfil_eleitor_secao" }
    if ($n -match "perfil_eleitorado")                    { return "perfil_eleitorado" }
    if ($n -match "eleitorado_local")                     { return "eleitorado_local" }
    if ($n -match "receitas_candidatos_doadores|receitas_doadores") { return "doadores_campanha" }
    if ($n -match "despesas_contratadas")                 { return "despesas_contratadas" }
    if ($n -match "despesas_pagas")                       { return "despesas_pagas" }
    if ($n -match "receita")                              { return "receitas" }
    if ($n -match "despesa")                              { return "despesas" }
    if ($n -match "prestacao_de_contas_eleitorais_orgaos") { return "prestacao_partidos" }
    if ($n -match "prestacao_de_contas")                  { return "prestacao_raw" }
    if ($n -match "filiados|filiacao_partidaria")         { return "filiados" }
    if ($n -match "consulta_coligacao")                   { return "coligacoes" }
    if ($n -match "consulta_vagas")                       { return "vagas" }
    if ($n -match "consulta_legendas|consulta_legenda")   { return "legendas" }
    if ($n -match "bweb|boletim_urna|bu_")                { return "boletim_urna" }
    if ($n -match "pesquisa_eleitoral")                   { return "pesquisas" }
    if ($n -match "motivo_cassacao")                      { return "cassacoes" }
    if ($n -match "consulta_mesarios|mesarios")           { return "mesarios" }
    if ($n -match "transferencia_eleitoral")              { return "transferencia_eleitoral" }
    if ($n -match "comparecimento_abstencao")             { return "comparecimento_abstencao" }
    if ($n -match "consulta_orgao_partidario|orgao_partidario") { return "orgao_partidario" }
    if ($n -match "fundo_partidario")                     { return "fundo_partidario" }
    if ($n -match "certidao_criminal")                    { return "certidao_criminal" }
    if ($n -match "convocacao_mesarios")                  { return "mesarios" }

    return $null
}

function Get-Ano([string]$nome) {
    if ($nome -match "(20\d{2})") { return $Matches[1] }
    if ($nome -match "(19\d{2})") { return $Matches[1] }
    return "sem_ano"
}

function Eh-ArquivoGO([string]$caminho) {
    $nome = [System.IO.Path]::GetFileName($caminho).ToLower()
    return ($nome -match "_go[_.\s]" -or $nome -match "_go\." -or $nome -match "_go$" -or $nome -match "goias")
}

function Encontrar-ColunaUF([string[]]$colunas) {
    $possveis = @("SG_UF", "SG_UE", "UF", "SIGLA_UF", "SG_UF_NASCIMENTO", "sigla_uf")
    foreach ($col in $possveis) {
        for ($i = 0; $i -lt $colunas.Count; $i++) {
            if ($colunas[$i].Trim('"', ' ').ToUpper() -eq $col.ToUpper()) {
                return $i
            }
        }
    }
    return -1
}

function Filtrar-ParaGO {
    param([string]$Entrada, [string]$Saida)
    
    try {
        $tamanhoMB = [math]::Round((Get-Item $Entrada).Length / 1MB, 1)
        
        # Ler primeira linha para detectar formato
        $primeiraLinha = $null
        try {
            $reader = [System.IO.StreamReader]::new($Entrada, [System.Text.Encoding]::GetEncoding("iso-8859-1"))
            $primeiraLinha = $reader.ReadLine()
            $reader.Close()
        } catch {
            try {
                $reader = [System.IO.StreamReader]::new($Entrada, [System.Text.Encoding]::UTF8)
                $primeiraLinha = $reader.ReadLine()
                $reader.Close()
            } catch {
                Write-Host " [ERRO LEITURA]" -ForegroundColor Red
                return 0
            }
        }
        
        if (-not $primeiraLinha -or $primeiraLinha.Length -lt 2) {
            Write-Host " [VAZIO]" -ForegroundColor DarkGray
            return 0
        }
        
        $separador = if (($primeiraLinha.ToCharArray() | Where-Object {$_ -eq ";"} | Measure-Object).Count -gt 2) { ";" } else { "," }
        $colunas = $primeiraLinha -split [regex]::Escape($separador)
        $idxUF = Encontrar-ColunaUF $colunas
        
        # Se nao tem coluna UF e arquivo ja eh de GO, copiar tudo
        if ($idxUF -lt 0) {
            if (Eh-ArquivoGO $Entrada) {
                Copy-Item $Entrada $Saida -Force
                $reader = [System.IO.StreamReader]::new($Saida, [System.Text.Encoding]::GetEncoding("iso-8859-1"))
                $linhas = 0
                while ($null -ne $reader.ReadLine()) { $linhas++ }
                $reader.Close()
                return [Math]::Max(0, $linhas - 1)
            }
            Write-Host " [SEM COL UF, ${tamanhoMB}MB]" -ForegroundColor Yellow
            return 0
        }
        
        # Filtrar linha a linha
        $enc = [System.Text.Encoding]::GetEncoding("iso-8859-1")
        $reader = [System.IO.StreamReader]::new($Entrada, $enc)
        $writer = [System.IO.StreamWriter]::new($Saida, $false, [System.Text.Encoding]::UTF8)
        
        $header = $reader.ReadLine()
        $writer.WriteLine($header)
        
        $contGO = 0
        $contTotal = 0
        
        while ($null -ne ($linha = $reader.ReadLine())) {
            $contTotal++
            $campos = $linha -split [regex]::Escape($separador)
            if ($campos.Count -gt $idxUF) {
                $val = $campos[$idxUF].Trim('"', ' ').ToUpper()
                if ($val -eq "GO" -or $val -eq "GOIAS" -or $val -match "^52\d{3}") {
                    $writer.WriteLine($linha)
                    $contGO++
                }
            }
            
            if ($contTotal % 500000 -eq 0) {
                Write-Host "." -NoNewline
            }
        }
        
        $reader.Close()
        $writer.Close()
        
        if ($contGO -eq 0 -and (Test-Path $Saida)) {
            Remove-Item $Saida -Force
        }
        
        return $contGO
    }
    catch {
        Write-Host " [ERRO: $($_.Exception.Message)]" -ForegroundColor Red
        return 0
    }
}

# ============================================================
$inicio = Get-Date
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " ORGANIZADOR DADOS ELEITORAIS - GOIAS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Origem:  $PastaDados"
Write-Host "Destino: $PastaSaida"
Write-Host ""

if (Test-Path $PastaSaida) { Remove-Item $PastaSaida -Recurse -Force }
New-Item -ItemType Directory -Path $PastaSaida -Force | Out-Null
New-Item -ItemType Directory -Path $PastaTemp -Force | Out-Null

$relatorio = @{}
$naoMapeados = @()
$erros = @()

# Listar arquivos
$todosArquivos = Get-ChildItem $PastaDados -Recurse -File
$zips = @($todosArquivos | Where-Object { $_.Extension.ToLower() -eq ".zip" })
$csvsDiretos = @($todosArquivos | Where-Object { $_.Extension.ToLower() -in @(".csv", ".txt") })
$jsonsDiretos = @($todosArquivos | Where-Object { $_.Extension.ToLower() -eq ".json" -and $_.Name -like "raw_*" })

Write-Host "ZIPs: $($zips.Count) | CSVs: $($csvsDiretos.Count) | JSONs: $($jsonsDiretos.Count)" -ForegroundColor White
Write-Host ""

$totalRegistrosGO = 0
$idx = 0

foreach ($zip in $zips) {
    $idx++
    $nomeZip = $zip.Name
    $ano = Get-Ano $nomeZip
    
    # Identificar tabela pelo nome do ZIP
    $tabelaZip = Identificar-Tabela $nomeZip
    
    Write-Host "[$idx/$($zips.Count)] $nomeZip" -ForegroundColor White -NoNewline
    
    $tempDir = Join-Path $PastaTemp "z_$idx"
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
    
    try {
        Expand-Archive -Path $zip.FullName -DestinationPath $tempDir -Force -ErrorAction Stop
    }
    catch {
        Write-Host " [ERRO EXTRAIR: $($_.Exception.Message)]" -ForegroundColor Red
        $erros += "EXTRAIR: $nomeZip - $($_.Exception.Message)"
        continue
    }
    
    $csvsNoZip = @(Get-ChildItem $tempDir -Recurse -File | Where-Object { $_.Extension.ToLower() -in @(".csv", ".txt") })
    
    if ($csvsNoZip.Count -eq 0) {
        Write-Host " (sem CSVs)" -ForegroundColor DarkGray
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        continue
    }
    
    $registrosZip = 0
    
    foreach ($csv in $csvsNoZip) {
        $nomeCsv = $csv.Name
        if ($nomeCsv -match "(?i)leia.?me|readme|instruc") { continue }
        
        # Tentar identificar pelo CSV, depois pelo ZIP
        $tabela = Identificar-Tabela $nomeCsv
        if (-not $tabela) { $tabela = $tabelaZip }
        
        if (-not $tabela) {
            $naoMapeados += "$nomeZip -> $nomeCsv"
            continue
        }
        
        # Separar prestacao_raw em receitas/despesas pelo conteudo do CSV
        if ($tabela -eq "prestacao_raw") {
            $nCsv = $nomeCsv.ToLower()
            if ($nCsv -match "receita") { $tabela = "receitas" }
            elseif ($nCsv -match "despesa") { $tabela = "despesas" }
            else { continue }
        }
        
        $pastaTabela = Join-Path $PastaSaida $tabela
        if (-not (Test-Path $pastaTabela)) {
            New-Item -ItemType Directory -Path $pastaTabela -Force | Out-Null
        }
        
        $nomeSaida = "${tabela}_${ano}_GO.csv"
        $caminhoSaida = Join-Path $pastaTabela $nomeSaida
        $sufixo = 1
        while (Test-Path $caminhoSaida) {
            $nomeSaida = "${tabela}_${ano}_GO_${sufixo}.csv"
            $caminhoSaida = Join-Path $pastaTabela $nomeSaida
            $sufixo++
        }
        
        $registros = Filtrar-ParaGO -Entrada $csv.FullName -Saida $caminhoSaida
        
        if ($registros -gt 0) {
            $registrosZip += $registros
            if (-not $relatorio.ContainsKey($tabela)) {
                $relatorio[$tabela] = @{ Arquivos = 0; Registros = 0; Anos = [System.Collections.ArrayList]::new() }
            }
            $relatorio[$tabela].Arquivos++
            $relatorio[$tabela].Registros += $registros
            if ($ano -notin $relatorio[$tabela].Anos) {
                [void]$relatorio[$tabela].Anos.Add($ano)
            }
        }
    }
    
    $totalRegistrosGO += $registrosZip
    
    if ($registrosZip -gt 0) {
        Write-Host " -> $($registrosZip.ToString('N0')) GO" -ForegroundColor Green
    } else {
        Write-Host " (0 GO)" -ForegroundColor DarkGray
    }
    
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

# CSVs soltos
Write-Host ""
Write-Host "Processando $($csvsDiretos.Count) CSVs soltos..." -ForegroundColor Green

foreach ($csv in $csvsDiretos) {
    if ($csv.Name -match "(?i)leia.?me|readme|instruc") { continue }
    $tabela = Identificar-Tabela $csv.Name
    if (-not $tabela) { continue }
    if ($tabela -eq "prestacao_raw") {
        $n = $csv.Name.ToLower()
        if ($n -match "receita") { $tabela = "receitas" }
        elseif ($n -match "despesa") { $tabela = "despesas" }
        else { continue }
    }
    
    $ano = Get-Ano $csv.BaseName
    $pastaTabela = Join-Path $PastaSaida $tabela
    if (-not (Test-Path $pastaTabela)) { New-Item -ItemType Directory -Path $pastaTabela -Force | Out-Null }
    
    $nomeSaida = "${tabela}_${ano}_GO.csv"
    $caminhoSaida = Join-Path $pastaTabela $nomeSaida
    $sufixo = 1
    while (Test-Path $caminhoSaida) {
        $nomeSaida = "${tabela}_${ano}_GO_${sufixo}.csv"
        $caminhoSaida = Join-Path $pastaTabela $nomeSaida
        $sufixo++
    }
    
    Write-Host "  $($csv.Name)" -ForegroundColor White -NoNewline
    $registros = Filtrar-ParaGO -Entrada $csv.FullName -Saida $caminhoSaida
    if ($registros -gt 0) {
        Write-Host " -> $($registros.ToString('N0')) GO" -ForegroundColor Green
        $totalRegistrosGO += $registros
        if (-not $relatorio.ContainsKey($tabela)) {
            $relatorio[$tabela] = @{ Arquivos = 0; Registros = 0; Anos = [System.Collections.ArrayList]::new() }
        }
        $relatorio[$tabela].Arquivos++
        $relatorio[$tabela].Registros += $registros
        if ($ano -notin $relatorio[$tabela].Anos) { [void]$relatorio[$tabela].Anos.Add($ano) }
    } else {
        Write-Host " (0 GO)" -ForegroundColor DarkGray
    }
}

# JSONs
$pastaApis = Join-Path $PastaSaida "_apis_externas"
if ($jsonsDiretos.Count -gt 0) {
    New-Item -ItemType Directory -Path $pastaApis -Force | Out-Null
    foreach ($json in $jsonsDiretos) {
        Copy-Item $json.FullName (Join-Path $pastaApis $json.Name) -Force
        Write-Host "  JSON: $($json.Name)" -ForegroundColor Green
    }
}

# Limpar temp
if (Test-Path $PastaTemp) { Remove-Item $PastaTemp -Recurse -Force -ErrorAction SilentlyContinue }

# RELATORIO
$fim = Get-Date
$duracao = $fim - $inicio

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " RELATORIO FINAL" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host ("{0,-35} {1,8} {2,12} {3}" -f "TABELA", "ARQS", "REGISTROS", "ANOS") -ForegroundColor White
Write-Host ("-" * 70) -ForegroundColor DarkGray

foreach ($t in ($relatorio.Keys | Sort-Object)) {
    $r = $relatorio[$t]
    $anos = ($r.Anos | Sort-Object) -join ","
    $cor = if ($r.Registros -gt 10000) { "Green" } elseif ($r.Registros -gt 0) { "Yellow" } else { "Red" }
    Write-Host ("{0,-35} {1,8} {2,12:N0} {3}" -f $t, $r.Arquivos, $r.Registros, $anos) -ForegroundColor $cor
}

Write-Host ("-" * 70) -ForegroundColor DarkGray
Write-Host "Tabelas: $($relatorio.Count) | Registros GO: $($totalRegistrosGO.ToString('N0')) | Duracao: $($duracao.ToString('hh\:mm\:ss'))" -ForegroundColor Cyan

if ($naoMapeados.Count -gt 0) {
    Write-Host ""
    Write-Host "NAO MAPEADOS ($($naoMapeados.Count)):" -ForegroundColor Yellow
    $naoMapeados | Select-Object -Unique | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkYellow }
}

if ($erros.Count -gt 0) {
    Write-Host ""
    Write-Host "ERROS ($($erros.Count)):" -ForegroundColor Red
    $erros | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
}

# Salvar relatorio
$relPath = Join-Path $PastaSaida "_RELATORIO.txt"
$txt = "RELATORIO - $fim`nDuracao: $($duracao.ToString('hh\:mm\:ss'))`n`n"
foreach ($t in ($relatorio.Keys | Sort-Object)) {
    $r = $relatorio[$t]
    $txt += "$t | $($r.Arquivos) arqs | $($r.Registros.ToString('N0')) regs | anos: $(($r.Anos | Sort-Object) -join ',')`n"
}
$txt += "`nTotal: $($relatorio.Count) tabelas, $($totalRegistrosGO.ToString('N0')) registros`n"
if ($naoMapeados.Count -gt 0) {
    $txt += "`nNAO MAPEADOS:`n"
    $naoMapeados | Select-Object -Unique | ForEach-Object { $txt += "  $_`n" }
}
Set-Content $relPath $txt -Encoding UTF8

Write-Host ""
Write-Host "Relatorio: $relPath" -ForegroundColor Green
Write-Host "Saida em:  $PastaSaida" -ForegroundColor Green
Write-Host ""
