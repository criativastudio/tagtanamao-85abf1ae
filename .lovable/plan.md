
## Problema identificado

Dois problemas distintos precisam ser resolvidos:

### 1. Build Error na Edge Function
O erro:
```
Failed resolving types for 'npm:qrcode@1.5.4'
```
Ocorre porque o Deno não encontra definições de tipos para a biblioteca `qrcode`. A solução é adicionar uma diretiva de tipo explícita no import usando `@deno-types` ou ignorar a verificação de tipos com `// @ts-ignore` acima do import.

### 2. Botão de personalização ausente no status `awaiting_customization`
A lógica atual do botão (linhas 254–268 em `MyOrders.tsx`) depende de `item.display_arts?.filter((a) => !a.locked)` — ou seja, só exibe o botão se já existir um registro em `display_arts` associado ao `order_item` com `locked: false`.

O problema é que quando o status é `awaiting_customization`, pode não existir ainda um `display_art` no banco (arte ainda não iniciada), então o botão nunca aparece nessa condição.

A solução é adicionar um botão adicional diretamente na condição de status do pedido, verificando:
- `order.status === 'awaiting_customization'` **E**
- não há `display_arts` com `locked: false` (para evitar duplicação com o botão existente)

Esse botão deve navegar para a página de personalização passando o `order_id` como parâmetro.

---

## Alterações técnicas

### Arquivo 1: `supabase/functions/finalize-display-art/index.ts`
Adicionar diretiva de tipo antes do import do qrcode para resolver o erro de build:
```typescript
// @ts-ignore - no type definitions available for qrcode npm module in Deno
import QRCode from "npm:qrcode@1.5.4";
```

### Arquivo 2: `src/pages/customer/MyOrders.tsx`
Na seção `{/* Actions */}`, adicionar botão condicional para status `awaiting_customization`:

**Lógica:**
```typescript
// Verifica se há arte aberta já existente (evita duplicar botão)
const hasOpenArt = order.items?.some((item: any) =>
  item.display_arts?.some((a: any) => !a.locked)
);

// Botão aparece quando:
// 1. Status é awaiting_customization E não há arte aberta (arte ainda não iniciada)
// 2. OU o status indica que o pedido é de display e precisa de personalização
{normalizedStatus === "awaiting_customization" && !hasOpenArt && (
  <Button
    size="sm"
    variant="outline"
    className="border-primary/50 text-primary hover:bg-primary/10"
    onClick={() => navigate(`/personalizar-display?order_id=${order.id}`)}
  >
    <Paintbrush className="w-4 h-4 mr-2" />
    Personalizar Arte do Display
  </Button>
)}
```

**Nota:** A navegação usa `order_id` como query param para que a página de personalização saiba qual pedido está sendo personalizado. Se a rota `/personalizar-display` já aceita apenas um `art_id`, a lógica de redirecionamento precisará ser ajustada na página `DisplayArtCustomizer.tsx` para buscar a arte pelo `order_id` quando nenhum `art_id` for passado.

---

## Verificação da rota de personalização

Preciso confirmar como a página `DisplayArtCustomizer.tsx` recebe o parâmetro para garantir que a navegação funcione corretamente. Se ela já busca por `order_id`, perfeito. Caso contrário, a navegação deve apontar para a arte existente usando o ID da `display_art`.

**Abordagem segura:** Como o `display_art` pode ou não existir para um pedido `awaiting_customization`, o botão deve:
- Navegar para `/personalizar-display/${art.id}` se já existir uma arte (comportamento atual do botão existente)
- Navegar para `/personalizar-display?order_id=${order.id}` se não existir arte ainda

### Arquivos afetados
1. `supabase/functions/finalize-display-art/index.ts` — corrige o build error com `@ts-ignore`
2. `src/pages/customer/MyOrders.tsx` — adiciona botão de personalização para status `awaiting_customization`
