

## Ajustes visuais no NetflixTemplate

### Mudanças planejadas

Todas as alterações são no arquivo `src/components/display/NetflixTemplate.tsx` e `src/components/display/TemplateMediaEditor.tsx`. Nenhuma migração de banco necessária.

---

### 1. Rodapé das thumbnails: mostrar apenas o título do usuário, não o nome do arquivo
- Atualmente, ao fazer upload, o `title` é preenchido com `file.name.replace(/\.[^.]+$/, "")` no `TemplateMediaEditor.tsx` (linha 124)
- Mudar para `title: ""` (vazio) por padrão — o usuário preenche manualmente
- No `NetflixTemplate.tsx`, exibir o título apenas se não estiver vazio (já funciona assim, mas o title sempre vem preenchido com nome do arquivo)

### 2. Rodapé das fotos maior com hover animado
- Nas capas (covers) e thumbnails, aumentar a área do gradiente inferior
- Adicionar animação CSS: overlay sobe de baixo ao hover (translate-y), sobrepondo parte da thumbnail
- Manter o título abaixo do badge "N"
- Shadow suave no hover

### 3. Sombra mais escura abaixo da headline principal
- Aumentar a intensidade do `text-shadow` na classe `.netflix-headline`
- Adicionar uma camada extra de sombra mais densa

### 4. Ícones "N" das thumbnails maiores
- Covers: aumentar de `text-lg` para `text-2xl` e ajustar container
- Thumbnails: aumentar de `text-sm` para `text-lg`

### 5. Capas aceitarem vídeos curtos além de fotos
- No `TemplateMediaEditor.tsx`, alterar o `accept` do upload de capas de `"image/*"` para `"image/*,video/*"`
- No `NetflixTemplate.tsx`, renderizar `<video>` quando `cover.type === "video"` no carrossel de covers

### 6. Texto e botões do hero na parte inferior (não no centro)
- Mover o container de conteúdo do hero de `bottom-[12%]` para `bottom-[4%]` para ficar mais embaixo
- Remover `text-center` e manter alinhamento à esquerda ou centralizado mas colado na parte inferior

---

### Arquivos modificados

**`src/components/display/NetflixTemplate.tsx`**
- Classe `.netflix-headline`: sombra mais intensa
- Hero content: reposicionar para `bottom-[4%]`
- Covers carousel: suporte a `<video>` quando `type === "video"`, ícone N maior
- Thumbnails grid: ícone N maior, overlay com animação hover slide-up
- CSS inline: adicionar keyframes para hover overlay

**`src/components/display/TemplateMediaEditor.tsx`**
- Linha 124: `title: ""` em vez de `file.name`
- Linha 338: accept de capas para `"image/*,video/*"`

