

## Desacoplar o fluxo de compra de templates do fluxo de produtos físicos

### Problema identificado

Existem **dois caminhos** para comprar um template, e apenas um funciona corretamente:

1. **Via URL param** (`/loja/checkout?template_id=X`) — funciona: pula endereço, seta `shipping_method: "digital"`, marca `notes` com `type: "template_purchase"`, e o webhook sabe que deve manter status em `"paid"` sem avançar para `awaiting_customization`.

2. **Via carrinho da loja** (Shop.tsx) — **quebrado**: o template é adicionado ao carrinho como produto comum (`type: "template"`), e o checkout exige endereço, frete, e não marca o pedido como digital. Após pagamento, o webhook chama `getNextStatusAfterPayment` que não encontra `template_purchase` no `notes` e avança o status para `processing` (ou `awaiting_customization` se tiver display no carrinho junto).

### Solução

#### 1. Shop.tsx — Redirecionar template direto para checkout dedicado

Quando o usuário clica "Adicionar" em um produto do tipo `template`, em vez de adicionar ao carrinho, redirecionar diretamente para `/loja/checkout?template_id={id}` (o fluxo dedicado que já existe e funciona).

| Arquivo | Mudança |
|---|---|
| `src/pages/customer/Shop.tsx` | No `addToCart`, se `product.type === "template"`, redirecionar para `/loja/checkout?template_id=${product.id}` em vez de adicionar ao carrinho. Mudar o label do botão para "Comprar" em vez de "Adicionar" para templates. |

#### 2. Products.tsx (Landing Page) — Mesma lógica

| Arquivo | Mudança |
|---|---|
| `src/components/Products.tsx` | No botão de ação de templates, redirecionar para `/loja/checkout?template_id=${product.id}` em vez de adicionar ao carrinho. |

#### 3. Checkout.tsx — Garantir fulfillment após PIX/Boleto

O `handlePaymentConfirmed` (chamado quando PIX é confirmado) já faz o fulfill. Porém, o redirect vai para `/dashboard/displays/templates?display=${templatePurchase.displayId}` — que depende do display. Corrigir para redirecionar para `/dashboard` quando não há `displayId`.

| Arquivo | Mudança |
|---|---|
| `src/pages/customer/Checkout.tsx` | Na função `handlePaymentConfirmed`, se `templatePurchase.displayId` estiver vazio, redirecionar para `/dashboard` em vez de `/dashboard/displays/templates`. Também na aprovação por cartão (linha 582), mesma correção. |

#### 4. Checkout.tsx — Detectar templates no carrinho misto (segurança)

Como proteção adicional, no `handleCreateOrder`, quando o carrinho contém itens com `type === "template"`, marcar o pedido com `notes` contendo `template_purchase` e `shipping_method: "digital"` — para que o webhook os reconheça.

Porém, isso conflita com pedidos mistos (template + produto físico). A solução mais limpa é **impedir que templates entrem no carrinho** (item 1), eliminando esse cenário.

### Resumo das mudanças

| Arquivo | Ação |
|---|---|
| `src/pages/customer/Shop.tsx` | Templates: botão "Comprar" redireciona para checkout dedicado em vez de adicionar ao carrinho |
| `src/components/Products.tsx` | Templates: botão redireciona para checkout dedicado |
| `src/pages/customer/Checkout.tsx` | Corrigir redirect pós-pagamento para templates sem `displayId` (ir para `/dashboard` ou `/dashboard/produtos`) |

### Nenhuma alteração de banco necessária

O fluxo backend (edge function `asaas-payment`) já trata corretamente templates quando o pedido tem `notes.type === "template_purchase"` e `shipping_method === "digital"`. A correção é garantir que o frontend sempre use esse caminho.

