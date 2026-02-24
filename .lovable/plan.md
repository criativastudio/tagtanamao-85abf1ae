

## Suporte a Instagram Reels nas Capas do Template Netflix

### Problema
Atualmente, as capas do carrossel só aceitam upload de arquivos (fotos/vídeos). O usuário quer colar um link de Instagram Reels e ter o vídeo reproduzido diretamente como capa, sem upload.

### Abordagem
Instagram não permite embed direto de vídeo via URL simples — é necessário usar um `<iframe>` com o embed oficial (`https://www.instagram.com/reel/{ID}/embed/`). Vamos adicionar um novo `type: "instagram"` ao `MediaItem` e um campo de input no editor para colar links de Reels.

### Mudanças

#### 1. Interfaces — adicionar tipo `"instagram"` ao `MediaItem`
Em ambos os arquivos (`NetflixTemplate.tsx` e `TemplateMediaEditor.tsx`), expandir:
```typescript
type?: "image" | "video" | "instagram";
```

#### 2. `TemplateMediaEditor.tsx` — botão "Adicionar Reels do Instagram"
Na aba **Capas**, adicionar abaixo do botão de upload:
- Um campo de input com placeholder `https://www.instagram.com/reel/ABC123/`
- Botão "Adicionar Reel"
- Ao clicar, extrair o ID do Reel via regex (`/reel\/([a-zA-Z0-9_-]+)/`) e criar um `MediaItem` com:
  - `url`: a URL completa do Reel
  - `type: "instagram"`
  - `title: ""`
- Adicionar ao array `config.covers`
- No `renderMediaGrid`, quando `item.type === "instagram"`, renderizar um preview com ícone do Instagram em vez de `<img>` ou `<video>`

#### 3. `NetflixTemplate.tsx` — renderizar iframe de Instagram Reels
No carrossel de covers e no grid de thumbnails, adicionar condição:
```tsx
cover.type === "instagram" ? (
  <iframe
    src={`https://www.instagram.com/reel/${extractReelId(cover.url)}/embed/`}
    className="w-full aspect-[2/3] border-0"
    allowFullScreen
    scrolling="no"
  />
) : cover.type === "video" ? ...
```
- Criar helper `extractReelId(url)` que extrai o ID do Reel da URL
- O iframe do Instagram renderiza o vídeo embutido diretamente

#### 4. Mesmo suporte nos Thumbnails
Aplicar a mesma lógica de renderização condicional no grid de thumbnails para que Reels também funcionem ali.

### Arquivos modificados
- **`src/components/display/NetflixTemplate.tsx`**: novo tipo na interface, helper `extractReelId`, renderização condicional de `<iframe>` para Instagram Reels nas covers e thumbnails
- **`src/components/display/TemplateMediaEditor.tsx`**: novo tipo na interface, input para URL de Reels na aba Capas, preview com ícone Instagram no grid de mídia

### Sem migração de banco
O `template_config` é JSONB livre — basta salvar `type: "instagram"` nos items.

