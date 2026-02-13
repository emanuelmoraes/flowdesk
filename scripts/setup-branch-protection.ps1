param(
  [string]$Owner = "emanuelmoraes",
  [string]$Repo = "flowdesk",
  [string[]]$Branches = @("main", "staging", "develop"),
  [string[]]$RequiredChecks = @("Qualidade (lint, type-check, test, build)")
)

$token = $env:GITHUB_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
  $token = $env:GH_TOKEN
}

if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Error "Defina GITHUB_TOKEN ou GH_TOKEN com permissões de admin no repositório."
  exit 1
}

$headers = @{
  Authorization = "Bearer $token"
  Accept = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

$requiredStatusChecks = @()
foreach ($check in $RequiredChecks) {
  $requiredStatusChecks += @{ context = $check }
}

$body = @{
  required_status_checks = @{
    strict = $true
    checks = $requiredStatusChecks
  }
  enforce_admins = $true
  required_pull_request_reviews = @{
    dismiss_stale_reviews = $true
    require_code_owner_reviews = $false
    required_approving_review_count = 1
    require_last_push_approval = $true
  }
  restrictions = $null
  required_linear_history = $true
  allow_force_pushes = $false
  allow_deletions = $false
  block_creations = $false
  required_conversation_resolution = $true
  lock_branch = $false
  allow_fork_syncing = $false
}

$jsonBody = $body | ConvertTo-Json -Depth 10

foreach ($branch in $Branches) {
  $url = "https://api.github.com/repos/$Owner/$Repo/branches/$branch/protection"
  Write-Host "Aplicando branch protection em $Owner/$Repo:$branch ..."

  try {
    Invoke-RestMethod -Method Put -Uri $url -Headers $headers -Body $jsonBody -ContentType "application/json" | Out-Null
    Write-Host "OK: proteção aplicada em $branch"
  }
  catch {
    Write-Error "Falha ao proteger branch '$branch': $($_.Exception.Message)"
    exit 1
  }
}

Write-Host "Proteções aplicadas com sucesso."