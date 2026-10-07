# Carrossel de banners da home — design

Data: 2026-10-07 · Status: aprovado

## Objetivo

Substituir o hero da home por um carrossel de banners (imagens 3:1 com texto e
botão já desenhados), gerenciado pelo painel `/admin`. Os 4 banners enviados
entram já cadastrados.

## Decisões

| Tema | Decisão |
|---|---|
| Posição | Substitui o hero quando houver banner ativo. Sem banners ativos, o hero atual volta. |
| Celular (< 768px) | Cada banner aceita imagem mobile opcional. Banners sem ela não aparecem no celular. Se nenhum tiver, o celular vê o hero de texto. |
| Link | O banner inteiro é um link editável. |
| SEO/a11y | `alt` obrigatório (o texto está na imagem); `h1` oculto com o título do hero; carrossel com setas, bolinhas, swipe, autoplay 6 s com botão pausar; pausa em hover/foco; sem autoplay com `prefers-reduced-motion`. |
| Upload | JPG/PNG/WebP até 5 MB, assinatura do arquivo conferida; salvo em `public/uploads/banners/`; arquivo antigo apagado ao trocar/excluir. CSRF conferido após o multer só nas rotas de banner. |
| Drivers | `sqlite`: tabela `banners` (seed com os 4). `mock`: `banners.mock.js` (leitura). `mysql`: lista vazia → hero. |

## Dados

Tabela `banners`: id, title (nome interno), alt, href, image, mobile_image,
active, display_order, created_at, updated_at.

Seed: `public/images/banners/banner-1..4.webp` → `/orcamento`, `/portfolio`,
`/orcamento`, `/contato`.

## Fora do escopo

Recorte/redimensionamento automático, agendamento de exibição, métricas de clique.
