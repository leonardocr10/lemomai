#!/usr/bin/env bash
# =============================================================================
# 1) Instala e liga a Lenom.AI AO LADO das aplicações que já estão no servidor.
#
#   bash 1-instalar.sh
#
# Não para, não move e não altera nenhuma outra aplicação (ex.: Cassiano3D na
# porta 3000) nem os sites que já existem no Nginx. Cria:
#   - Node 22 em /opt/node22 (o Node do sistema não muda)
#   - usuário de sistema "lenom" (sem login) e o código em /var/www/lenom-ai
#   - serviço systemd "lenom-ai" na porta interna 3100 (só 127.0.0.1)
#   - site novo no Nginx: http://IP-DO-SERVIDOR:8080  (até ter domínio;
#     depois use 3-usar-dominio.sh)
#
# Pode rodar de novo: não apaga o .env nem o banco existentes.
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/comum.sh"
precisa_root
precisa git "Instale com: apt install -y git"
precisa curl "Instale com: apt install -y curl"
precisa nginx "Este script configura o acesso pelo Nginx."
precisa ss "Instale com: apt install -y iproute2"

# --- Portas: nunca usar as de outra aplicação --------------------------------
if ! porta_livre "$APP_PORT" && ! systemctl is-active --quiet "$APP_NAME"; then
  erro "A porta $APP_PORT já está em uso por '$(dono_da_porta "$APP_PORT")'. Rode com outra: APP_PORT=3200 bash $0"
fi
if ! porta_livre "$PUBLIC_PORT" && [[ ! -f "$NGINX_SITE" ]]; then
  erro "A porta $PUBLIC_PORT já está em uso por '$(dono_da_porta "$PUBLIC_PORT")'. Rode com outra: PUBLIC_PORT=8081 bash $0"
fi

# --- Node 22 em /opt/node22 -------------------------------------------------
if [[ -x "$NODE_BIN" ]] && "$NODE_BIN" -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)'; then
  info "Node $("$NODE_BIN" -v) já instalado em $NODE_DIR."
else
  info "Instalando Node 22 em $NODE_DIR (só para a Lenom.AI)..."
  case "$(uname -m)" in
    x86_64) ARCH=x64 ;;
    aarch64) ARCH=arm64 ;;
    *) erro "Arquitetura $(uname -m) não suportada por este script." ;;
  esac
  SUMS="$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt)"
  TARBALL="$(grep -oE "node-v22[0-9.]+-linux-${ARCH}\.tar\.xz" <<<"$SUMS" | head -1)"
  [[ -n "$TARBALL" ]] || erro "Não consegui descobrir a versão do Node 22 em nodejs.org."
  TMP="$(mktemp -d)"
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$TARBALL" -o "$TMP/$TARBALL"
  (cd "$TMP" && grep " $TARBALL\$" <<<"$SUMS" | sha256sum -c - >/dev/null) || erro "Falha na verificação do download do Node."
  rm -rf "$NODE_DIR" && mkdir -p "$NODE_DIR"
  tar -xJf "$TMP/$TARBALL" -C "$NODE_DIR" --strip-components=1
  rm -rf "$TMP"
  info "Node $("$NODE_BIN" -v) instalado."
fi

# --- Usuário da aplicação ---------------------------------------------------
if ! id "$APP_USER" >/dev/null 2>&1; then
  info "Criando usuário de sistema '$APP_USER'..."
  useradd --system --create-home --home-dir "/home/$APP_USER" --shell /usr/sbin/nologin "$APP_USER"
fi

# --- Código, dependências e build -------------------------------------------
if [[ -d "$APP_DIR/.git" ]]; then
  info "Atualizando código em $APP_DIR..."
  como_app git -C "$APP_DIR" pull --quiet --ff-only origin "$BRANCH"
else
  info "Baixando código de $REPO_URL para $APP_DIR..."
  mkdir -p "$APP_DIR"
  chown "$APP_USER:$APP_USER" "$APP_DIR"
  como_app git clone --quiet --branch "$BRANCH" "$REPO_URL" "$APP_DIR" ||
    erro "Falha no git clone. Se o repositório for privado, use REPO_URL=https://TOKEN@github.com/leonardocr10/lemomai.git"
fi

