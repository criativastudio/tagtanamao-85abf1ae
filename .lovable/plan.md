
# Cores de Fundo Alternadas nos Cards de Pedidos

## Alteracao

Adicionar um fundo levemente diferente nos cards de indice impar para criar separacao visual entre pedidos consecutivos.

Na linha 623-624 do `OrdersManager.tsx`, usar o indice do `.map()` para alternar classes de fundo:

```typescript
{filteredOrders.map((order, index) => (
  <div
    key={order.id}
    className={`glass-card rounded-xl p-4 space-y-3 ${
      index % 2 === 1 ? "bg-muted/30" : ""
    }`}
  >
```

- Cards pares: fundo padrao (glass-card)
- Cards impares: fundo com `bg-muted/30` (tom sutil da paleta existente)

## Arquivo afetado

`src/pages/admin/OrdersManager.tsx` -- unica alteracao nas linhas 623-624
