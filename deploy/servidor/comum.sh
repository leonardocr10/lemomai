#!/usr/bin/env bash
# Funções e configurações usadas pelos scripts de deploy da Lenom.AI.
# Não rode este arquivo direto: ele é carregado pelos outros scripts.
#
# A Lenom.AI roda AO LADO das outras aplicações do servidor (ex.: Cassiano3D):
# porta interna própria, serviço systemd próprio e site próprio no Nginx.
# Nenhum script mexe em outra aplicação nem nos sites que já existem no Nginx.

# ---------------------------------------------------------------------------
# Configuração (pode sobrescrever por variável de ambiente ao rodar o script)
# ---------------------------------------------------------------------------
APP_NAME="${APP_NAME:-lenom-ai}"                         # serviço systemd e site do Nginx
APP_USER="${APP_USER:-lenom}"                            # usuário (sem login) que roda a app
APP_DIR="${APP_DIR:-/var/www/lenom-ai}"                  # onde o código fica
APP_PORT="${APP_PORT:-3100}"                             # porta interna (só 127.0.0.1)
PUBLIC_PORT="${PUBLIC_PORT:-8080}"                       # porta de acesso pelo IP, até ter domínio
REPO_URL="${REPO_URL:-https://github.com/leonardocr10/lemomai.git}"
BRANCH="${BRANCH:-main}"
NODE_DIR="${NODE_DIR:-/opt/node22}"                      # Node 22 só desta app (não mexe no Node do sistema)
BACKUP_ROOT="${BACKUP_ROOT:-/root/backups-lenom}"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}"
NGINX_LINK="/etc/nginx/sites-enabled/${APP_NAME}"
NODE_BIN="$NODE_DIR/bin/node"
NPM_BIN="$NODE_DIR/bin/npm"

# ---------------------------------------------------------------------------
# Saída
# ---------------------------------------------------------------------------
info() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
aviso() { printf '\033[1;33m[aviso]\033[0m %s\n' "$*"; }
erro() { printf '\033[1;31m[erro]\033[0m %s\n' "$*" >&2; exit 1; }

confirmar() {
  local resposta
  read -r -p "$1 [s/N] " resposta
  [[ "$resposta" =~ ^[sS]$ ]]
}

precisa() {
  command -v "$1" >/dev/null 2>&1 || erro "Comando '$1' não encontrado. $2"
}

precisa_root() {
  [[ "$(id -u)" -eq 0 ]] || erro "Rode como root (ex.: sudo bash $0)."
}

# Roda um comando como o usuário da app, com o Node 22 no PATH.
como_app() {
  runuser -u "$APP_USER" -- env PATH="$NODE_DIR/bin:/usr/bin:/bin" HOME="/home/$APP_USER" "$@"
}

# ---------------------------------------------------------------------------
# Portas
# ---------------------------------------------------------------------------
porta_livre() {
  [[ -z "$(ss -ltnH "sport = :$1" 2>/dev/null)" ]]
}

# Quem usa a porta (para mensagens de erro)
dono_da_porta() {
  ss -ltnpH "sport = :$1" 2>/dev/null | grep -oE 'users:\(\("[^"]+' | head -1 | cut -d'"' -f2
}

esperar_resposta() {
  local porta="$1" tentativa
  for tentativa in $(seq 1 30); do
    if curl -fsS -o /dev/null "http://127.0.0.1:${porta}/"; then return 0; fi
    sleep 1
  done
  return 1
}

# Libera a porta no firewall UFW, se ele estiver ativo.
liberar_no_firewall() {
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q '^Status: active'; then
    ufw allow "$1/tcp" >/dev/null && info "Porta $1 liberada no firewall (ufw)."
  fi
}

# ---------------------------------------------------------------------------
# Nginx: aplica a configuração só se o teste passar; senão desfaz.
# ---------------------------------------------------------------------------
recarregar_nginx_ou_desfazer() {
  local backup="$1"
  if nginx -t 2>/tmp/lenom-nginx-test.log; then
    systemctl reload nginx
    return 0
  fi
  cat /tmp/lenom-nginx-test.log >&2
  if [[ -n "$backup" && -f "$backup" ]]; then cp "$backup" "$NGINX_SITE"; else rm -f "$NGINX_SITE" "$NGINX_LINK"; fi
  nginx -t >/dev/null 2>&1 && systemctl reload nginx
  erro "O Nginx recusou a configuração da Lenom.AI; nada foi alterado (as outras aplicações seguem normais)."
}

# Bloco "location /" comum às configurações do Nginx
nginx_location() {
  cat <<EOF
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
EOF
}

# ---------------------------------------------------------------------------
# .env: grava CHAVE='valor', trocando a linha se já existir. O dotenv lê o
# valor literal entre aspas, então usa um tipo de aspas que não apareça nele.
# ---------------------------------------------------------------------------
set_env() {
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
  ' "$APP_DIR/.env" "$1" "$2"
}
