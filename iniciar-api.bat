@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo Monitoramento de Jornada - API
echo ==============================================

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado. Instale Node.js e reabra o VS Code.
  pause
  exit /b 1
)

if not exist .env (
  copy .env.example .env >nul
  echo Foi criado o arquivo .env a partir de .env.example.
  echo Abra .env, informe DB_PASSWORD e JWT_SECRET e execute este arquivo novamente.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo ERRO ao instalar dependencias.
    pause
    exit /b 1
  )
)

echo Iniciando API. Para parar, pressione Ctrl+C.
call npm run dev
pause
