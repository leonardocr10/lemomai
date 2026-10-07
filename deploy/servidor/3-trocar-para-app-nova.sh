#!/usr/bin/env bash
# =============================================================================
# 3) Troca: para a aplicação ANTIGA e coloca a NOVA na mesma porta.
#
#   bash 3-trocar-para-app-nova.sh
#
# O Nginx continua igual (domínio e HTTPS não mudam): ele já repassa para essa porta.
# Fora do ar por poucos segundos. Se a app nova não responder em 30 s,
# a antiga volta sozinha.
#
# A antiga sai da lista do PM2 (para não disputar a porta num reinício do
# servidor), mas os arquivos dela não são tocados e o backup fica guardado.
# Para voltar: bash 9-voltar-app-antiga.sh
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/comum.sh"

[[ -f "$STATE_FILE" ]] || erro "Rode antes: 1-backup-app-antiga.sh e 2-instalar-app-nova.sh"
# shellcheck disable=SC1090
source "$STATE_FILE"
[[ -n "${NODE_BIN:-}" && -x "$NODE_BIN" ]] || erro "Rode antes: bash 2-instalar-app-nova.sh"
[[ -f "$APP_DIR/server.js" && -f "$APP_DIR/.env" ]] || erro "App nova não está instalada em $APP_DIR."

echo "Vai parar: $OLD_NAME ($OLD_CWD)"
echo "Vai subir: $APP_NAME ($APP_DIR) na porta $PORT"
confirmar "Continuar?" || exit 0

voltar_antiga() {
  aviso "A app nova não respondeu. Voltando a antiga..."
  pm2 logs "$APP_NAME" --lines 40 --nostream || true
  pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
  if pm2 describe "$OLD_NAME" >/dev/null 2>&1; then
    pm2 start "$OLD_NAME" >/dev/null
  else
    pm2 start "$OLD_SCRIPT" --name "$OLD_NAME" --cwd "$OLD_CWD" ${OLD_INTERP:+--interpreter "$OLD_INTERP"} >/dev/null
  fi
  pm2 save >/dev/null
  erro "A app antiga voltou ao ar. Veja os logs acima, corrija e rode este script de novo."
}

info "Parando a app antiga..."
pm2 stop "$OLD_NAME" >/dev/null

info "Subindo a app nova..."
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
pm2 start "$APP_DIR/server.js" --name "$APP_NAME" --cwd "$APP_DIR" --interpreter "$NODE_BIN" --time >/dev/null

if ! esperar_resposta "$PORT"; then
  voltar_antiga
fi

info "App nova respondendo na porta $PORT. Removendo a antiga da lista do PM2 (arquivos mantidos)..."
pm2 delete "$OLD_NAME" >/dev/null
pm2 save >/dev/null

echo
pm2 list
echo
info "Pronto! Abra o site pelo domínio e entre em /admin com o usuário e a senha do .env."
echo "    Logs:   pm2 logs $APP_NAME"
echo "    Voltar: bash 9-voltar-app-antiga.sh"
