
# Corrigir SVG final: embutir imagens de fundo do template como base64

## Problema

Os templates SVG contêm elementos `<image href="https://...supabase.co/storage/...">` para a imagem de fundo. O código atual só converte a **logo** do usuário para base64, mas **não processa** as imagens já existentes no SVG do template. Resultado: ao baixar o SVG, o background não aparece (URL externa não funciona offline ou é removida pelo sanitizador).

## Solução

Antes de montar os elementos sobrepostos (logo, QR, textos), percorrer o SVG base e converter **todas** as tags `<image href="https://...">` existentes para data URIs base64. Isso inclui a imagem de fundo do template.

## Alteracao tecnica

### Arquivo: `supabase/functions/finalize-display-art/index.ts`

1. Criar funcao auxiliar `embedExternalImages(svgString)` que:
   - Usa regex para encontrar todos os `href="https://..."` dentro de tags `<image`
   - Para cada URL encontrada, faz fetch, converte para base64 e substitui no SVG
   - Retorna o SVG com todas as imagens embutidas

2. Chamar essa funcao no `baseSvg` **antes** de extrair o `closingTagIndex` e montar os elementos sobrepostos

### Logica da funcao

```
async function embedExternalImages(svg: string): string {
  // Encontrar todos href="https://..." em tags <image
  // Para cada match:
  //   fetch URL -> arrayBuffer -> base64
  //   substituir href="https://..." por href="data:image/...;base64,..."
  return svgComImagensEmbutidas
}
```

### Fluxo atualizado

```
Template SVG (com <image href="https://...background.png">)
    |
    v
embedExternalImages() -> converte TODAS as URLs externas para base64
    |
    v
Logo do usuario: ja convertida para base64 (codigo existente)
    |
    v
Monta elementos: logo, QR code, textos, codigos
    |
    v
SVG final 100% autossuficiente (sem URLs externas)
```

### Resultado esperado

O SVG final tera:
- Imagem de fundo do template embutida como base64
- Logo da empresa embutida como base64 (ja funciona)
- QR Code como data URI (ja funciona)
- Textos (nome empresa, codigo ativacao, numero pedido)
- Dimensoes fisicas 100mm x 150mm para impressao

Apenas 1 arquivo sera alterado: `supabase/functions/finalize-display-art/index.ts`
