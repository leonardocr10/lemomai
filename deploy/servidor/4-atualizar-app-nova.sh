#!/usr/bin/env bash
# =============================================================================
# 4) Atualiza a aplicação nova com o que estiver no GitHub (main).
#
#   bash 4-atualizar-app-nova.sh
#
# Mantém .env, banco (storage/lenom.db) e imagens enviadas (public/uploads):
# eles ficam fora do git. Faz uma cópia do banco antes de atualizar.
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/comum.sh"
precisa_root
[[ -d "$APP_DIR/.git" ]] || erro "App nova não encontrada em $APP_DIR."

como_app() { runuser -u "$APP_USER" -- env PATH="$NODE_DIR/bin:/usr/bin:/bin" HOME="/home/$APP_USER" "$@"; }
PORT="$(grep -E '^PORT=' "$APP_DIR/.env" | cut -d= -f2- | tr -d "\"'\`")"

cd "$APP_DIR"

if [[ -f storage/lenom.db ]]; then
  mkdir -p "$BACKUP_ROOT/banco"
  COPIA="$BACKUP_ROOT/banco/lenom-$(date +%Y%m%d-%H%M%S).db"
  "$NODE_BIN" --no-warnings -e '
    const { DatabaseSync } = require("node:sqlite");
    new DatabaseSync(process.argv[1]).exec(`VACUUM INTO '"'"'${process.argv[2]}'"'"'`);
  ' storage/lenom.db "$COPIA" && info "Cópia do banco: $COPIA" || aviso "Não consegui copiar o banco; seguindo mesmo assim."
fi

info "Baixando atualizações..."
como_app git pull --quiet --ff-only origin "$BRANCH"

info "Instalando dependências e gerando arquivos de produção..."
como_app "$NPM_BIN" ci --no-audit --no-fund
como_app "$NPM_BIN" run build

info "Reiniciando o serviço..."
systemctl restart "$APP_NAME"
esperar_resposta "$PORT" || erro "A app não respondeu depois da atualização. Veja: journalctl -u $APP_NAME -n 100"
info "Atualizado: $(como_app git log -1 --format='%h %s')"
