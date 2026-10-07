# Painel administrativo com Tabler — design

Data: 2026-10-07 · Status: aprovado

## Objetivo

Refazer o layout de todo o `/admin` com componentes atuais: grid com busca,
ordenação, paginação e ações em massa; formulários modernos; upload de imagem
com arrastar e soltar, prévia, aviso de proporção e recorte no navegador.

## Decisões

| Tema | Decisão |
|---|---|
| Base | `@tabler/core` 1.6 (Bootstrap 5) + `@tabler/icons-webfont` 3, servidos de `node_modules` em `/vendor/*` (sem CDN). |
| Recorte | `cropperjs` 1.6 (API clássica). Desktop 3:1 fixo, saída máx. 2000×667; celular 4:5, 1:1 ou livre. Saída WebP. |
| Visual | Claro + menu lateral petróleo `#0F2D4A`. Primário `#2B7F2A` (texto branco legível). Login Tabler com o banner digitado. |
| Grid | Servidor processa `q`, `sort`, `dir`, `page`, `per` (10/25/50), tudo na URL. Ordenação só em colunas permitidas; valor inválido volta ao padrão. |
| Massa | Planos, FAQ, depoimentos, banners: ativar, desativar, excluir. Leads: mudar status. POST com CSRF + modal de confirmação. |
| Formulários | Campos Tabler, erros por campo, prefixo "R$", interruptores, seções em cards, modal de confirmação ao excluir, alertas que somem. |
| CSP | Inalterada, exceto `img-src` ganha `blob:` (prévia de imagem local). Nada de script/style inline no HTML. |
| Site público | Não muda. O admin deixa de carregar `main.css`. |

## Fora do escopo

Gráficos, modo escuro, editor rico, várias imagens por banner.
