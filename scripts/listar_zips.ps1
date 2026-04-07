# Listar todos os ZIPs da pasta
# Uso: Abra o PowerShell, navegue até a pasta dos dados e rode:
#   .\listar_zips.ps1

$pasta = "C:\Users\Gustavo\Desktop\dados"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ZIPs encontrados em: $pasta" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$zips = Get-ChildItem -Path $pasta -Filter "*.zip" | Sort-Object Name

Write-Host "`nTotal: $($zips.Count) arquivos ZIP`n" -ForegroundColor Yellow

foreach ($zip in $zips) {
    $mb = [math]::Round($zip.Length / 1MB, 1)
    Write-Host "  $($zip.Name)  ($mb MB)"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Total: $($zips.Count) ZIPs" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
