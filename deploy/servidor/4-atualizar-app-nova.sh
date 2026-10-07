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

[[ -f "$STATE_FILE" ]] || erro "Arquivo $STATE_FILE não encontrado (a instalação foi feita por estes scripts?)."
# shellcheck disable=SC1090
source "$STATE_FILE"
[[ -n "${NODE_BIN:-}" && -x "$NODE_BIN" ]] || preparar_node
NPM_BIN="${NPM_BIN:-$(dirname "$NODE_BIN")/npm}"

cd "$APP_DIR"

if [[ -f storage/lenom.db ]]; then
  STAMP="$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_ROOT/banco"
  "$NODE_BIN" -e '
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(process.argv[1]);
    db.exec(`VACUUM INTO '"'"'${process.argv[2]}'"'"'`);
  ' storage/lenom.db "$BACKUP_ROOT/banco/lenom-$STAMP.db" 2>/dev/null &&
    info "Cópia do banco: $BACKUP_ROOT/banco/lenom-$STAMP.db" ||
    aviso "Não consegui copiar o banco; seguindo mesmo assim."
fi

info "Baixando atualizações..."
git fetch --quiet origin "$BRANCH"
git pull --quiet --ff-only origin "$BRANCH"

info "Instalando dependências e gerando arquivos de produção..."
npm_novo ci --no-audit --no-fund
npm_novo run build

info "Reiniciando sem derrubar (pm2 reload)..."
pm2 reload "$APP_NAME" --update-env >/dev/null
esperar_resposta "$PORT" || erro "A app não respondeu depois da atualização. Veja: pm2 logs $APP_NAME"
pm2 save >/dev/null
info "Atualizado: $(git log -1 --format='%h %s')"
