#!/usr/bin/env bash
# =============================================================================
# 3) Troca: para a aplicação ANTIGA e liga a NOVA na mesma porta.
#
#   bash 3-trocar-para-app-nova.sh
#
# O Nginx continua igual (domínio e HTTPS não mudam). Fora do ar por poucos
# segundos. Se a app nova não responder em 30 s, a antiga volta sozinha.
# A antiga não é apagada: arquivos e backup ficam. Para voltar:
#   bash 9-voltar-app-antiga.sh
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/comum.sh"
precisa_root

[[ -f "$STATE_FILE" ]] || erro "Rode antes: 1-backup-app-antiga.sh e 2-instalar-app-nova.sh"
# shellcheck disable=SC1090
source "$STATE_FILE"
[[ -f "$SERVICE_FILE" && -f "$APP_DIR/.env" ]] || erro "App nova não instalada. Rode: bash 2-instalar-app-nova.sh"

echo "Vai parar: app antiga ($OLD_MANAGER ${OLD_UNIT}${OLD_CONTAINER}${OLD_PM2_NAME}) em $OLD_CWD"
echo "Vai ligar: serviço $APP_NAME ($APP_DIR) na porta $PORT"
confirmar "Continuar?" || exit 0

info "Parando a app antiga..."
parar_antiga

info "Ligando a app nova..."
systemctl enable --now "$APP_NAME" >/dev/null 2>&1 || true

if ! esperar_resposta "$PORT"; then
  aviso "A app nova não respondeu. Voltando a antiga..."
  journalctl -u "$APP_NAME" -n 40 --no-pager || true
  systemctl disable --now "$APP_NAME" >/dev/null 2>&1 || true
  esperar_porta_livre "$PORT" || true
  iniciar_antiga
  esperar_resposta "$PORT" && erro "A app antiga voltou ao ar. Veja os logs acima, corrija e rode este script de novo." ||
    erro "Nem a nova nem a antiga responderam! Veja: journalctl -u $APP_NAME -n 100  e  $BACKUP_ROOT/app-antiga.log"
fi

echo
systemctl --no-pager --lines=0 status "$APP_NAME" || true
echo
info "Pronto! A app nova está no ar na porta $PORT. Abra o site pelo domínio e entre em /admin."
echo "    Logs:      journalctl -u $APP_NAME -f"
echo "    Reiniciar: systemctl restart $APP_NAME"
echo "    Voltar:    bash 9-voltar-app-antiga.sh"
if [[ "$OLD_MANAGER" == "manual" ]]; then
  aviso "Se a app antiga era iniciada por cron/@reboot ou rc.local (veja o passo 1), desative essa linha agora."
fi
