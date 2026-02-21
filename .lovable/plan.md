

# Melhorar exibicao de todos os tipos de produto nos pedidos

## Situacao atual

O codigo ja exibe corretamente nome, tipo e quantidade para todos os produtos (pet_tag, business_display, etc). O motivo de so aparecer "Display Empresarial" e que a maioria dos pedidos no banco so contem esse produto. Pedidos que incluem Pet Tag (como #7e128a38 e #af23bc5b) ja mostram corretamente os dois tipos.

Porem, existem melhorias a fazer:

1. **Itens sem produto vinculado** (`product_id: null`) aparecem como "Produto" sem tipo -- precisa de tratamento melhor
2. **Futuros tipos de produto** (nfc_card, nfc_tag) nao tem labels nem cores definidas
3. **Fallback generico** para tipos desconhecidos pode ser mais claro

## Alteracoes propostas

### 1. Expandir mapeamentos de tipos

Adicionar labels e cores para todos os tipos de produto suportados no sistema (incluindo futuros):

```typescript
const productTypeLabels: Record<string, string> = {
  pet_tag: "Pet Tag",
  business_display: "Display Empresarial",
  nfc_card: "Cartao NFC",
  nfc_tag: "Tag NFC",
};

const productTypeColors: Record<string, string> = {
  pet_tag: "bg-green-500/20 text-green-400 border-green-500/30",
  business_display: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  nfc_card: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  nfc_tag: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};
```

### 2. Melhorar fallback para itens sem produto

Para order_items com `product_id: null` (existem 3 no banco), mostrar "Produto removido" em vez de "Produto", com badge cinza "Indisponivel".

### 3. Nenhuma alteracao de logica de dados

A query de `fetchOrders` ja busca os itens com produto corretamente. Nao ha bug no codigo -- apenas refinamento visual.

## Arquivo afetado

1. `src/pages/admin/OrdersManager.tsx` -- atualizar mapeamentos `productTypeLabels` e `productTypeColors`, melhorar fallback para itens sem produto

