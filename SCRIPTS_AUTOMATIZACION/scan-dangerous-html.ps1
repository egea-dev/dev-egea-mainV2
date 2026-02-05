param(
  [string]$Root = "MainControl-Egea/src",
  [string]$Out = "MainControl-Egea/docs/audits/2026-01-28/DANGEROUS_HTML_REPORT.md"
)

$pattern = 'dangerouslySetInnerHTML'
$matches = @()

if (Get-Command rg -ErrorAction SilentlyContinue) {
  $matches = rg -n $pattern $Root
} else {
  $files = Get-ChildItem -Path $Root -Recurse -File
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
$outLines += "# dangerouslySetInnerHTML Report"
$outLines += ""
$outLines += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$outLines += ""
if ($matches.Count -eq 0) {
  $outLines += "No dangerouslySetInnerHTML usages found."
} else {
  $outLines += "Found $($matches.Count) matches:"
  $outLines += ""
  $outLines += $matches
}

$outLines | Set-Content -Path $Out -Encoding UTF8
