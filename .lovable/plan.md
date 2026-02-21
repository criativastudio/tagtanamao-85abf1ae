

# Exibir Tipo de Produto e Quantidade na Gestao de Pedidos

## Problema atual

1. **Na listagem de pedidos (tabela)**: nao mostra quais produtos foram comprados nem a quantidade. O admin precisa clicar no icone de "olho" para ver os itens.
2. **No detalhamento do pedido (dialog)**: mostra nome do produto e quantidade, mas nao mostra o **tipo** do produto (ex: "pet_tag", "business_display").

## Solucao

### 1. Buscar itens junto com os pedidos na listagem

Alterar `fetchOrders` para incluir `order_items` com `product` na query principal:

```typescript
const { data, error } = await supabase
  .from("orders")
  .select(`
    *,
    profile:profiles(email, full_name, phone),
    items:order_items(id, quantity, unit_price, product:products(name, type))
  `)
  .order("created_at", { ascending: false });
```

Isso elimina a necessidade de buscar itens separadamente ao clicar no olho (a funcao `fetchOrderItems` continua para garantir dados completos no dialog).

### 2. Adicionar coluna "Produtos" na tabela de listagem

Nova coluna entre "Cliente" e "Total" mostrando resumo dos itens. Cada item aparece como uma linha com:
- Nome do produto
- Tipo (badge colorido: "Pet Tag" em verde, "Display" em azul)
- Quantidade (ex: "x2")

Exemplo visual na celula:

```
Tag Pet Inteligente (Pet Tag) x1
Display Acrilico (Display) x2
```

### 3. Adicionar coluna "Tipo" na tabela de itens do dialog

Na tabela de itens dentro do dialog de detalhes, adicionar coluna "Tipo" com badge colorido mostrando o tipo do produto traduzido:
- `pet_tag` -> badge verde "Pet Tag"
- `business_display` -> badge azul "Display Empresarial"
- outros -> badge cinza com o valor original

## Arquivos afetados

1. `src/pages/admin/OrdersManager.tsx` -- unico arquivo a editar

## Detalhes tecnicos

**Alteracoes em `fetchOrders`:**
- Expandir a query SELECT para incluir `items:order_items(id, quantity, unit_price, product:products(name, type))`
- O tipo `OrderWithItems` ja suporta `items?: OrderItem[]`

**Nova coluna na tabela principal (entre Cliente e Total):**
- TableHead: "Produtos"
- TableCell: mapeia `order.items` e mostra cada produto com nome, tipo (badge) e quantidade
- Colspan do loading/empty row passa de 7 para 8

**Coluna extra no dialog de detalhes:**
- Adicionar TableHead "Tipo" apos "Produto"
- Adicionar TableCell com badge colorido baseado em `item.product?.type`

**Helper de traducao de tipo:**
```typescript
const productTypeLabels: Record<string, string> = {
  pet_tag: "Pet Tag",
  business_display: "Display Empresarial",
};

const productTypeColors: Record<string, string> = {
  pet_tag: "bg-green-500/20 text-green-400 border-green-500/30",
  business_display: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};
```

