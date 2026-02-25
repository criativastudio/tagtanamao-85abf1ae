

## Corrigir transições automáticas de status dos pedidos

### Problema identificado

1. **Bug crítico em `finalize-display-art`**: Na linha 181, `svgBody` é referenciado **antes** de ser definido (a definição está na linha 222). Isso causa um erro de runtime que impede a função de funcionar — ou seja, a arte nunca é finalizada e o pedido nunca avança para `art_finalized` / `processing`.

2. **`melhor-envio` generate-label**: Atualmente define o status como `ready_to_ship`. O usuário quer que, ao anexar no Correios, o status vá direto para `shipped` (Enviado).

3. **Tracking/entrega**: Já funciona — o action `tracking` no melhor-envio já atualiza para `delivered` quando o Correios reporta entrega.

### Mudanças

#### 1. `supabase/functions/finalize-display-art/index.ts` — Corrigir bug de svgBody

- Remover o bloco duplicado das linhas 177-191 que referencia `svgBody` e `svgWidth`/`svgHeight` antes de serem declaradas
- Manter a lógica correta que já existe nas linhas 193-232 (viewBox adjustment + svgBody definition)
- O fluxo de status `art_finalized → processing` já está implementado nas linhas 326-332 e funcionará assim que o bug for corrigido

#### 2. `supabase/functions/melhor-envio/index.ts` — generate-label → shipped

- Alterar o status de `ready_to_ship` para `shipped` na ação `generate-label` (linha ~290)
- Isso reflete que, ao gerar a etiqueta e anexar ao Correios, o pedido é considerado "Enviado"

### Arquivos modificados
- `supabase/functions/finalize-display-art/index.ts` — remover bloco duplicado (linhas 177-191) que causa crash
- `supabase/functions/melhor-envio/index.ts` — alterar status de `ready_to_ship` para `shipped` no generate-label

### Detalhes técnicos

O bloco problemático em `finalize-display-art`:
```text
Linha 172: let baseSvg = ...       (OK - definido)
Linha 181: svgBody = svgBody.replace(...)  ← ERRO: svgBody não existe ainda
Linha 190: svgWidth = finalWidth           ← ERRO: svgWidth não existe ainda
Linha 222: let svgBody = baseSvg.substring(...)  ← aqui é onde svgBody deveria começar
```

A correção remove as linhas 177-191 (bloco duplicado/fora de ordem) e integra a lógica de forçar proporção 2:3 no local correto, após `svgBody` ser definido na linha 222.

