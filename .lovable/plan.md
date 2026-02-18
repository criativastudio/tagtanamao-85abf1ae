
## Ajuste do Stepper por Tipo de Produto

### Problema identificado

O `OrderProductionStepper` atualmente recebe apenas `status: string` e renderiza sempre o fluxo completo de 8 etapas — incluindo `awaiting_customization` e `art_finalized`, que só fazem sentido para pedidos de **Display**. Para pedidos de **Pet Tag**, essas 2 etapas não existem, então o stepper mostra etapas irrelevantes e o progresso aparece errado.

### Lógica de negócio

| Tipo do pedido | Fluxo exibido |
|---|---|
| Pet Tag (somente) | 6 etapas: sem `awaiting_customization` e `art_finalized` |
| Display (ou mix com Display) | 8 etapas completas |
| Outros produtos futuros | Fluxo padrão (6 etapas, sem personalização) |

Para determinar o tipo, basta inspecionar `order.items[].product.type`:
- Se **qualquer** item for `business_display` → fluxo completo (8 etapas)
- Caso contrário → fluxo padrão (6 etapas)

### Arquivos a modificar

**1. `src/components/order/OrderProductionStepper.tsx`** — Refatoração principal

- Remover o `productionFlow` e `steps` fixos do módulo
- Criar e exportar uma função utilitária pura: `getProductionFlow(hasDisplay: boolean)`
- A função retorna um objeto com `{ flow: string[], steps: StepDef[] }` — onde `StepDef` é a definição de cada etapa (status, label, descrição, ícone)
- Adicionar prop `hasDisplay: boolean` ao componente (além de `status`)
- Internamente, derivar `flow` e `steps` chamando `getProductionFlow(hasDisplay)`
- O cálculo de `currentIndex` passa a usar o `flow` retornado pela função

**Função utilitária (estrutura):**
```typescript
// Exportada para uso em MyOrders e futuros componentes
export function getProductionFlow(hasDisplay: boolean) {
  const allSteps = [ /* 8 etapas com definições */ ];
  const CUSTOMIZATION_STATUSES = ["awaiting_customization", "art_finalized"];
  
  const steps = hasDisplay 
    ? allSteps 
    : allSteps.filter(s => !CUSTOMIZATION_STATUSES.includes(s.status));
  
  return {
    flow: steps.map(s => s.status),
    steps,
  };
}
```

**Props do componente atualizadas:**
```typescript
interface OrderProductionStepperProps {
  status: string;
  hasDisplay: boolean; // novo
}
```

---

**2. `src/pages/customer/MyOrders.tsx`** — Integração da nova prop

Dentro do `orders.map(...)`, antes de renderizar o `OrderProductionStepper`, calcular se o pedido contém algum item do tipo `business_display`:

```typescript
const hasDisplay = order.items?.some(
  (item: any) => item.product?.type === "business_display"
) ?? false;
```

Passar `hasDisplay` para o stepper:
```tsx
{normalizedStatus !== "cancelled" && (
  <OrderProductionStepper status={normalizedStatus} hasDisplay={hasDisplay} />
)}
```

**Nenhuma outra parte de `MyOrders.tsx` é alterada** — fetch, tipagens, badges, seção de itens, entrega e ações permanecem intocados.

---

### Escalabilidade futura

A função `getProductionFlow` pode ser expandida facilmente:

```typescript
// Futuros produtos com fluxo próprio:
export function getProductionFlow(hasDisplay: boolean, hasNFC?: boolean) {
  // lógica adicional aqui
}
```

Como é uma função pura exportada, pode ser reutilizada em:
- Componentes de notificação de status
- Emails transacionais
- Painel admin para visualizar progresso do pedido

---

### Resumo visual dos fluxos

**Fluxo Pet Tag (6 etapas):**
```text
pending → paid → processing → ready_to_ship → shipped → delivered
```

**Fluxo Display (8 etapas):**
```text
pending → paid → awaiting_customization → art_finalized → processing → ready_to_ship → shipped → delivered
```

### Arquivos afetados
1. `src/components/order/OrderProductionStepper.tsx` — refatoração + nova prop `hasDisplay` + função `getProductionFlow` exportada
2. `src/pages/customer/MyOrders.tsx` — calcular `hasDisplay` e passar para o stepper
