

## Simplificar fluxo de pagamento de templates: apenas pending → paid

### Problema atual
Os templates de display compartilham o mesmo fluxo de pedidos dos produtos físicos (displays, pet tags), passando por etapas como `awaiting_customization`, `processing`, `ready_to_ship`, etc. Isso não faz sentido para um produto digital — o template deve ser liberado imediatamente após o pagamento, com apenas 2 status: `pending` e `paid`.

### Mudanças necessárias

#### 1. Edge Functions — desacoplar templates do fluxo de displays

**`supabase/functions/asaas-payment/index.ts`** (webhook handler):
- Na função `getNextStatusAfterPayment`: quando o pedido for `template_purchase` (detectado via `order.notes`), retornar `"paid"` em vez de avançar para `awaiting_customization` ou `processing`
- Na lógica do webhook, após `fulfillTemplatePurchase`, manter o status como `"paid"` (não avançar mais)

**`supabase/functions/process-credit-card-payment/index.ts`**:
- Mesma lógica: detectar `template_purchase` no `notes` do pedido e retornar `"paid"` como status final, sem avançar para `awaiting_customization`

#### 2. Frontend — Checkout (`src/pages/customer/Checkout.tsx`)

- Após pagamento confirmado por cartão de crédito (template), manter o pedido como `"paid"` e redirecionar para o dashboard (não para `/dashboard/displays/templates?display=...`)
- Remover o vínculo obrigatório com `display_id` no checkout de template — o `display_id` passa a ser opcional (o usuário escolhe onde aplicar depois)
- Atualizar `isTemplatePurchase` para funcionar sem `display_id` obrigatório: `!!templateId` em vez de `!!templateId && !!templateDisplayId`

#### 3. Frontend — Componentes de template

**`src/components/dashboard/DashboardTemplates.tsx`**:
- No `handleBuy`, não passar `display_id` como obrigatório; remover `order_bump` param (o desconto continua baseado em `hasDisplay`, mas o fluxo de compra é independente)

**`src/components/display/DisplayTemplateSelector.tsx`**:
- No `handlePurchase`, navegar para checkout apenas com `template_id` (sem `display_id` obrigatório)

#### 4. Frontend — MyOrders (`src/pages/customer/MyOrders.tsx`)
- Para pedidos de template (`shipping_method === "digital"`), mostrar apenas os status `pending` e `paid`, sem exibir etapas de produção/envio

### Arquivos modificados
- `supabase/functions/asaas-payment/index.ts` — detectar template_purchase e manter status "paid"
- `supabase/functions/process-credit-card-payment/index.ts` — mesma lógica
- `src/pages/customer/Checkout.tsx` — desacoplar display_id, simplificar redirect
- `src/components/dashboard/DashboardTemplates.tsx` — remover display_id obrigatório do checkout
- `src/components/display/DisplayTemplateSelector.tsx` — ajustar navegação de compra
- `src/pages/customer/MyOrders.tsx` — renderização simplificada para pedidos digitais

### Sem migrações de banco
Nenhuma alteração de schema necessária. Os status `pending` e `paid` já existem.

