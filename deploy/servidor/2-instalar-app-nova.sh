#!/usr/bin/env bash
# =============================================================================
# 2) Instala a aplicação NOVA ao lado da antiga — sem parar nada.
#
#   bash 2-instalar-app-nova.sh
#
# - Garante Node 22.13+ só para a app nova (via nvm se o do sistema for antigo)
# - Baixa o código do GitHub em /var/www/lenom-ai (ou APP_DIR)
# - Instala dependências e gera os arquivos de produção (npm run build)
# - Cria o .env de produção (pergunta domínio, senha do painel e e-mail)
# - Libera uploads de até 10 MB no Nginx (o padrão do Nginx é 1 MB)
#
# Pode rodar de novo sem problema: não apaga o .env nem o banco existentes.
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/comum.sh"

precisa git "Instale com: sudo apt install -y git"
precisa curl "Instale com: sudo apt install -y curl"
precisa pm2 "Este servidor deveria ter o PM2."

[[ -f "$STATE_FILE" ]] || erro "Rode antes o backup: bash 1-backup-app-antiga.sh <nome-da-app-antiga>"
# shellcheck disable=SC1090
source "$STATE_FILE"

preparar_node

# --- Código -----------------------------------------------------------------
if [[ -d "$APP_DIR/.git" ]]; then
  info "Atualizando código em $APP_DIR..."
  git -C "$APP_DIR" fetch --quiet origin "$BRANCH"
  git -C "$APP_DIR" checkout --quiet "$BRANCH"
  git -C "$APP_DIR" pull --quiet --ff-only origin "$BRANCH"
else
  info "Baixando código de $REPO_URL para $APP_DIR..."
  sudo mkdir -p "$APP_DIR"
  sudo chown "$(id -u):$(id -g)" "$APP_DIR"
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$APP_DIR" ||
    erro "Falha no git clone. Se o repositório for privado, configure uma chave SSH ou token e rode de novo com REPO_URL=git@github.com:leonardocr10/lemomai.git"
fi

cd "$APP_DIR"

# --- Dependências e build ---------------------------------------------------
info "Instalando dependências (npm ci)..."
npm_novo ci --no-audit --no-fund
info "Gerando CSS/JS de produção (npm run build)..."
npm_novo run build

# --- .env de produção -------------------------------------------------------
set_env() {
  # Grava CHAVE='valor' no .env, trocando a linha se já existir. O dotenv lê
  # o valor literal entre aspas, então usa um tipo de aspas que não apareça nele.
  "$NODE_BIN" -e '
    const fs = require("fs");
    const [file, key, value] = process.argv.slice(1);
    const quote = ["\x27", "\"", "`"].find((q) => !value.includes(q));
    if (!quote || /[\r\n]/.test(value)) {
      console.error(`Valor de ${key} não pode ter os três tipos de aspas nem quebra de linha.`);
      process.exit(1);
    }
    const line = `${key}=${quote}${value}${quote}`;
    let text = fs.readFileSync(file, "utf8");
    const re = new RegExp(`^#?\\s*${key}=.*$`, "m");
    text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
    fs.writeFileSync(file, text);
  ' .env "$1" "$2"
}

if [[ -f .env ]]; then
  info ".env já existe: mantido (edite $APP_DIR/.env se precisar mudar algo)."
else
  info "Criando .env de produção..."
  cp .env.example .env
  chmod 600 .env

  read -r -p "Endereço público do site (ex.: https://lenom.ai): " APP_URL
  read -r -p "Usuário do painel /admin [admin]: " ADMIN_USER
  ADMIN_USER="${ADMIN_USER:-admin}"
  while :; do
    read -r -s -p "Senha do painel /admin (mín. 8 caracteres): " ADMIN_PASSWORD; echo
    [[ ${#ADMIN_PASSWORD} -ge 8 ]] && break
    aviso "Use pelo menos 8 caracteres."
  done
  read -r -p "E-mail que recebe os contatos do site (ex.: contato@lenom.ai): " MAIL_TO

  set_env NODE_ENV production
  set_env PORT "$PORT"
  set_env APP_URL "${APP_URL%/}"
  set_env COOKIE_SECRET "$(openssl rand -hex 32)"
  set_env TRUST_PROXY true
  set_env DATA_DRIVER sqlite
  set_env ADMIN_USER "$ADMIN_USER"
  set_env ADMIN_PASSWORD "$ADMIN_PASSWORD"
  set_env MAIL_FROM "Lenom.AI <nao-responda@${APP_URL#*://}>"
  set_env MAIL_TO_LEADS "$MAIL_TO"
  info ".env criado. E-mails ficam em modo 'log' até você configurar o SMTP no .env (MAIL_DRIVER=smtp)."
fi

# --- Nginx: tamanho de upload -----------------------------------------------
if [[ -d /etc/nginx/conf.d ]]; then
  if ! grep -rqsE 'client_max_body_size\s+([1-9][0-9]|[6-9])m' /etc/nginx/nginx.conf /etc/nginx/conf.d /etc/nginx/sites-enabled; then
    info "Liberando uploads de até 10 MB no Nginx (banners do painel e anexos do orçamento)..."
    echo 'client_max_body_size 10m;' | sudo tee /etc/nginx/conf.d/lenom-upload.conf >/dev/null
    if sudo nginx -t 2>/dev/null; then
      sudo systemctl reload nginx
    else
      sudo rm -f /etc/nginx/conf.d/lenom-upload.conf
      aviso "O Nginx recusou a configuração de upload; nada foi alterado. Ajuste client_max_body_size manualmente."
    fi
  fi
fi

# Guarda o Node usado para os próximos scripts.
grep -q '^NODE_BIN=' "$STATE_FILE" && sed -i "s#^NODE_BIN=.*#NODE_BIN='$NODE_BIN'#" "$STATE_FILE" || echo "NODE_BIN='$NODE_BIN'" >>"$STATE_FILE"

echo
info "App nova instalada em $APP_DIR (ainda parada; a antiga continua no ar)."
echo "Próximo passo: bash 3-trocar-para-app-nova.sh"
