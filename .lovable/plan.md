

## Redesign do NetflixTemplate com Carrossel Automático, Botões Interativos e Barra de Navegação Fixa

### Referência Visual (print do usuário)
O layout segue fielmente o design do screenshot: hero com foto/vídeo de fundo, headline bold estilo Netflix (fonte Bebas Neue), subtítulo com sombra sutil, tags descritivas, botões de ação centrais ("Minha lista", "Meus links", "Saiba mais"), grid de thumbnails 2x3 com capas coloridas, badge "N" vermelho e etiquetas como "NOVOS EPISÓDIOS", e barra fixa no rodapé com ícones de navegação.

---

### Mudanças no `template_config` (JSONB)

Expandir a estrutura de configuração para suportar os novos elementos:

```json
{
  "hero": { "type": "...", "items": [...], "youtubeId": "..." },
  "headline": "MOMENTOS",
  "subheadline": "FOTOGRAFAR É ETERNIZAR",
  "heroSubtitle": "COM ANA LUA",
  "tags": ["Fortes emoções", "Fascinante", "Memórias"],
  "heroButtons": [
    { "label": "Minha lista", "icon": "Plus", "action": "scroll" },
    { "label": "Meus links", "icon": "ChevronDown", "url": "#links" },
    { "label": "Saiba mais", "icon": "Info", "url": "https://..." }
  ],
  "covers": [
    { "url": "...", "title": "CASAMENTO", "badge": "NOVOS EPISÓDIOS", "bgColor": "#1a3a2a" }
  ],
  "thumbnails": [...],
  "sections": [...],
  "bottomNav": [
    { "icon": "Home", "label": "Início", "url": "#top" },
    { "icon": "Heart", "label": "Favoritos", "url": "#" },
    { "icon": "MessageCircle", "label": "WhatsApp", "url": "https://wa.me/..." },
    { "icon": "Instagram", "label": "Instagram", "url": "https://instagram.com/..." },
    { "icon": "Star", "label": "Avaliar", "url": "https://g.page/..." }
  ]
}
```

Nenhuma migração de banco necessária, pois `template_config` já é JSONB livre.

---

### Arquivos a modificar

#### 1. `src/components/display/NetflixTemplate.tsx` (reescrever)

- **Fonte Netflix**: importar Bebas Neue do Google Fonts via `<link>` injetado no head
- **Hero redesenhado**:
  - Subtítulo pequeno acima ("FOTOGRAFAR É ETERNIZAR")
  - Headline grande e bold com `text-shadow` sutil ("MOMENTOS")
  - Linha extra abaixo ("COM ANA LUA")
  - Tags horizontais com separador "·"
  - 3 botões de ação com ícones (Minha lista, Meus links, Saiba mais)
- **Thumbnails com estilo Netflix**:
  - Badge "N" vermelho no canto superior esquerdo de cada capa
  - Título bold sobre a imagem com gradiente
  - Badge opcional ("NOVOS EPISÓDIOS") em vermelho
  - Cor de fundo configurável por thumbnail
  - **Carrossel automático**: animação CSS `@keyframes` scroll infinito da direita para esquerda usando `translateX`, sem dependência de JS para performance. Duplica os items para loop seamless
- **Barra fixa no rodapé**:
  - `position: fixed; bottom: 0` com `backdrop-blur`
  - 5 ícones com labels pequenos, links configuráveis
  - Ícones de Lucide React dinâmicos
  - Badge de notificação no ícone central (estilo "20" do print)
- **`padding-bottom`** no conteúdo para não ficar atrás da barra fixa

#### 2. `src/components/display/TemplateMediaEditor.tsx` (expandir)

Adicionar novas abas/seções no editor:

- **Aba "Textos"**: campos para `headline`, `subheadline`, `heroSubtitle`, `tags` (input com chips)
- **Aba "Botões do Hero"**: editor para os 3 botões de ação (label, ícone, URL/ação)
- **Aba "Capas"** (expandir): campo de cor de fundo por thumbnail, campo de badge text
- **Aba "Barra Inferior"**: editor para até 5 ícones fixos com seletor de ícone (dropdown com ícones Lucide), label e URL
  - Presets rápidos: WhatsApp, Instagram, Google Reviews, Telefone, Site

#### 3. `src/pages/customer/DisplayTemplateManager.tsx`
- Sem mudanças estruturais, apenas se beneficia das novas props passadas ao `NetflixTemplate` no preview

---

### Detalhes técnicos

**Carrossel automático (CSS-only):**
```css
@keyframes netflix-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```
- Duplicar os items no DOM para loop seamless
- `animation: netflix-scroll 30s linear infinite`
- `pause` on hover via `animation-play-state`

**Fonte Bebas Neue:**
- Injetar `<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap">` via `useEffect` no componente
- Aplicar `fontFamily: "'Bebas Neue', sans-serif"` na headline

**Text shadow na headline:**
```css
text-shadow: 0 2px 20px rgba(0,0,0,0.7), 0 0 40px rgba(0,0,0,0.3);
```

**Bottom nav com ícones dinâmicos:**
- Usar o pattern de dynamic icon do Lucide: `icons[iconName]`
- Renderizar com fallback para `Home` se ícone não existir

**Thumbnails Netflix-style:**
- Aspect ratio 2:3 (retrato)
- Badge "N" vermelho posicionado `absolute top-1 left-1`
- Gradiente `from-transparent to-black/80` na metade inferior
- Título em Bebas Neue ou bold
- Badge de texto opcional (ex: "NOVOS EPISÓDIOS") em faixa vermelha

