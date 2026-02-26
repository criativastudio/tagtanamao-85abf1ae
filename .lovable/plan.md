

## Por que o template Netflix não aparece no site publicado + correção do erro de build

### Diagnóstico

Existem **dois problemas** acontecendo:

#### 1. Erro de build bloqueando o deploy
O erro atual `ERR_TYPES_NOT_FOUND` na função `finalize-display-art/index.ts` está impedindo o build. O import `import QRCode from "npm:qrcode@1.5.4"` usa um pacote npm sem tipos TypeScript disponíveis no Deno, e o comentário `// @ts-ignore` não é suficiente para o type-checker do Deno.

**Correção**: Usar `// @deno-types` ou uma declaração inline para suprimir o erro, ou simplesmente usar um cast com tipo `any`:
```typescript
// @ts-ignore
import QRCode from "npm:qrcode@1.5.4";
```
Trocar para:
```typescript
import QRCode from "npm:qrcode@1.5.4";
const _QRCode = QRCode as any;
```
Ou adicionar um `/// <reference types="..." />` adequado — a forma mais simples é usar a diretiva Deno `// @ts-nocheck` no topo do arquivo, já que é uma edge function sem benefício real do type-checking estrito.

#### 2. Lógica de renderização do template (funciona corretamente)
O código em `PublicDisplayPage.tsx` (linha 318) já verifica `display.active_template_id && display.template_config` e renderiza o `NetflixTemplate`. A lógica está correta e os dados no banco confirmam que existem displays com template ativo (ex: `DSP-B844AB53`, `512659`).

O template **não aparece no site publicado** porque o **erro de build impede a publicação de novas versões**. Assim que o erro for corrigido e o build passar, o template aparecerá normalmente.

### Mudança necessária

**Arquivo**: `supabase/functions/finalize-display-art/index.ts`
- Linha 2-3: Substituir o import problemático por uma abordagem que o Deno aceite sem erro de tipos. A solução mais robusta é adicionar `// @ts-nocheck` na primeira linha ou usar a sintaxe `// deno-lint-ignore` com importação dinâmica.

### Resumo
- O template Netflix já está configurado corretamente no código e no banco de dados
- O único bloqueio é o erro de tipo do `qrcode` que impede o build/deploy
- Corrigindo esse import, o build passa e o site publicado mostrará o template

