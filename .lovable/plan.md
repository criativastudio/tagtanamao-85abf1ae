

## Plano: Cupons aceitos em compras com combo, mas desconto aplicado apenas nos itens não-combo

### Problema atual
Quando `exclude_combos = true` e o carrinho contém um combo, o edge function **rejeita o cupom inteiro** (retorna erro 400). O usuário não consegue usar o cupom, e a compra não é vinculada ao cupom para métricas.

### Solução
Em vez de rejeitar, o edge function deve **aceitar o cupom** mas calcular o desconto apenas sobre os itens que **não são combo**. O frontend precisa enviar os preços individuais dos itens para que o cálculo seja feito corretamente no backend.

### Alterações

#### 1. Edge function `supabase/functions/validate-coupon/index.ts`
- Receber novo campo `items` no body: `{ productId: string, unitPrice: number, quantity: number }[]`
- Quando `exclude_combos = true`, filtrar os itens removendo combos (IDs `pet-tag-pack-*`)
- Calcular `eligibleTotal` somando apenas os itens não-combo
- Se `eligibleTotal = 0` (só combos no carrinho), retornar `discountAmount: 0` com flag `comboOnly: true` e mensagem informativa (mas **não rejeitar**)
- Aplicar o desconto sobre `eligibleTotal` em vez de `orderTotal`
- Retornar o cupom normalmente para que seja vinculado ao pedido

#### 2. `src/components/checkout/CouponInput.tsx`
- Adicionar prop `cartItems: { productId: string, unitPrice: number, quantity: number }[]`
- Enviar `items` no body da chamada ao edge function
- Tratar resposta com `comboOnly: true` mostrando toast informativo ("Cupom vinculado, mas desconto não se aplica a combos")

#### 3. `src/pages/customer/Checkout.tsx`
- Passar `cartItems` ao `CouponInput` com os dados de preço/quantidade do carrinho

### Comportamento esperado
- Carrinho com combo + produto normal: desconto aplica só no produto normal, cupom vinculado ao pedido
- Carrinho só com combos: cupom aceito com desconto R$ 0,00, vinculado ao pedido para métricas
- Carrinho sem combos: comportamento normal (desconto total)

