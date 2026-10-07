#!/usr/bin/env bash
# =============================================================================
# 2) Instala a aplicação NOVA ao lado da antiga — sem parar nada.
#
#   bash 2-instalar-app-nova.sh
#
# - Node 22 em /opt/node22, só para a app nova (o Node do sistema não muda)
# - Usuário de sistema "lenom" (sem login) para rodar a app
# - Código do GitHub em /var/www/lenom-ai, dependências e build de produção
# - .env de produção (pergunta domínio, senha do painel e e-mail)
# - Serviço systemd "lenom-ai" (criado, mas ainda não ligado)
# - Uploads de até 10 MB no Nginx (o padrão do Nginx é 1 MB)
#
# Pode rodar de novo sem problema: não apaga o .env nem o banco existentes.
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/comum.sh"
precisa_root
precisa git "Instale com: apt install -y git"
precisa curl "Instale com: apt install -y curl"

[[ -f "$STATE_FILE" ]] || erro "Rode antes o backup: bash 1-backup-app-antiga.sh"
# shellcheck disable=SC1090
source "$STATE_FILE"

# --- Node 22 em /opt/node22 -------------------------------------------------
if [[ -x "$NODE_BIN" ]] && "$NODE_BIN" -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)'; then
  info "Node $("$NODE_BIN" -v) já instalado em $NODE_DIR."
else
  info "Instalando Node 22 em $NODE_DIR (só para a app nova)..."
  case "$(uname -m)" in
    x86_64) ARCH=x64 ;;
    aarch64) ARCH=arm64 ;;
    *) erro "Arquitetura $(uname -m) não suportada por este script." ;;
  esac
  TARBALL="$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | grep -oE "node-v22[0-9.]+-linux-${ARCH}\.tar\.xz" | head -1)"
  [[ -n "$TARBALL" ]] || erro "Não consegui descobrir a versão do Node 22 em nodejs.org."
  TMP="$(mktemp -d)"
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$TARBALL" -o "$TMP/node.tar.xz"
  curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | grep " $TARBALL\$" | sed "s#$TARBALL#$TMP/node.tar.xz#" | sha256sum -c - >/dev/null ||
    erro "Falha na verificação do download do Node."
  rm -rf "$NODE_DIR" && mkdir -p "$NODE_DIR"
  tar -xJf "$TMP/node.tar.xz" -C "$NODE_DIR" --strip-components=1
  rm -rf "$TMP"
  info "Node $("$NODE_BIN" -v) instalado."
fi

# --- Usuário da aplicação ---------------------------------------------------
if ! id "$APP_USER" >/dev/null 2>&1; then
  info "Criando usuário de sistema '$APP_USER'..."
  useradd --system --create-home --home-dir "/home/$APP_USER" --shell /usr/sbin/nologin "$APP_USER"
fi
como_app() { runuser -u "$APP_USER" -- env PATH="$NODE_DIR/bin:/usr/bin:/bin" HOME="/home/$APP_USER" "$@"; }

# --- Código -----------------------------------------------------------------
if [[ -d "$APP_DIR/.git" ]]; then
  info "Atualizando código em $APP_DIR..."
  como_app git -C "$APP_DIR" pull --quiet --ff-only origin "$BRANCH"
else
  info "Baixando código de $REPO_URL para $APP_DIR..."
  mkdir -p "$APP_DIR"
  chown "$APP_USER:$APP_USER" "$APP_DIR"
  como_app git clone --quiet --branch "$BRANCH" "$REPO_URL" "$APP_DIR" ||
    erro "Falha no git clone. Se o repositório for privado, torne-o público temporariamente ou use REPO_URL=https://TOKEN@github.com/leonardocr10/lemomai.git"
fi

cd "$APP_DIR"
info "Instalando dependências (npm ci)..."
como_app "$NPM_BIN" ci --no-audit --no-fund
info "Gerando CSS/JS de produção (npm run build)..."
como_app "$NPM_BIN" run build

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

  read -r -p "Endereço público do site (ex.: https://lenom.ai): " APP_URL
  read -r -p "Usuário do painel /admin [admin]: " ADMIN_USER
  ADMIN_USER="${ADMIN_USER:-admin}"
  while :; do
    read -r -s -p "Senha do painel /admin (mín. 8 caracteres): " ADMIN_PASSWORD; echo
    [[ ${#ADMIN_PASSWORD} -ge 8 ]] && break
    aviso "Use pelo menos 8 caracteres."
  done
  read -r -p "E-mail que recebe os contatos do site (ex.: contato@lenom.ai): " MAIL_TO

  DOMAIN="${APP_URL#*://}"
  DOMAIN="${DOMAIN%%/*}"
  set_env NODE_ENV production
  set_env PORT "$PORT"
  set_env APP_URL "${APP_URL%/}"
  set_env COOKIE_SECRET "$(openssl rand -hex 32)"
  set_env TRUST_PROXY true
  set_env DATA_DRIVER sqlite
  set_env ADMIN_USER "$ADMIN_USER"
  set_env ADMIN_PASSWORD "$ADMIN_PASSWORD"
  set_env MAIL_FROM "Lenom.AI <nao-responda@${DOMAIN}>"
  set_env MAIL_TO_LEADS "$MAIL_TO"
  info ".env criado. E-mails ficam em modo 'log' até você configurar o SMTP (MAIL_DRIVER=smtp)."
fi
chown "$APP_USER:$APP_USER" .env
chmod 600 .env

# --- Serviço systemd (criado, ainda desligado) -------------------------------
info "Criando o serviço systemd $APP_NAME..."
cat >"$SERVICE_FILE" <<EOF
[Unit]
Description=Lenom.AI — site institucional
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=$NODE_BIN server.js
Environment=NODE_ENV=production
Restart=always
RestartSec=3
# Segurança: a app só escreve na própria pasta.
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload

# --- Nginx: tamanho de upload -----------------------------------------------
if [[ -d /etc/nginx/conf.d ]] &&
  ! grep -rqsE 'client_max_body_size\s+([1-9][0-9]|[6-9])m' /etc/nginx/nginx.conf /etc/nginx/conf.d /etc/nginx/sites-enabled; then
  info "Liberando uploads de até 10 MB no Nginx..."
  echo 'client_max_body_size 10m;' >/etc/nginx/conf.d/lenom-upload.conf
  if nginx -t 2>/dev/null; then
    systemctl reload nginx
  else
    rm -f /etc/nginx/conf.d/lenom-upload.conf
    aviso "O Nginx recusou a configuração de upload; nada foi alterado. Ajuste client_max_body_size manualmente."
  fi
fi

echo
info "App nova instalada em $APP_DIR (ainda desligada; a antiga continua no ar)."
echo "Próximo passo: bash 3-trocar-para-app-nova.sh"
