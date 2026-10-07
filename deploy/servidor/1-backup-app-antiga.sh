#!/usr/bin/env bash
# =============================================================================
# 1) Descobre como a aplicação ANTIGA roda e faz backup completo dela.
#    Não para nada.
#
#   bash 1-backup-app-antiga.sh            # usa a porta para onde o Nginx repassa
#   bash 1-backup-app-antiga.sh 3000       # ou informe a porta da app antiga
#
# Descobre pelo processo que escuta na porta: serviço systemd, contêiner
# Docker, PM2 ou "node" iniciado à mão. Guarda em /root/backups-lenom/:
#   - os arquivos da aplicação (com .env, banco, uploads; sem node_modules)
#   - dump do MySQL, se a antiga usar MySQL e o mysqldump estiver instalado
#   - configuração do Nginx (e do serviço systemd, se houver)
#   - app-antiga.env: como ela rodava, usado na troca e para voltar atrás
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/comum.sh"
precisa_root
precisa ss "Instale com: apt install -y iproute2"

NGINX_PORT="$(porta_no_nginx || true)"
PORT="${1:-$NGINX_PORT}"
if [[ -z "$PORT" ]]; then
  read -r -p "Não achei o proxy_pass no Nginx. Qual a porta da aplicação antiga? " PORT
fi
[[ "$PORT" =~ ^[0-9]+$ ]] || erro "Porta inválida: '$PORT'"

PID="$(pid_na_porta "$PORT")"
[[ -n "$PID" ]] || erro "Nenhum processo escutando na porta $PORT. Confira com: ss -ltnp"

OLD_CWD="$(readlink "/proc/$PID/cwd")"
OLD_USER="$(ps -o user= -p "$PID" | tr -d ' ')"
OLD_EXE="$(readlink "/proc/$PID/exe")"
mapfile -d '' ARGS <"/proc/$PID/cmdline"
CGROUP="$(cat "/proc/$PID/cgroup")"

# Comando para subir de novo à mão: executável real + argumentos + PORT/NODE_ENV que o processo tinha.
ENV_PREFIX=""
for var in PORT NODE_ENV; do
  val="$(tr '\0' '\n' <"/proc/$PID/environ" | grep -E "^${var}=" | head -1 | cut -d= -f2- || true)"
  [[ -n "$val" ]] && ENV_PREFIX+="$var=$(printf '%q' "$val") "
done
OLD_CMD="${ENV_PREFIX}$(printf '%q ' "$OLD_EXE" "${ARGS[@]:1}")"

# Como foi iniciada?
OLD_MANAGER="manual"
OLD_UNIT=""
OLD_CONTAINER=""
OLD_PM2_NAME=""
UNIT_IN_CGROUP="$(grep -oE '[^/]+\.service' <<<"$CGROUP" | tail -1 || true)"
if grep -qE 'docker[-/]' <<<"$CGROUP" && command -v docker >/dev/null 2>&1; then
  CID="$(grep -oE '[0-9a-f]{64}' <<<"$CGROUP" | head -1 || true)"
  OLD_CONTAINER="$(docker ps --no-trunc --filter "id=$CID" --format '{{.Names}}' | head -1)"
  [[ -n "$OLD_CONTAINER" ]] && OLD_MANAGER="docker"
