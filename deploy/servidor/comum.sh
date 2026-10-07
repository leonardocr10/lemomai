#!/usr/bin/env bash
# Funções e configurações usadas pelos scripts de deploy da Lenom.AI.
# Não rode este arquivo direto: ele é carregado pelos outros scripts.

# ---------------------------------------------------------------------------
# Configuração (pode sobrescrever por variável de ambiente ao rodar o script)
# ---------------------------------------------------------------------------
APP_NAME="${APP_NAME:-lenom-ai}"                         # nome do serviço systemd da app nova
APP_USER="${APP_USER:-lenom}"                            # usuário (sem login) que roda a app nova
APP_DIR="${APP_DIR:-/var/www/lenom-ai}"                  # onde o código novo fica
REPO_URL="${REPO_URL:-https://github.com/leonardocr10/lemomai.git}"
BRANCH="${BRANCH:-main}"
NODE_DIR="${NODE_DIR:-/opt/node22}"                      # Node 22 só da app nova (não mexe no Node do sistema)
BACKUP_ROOT="${BACKUP_ROOT:-/root/backups-lenom}"        # backups da aplicação antiga
STATE_FILE="${STATE_FILE:-$BACKUP_ROOT/app-antiga.env}"  # como a antiga rodava (usado na troca e no rollback)
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
NODE_BIN="$NODE_DIR/bin/node"
NPM_BIN="$NODE_DIR/bin/npm"

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

precisa_root() {
  [[ "$(id -u)" -eq 0 ]] || erro "Rode como root (ex.: sudo bash $0)."
}

# ---------------------------------------------------------------------------
# Porta para onde o Nginx repassa (proxy_pass http://127.0.0.1:PORTA)
# ---------------------------------------------------------------------------
porta_no_nginx() {
  grep -rhoE 'proxy_pass\s+https?://(127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\]):[0-9]+' \
    /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null \
    | grep -oE '[0-9]+$' | sort | uniq -c | sort -rn | awk 'NR==1 {print $2}'
}

# PID do processo que escuta na porta (vazio se nenhum)
pid_na_porta() {
  ss -ltnpH "sport = :$1" 2>/dev/null | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2
}

porta_livre() {
  [[ -z "$(ss -ltnH "sport = :$1" 2>/dev/null)" ]]
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

esperar_porta_livre() {
  local porta="$1" tentativa
  for tentativa in $(seq 1 15); do
    porta_livre "$porta" && return 0
    sleep 1
  done
  return 1
}

# ---------------------------------------------------------------------------
# Parar / iniciar a aplicação ANTIGA conforme o jeito que ela rodava
# (dados lidos de STATE_FILE: OLD_MANAGER, OLD_UNIT, OLD_CONTAINER, OLD_CWD,
#  OLD_CMD, OLD_USER, OLD_PID, PORT)
# ---------------------------------------------------------------------------
parar_antiga() {
  case "$OLD_MANAGER" in
    systemd)
      systemctl stop "$OLD_UNIT"
      systemctl disable "$OLD_UNIT" >/dev/null 2>&1 || true
      ;;
    docker)
      docker stop "$OLD_CONTAINER" >/dev/null
      docker update --restart=no "$OLD_CONTAINER" >/dev/null 2>&1 || true
      ;;
    pm2)
      pm2 stop "$OLD_PM2_NAME" >/dev/null && pm2 save >/dev/null
      ;;
    manual)
      local pid
      pid="$(pid_na_porta "$PORT")"
      if [[ -n "$pid" ]]; then
        # Encerra o grupo do processo (ex.: "npm start" + o node filho).
        local pgid
        pgid="$(ps -o pgid= -p "$pid" | tr -d ' ')"
        kill -TERM -- "-$pgid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
      fi
      ;;
  esac
  esperar_porta_livre "$PORT" || {
    local pid
    pid="$(pid_na_porta "$PORT")"
    [[ -n "$pid" ]] && kill -KILL "$pid" 2>/dev/null || true
    esperar_porta_livre "$PORT" || erro "A porta $PORT continua ocupada. Veja: ss -ltnp 'sport = :$PORT'"
  }
}

iniciar_antiga() {
  case "$OLD_MANAGER" in
    systemd)
      systemctl enable "$OLD_UNIT" >/dev/null 2>&1 || true
      systemctl start "$OLD_UNIT"
      ;;
    docker)
      docker update --restart=unless-stopped "$OLD_CONTAINER" >/dev/null 2>&1 || true
      docker start "$OLD_CONTAINER" >/dev/null
      ;;
    pm2)
      pm2 start "$OLD_PM2_NAME" >/dev/null && pm2 save >/dev/null
      ;;
    manual)
      # Mesmo comando, mesma pasta e mesmo usuário de antes, em segundo plano.
      local log="$BACKUP_ROOT/app-antiga.log"
      if [[ "$OLD_USER" == "root" ]]; then
        (cd "$OLD_CWD" && setsid nohup bash -c "$OLD_CMD" >>"$log" 2>&1 &)
      else
        (cd "$OLD_CWD" && setsid nohup runuser -u "$OLD_USER" -- bash -c "$OLD_CMD" >>"$log" 2>&1 &)
      fi
      ;;
  esac
}
