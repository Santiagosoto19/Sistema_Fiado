# Ejecuta colección Postman SV y genera documentación automática (HTML + Obsidian)
# Uso: cd backend/postman && .\run-postman-docs.ps1
#      .\run-postman-docs.ps1 -Environment Local

param(
    [ValidateSet('Azure', 'Local')]
    [string]$Environment = 'Azure'
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

$collection = Join-Path $here 'FiadoCheck-SV-Pruebas.postman_collection.json'
if ($Environment -eq 'Local') {
    $envFile = Join-Path $here 'FiadoCheck-SV-Pruebas-Local.postman_environment.json'
} else {
    $envFile = Join-Path $here 'FiadoCheck-SV-Pruebas.postman_environment.json'
}

if (-not (Test-Path $collection)) {
    Write-Host 'No se encontró FiadoCheck-SV-Pruebas.postman_collection.json' -ForegroundColor Red
    exit 1
}

if (-not (Test-Path (Join-Path $here 'node_modules'))) {
    Write-Host 'Instalando Newman...' -ForegroundColor Cyan
    npm install
}

$reportsDir = Join-Path $here 'reports'
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

$jsonOut = Join-Path $reportsDir 'newman-results.json'
$htmlOut = Join-Path $reportsDir 'postman-report.html'
$newman = Join-Path $here 'node_modules\.bin\newman.cmd'

Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host 'Ejecutando Newman...' -ForegroundColor Cyan

& $newman run $collection `
    -e $envFile `
    --reporters cli,json,htmlextra `
    --reporter-json-export $jsonOut `
    --reporter-htmlextra-export $htmlOut `
    --reporter-htmlextra-title 'FiadoCheck SV — Postman' `
    --reporter-htmlextra-showEnvironmentData

$newmanExit = $LASTEXITCODE

Write-Host ''
Write-Host 'Generando nota Obsidian...' -ForegroundColor Cyan
node (Join-Path $here 'generate-obsidian-report.js') $jsonOut
$obsidianExit = $LASTEXITCODE

Write-Host ''
if ($newmanExit -eq 0) {
    Write-Host 'Listo: reporte HTML + nota Obsidian generados.' -ForegroundColor Green
} else {
    Write-Host "Newman terminó con código $newmanExit. Revisa reportes y la nota Obsidian." -ForegroundColor Yellow
}

exit [Math]::Max($newmanExit, $obsidianExit)
