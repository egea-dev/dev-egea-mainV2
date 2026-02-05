param(
  [string]$Root = "MainControl-Egea",
  [string]$Out = "MainControl-Egea/docs/audits/2026-01-28/FILE_SUMMARIES.md"
)

$extensions = @('.ts', '.tsx', '.js', '.jsx', '.ps1', '.sh', '.sql')
$excluded = '\\(node_modules|dist|build|out|coverage|\.git|\.vercel|\.next|\.cache)\\'
$files = Get-ChildItem -Path $Root -Recurse -File | Where-Object { $extensions -contains $_.Extension -and $_.FullName -notmatch $excluded }

$repoRoot = Resolve-Path "MainControl-Egea"

$lines = @()
$lines += "# File Summaries (code files)"
$lines += ""
$lines += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$lines += ""

foreach ($file in $files) {
  $relative = $file.FullName.Substring($repoRoot.Path.Length + 1).Replace('\\','/')
  $content = @()
  try { $content = Get-Content -Path $file.FullName -TotalCount 220 } catch {}
  $contentText = ($content -join "`n")

  $kind = "Module"
  if ($relative -match '/pages/') { $kind = 'Page component' }
  elseif ($relative -match '/components/ui/') { $kind = 'UI primitive' }
  elseif ($relative -match '/components/') { $kind = 'Component' }
  elseif ($relative -match '/hooks/') { $kind = 'Hook' }
  elseif ($relative -match '/features/') { $kind = 'Feature module' }
  elseif ($relative -match '/services/') { $kind = 'Service' }
  elseif ($relative -match '/lib/') { $kind = 'Library utility' }
  elseif ($relative -match '/utils/') { $kind = 'Utility' }
  elseif ($relative -match '/integrations/') { $kind = 'Integration' }
  elseif ($relative -match '/context/') { $kind = 'Context provider' }
  elseif ($relative -match '/layout/') { $kind = 'Layout component' }
  elseif ($relative -match '/config/') { $kind = 'Configuration module' }
  elseif ($relative -match '/types/') { $kind = 'Types module' }
  elseif ($relative -match '/supabase/functions/') { $kind = 'Edge function' }
  elseif ($relative -match '/tools/') { $kind = 'Tooling script' }
  elseif ($relative -match '\.ps1$') { $kind = 'PowerShell script' }
  elseif ($relative -match '\.sh$') { $kind = 'Shell script' }
  elseif ($relative -match '\.sql$') { $kind = 'SQL script' }

  $exports = @()
  if ($contentText -match 'export\s+default\s+function\s+([A-Za-z0-9_]+)') { $exports += $matches[1] }
  elseif ($contentText -match 'export\s+default\s+([A-Za-z0-9_]+)') { $exports += "default:$($matches[1])" }
  elseif ($contentText -match 'export\s+default\s*\(') { $exports += 'default:(anonymous)' }

  $exportConsts = [regex]::Matches($contentText, 'export\s+(const|function|class)\s+([A-Za-z0-9_]+)') | ForEach-Object { $_.Groups[2].Value }
  foreach ($e in $exportConsts) { if (-not ($exports -contains $e)) { $exports += $e } }

  if ($exports.Count -eq 0) { $exports = @('default export or module-side effects') }

  $importModules = [regex]::Matches($contentText, 'from\s+["\'']([^"\'']+)["\'']') | ForEach-Object { $_.Groups[1].Value }
  $importModules = $importModules | Select-Object -Unique | Select-Object -First 4
  $deps = if ($importModules.Count -gt 0) { $importModules -join ', ' } else { 'none (local file only or side effects)' }

  $dataSources = @()
  if ($contentText -match 'supabaseProductivity') { $dataSources += 'Supabase PRODUCTIVITY' }
  if ($contentText -match 'supabaseMain|supabase\b') { $dataSources += 'Supabase MAIN' }
  if ($contentText -match 'fetch\(') { $dataSources += 'fetch()' }
  $dataSources = $dataSources | Select-Object -Unique
  $dataLine = if ($dataSources.Count -gt 0) { $dataSources -join ', ' } else { 'none detected' }

  $todoNote = if ($contentText -match 'TODO|FIXME|HACK') { 'Contains TODO/FIXME/HACK comments.' } else { 'No TODO/FIXME/HACK detected in first 220 lines.' }

  $lines += "## $relative"
  $lines += "- Role: $kind inferred from path and file name."
  $lines += "- Key exports: $($exports -join ', ')."
  $lines += "- Dependencies (sample): $deps."
  $lines += "- Data sources: $dataLine."
  $lines += "- Notes: $todoNote"
  $lines += ""
}

$lines | Set-Content -Path $Out -Encoding UTF8
