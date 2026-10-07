#!/usr/bin/env bash
# =============================================================================
# 9) Volta para a aplicação ANTIGA (rollback).
#
#   bash 9-voltar-app-antiga.sh
#
# Para a app nova (sem apagar arquivos, banco ou uploads dela) e sobe a antiga
# na mesma porta, com os arquivos que continuam na pasta original.
# Se a pasta original tiver sido apagada, restaura do backup.
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/comum.sh"

[[ -f "$STATE_FILE" ]] || erro "Arquivo $STATE_FILE não encontrado: não há dados da app antiga."
# shellcheck disable=SC1090
source "$STATE_FILE"

echo "Vai parar: $APP_NAME"
echo "Vai subir: $OLD_NAME ($OLD_CWD) na porta $PORT"
confirmar "Continuar?" || exit 0

if [[ ! -d "$OLD_CWD" ]]; then
  aviso "Pasta $OLD_CWD não existe mais. Restaurando do backup $BACKUP_DIR..."
  sudo mkdir -p "$(dirname "$OLD_CWD")"
  sudo tar -xzf "$BACKUP_DIR/app-antiga.tar.gz" -C "$(dirname "$OLD_CWD")"
  sudo chown -R "$(id -u):$(id -g)" "$OLD_CWD"
  (cd "$OLD_CWD" && npm install --omit=dev --no-audit --no-fund)
fi

pm2 stop "$APP_NAME" >/dev/null 2>&1 || true
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true

if pm2 describe "$OLD_NAME" >/dev/null 2>&1; then
  pm2 restart "$OLD_NAME" >/dev/null
else
  pm2 start "$OLD_SCRIPT" --name "$OLD_NAME" --cwd "$OLD_CWD" ${OLD_INTERP:+--interpreter "$OLD_INTERP"} >/dev/null
fi

esperar_resposta "$PORT" || erro "A app antiga não respondeu. Veja: pm2 logs $OLD_NAME"
pm2 save >/dev/null
pm2 list
info "App antiga de volta no ar. A nova continua instalada em $APP_DIR (é só rodar o passo 3 de novo)."
