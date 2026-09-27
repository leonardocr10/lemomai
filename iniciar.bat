@echo off
setlocal
title LC Servicos - Servidor
cd /d "%~dp0"

echo ============================================
echo   LC Servicos - iniciando o site
echo ============================================
echo.

rem 1) Node.js instalado?
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale a versao LTS em https://nodejs.org
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo Node.js %%v

rem 2) Dependencias
if not exist "node_modules" (
  echo.
  echo Instalando dependencias ^(primeira execucao^)...
  call npm install
  if errorlevel 1 (
    echo [ERRO] Falha no npm install.
    pause
    exit /b 1
  )
)

rem 3) Arquivo .env
if not exist ".env" (
  echo Criando .env a partir de .env.example...
  copy ".env.example" ".env" >nul
)

rem 4) Modo: "iniciar.bat prod" roda build + producao; sem argumento roda desenvolvimento
set "PORT_URL=http://localhost:3000"
for /f "tokens=1,* delims==" %%a in ('findstr /b "PORT=" ".env"') do set "PORT_URL=http://localhost:%%b"

echo.
echo Abrindo %PORT_URL% no navegador...
start "" cmd /c "timeout /t 4 >nul & start "" %PORT_URL%"

if /i "%~1"=="prod" (
  echo Gerando assets de producao...
  call npm run build
  set "NODE_ENV=production"
  echo Modo PRODUCAO. Feche esta janela ou pressione Ctrl+C para parar.
  call npm start
) else (
  echo Modo DESENVOLVIMENTO ^(recarga automatica^). Pressione Ctrl+C para parar.
  call npm run dev
)

endlocal
