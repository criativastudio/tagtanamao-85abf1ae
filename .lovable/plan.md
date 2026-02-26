

## Templates: fluxo independente com apenas pending/paid

### Situação atual

O sistema **já trata templates como digitais** em vários pontos:
- `Checkout.tsx` marca `shipping_method = "digital"` e `notes = { type: "template_purchase" }`
- `asaas-payment/index.ts` webhook já detecta `template_purchase` e retorna status `"paid"` (não avança para `awaiting_customization`)
- `MyOrders.tsx` já exibe card simplificado (Crown icon) para pedidos digitais, sem stepper de produção
- `Checkout.tsx` já insere em `user_templates` após pagamento aprovado (cartão e PIX)

### Problema identificado

No `Checkout.tsx` (linhas 508-525), após criar os order items do carrinho, o código verifica se há `business_display` e cria `display_arts` + muda status para `awaiting_customization`. Esse bloco **não se aplica a templates** porque templates usam o fluxo `isTemplatePurchase` que pula o carrinho. Portanto, **não há bug ativo** nesse trecho.

### O que realmente precisa ser reforçado

1. **Admin OrdersManager** — o select de status permite mudar pedidos digitais para statuses físicos (shipped, processing, etc). Precisa restringir para pedidos digitais.

2. **OrderProductionStepper** — se por alguma razão um pedido digital cair no stepper, deve mostrar apenas pending/paid.

3. **DisplaysOrderManager / Personalizar Arte** — garantir que pedidos de template não mostrem botão de personalização.

### Mudanças planejadas

| Arquivo | Mudança |
|---|---|
| `src/pages/customer/MyOrders.tsx` | Garantir que pedidos digitais nunca mostrem botão "Personalizar Arte do Display" e ocultar seção de shipping |
| `src/pages/customer/OrdersManager.tsx` | No admin, restringir opções de status para pedidos digitais (apenas pending/paid/cancelled) |
| `src/components/order/OrderProductionStepper.tsx` | Adicionar suporte a `isDigital` que mostra apenas 2 etapas: Aguardando Pagamento e Liberado |

### Sem alterações de banco necessárias

O fluxo já funciona corretamente no banco e nos webhooks. As mudanças são apenas de UI para reforçar a separação visual.