elif [[ "$UNIT_IN_CGROUP" == pm2-*.service ]] && command -v pm2 >/dev/null 2>&1; then
  OLD_MANAGER="pm2"
  OLD_PM2_NAME="$(pm2 jlist 2>/dev/null | node -e '
    let raw = ""; process.stdin.on("data", (d) => (raw += d)).on("end", () => {
      const list = JSON.parse(raw.slice(raw.search(/\[\s*(\{|\])/)));
      const app = list.find((p) => String(p.pid) === process.argv[1]);
      if (app) console.log(app.name);
    });' "$PID" || true)"
elif [[ -n "$UNIT_IN_CGROUP" && "$UNIT_IN_CGROUP" != user@*.service ]]; then
  OLD_MANAGER="systemd"
  OLD_UNIT="$UNIT_IN_CGROUP"
fi

echo
info "Aplicação antiga encontrada na porta $PORT"
echo "    gerenciada por: $OLD_MANAGER ${OLD_UNIT}${OLD_CONTAINER}${OLD_PM2_NAME}"
echo "    processo:       $PID ($OLD_USER)"
echo "    pasta:          $OLD_CWD"
echo "    comando:        $OLD_CMD"
echo "    Nginx repassa para a porta: ${NGINX_PORT:-não encontrado}"

if [[ "$OLD_MANAGER" == "manual" ]]; then
  echo
  aviso "Ela foi iniciada à mão (sem systemd/PM2/Docker). Procurando algo que a suba sozinho no boot..."
  AUTOSTART="$( { crontab -l 2>/dev/null; cat /etc/crontab /etc/cron.d/* /etc/rc.local 2>/dev/null; \
    for u in $(cut -d: -f1 /etc/passwd); do crontab -u "$u" -l 2>/dev/null; done; } | grep -nF "$OLD_CWD" || true)"
  if [[ -n "$AUTOSTART" ]]; then
    aviso "Encontrei inicialização automática citando $OLD_CWD:"
    echo "$AUTOSTART"
    aviso "Depois da troca, desative essa linha (senão a antiga volta a disputar a porta num reinício)."
  else
    echo "    Nada encontrado no cron/rc.local: ela só voltaria se alguém rodasse de novo."
  fi
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_ROOT/$STAMP"
mkdir -p "$DEST"
chmod 700 "$BACKUP_ROOT"

echo
info "Copiando arquivos da aplicação (sem node_modules)..."
tar -czf "$DEST/app-antiga.tar.gz" --exclude='node_modules' --exclude='.git' \
  -C "$(dirname "$OLD_CWD")" "$(basename "$OLD_CWD")"

if [[ -f "$OLD_CWD/.env" ]] && grep -qE '^(USE_MOCK_DATA=false|DATA_DRIVER=mysql)' "$OLD_CWD/.env"; then
  if command -v mysqldump >/dev/null 2>&1; then
    info "A app antiga usa MySQL: gerando dump..."
    DB_HOST="$(grep -E '^DB_HOST=' "$OLD_CWD/.env" | cut -d= -f2- | tr -d "\"'")"
    DB_PORT="$(grep -E '^DB_PORT=' "$OLD_CWD/.env" | cut -d= -f2- | tr -d "\"'")"
    DB_NAME="$(grep -E '^DB_NAME=' "$OLD_CWD/.env" | cut -d= -f2- | tr -d "\"'")"
    DB_USER="$(grep -E '^DB_USER=' "$OLD_CWD/.env" | cut -d= -f2- | tr -d "\"'")"
    DB_PASSWORD="$(grep -E '^DB_PASSWORD=' "$OLD_CWD/.env" | cut -d= -f2- | tr -d "\"'")"
    MYSQL_PWD="$DB_PASSWORD" mysqldump -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" \
      --single-transaction --routines "$DB_NAME" >"$DEST/mysql-$DB_NAME.sql" &&
      info "Dump salvo: $DEST/mysql-$DB_NAME.sql" ||
      aviso "Não consegui gerar o dump do MySQL. Faça manualmente antes de seguir."
  else
    aviso "A app antiga usa MySQL, mas o mysqldump não está instalado. Faça o dump manualmente."
  fi
fi

[[ -d /etc/nginx ]] && tar -czf "$DEST/nginx.tar.gz" -C /etc nginx
[[ "$OLD_MANAGER" == "systemd" ]] && systemctl cat "$OLD_UNIT" >"$DEST/$OLD_UNIT" 2>/dev/null || true

{
  echo "# Gerado por 1-backup-app-antiga.sh em $STAMP"
  for var in PORT OLD_MANAGER OLD_UNIT OLD_CONTAINER OLD_PM2_NAME OLD_CWD OLD_USER OLD_CMD; do
    printf '%s=%q\n' "$var" "${!var}"
  done
  printf 'BACKUP_DIR=%q\n' "$DEST"
} >"$STATE_FILE"
chmod 600 "$STATE_FILE"

echo
info "Backup pronto em: $DEST"
ls -lh "$DEST"
echo
echo "Próximo passo: bash 2-instalar-app-nova.sh   (a app nova vai usar a porta $PORT)"
