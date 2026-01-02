# Script PowerShell para consolidar todas las migraciones SQL
# Ejecutar desde: c:\Users\Usuari\Documents\GitHub\egea-Main-control

Write-Host "🔄 Consolidando migraciones SQL..." -ForegroundColor Cyan

# Archivo de salida
$outputFile = "supabase\MIGRATE_TO_MAINEGEA_V2_COMPLETE.sql"

# Header
$header = @"
-- ============================================
-- MIGRACIÓN COMPLETA A MAINEGEA V2
-- Generado automáticamente: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- ============================================

-- Base de datos destino: jyaudpctcqcuskzwmism.supabase.co
-- Ejecutar en: https://supabase.com/dashboard/project/jyaudpctcqcuskzwmism/sql/new

-- ============================================
-- EXTENSIONES
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- MIGRACIONES
-- ============================================

"@

# Escribir header
$header | Out-File -FilePath $outputFile -Encoding UTF8

# Obtener todas las migraciones en orden
$migrations = Get-ChildItem -Path "supabase\migrations\*.sql" | Sort-Object Name

Write-Host "📋 Encontradas $($migrations.Count) migraciones" -ForegroundColor Green

foreach ($migration in $migrations) {
    Write-Host "  ➕ Añadiendo: $($migration.Name)" -ForegroundColor Yellow
    
    # Añadir separador
    "`n-- ============================================" | Out-File -FilePath $outputFile -Append -Encoding UTF8
    "-- MIGRACIÓN: $($migration.Name)" | Out-File -FilePath $outputFile -Append -Encoding UTF8
    "-- ============================================`n" | Out-File -FilePath $outputFile -Append -Encoding UTF8
    
    # Añadir contenido de la migración
    Get-Content $migration.FullName | Out-File -FilePath $outputFile -Append -Encoding UTF8
    
    # Añadir separador final
    "`n" | Out-File -FilePath $outputFile -Append -Encoding UTF8
}

Write-Host "`n✅ Migración consolidada creada: $outputFile" -ForegroundColor Green
Write-Host "📊 Tamaño total: $((Get-Item $outputFile).Length / 1KB) KB" -ForegroundColor Cyan
Write-Host "`n📋 Próximos pasos:" -ForegroundColor Magenta
Write-Host "  1. Abrir: https://supabase.com/dashboard/project/jyaudpctcqcuskzwmism/sql/new" -ForegroundColor White
Write-Host "  2. Copiar el contenido de: $outputFile" -ForegroundColor White
Write-Host "  3. Pegar en el SQL Editor" -ForegroundColor White
Write-Host "  4. Ejecutar (Ctrl+Enter)" -ForegroundColor White
