#!/usr/bin/env bash
# =============================================================================
# 3) Passa a Lenom.AI para um domínio próprio, com HTTPS grátis (Let's Encrypt).
#
#   bash 3-usar-dominio.sh lenom.com.br
#
# Antes: no painel do domínio, aponte os registros A de "lenom.com.br" e
# "www.lenom.com.br" para o IP deste servidor e espere propagar.
#
# Só altera o site da Lenom.AI no Nginx. O Cassiano3D e os outros sites
# continuam como estão (o domínio novo não interfere neles).
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/comum.sh"
precisa_root

DOMINIO="${1:-}"
DOMINIO="${DOMINIO#http://}"
DOMINIO="${DOMINIO#https://}"
DOMINIO="${DOMINIO%%/*}"
DOMINIO="${DOMINIO#www.}"
[[ "$DOMINIO" =~ ^[a-z0-9.-]+\.[a-z]{2,}$ ]] || erro "Uso: bash $0 seudominio.com.br"
[[ -f "$APP_DIR/.env" ]] || erro "Lenom.AI não instalada. Rode antes: bash 1-instalar.sh"

IP_PUBLICO="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
IP_DOMINIO="$(getent ahostsv4 "$DOMINIO" | awk 'NR==1 {print $1}' || true)"
if [[ "$IP_DOMINIO" != "$IP_PUBLICO" ]]; then
  aviso "$DOMINIO aponta para '${IP_DOMINIO:-nada}', mas este servidor é $IP_PUBLICO."
  confirmar "O HTTPS só funciona depois que o DNS apontar para cá. Continuar mesmo assim?" || exit 1
fi

info "Configurando o site da Lenom.AI no Nginx para $DOMINIO..."
mkdir -p "$BACKUP_ROOT"
BACKUP_SITE=""
[[ -f "$NGINX_SITE" ]] && BACKUP_SITE="$BACKUP_ROOT/nginx-${APP_NAME}-$(date +%Y%m%d-%H%M%S)" && cp "$NGINX_SITE" "$BACKUP_SITE"
{
  echo "# Lenom.AI — $DOMINIO (gerado por 3-usar-dominio.sh)"
  echo "server {"
  echo "    listen 80;"
  echo "    listen [::]:80;"
  echo "    server_name $DOMINIO www.$DOMINIO;"
  echo
  nginx_location
  echo "}"
} >"$NGINX_SITE"
ln -sf "$NGINX_SITE" "$NGINX_LINK"
recarregar_nginx_ou_desfazer "$BACKUP_SITE"

URL="http://$DOMINIO"
if confirmar "Ativar HTTPS grátis com Let's Encrypt (certbot) agora?"; then
  if ! command -v certbot >/dev/null 2>&1; then
    info "Instalando o certbot..."
    apt-get update -qq && apt-get install -y -qq certbot python3-certbot-nginx
  fi
  if certbot --nginx -d "$DOMINIO" -d "www.$DOMINIO" --redirect --non-interactive --agree-tos \
    --register-unsafely-without-email --cert-name "$APP_NAME"; then
    URL="https://$DOMINIO"
  else
    aviso "O certbot não conseguiu emitir o certificado (DNS ainda não propagou?). O site segue em http://$DOMINIO. Rode este script de novo mais tarde."
  fi
fi

info "Atualizando o endereço do site no .env..."
set_env APP_URL "$URL"
systemctl restart "$APP_NAME"
APP_PORT_ENV="$(grep -E '^PORT=' "$APP_DIR/.env" | cut -d= -f2- | tr -d "\"'\`")"
esperar_resposta "$APP_PORT_ENV" || erro "A Lenom.AI não respondeu. Veja: journalctl -u $APP_NAME -n 100"

echo
info "Pronto! Lenom.AI em $URL  (painel: $URL/admin)"
echo "O acesso antigo por IP:${PUBLIC_PORT} foi desativado; o Cassiano3D segue como estava."
