# Stepper Vertical de Produção — OrderProductionStepper

## Resumo

Criar um novo componente `OrderProductionStepper.tsx` com um stepper vertical moderno usando framer-motion, e integrá-lo em `MyOrders.tsx` substituindo a renderização condicional do `DisplayOrderStepper` existente — sem tocar em nenhuma lógica de fetch, tipagem ou ações de pagamento/rastreio. Preciso que os status seja refletido do painel admin para o painel do usuario.

---

## O que o usuário verá

- Dentro de cada pedido expandido (accordion), o stepper aparece no topo do conteúdo
- Pedidos **cancelados** mostram um card vermelho no lugar do stepper
- Etapas concluídas: círculo preenchido com `primary` + ícone de check
- Etapa atual: círculo `primary` com anel pulsante (framer-motion) + label em negrito
- Etapas futuras: círculo `muted` com ícone da etapa
- Linha vertical conectando os círculos — colorida até a etapa atual, `muted` após

---

## Fluxo fixo de etapas


| Status                   | Ícone        | Label                |
| ------------------------ | ------------ | -------------------- |
| `pending`                | Clock        | Aguardando Pagamento |
| `paid`                   | CreditCard   | Pagamento Aprovado   |
| `awaiting_customization` | Paintbrush   | Personalizar Arte    |
| `art_finalized`          | CheckCircle  | Arte Finalizada      |
| `processing`             | Package      | Em Produção          |
| `ready_to_ship`          | PackageOpen  | Pronto para Envio    |
| `shipped`                | Truck        | Enviado              |
| `delivered`              | PackageCheck | Entregue             |


---

## Arquivos a criar/editar

### 1. CRIAR: `src/components/order/OrderProductionStepper.tsx`

**Props:** `{ status: string }`

**Lógica de índice:**

```typescript
const productionFlow = [
  "pending", "paid", "awaiting_customization",
  "art_finalized", "processing", "ready_to_ship",
  "shipped", "delivered"
];

const currentIndex = productionFlow.indexOf(status.toLowerCase());
// Se não encontrar (ex: "cancelled"), currentIndex === -1
```

**Caso cancelado:** retorna card vermelho com `XCircle` e texto "Pedido Cancelado" (mas na verdade a condição de cancelado é tratada no MyOrders — o componente recebe somente status não-cancelados).

**UI do stepper:**

```
[círculo]──────── Label principal (bold se atual)
    |              Descrição pequena (text-xs muted)
    |
[círculo]──────── ...
```

**Animação framer-motion na etapa atual:**

- O círculo da etapa atual terá um anel animado usando `motion.div` com `animate={{ scale: [1, 1.15, 1] }}` em loop suave (tipo "heartbeat")
- O label da etapa atual faz `initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}`

**Linha vertical:**

- `bg-primary` entre etapas concluídas
- `bg-muted` entre etapa atual e as futuras
- Não renderiza linha após a última etapa

---

### 2. EDITAR: `src/pages/customer/MyOrders.tsx`

Apenas duas mudanças dentro do `AccordionContent`, sem tocar em mais nada:

**A) Remover** a renderização condicional do `DisplayOrderStepper` (que só aparecia para display_arts):

```tsx
// REMOVER:
{order.display_arts && order.display_arts.length > 0 && order.status !== "cancelled" && (
  <DisplayOrderStepper order={order} />
)}
```

**B) Adicionar** o novo stepper para todos os pedidos não-cancelados:

```tsx
{normalizedStatus !== "cancelled" && (
  <OrderProductionStepper status={normalizedStatus} />
)}
```

**C) Adicionar** o card de cancelado quando aplicável:

```tsx
{normalizedStatus === "cancelled" && (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
    <XCircle className="w-5 h-5 shrink-0" />
    <div>
      <p className="font-semibold text-sm">Pedido Cancelado</p>
      <p className="text-xs text-muted-foreground">Este pedido foi cancelado.</p>
    </div>
  </div>
)}
```

O import do `DisplayOrderStepper` pode ser removido se não for mais usado.

---

## O que NÃO muda

- `fetchOrders` e toda lógica de dados
- Tipagens (`OrderWithItems`, `OrderItem`, etc.)
- `statusConfig` e os badges de status no header do card
- Seção de items (produtos)
- Seção de entrega/endereço
- Seção de actions (Pagar Agora, Rastrear, Personalizar Arte)
- Animações de entrada do `motion.div` dos cards

---

## Estrutura do componente final

```text
OrderProductionStepper
├── productionFlow (array de 8 status)
├── steps (array com label, descrição, ícone)  
├── currentIndex = productionFlow.indexOf(status)
└── Render
    ├── Para cada step:
    │   ├── motion.div [círculo] — concluído / atual / futuro
    │   ├── linha vertical (exceto último)
    │   └── label + descrição
    └── Framer-motion: etapa atual pulsa suavemente
```