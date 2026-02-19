# Garantir Avanço de Status Somente com Todas as Artes Salvas

## Problema central identificado

### 1. Edge function `finalize-display-art` avança imediatamente

Na linha 213-216, ao finalizar **qualquer** arte, o status do pedido é imediatamente alterado para `processing` — mesmo que existam outros displays no mesmo pedido aguardando personalização:

```typescript
// Atual (ERRADO para pedidos com múltiplos displays):
await supabase.from("orders").update({ status: "processing" }).eq("id", displayArt.order_id);
```

### 2. Admin baixa apenas uma arte por pedido

`handleDownloadDisplayArt` em `OrdersManager.tsx` usa `.maybeSingle()` e baixa somente o primeiro SVG finalizado. Se o pedido tem 2 displays, o admin só vê 1.

### 3. Após finalizar, o editor redireciona errado

`DisplayArtCustomizer.tsx` (linha 410) manda o usuário para `/meus-pedidos` após finalizar, em vez de voltar ao `DisplaysOrderManager` do pedido, impedindo o fluxo de personalizar o próximo display pendente.

---

## Regra de negócio correta


| Situação                                           | Status deve mudar para                |
| -------------------------------------------------- | ------------------------------------- |
| Arte salva, mas ainda há artes pendentes no pedido | Permanece em `awaiting_customization` |
| Última arte do pedido salva (todas finalizadas)    | `art_finalized` → depois `processing` |


---

## Arquivos a modificar

"Posicione o código único de 6 dígitos do QR do display empresarial no lugar do código em negrito com '#', na cor branca. Mantenha o código do rodapé (# + 8 caracteres) apenas no canto inferior direito e na cor branca."

### 1. EDGE FUNCTION: `supabase/functions/finalize-display-art/index.ts`

Substituir a lógica de avanço de status por uma verificação completa:

```typescript
// Após travar a arte atual, verificar se TODAS as artes do pedido estão finalizadas
const { data: allArts } = await supabase
  .from("display_arts")
  .select("id, locked, order_item_id")
  .eq("order_id", displayArt.order_id);

// Buscar total de displays esperados (somando quantity de cada order_item)
const { data: displayOrderItems } = await supabase
  .from("order_items")
  .select("id, quantity, product:products(type)")
  .eq("order_id", displayArt.order_id);

const totalExpected = (displayOrderItems || [])
  .filter((item: any) => item.product?.type === "business_display")
  .reduce((sum: number, item: any) => sum + item.quantity, 0);

const totalLocked = (allArts || []).filter((a: any) => a.locked).length;
// +1 porque a arte atual foi travada no passo anterior (updated in DB)

const allDone = totalLocked >= totalExpected;

if (allDone) {
  // Avançar: art_finalized → processing
  await supabase.from("orders").update({ status: "art_finalized" }).eq("id", displayArt.order_id);
  // Pequeno delay visual ou segunda update
  await supabase.from("orders").update({ status: "processing" }).eq("id", displayArt.order_id);
} 
// Se não allDone: não atualizar status, manter em awaiting_customization
```

A resposta JSON também retorna `allArtsFinalized: boolean` para o frontend poder redirecionar adequadamente.

### 2. PÁGINA: `src/pages/customer/DisplayArtCustomizer.tsx`

**A) Passar `order_id` do display art para o botão de voltar**

O `displayArt` já tem `order_id`. Alterar o botão "Voltar" e o botão pós-finalização para:

```tsx
// Botão de voltar no header (linha 374):
onClick={() => navigate(`/personalizar-display?order_id=${displayArt?.order_id}`)}

// Botão após finalização bem-sucedida (linha 410):
<Button onClick={() => navigate(`/personalizar-display?order_id=${displayArt?.order_id}`)}>
  Voltar à Lista de Displays
</Button>
```

**B) Após finalizar com sucesso**, verificar a resposta da edge function:

- Se `data.allArtsFinalized === true` → mostrar mensagem "Todas as artes finalizadas! Pedido em produção." e redirecionar para `/meus-pedidos`
- Se `data.allArtsFinalized === false` → mostrar "Arte salva! Agora personalize o próximo display." e redirecionar para `/personalizar-display?order_id=...`

### 3. PÁGINA ADMIN: `src/pages/admin/OrdersManager.tsx`

