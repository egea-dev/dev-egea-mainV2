param(
  [string]$Root = "MainControl-Egea",
  [string]$Out = "MainControl-Egea/docs/audits/2026-01-28/METRICS.md"
)

$exts = @('.ts','.tsx','.js','.jsx','.css','.md','.json','.toml','.yml','.yaml','.ps1','.sh','.sql')
$excluded = '\\(node_modules|dist|build|out|coverage|\.git|\.vercel|\.next|\.cache)\\'
$files = Get-ChildItem -Path $Root -Recurse -File -Force | Where-Object { $exts -contains $_.Extension -and $_.FullName -notmatch $excluded }

$counts = $files | Group-Object Extension | ForEach-Object {
  [pscustomobject]@{ Ext = $_.Name; Files = $_.Count }
} | Sort-Object Ext

# Line counts for src only to keep runtime reasonable
$srcFiles = Get-ChildItem -Path "$Root\src" -Recurse -File | Where-Object { @('.ts','.tsx','.js','.jsx','.css') -contains $_.Extension }
$srcStats = $srcFiles | ForEach-Object {
  $lines = 0
  try { $lines = [System.IO.File]::ReadAllLines($_.FullName).Length } catch {}
  [pscustomobject]@{ Ext = $_.Extension; Lines = $lines }
}
$srcSummary = $srcStats | Group-Object Ext | ForEach-Object {
  [pscustomobject]@{ Ext = $_.Name; Files = $_.Count; Lines = ($_.Group | Measure-Object Lines -Sum).Sum }
} | Sort-Object Ext

$linesOut = @()
$linesOut += "# Code Metrics"
$linesOut += ""
$linesOut += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$linesOut += ""
$linesOut += "## File counts (entire repo, excluding node_modules/build output)"
$linesOut += ""
$linesOut += ($counts | Format-Table -AutoSize | Out-String).TrimEnd()
$linesOut += ""
$linesOut += "Total files counted: $($files.Count)"
$linesOut += ""
$linesOut += "## Line counts (src only)"
$linesOut += ""
$linesOut += ($srcSummary | Format-Table -AutoSize | Out-String).TrimEnd()
$linesOut += ""
$linesOut += "Total src files counted: $($srcFiles.Count)"
$linesOut += ""
$linesOut += "Note: Line counts are restricted to src for speed; run this script for a full count if needed."

$linesOut | Set-Content -Path $Out -Encoding UTF8
