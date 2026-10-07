#!/usr/bin/env bash
# =============================================================================
# 1) Backup completo da aplicação ANTIGA — não para nada, só copia.
#
#   bash 1-backup-app-antiga.sh <nome-da-app-antiga-no-pm2>
#
# Guarda em ~/backups-lenom/:
#   - os arquivos da aplicação (com .env, banco SQLite, uploads, logs; sem node_modules)
#   - dump do MySQL, se a antiga usar MySQL e o mysqldump estiver disponível
#   - a lista do PM2 e a configuração do Nginx
#   - app-antiga.env: nome, pasta, script e porta, usado pelo rollback
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/comum.sh"

OLD_NAME="${1:-}"
if [[ -z "$OLD_NAME" ]]; then
  echo "Uso: bash $0 <nome-da-app-antiga-no-pm2>"
  echo
  pm2 list
  exit 1
fi

precisa pm2 "Este servidor deveria ter o PM2 (a aplicação antiga roda nele)."
precisa node "O PM2 precisa do Node instalado."

INFO="$(pm2_info "$OLD_NAME")" || erro "Processo '$OLD_NAME' não encontrado no PM2. Confira o nome em: pm2 list"
IFS=$'\t' read -r OLD_CWD OLD_SCRIPT OLD_PORT OLD_INTERP OLD_STATUS <<<"$INFO"

if [[ -z "$OLD_PORT" && -f "$OLD_CWD/.env" ]]; then
  OLD_PORT="$(grep -E '^PORT=' "$OLD_CWD/.env" | tail -1 | cut -d= -f2 | tr -d '"'"'"' ' || true)"
fi
NGINX_PORT="$(porta_no_nginx || true)"
PORT="${OLD_PORT:-${NGINX_PORT:-3000}}"

info "Aplicação antiga: $OLD_NAME ($OLD_STATUS)"
echo "    pasta:  $OLD_CWD"
echo "    script: $OLD_SCRIPT"
echo "    porta:  ${OLD_PORT:-não definida no PM2/.env} | Nginx repassa para: ${NGINX_PORT:-não encontrado}"
[[ -n "$OLD_PORT" && -n "$NGINX_PORT" && "$OLD_PORT" != "$NGINX_PORT" ]] &&
  aviso "A porta da app antiga ($OLD_PORT) é diferente da do Nginx ($NGINX_PORT). Confira antes de seguir."

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_ROOT/$STAMP"
mkdir -p "$DEST"

info "Copiando arquivos da aplicação (sem node_modules)..."
tar -czf "$DEST/app-antiga.tar.gz" \
  --exclude='node_modules' --exclude='.git' \
  -C "$(dirname "$OLD_CWD")" "$(basename "$OLD_CWD")"

# MySQL (versão antiga com USE_MOCK_DATA=false ou DATA_DRIVER=mysql)
if [[ -f "$OLD_CWD/.env" ]] && grep -qE '^(USE_MOCK_DATA=false|DATA_DRIVER=mysql)' "$OLD_CWD/.env"; then
  if command -v mysqldump >/dev/null 2>&1; then
    info "A app antiga usa MySQL: gerando dump..."
    set -a
    # shellcheck disable=SC1090
    source <(grep -E '^DB_(HOST|PORT|NAME|USER|PASSWORD)=' "$OLD_CWD/.env")
    set +a
    MYSQL_PWD="${DB_PASSWORD:-}" mysqldump -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" \
      --single-transaction --routines "${DB_NAME}" >"$DEST/mysql-${DB_NAME}.sql" \
      && info "Dump salvo em $DEST/mysql-${DB_NAME}.sql" \
      || aviso "Não consegui gerar o dump do MySQL. Faça manualmente antes de seguir."
  else
    aviso "A app antiga usa MySQL, mas o mysqldump não está instalado. Faça o dump manualmente."
  fi
fi

info "Salvando lista do PM2 e configuração do Nginx..."
pm2 save >/dev/null
cp "$HOME/.pm2/dump.pm2" "$DEST/pm2-dump.pm2" 2>/dev/null || true
pm2 jlist >"$DEST/pm2-jlist.json" 2>/dev/null || true
if [[ -d /etc/nginx ]]; then
  sudo tar -czf "$DEST/nginx.tar.gz" -C /etc nginx && sudo chown "$(id -u):$(id -g)" "$DEST/nginx.tar.gz"
fi

cat >"$STATE_FILE" <<EOF
# Gerado por 1-backup-app-antiga.sh em $STAMP — usado pelo 9-voltar-app-antiga.sh
OLD_NAME='$OLD_NAME'
OLD_CWD='$OLD_CWD'
OLD_SCRIPT='$OLD_SCRIPT'
OLD_INTERP='$OLD_INTERP'
PORT='$PORT'
BACKUP_DIR='$DEST'
EOF

echo
info "Backup pronto em: $DEST"
ls -lh "$DEST"
echo
echo "Próximo passo: bash 2-instalar-app-nova.sh   (a app nova vai usar a porta $PORT)"
