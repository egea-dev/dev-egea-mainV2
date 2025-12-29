# Script para corregir errores de sintaxis en el archivo de migraciones consolidado

$inputFile = "supabase\MIGRATE_TO_MAINEGEA_V2_COMPLETE.sql"
$outputFile = "supabase\MIGRATE_CLEAN.sql"

Write-Host "Leyendo archivo original..." -ForegroundColor Cyan
$content = Get-Content $inputFile -Raw -Encoding UTF8

Write-Host "Aplicando correcciones..." -ForegroundColor Yellow

# 1. Corregir sintaxis FOR con múltiples acciones (con o sin paréntesis) -> FOR ALL
$content = $content -replace 'FOR\s+(\()?\s*INSERT,\s*UPDATE,\s*DELETE\s*(\))?', 'FOR ALL '

# 2. Eliminar todo el bloque de cron jobs que causa problemas
$content = $content -replace '(?s)/\*\r?\n-- Habilitar la extensión pg_cron.*?SELECT cron\.unschedule\(''cleanup-expired-plans''\);\r?\n\*/', '-- NOTA: Los Cron Jobs deben configurarse manualmente en Supabase Dashboard'

# 3. Asegurar que no hay comillas simples problemáticas en expresiones cron
$content = $content -replace "'0 \*/6 \* \* \*',\s*--", "'0 */6 * * *' --"

# 4. Eliminar índices inline de CREATE TABLE user_messages
$content = $content -replace ',\s*INDEX idx_user_messages_from_to \(from_profile_id, to_profile_id\)', ''
$content = $content -replace ',\s*INDEX idx_user_messages_to_unread \(to_profile_id, is_read\)', ''
$content = $content -replace ',\s*INDEX idx_user_messages_created \(created_at DESC\)', ''

# 5. Eliminar índices inline de CREATE TABLE communication_logs
$content = $content -replace ',\s*INDEX idx_communication_logs_profile \(profile_id\)', ''
$content = $content -replace ',\s*INDEX idx_communication_logs_action \(action\)', ''
$content = $content -replace ',\s*INDEX idx_communication_logs_status \(status\)', ''
$content = $content -replace ',\s*INDEX idx_communication_logs_created \(created_at DESC\)', ''

# 6. Corregir dollar quoting incompleto (AS $ -> AS $$)
$content = $content -replace 'AS \$(?!\$)', 'AS $$$$'
$content = $content -replace '(?m)^\$(?!\$)\s*(LANGUAGE)', '$$$$ $1'

# 6.5 Eliminar cualquier DROP POLICY IF EXISTS previo para evitar duplicados
# (Se volverán a crear de forma uniforme en la regla 7)
$content = $content -replace '(?mi)DROP\s+POLICY\s+IF\s+EXISTS\s+(?:"[^"]+"|[^\s;]+)\s+ON\s+[^\s;]+;', ''

# 7. Corregir cualquier CREATE POLICY -> DROP POLICY IF EXISTS + CREATE POLICY
# Se hace universal para asegurar idempotencia total (case-insensitive) y flexible con cualquier espacio/salto de línea (\s+)
$content = [regex]::Replace($content, '(?mi)CREATE\s+POLICY\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|([^\s;]+))\s+ON\s+([^\s;]+)', {
        param($m)
        $policyName = if ($m.Groups[1].Value) { $m.Groups[1].Value } else { $m.Groups[2].Value }
        # Normalizamos cualquier salto de línea o espacio múltiple a un solo espacio
        $policyName = ($policyName -replace '\s+', ' ').Trim()
        $tableName = $m.Groups[3].Value
        return "DROP POLICY IF EXISTS ""$policyName"" ON $tableName;`r`nCREATE POLICY ""$policyName"" ON $tableName"
    })

# 8. Corregir ADD COLUMN -> ADD COLUMN IF NOT EXISTS
# Este regex evita duplicar el IF NOT EXISTS si ya está presente
$content = $content -replace 'ADD COLUMN\s+(?!IF NOT EXISTS)', 'ADD COLUMN IF NOT EXISTS '

# 9. Corregir CREATE INDEX -> CREATE INDEX IF NOT EXISTS
$content = $content -replace 'CREATE INDEX\s+(?!IF NOT EXISTS)', 'CREATE INDEX IF NOT EXISTS '

# 10. Estandarizar 'team' a 'role' (Legacy transition)
$content = $content -replace '\bteam\s+TEXT\b', 'role TEXT NOT NULL DEFAULT ''operario'''
$content = $content -replace '\bteam\s*=\s*''admin''', 'role = ''admin'''

# 11. Agregar CASCADE a DROP CONSTRAINT profiles_pkey
$content = $content -replace 'ALTER TABLE public\.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;', 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;'

# 12. Mejorar bloque DO para evitar conflicto con start_date existente
# Usar un patrón simple que preserve los $$ correctamente
$content = $content -replace "IF EXISTS\(SELECT 1 FROM information_schema\.columns WHERE table_schema = 'public' AND table_name='screen_data' AND column_name='due_date'\) THEN", "IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='screen_data' AND column_name='due_date') `r`n       AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='screen_data' AND column_name='start_date') THEN"

# 13. Asegurar columnas en system_config ante tablas preexistentes
$systemConfigFix = @"
CREATE TABLE IF NOT EXISTS public.system_config (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id);
"@
$content = $content -replace 'CREATE TABLE IF NOT EXISTS public\.system_config \(', ($systemConfigFix + "`r`n-- Original definition follows:`r`nCREATE TABLE IF NOT EXISTS public.system_config (")

Write-Host "Guardando archivo corregido..." -ForegroundColor Green
$content | Out-File $outputFile -Encoding UTF8 -NoNewline

$fileSize = [math]::Round((Get-Item $outputFile).Length / 1KB, 2)
Write-Host "Archivo corregido creado: $outputFile" -ForegroundColor Green
Write-Host "Tamaño: $fileSize KB" -ForegroundColor Cyan
