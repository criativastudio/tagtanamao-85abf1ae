
# Correcao de Status e Agrupamento de Pedidos

## Problemas identificados

### 1. Status nao atualiza em tempo real
As paginas `MyOrders` (usuario) e `OrdersManager` (admin) fazem apenas uma busca inicial ao banco e nunca mais atualizam. Nao ha nenhuma subscription Realtime nem polling nessas paginas. Quando o pagamento e confirmado no backend, o status muda no banco mas as telas continuam mostrando o status antigo.

### 2. Multiplas compras na mesma sessao
Atualmente, cada compra redireciona para a pagina de "Obrigado" mostrando apenas 1 pedido. Se o usuario voltar e comprar novamente, nao ha agrupamento. O pedido anterior "desaparece" da visao.

## Solucao

### Parte 1: Realtime em MyOrders (usuario)
Adicionar subscription Realtime na tabela `orders` filtrada por `user_id` no componente `MyOrders.tsx`. Quando qualquer pedido do usuario for atualizado, a lista sera re-carregada automaticamente.

```text
MyOrders.tsx
  useEffect -> subscribe to orders table (filter user_id)
    on UPDATE -> fetchOrders() (reload all)
  return -> unsubscribe
```

### Parte 2: Realtime em OrdersManager (admin)
Adicionar subscription Realtime na tabela `orders` (sem filtro, admin ve tudo) no `OrdersManager.tsx`. Quando qualquer pedido mudar de status, a tabela atualiza automaticamente.

```text
OrdersManager.tsx
  useEffect -> subscribe to orders table (all)
    on UPDATE/INSERT -> fetchOrders() (reload all)
  return -> unsubscribe
```

### Parte 3: Modal de pedidos recentes na sessao
Criar um componente `RecentOrdersModal` que:
- Armazena IDs dos pedidos feitos na sessao atual (via state no Checkout ou sessionStorage)
- Ao finalizar uma compra, ao inves de redirecionar para `/obrigado`, mostra um modal resumido
- O modal lista todos os pedidos da sessao com seus status
- Cada pedido e expansivel (accordion) mostrando itens e status detalhado
- Os status atualizam em tempo real via subscription

### Parte 4: Labels de status conforme solicitado
Atualizar os labels de status para corresponder ao pedido:
- `paid` -> "Pedido Pago"
- `processing` -> "Em Producao"  
- `awaiting_customization` -> "Aguardando Personalizacao"
- `shipped` -> "Enviado"
- `delivered` -> "Entregue"
- `pending` -> "Aguardando Pagamento"

## Arquivos a criar/editar

1. **Editar** `src/pages/customer/MyOrders.tsx`
   - Adicionar subscription Realtime para `orders` filtrado por user_id
   - Atualizar labels de status

2. **Editar** `src/pages/admin/OrdersManager.tsx`
   - Adicionar subscription Realtime para `orders` (todos)

3. **Criar** `src/components/checkout/SessionOrdersModal.tsx`
   - Modal com lista expansivel de pedidos da sessao
   - Subscription Realtime por pedido para atualizar status dinamicamente
   - Accordion com detalhes de cada pedido (itens, valor, status)

4. **Editar** `src/pages/customer/Checkout.tsx`
   - Usar sessionStorage para acumular IDs de pedidos feitos na sessao
   - Ao confirmar pagamento, abrir o `SessionOrdersModal` ao inves de redirecionar
   - Manter opcao de ir para dashboard ou continuar comprando

## Detalhes tecnicos

### Realtime subscription (MyOrders)
```typescript
useEffect(() => {
  if (!user) return;
  const channel = supabase
    .channel('my-orders-realtime')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `user_id=eq.${user.id}`,
    }, () => fetchOrders())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [user]);
```

### SessionStorage para pedidos da sessao
```typescript
// Ao criar pedido com sucesso:
const sessionOrders = JSON.parse(sessionStorage.getItem('session_orders') || '[]');
sessionOrders.push(order.id);
sessionStorage.setItem('session_orders', JSON.stringify(sessionOrders));
```

### Modal com status dinamico
O modal busca todos os pedidos da sessao e escuta mudancas em tempo real. Cada pedido mostra:
- Numero do pedido
- Status com badge colorido
- Valor total
- Ao expandir: lista de itens comprados

```text
+------------------------------------------+
| Seus Pedidos desta Sessao          [X]   |
+------------------------------------------+
| Pedido #abc12345  [Pedido Pago]    R$89  |
|   > Tag Pet x1                           |
|   > Tag Pet x1                           |
|------------------------------------------|
| Pedido #def67890  [Aguardando]     R$149 |
|   > Display Empresarial x1              |
+------------------------------------------+
| [Continuar Comprando]  [Ir ao Dashboard] |
+------------------------------------------+
```
