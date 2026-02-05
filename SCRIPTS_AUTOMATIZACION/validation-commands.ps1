param(
  [string]$Root = "MainControl-Egea",
  [string]$Out = "MainControl-Egea/docs/audits/2026-01-28/VALIDATION_COMMANDS.md"
)

$outLines = @()
$outLines += "# Validation Commands"
$outLines += ""
$outLines += "Run these from the repo root (MainControl-Egea):"
$outLines += ""
$outLines += "- npm install"
$outLines += "- npm run lint"
$outLines += "- npm run type-check"
$outLines += "- npm run build"
$outLines += "- npm run validate"
$outLines += ""
$outLines += "Note: npm install requires network access and should be executed with the appropriate permissions."

$outLines | Set-Content -Path $Out -Encoding UTF8