cd "$APP_DIR"
info "Instalando dependências (npm ci)..."
como_app "$NPM_BIN" ci --no-audit --no-fund
info "Gerando CSS/JS de produção (npm run build)..."
como_app "$NPM_BIN" run build

# --- .env de produção -------------------------------------------------------
IP_PUBLICO="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
if [[ -f .env ]]; then
  info ".env já existe: mantido (edite $APP_DIR/.env se precisar mudar algo)."
else
  info "Criando .env de produção..."
  cp .env.example .env
  read -r -p "Usuário do painel /admin [admin]: " ADMIN_USER
  ADMIN_USER="${ADMIN_USER:-admin}"
  while :; do
    read -r -s -p "Senha do painel /admin (mín. 8 caracteres): " ADMIN_PASSWORD; echo
    [[ ${#ADMIN_PASSWORD} -ge 8 ]] && break
    aviso "Use pelo menos 8 caracteres."
  done
  read -r -p "E-mail que recebe os contatos do site (ex.: contato@lenom.ai): " MAIL_TO

  set_env NODE_ENV production
  set_env PORT "$APP_PORT"
  set_env APP_URL "http://${IP_PUBLICO}:${PUBLIC_PORT}"
  set_env COOKIE_SECRET "$(openssl rand -hex 32)"
  set_env TRUST_PROXY true
  set_env DATA_DRIVER sqlite
  set_env ADMIN_USER "$ADMIN_USER"
  set_env ADMIN_PASSWORD "$ADMIN_PASSWORD"
  set_env MAIL_FROM "Lenom.AI <nao-responda@lenom.ai>"
  set_env MAIL_TO_LEADS "$MAIL_TO"
  info ".env criado. E-mails ficam em modo 'log' até você configurar o SMTP (MAIL_DRIVER=smtp)."
fi
chown "$APP_USER:$APP_USER" .env
chmod 600 .env

# --- Serviço systemd --------------------------------------------------------
info "Configurando o serviço systemd $APP_NAME..."
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
systemctl enable "$APP_NAME" >/dev/null 2>&1
systemctl restart "$APP_NAME"
esperar_resposta "$APP_PORT" || {
  journalctl -u "$APP_NAME" -n 40 --no-pager || true
  erro "A Lenom.AI não respondeu na porta $APP_PORT. Veja os logs acima."
}
info "Lenom.AI rodando na porta interna $APP_PORT."

# --- Site no Nginx (arquivo novo; os sites existentes não são tocados) -------
if [[ -f "$NGINX_SITE" ]] && grep -q 'server_name' "$NGINX_SITE" && ! grep -q "listen ${PUBLIC_PORT};" "$NGINX_SITE"; then
  info "Site do Nginx já configurado com domínio: mantido."
else
  info "Criando o site da Lenom.AI no Nginx (porta $PUBLIC_PORT)..."
  mkdir -p "$BACKUP_ROOT"
  BACKUP_SITE=""
  [[ -f "$NGINX_SITE" ]] && BACKUP_SITE="$BACKUP_ROOT/nginx-${APP_NAME}-$(date +%Y%m%d-%H%M%S)" && cp "$NGINX_SITE" "$BACKUP_SITE"
  {
    echo "# Lenom.AI — acesso pelo IP do servidor na porta ${PUBLIC_PORT} (gerado por 1-instalar.sh)"
    echo "server {"
    echo "    listen ${PUBLIC_PORT};"
    echo "    listen [::]:${PUBLIC_PORT};"
    echo "    server_name _;"
    echo
    nginx_location
    echo "}"
  } >"$NGINX_SITE"
  ln -sf "$NGINX_SITE" "$NGINX_LINK"
  recarregar_nginx_ou_desfazer "$BACKUP_SITE"
  liberar_no_firewall "$PUBLIC_PORT"
fi

echo
info "Pronto! Lenom.AI no ar ao lado das outras aplicações."
echo "    Site:   http://${IP_PUBLICO}:${PUBLIC_PORT}"
echo "    Painel: http://${IP_PUBLICO}:${PUBLIC_PORT}/admin"
echo "    Logs:   journalctl -u $APP_NAME -f"
echo
echo "Se não abrir no navegador, libere a porta $PUBLIC_PORT (TCP) no firewall do painel da sua hospedagem."
echo "Quando tiver domínio: bash 3-usar-dominio.sh seudominio.com.br"
