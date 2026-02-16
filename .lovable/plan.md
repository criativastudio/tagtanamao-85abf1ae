

# Gerar QR Code real e codigo de ativacao na arte do display

## Resumo
Ao finalizar a arte, o sistema vai gerar um QR Code real (imagem) na posicao correta do template, junto com um codigo unico de ativacao de 6 digitos no rodape. O display sera criado como "aguardando ativacao" para que o usuario ative na dashboard usando esse codigo. O admin recebe a arte completa pronta para producao.

## O que muda para o usuario

- A arte finalizada tera um QR Code visual real (nao mais texto placeholder)
- Um codigo numerico de 6 digitos aparecera no rodape da arte (igual ao padrao das pet tags)
- O display aparecera na lista do admin como "aguardando ativacao"
- O usuario ativa o display na dashboard usando o codigo de 6 digitos impresso na arte
- Apos ativacao, o QR Code direciona para a pagina publica do display

## Alteracoes tecnicas

### 1. Edge Function `finalize-display-art/index.ts`

**Importar biblioteca QR Code:**
```typescript
import QRCode from "npm:qrcode@1.5.4";
```

**Gerar codigo numerico de 6 digitos** (em vez do formato DSP-XXXXXXXX) para alinhar com o sistema de ativacao existente. Verificar unicidade em `pet_tags` e `business_displays`.

**Gerar QR Code como Data URI PNG** usando `QRCode.toDataURL()` e embutir como `<image>` no SVG final na posicao `qrPos` do template.

**Adicionar codigo de ativacao como texto** logo abaixo do QR Code:
```xml
<text x="{centro}" y="{abaixo do QR}" text-anchor="middle"
      font-size="14" font-family="monospace" font-weight="bold"
      fill="#333">{codigo6digitos}</text>
```

**Criar `business_displays` com `is_activated: false`** (em vez de `true`), para que o display apareca no painel admin como "aguardando ativacao" e o usuario precise ativar manualmente.

**URL do QR Code:** `https://tagtanamao.lovable.app/display/{codigo6digitos}`

### 2. Preview no frontend (`DisplayArtCustomizer.tsx`)

Atualizar o placeholder do QR no `buildPreviewSvg` para mostrar texto mais claro:
- Manter retangulo tracejado indicando a posicao
- Texto "QR gerado ao finalizar" em vez de "QR Code"

### Fluxo completo

```text
1. Usuario finaliza arte no customizador
2. Edge function gera codigo numerico de 6 digitos unico
3. Gera imagem QR Code apontando para /display/{codigo}
4. Embute QR + codigo no SVG final na posicao do template
5. Cria registro em business_displays com is_activated=false
6. Admin ve display na lista como "aguardando ativacao"
7. Admin imprime a arte com QR + codigo visivel
8. Usuario recebe o produto e ativa com o codigo de 6 digitos
9. QR Code passa a funcionar redirecionando para a pagina publica
```

### Arquivos afetados
1. `supabase/functions/finalize-display-art/index.ts` — gerar QR real + codigo 6 digitos + is_activated=false
2. `src/pages/customer/DisplayArtCustomizer.tsx` — melhorar placeholder do QR no preview

