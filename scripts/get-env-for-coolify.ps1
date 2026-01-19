# Script para extraer variables de entorno en formato Coolify
# Este script lee tu archivo .env local y las muestra en formato listo para copiar/pegar en Coolify

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Variables de Entorno para Coolify" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$envFile = ".env"

if (-Not (Test-Path $envFile)) {
    Write-Host "⚠️  No se encontró el archivo .env" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Por favor, crea un archivo .env con tus credenciales:" -ForegroundColor Yellow
    Write-Host "  cp .env.example .env" -ForegroundColor Gray
    Write-Host "  # Luego edita .env con tus valores reales" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "📄 Leyendo archivo .env..." -ForegroundColor Green
Write-Host ""

# Leer el archivo .env
$envContent = Get-Content $envFile | Where-Object { $_ -match '^VITE_' }

if ($envContent.Count -eq 0) {
    Write-Host "⚠️  No se encontraron variables VITE_* en .env" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔧 Variables para configurar en Coolify → Build Arguments:" -ForegroundColor Cyan
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

foreach ($line in $envContent) {
    if ($line -match '^([^=]+)=(.*)$') {
        $varName = $matches[1]
        $varValue = $matches[2]
        
        # Determinar el tipo de variable
        $type = ""
        if ($varName -match "SUPABASE_URL") {
            $type = "🔗 URL"
        } elseif ($varName -match "ANON_KEY") {
            $type = "🔑 Anon Key"
        } elseif ($varName -match "PRINTER") {
            $type = "🖨️  Printer"
        }
        
        Write-Host ""
        Write-Host "Variable: " -NoNewline -ForegroundColor White
        Write-Host "$varName" -ForegroundColor Yellow
        
        if ($type) {
            Write-Host "Tipo:     " -NoNewline -ForegroundColor White
            Write-Host "$type" -ForegroundColor Cyan
        }
        
        Write-Host "Valor:    " -NoNewline -ForegroundColor White
        
        # Mostrar valor parcialmente oculto si es una key
        if ($varName -match "KEY") {
            $maskedValue = $varValue.Substring(0, [Math]::Min(20, $varValue.Length)) + "..."
            Write-Host "$maskedValue" -ForegroundColor DarkGray
        } else {
            Write-Host "$varValue" -ForegroundColor Green
        }
        
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "📋 Cómo usar estas variables en Coolify:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Ve a tu aplicación en Coolify" -ForegroundColor White
Write-Host "  2. Pestaña 'Build' → Sección 'Build Arguments'" -ForegroundColor White
Write-Host "  3. Agrega cada variable con su nombre y valor" -ForegroundColor White
Write-Host "  4. Haz clic en 'Deploy'" -ForegroundColor White
Write-Host ""

# Opción para exportar a un archivo
$export = Read-Host "¿Quieres exportar las variables a un archivo de texto? (s/n)"

if ($export -eq "s" -or $export -eq "S") {
    $outputFile = "coolify-build-args.txt"
    
    "# Variables de Build para Coolify" | Out-File $outputFile
    "# Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $outputFile -Append
    "" | Out-File $outputFile -Append
    
  foreach ($line in $envContent) {
        if ($line -match '^([^=]+)=(.*)$') {
            $varName = $matches[1]
            $varValue = $matches[2]
            "$varName=$varValue" | Out-File $outputFile -Append
        }
    }
    
    Write-Host ""
    Write-Host "✅ Variables exportadas a: $outputFile" -ForegroundColor Green
    Write-Host "⚠️  ADVERTENCIA: Este archivo contiene secretos. NO lo subas a GitHub." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "🎉 ¡Listo! Usa estas variables en Coolify." -ForegroundColor Green
Write-Host ""
