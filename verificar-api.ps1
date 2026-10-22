$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'
Write-Host 'Testando se a API responde...'
try {
  $r = Invoke-RestMethod -Uri "$base/api/health" -Method Get -TimeoutSec 5
  $r | ConvertTo-Json -Depth 5
  if ($r.status -ne 'ok' -or $r.database -ne 'connected') {
    Write-Host 'A API respondeu, mas o banco nao esta confirmado como conectado.' -ForegroundColor Yellow
    exit 1
  }
  Write-Host 'API e MariaDB conectados.' -ForegroundColor Green
} catch {
  Write-Host 'Nao foi possivel validar API + banco.' -ForegroundColor Red
  Write-Host $_.Exception.Message
  Write-Host 'Confira se MariaDB esta iniciado e se o servidor esta rodando na porta 3000.'
  exit 1
}
