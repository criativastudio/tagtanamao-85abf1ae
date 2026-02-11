

# Ajuste de Upload de Templates - Aceitar JPG e PNG

## Resumo
Modificar o upload de arte no Templates Manager para aceitar arquivos JPG e PNG alem de SVG. Quando o usuario enviar uma imagem (JPG/PNG), o arquivo sera enviado ao storage e a URL publica sera armazenada como `preview_url` e tambem no campo `svg_content` (como tag `<img>` embutida em SVG wrapper). Isso permite que templates baseados em imagem funcionem no fluxo existente.

## Alteracoes em `src/pages/admin/TemplatesManager.tsx`

### 1. Funcao `handleSVGUpload` (linhas 210-232)
Renomear para `handleArtUpload` e expandir a logica:
- Alterar o `accept` do input de `.svg` para `.svg,.jpg,.jpeg,.png,image/svg+xml,image/jpeg,image/png`
- Se o arquivo for SVG: manter comportamento atual (ler como texto, parsear campos editaveis)
- Se o arquivo for JPG/PNG:
  - Fazer upload para o bucket `bio-images` no path `template-arts/{timestamp}-{nome}`
  - Obter a URL publica
  - Gerar um SVG wrapper: `<svg xmlns="..." viewBox="0 0 800 800"><image href="{url}" width="800" height="800"/></svg>`
  - Salvar esse SVG wrapper no `svg_content` para compatibilidade
  - Tambem definir o `previewUrl` com a URL da imagem

### 2. Input de upload (linhas 506-517)
- Alterar `accept=".svg"` para `accept=".svg,.jpg,.jpeg,.png"`
- Alterar label de "Upload SVG" para "Upload Arte"

### 3. Validacao no `handleSaveTemplate` (linhas 136-144)
- Manter a validacao de `svg_content` obrigatorio (sera preenchido automaticamente para imagens)

### 4. Preview do arquivo carregado (linhas 532-545)
- Adicionar condicao: se o `svg_content` contem `<image href=`, mostrar como `<img>` ao inves de `dangerouslySetInnerHTML`
- Caso contrario, manter o comportamento SVG atual

## Detalhes Tecnicos

- O upload de JPG/PNG usara `supabase.storage.from('bio-images').upload()` seguindo o mesmo padrao ja usado no `handlePreviewUpload` (linha 296)
- O SVG wrapper gerado garante compatibilidade com o fluxo de renderizacao existente (ArtCustomizer e previews)
- Nenhuma migracao de banco necessaria - os campos `svg_content` e `preview_url` ja existem como `text`
- A compressao de imagem existente (`imageCompression.ts`) nao sera aplicada aqui pois templates de arte precisam manter qualidade maxima