`**handleDownloadDisplayArt**` — atualmente busca `.maybeSingle()`. Alterar para buscar **todas** as artes finalizadas do pedido e:

- Se houver apenas 1 → baixar diretamente como antes
- Se houver 2 ou mais → gerar um ZIP com todos os SVGs, ou abrir um dialog de seleção

Solução mais simples e imediata: baixar todas as artes em sequência (um arquivo por arte), numerando como `arte-display-{orderId}-1.svg`, `arte-display-{orderId}-2.svg`, etc.

```typescript
const handleDownloadDisplayArt = async (order: OrderWithItems) => {
  setDownloadingArt(order.id);
  try {
    const { data: displayArts, error } = await supabase
      .from("display_arts")
      .select("id, final_svg, company_name")
      .eq("order_id", order.id)
      .eq("locked", true);  // busca TODAS

    if (error || !displayArts?.length) {
      toast({ title: "Arte não encontrada", variant: "destructive" });
      return;
    }

    // Baixar cada arte individualmente
    displayArts.forEach((art, index) => {
      if (!art.final_svg) return;
      const blob = new Blob([art.final_svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arte-display-${order.id.slice(0, 8)}-${index + 1}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    });

    toast({ title: `${displayArts.length} arte(s) baixada(s)!` });
  } catch (err: any) {
    toast({ title: "Erro ao baixar arte", variant: "destructive" });
  } finally {
    setDownloadingArt(null);
  }
};
```

### 4. PÁGINA: `src/pages/customer/DisplaysOrderManager.tsx`

Após uma arte ser finalizada via Realtime, **o próximo display pendente é destacado** visualmente com uma borda animada ou um indicador "próximo", guiando o usuário para clicar nele. Isso melhora o UX sem necessidade de redirecionamento automático.

Também: o botão de ação para artes não-iniciadas deve redirecionar diretamente para o editor sem criar duplicata (a lógica de criação já existe mas pode criar múltiplas se clicado rápido — adicionar proteção com debounce via `creatingArt` state, que já existe).

---

## Fluxo corrigido completo

```text
Pedido com 2 displays
│
├── Cliente clica "Personalizar Arte do Display"
│     └── → DisplaysOrderManager (mostra Display 1: Pendente, Display 2: Pendente)
│
├── Clica em "Personalizar" no Display 1
│     └── → DisplayArtCustomizer (editor)
│           ├── Salva arte → edge function
│           │     ├── Verifica: 1/2 finalizadas → NÃO avança status
│           │     └── Retorna { allArtsFinalized: false }
│           └── Toast: "Arte salva! Personalize o próximo display."
│                 └── Redireciona → DisplaysOrderManager
│                       (mostra Display 1: Finalizada ✓, Display 2: Pendente)
│
├── Clica em "Personalizar" no Display 2
│     └── → DisplayArtCustomizer (editor)
│           ├── Salva arte → edge function
│           │     ├── Verifica: 2/2 finalizadas → AVANÇA status para processing
│           │     └── Retorna { allArtsFinalized: true }
│           └── Toast: "Todas as artes finalizadas! Pedido em produção."
│                 └── Redireciona → /meus-pedidos
│                       (stepper mostra "Em Produção" ✓)
│
└── Admin em OrdersManager
      └── Clica "Download Arte" → baixa 2 arquivos SVG numerados
```

---

## O que NÃO muda

- Lógica de criação de `display_arts` no `DisplaysOrderManager`
- Geração do QR Code e composição do SVG na edge function
- Criação do registro `business_displays` na edge function
- `OrderProductionStepper` e seus fluxos
- RLS policies
- Fetch de pedidos no `MyOrders`
- Lógica de pagamento e demais edge functions

---

## Arquivos afetados

1. `supabase/functions/finalize-display-art/index.ts` — verificar se todas as artes estão finalizadas antes de avançar status
2. `src/pages/customer/DisplayArtCustomizer.tsx` — corrigir redirecionamento do botão voltar e pós-finalização
3. `src/pages/admin/OrdersManager.tsx` — baixar todas as artes finalizadas do pedido (não apenas a primeira)
4. `src/pages/customer/DisplaysOrderManager.tsx` — destaque visual do próximo display pendente