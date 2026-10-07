#!/usr/bin/env bash
# Funções e configurações usadas pelos scripts de deploy da Lenom.AI.
# Não rode este arquivo direto: ele é carregado pelos outros scripts.

# ---------------------------------------------------------------------------
# Configuração (pode sobrescrever por variável de ambiente ao rodar o script)
# ---------------------------------------------------------------------------
APP_NAME="${APP_NAME:-lenom-ai}"                         # nome do processo novo no PM2
APP_DIR="${APP_DIR:-/var/www/lenom-ai}"                  # onde o código novo fica
REPO_URL="${REPO_URL:-https://github.com/leonardocr10/lemomai.git}"
BRANCH="${BRANCH:-main}"
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/backups-lenom}"        # backups da aplicação antiga
STATE_FILE="${STATE_FILE:-$BACKUP_ROOT/app-antiga.env}"  # dados para voltar à antiga (rollback)
NODE_MIN="22.13.0"                                       # node:sqlite exige Node 22.13+

# ---------------------------------------------------------------------------
# Saída
# ---------------------------------------------------------------------------
info() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
aviso() { printf '\033[1;33m[aviso]\033[0m %s\n' "$*"; }
erro() { printf '\033[1;31m[erro]\033[0m %s\n' "$*" >&2; exit 1; }

confirmar() {
  local resposta
  read -r -p "$1 [s/N] " resposta
  [[ "$resposta" =~ ^[sS]$ ]]
}

precisa() {
  command -v "$1" >/dev/null 2>&1 || erro "Comando '$1' não encontrado. $2"
}

# ---------------------------------------------------------------------------
# PM2: lê dados de um processo pelo nome (pasta, script, porta, node usado)
# Saída: cwd<TAB>script<TAB>porta<TAB>interpretador<TAB>status
# ---------------------------------------------------------------------------
pm2_info() {
  pm2 jlist 2>/dev/null | node -e '
    let raw = "";
    process.stdin.on("data", (d) => (raw += d)).on("end", () => {
      // Avisos do PM2 também começam com "[" ("[PM2] ..."): procura o início real da lista JSON.
      const start = raw.search(/\[\s*(\{|\])/);
      const list = JSON.parse(raw.slice(start));
      const app = list.find((p) => p.name === process.argv[1]);
      if (!app) process.exit(2);
      const e = app.pm2_env || {};
      const port = (e.env && e.env.PORT) || e.PORT || "";
      const interp = e.exec_interpreter && e.exec_interpreter !== "node" ? e.exec_interpreter : "";
      console.log([e.pm_cwd, e.pm_exec_path, port, interp, e.status].join("\t"));
    });
  ' "$1"
}

# Porta para onde o Nginx repassa (proxy_pass http://127.0.0.1:PORTA)
porta_no_nginx() {
  grep -rhoE 'proxy_pass\s+https?://(127\.0\.0\.1|localhost|0\.0\.0\.0):[0-9]+' /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null \
    | grep -oE '[0-9]+$' | sort | uniq -c | sort -rn | awk 'NR==1 {print $2}'
}

# ---------------------------------------------------------------------------
# Node 22.13+ para a aplicação nova (sem mexer no Node que a antiga usa)
# Define NODE_BIN e NPM_BIN.
# ---------------------------------------------------------------------------
versao_ok() {
  # $1 >= $2 ?
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -1)" = "$2" ]
}

preparar_node() {
  local atual=""
  if command -v node >/dev/null 2>&1; then atual="$(node -v | tr -d v)"; fi
  if [[ -n "$atual" ]] && versao_ok "$atual" "$NODE_MIN"; then
    NODE_BIN="$(command -v node)"
    NPM_BIN="$(command -v npm)"
    info "Node $atual do sistema atende (mínimo $NODE_MIN)."
    return
  fi

  aviso "Node do sistema é ${atual:-inexistente}; a aplicação nova precisa de $NODE_MIN+."
  info "Instalando Node 22 só para a aplicação nova via nvm (o Node do sistema, usado pela antiga, não muda)."
  export NVM_DIR="$HOME/.nvm"
  if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  fi
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm install 22 >/dev/null
  NODE_BIN="$(nvm which 22)"
  NPM_BIN="$(dirname "$NODE_BIN")/npm"
  info "Usando $("$NODE_BIN" -v) em $NODE_BIN"
}

npm_novo() {
  PATH="$(dirname "$NODE_BIN"):$PATH" "$NPM_BIN" "$@"
}

# ---------------------------------------------------------------------------
# Espera a aplicação responder na porta (até ~30 s)
# ---------------------------------------------------------------------------
esperar_resposta() {
  local porta="$1" tentativa
  for tentativa in $(seq 1 30); do
    if curl -fsS -o /dev/null "http://127.0.0.1:${porta}/"; then return 0; fi
    sleep 1
  done
  return 1
}
