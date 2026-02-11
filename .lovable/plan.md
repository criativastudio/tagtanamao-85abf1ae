

# Galeria de Fotos e Imagem Maior nos Produtos

## Resumo
Ampliar a area de imagem de capa do produto no admin e adicionar suporte para multiplas fotos (galeria) por produto. A imagem principal ficara maior no editor e na listagem, e o admin podera adicionar ate 5 fotos adicionais por produto.

## Alteracoes no Banco de Dados

### Migracao: Adicionar coluna `gallery_images` na tabela `products`
- Adicionar coluna `gallery_images text[] default '{}'` na tabela `products`
- Array de URLs de imagens adicionais do produto
- Nenhuma alteracao em RLS necessaria (politicas existentes ja cobrem a tabela)

## Alteracoes no Codigo

### 1. Tipo `Product` em `src/types/ecommerce.ts`
- Adicionar campo `gallery_images: string[] | null` ao interface `Product`

### 2. Admin `ProductsManager.tsx` - Editor de Produto
**Imagem de capa maior:**
- Aumentar preview da imagem principal de `h-32` para `h-48` no editor
- Aumentar exibicao no card de `h-40` para `h-56`

**Galeria de fotos adicionais:**
- Adicionar state `galleryImages: string[]` ao formulario
- Criar secao "Fotos Adicionais" abaixo da imagem principal com grid de thumbnails
- Botao de upload para adicionar fotos (maximo 5)
- Botao X para remover cada foto da galeria
- Salvar array no campo `gallery_images` ao salvar produto
- Carregar `gallery_images` ao editar produto existente

### 3. Landing Page `Products.tsx` - Lightbox com Galeria
- No lightbox existente, incluir as `gallery_images` do produto junto com a imagem principal
- Adicionar navegacao (setas esquerda/direita) para percorrer as fotos no lightbox
- Indicador de posicao (dots) abaixo da imagem

### 4. Loja `Shop.tsx` - Exibicao na Loja
- Se o produto tiver galeria, mostrar indicador de "mais fotos" no card
- Ao clicar na imagem, abrir lightbox com todas as fotos

## Detalhes Tecnicos

- Upload de galeria usa o mesmo bucket `bio-images` com path `product-images/gallery/{timestamp}-{nome}`
- O dialog do editor sera expandido para `max-w-2xl` para acomodar a galeria
- As gallery_images serao carregadas no `handleOpenEditor` e salvas no `handleSaveProduct`
- Lightbox com `framer-motion` AnimatePresence para transicoes suaves entre fotos
- Thumbnails no grid com `w-20 h-20 object-cover rounded-lg`

