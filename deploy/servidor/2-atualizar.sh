#!/usr/bin/env bash
# =============================================================================
# 2) Atualiza a Lenom.AI com o que estiver no GitHub (main).
#
#   bash 2-atualizar.sh
#
# Mantém .env, banco (storage/lenom.db) e imagens enviadas (public/uploads):
# eles ficam fora do git. Faz uma cópia do banco antes de atualizar.
# Só reinicia o serviço da Lenom.AI; as outras aplicações não são tocadas.
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/comum.sh"
precisa_root
[[ -d "$APP_DIR/.git" ]] || erro "Lenom.AI não encontrada em $APP_DIR. Rode antes: bash 1-instalar.sh"

PORTA="$(grep -E '^PORT=' "$APP_DIR/.env" | cut -d= -f2- | tr -d "\"'\`")"
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

info "Reiniciando a Lenom.AI..."
systemctl restart "$APP_NAME"
esperar_resposta "$PORTA" || erro "A Lenom.AI não respondeu depois da atualização. Veja: journalctl -u $APP_NAME -n 100"
info "Atualizado: $(como_app git log -1 --format='%h %s')"
