#!/usr/bin/env bash
# =============================================================================
# 9) Volta para a aplicação ANTIGA (rollback).
#
#   bash 9-voltar-app-antiga.sh
#
# Desliga a app nova (sem apagar arquivos, banco ou uploads dela) e sobe a
# antiga do mesmo jeito que ela rodava, na mesma porta. Se a pasta original
# tiver sido apagada, restaura do backup.
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/comum.sh"
precisa_root

[[ -f "$STATE_FILE" ]] || erro "Arquivo $STATE_FILE não encontrado: não há dados da app antiga."
# shellcheck disable=SC1090
source "$STATE_FILE"

echo "Vai desligar: serviço $APP_NAME"
echo "Vai subir:    app antiga ($OLD_MANAGER ${OLD_UNIT}${OLD_CONTAINER}${OLD_PM2_NAME}) em $OLD_CWD, porta $PORT"
confirmar "Continuar?" || exit 0

if [[ ! -d "$OLD_CWD" ]]; then
  aviso "Pasta $OLD_CWD não existe mais. Restaurando do backup $BACKUP_DIR..."
  mkdir -p "$(dirname "$OLD_CWD")"
  tar -xzf "$BACKUP_DIR/app-antiga.tar.gz" -C "$(dirname "$OLD_CWD")"
  chown -R "$OLD_USER" "$OLD_CWD" 2>/dev/null || true
  aviso "Arquivos restaurados sem node_modules: rode 'npm install' em $OLD_CWD se a app não subir."
fi

systemctl disable --now "$APP_NAME" >/dev/null 2>&1 || true
esperar_porta_livre "$PORT" || erro "A porta $PORT continua ocupada. Veja: ss -ltnp 'sport = :$PORT'"

iniciar_antiga
esperar_resposta "$PORT" || erro "A app antiga não respondeu. Veja: $BACKUP_ROOT/app-antiga.log"
info "App antiga de volta no ar. A nova continua instalada em $APP_DIR (é só rodar o passo 3 de novo)."
