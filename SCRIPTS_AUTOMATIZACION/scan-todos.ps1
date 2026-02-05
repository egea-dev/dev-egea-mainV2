param(
  [string]$Root = "MainControl-Egea",
  [string]$Out = "MainControl-Egea/docs/audits/2026-01-28/TODO_REPORT.md"
)

$pattern = 'TODO|FIXME|HACK'
$matches = @()

if (Get-Command rg -ErrorAction SilentlyContinue) {
  $matches = rg -n $pattern $Root
} else {
  $files = Get-ChildItem -Path $Root -Recurse -File | Where-Object { $_.FullName -notmatch '\\(node_modules|dist|build|out|coverage|\.git|\.vercel|\.next|\.cache)\\' }
  foreach ($f in $files) {
    $lines = Get-Content -Path $f.FullName -ErrorAction SilentlyContinue
    for ($i=0; $i -lt $lines.Count; $i++) {
      if ($lines[$i] -match $pattern) {
        $matches += "${($f.FullName)}:$($i+1):$($lines[$i])"
      }
    }
  }
}

$outLines = @()
$outLines += "# TODO/FIXME/HACK Report"
$outLines += ""
$outLines += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$outLines += ""
if ($matches.Count -eq 0) {
  $outLines += "No TODO/FIXME/HACK matches found."
} else {
  $outLines += "Found $($matches.Count) matches:"
  $outLines += ""
  $outLines += $matches
}

$outLines | Set-Content -Path $Out -Encoding UTF8
