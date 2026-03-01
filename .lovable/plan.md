

## Plano: Cupons com produtos específicos e bloqueio de combos

### Alterações no banco de dados

#### 1. Criar tabela `coupon_products` (migração)
```sql
CREATE TABLE coupon_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(coupon_id, product_id)
);
ALTER TABLE coupon_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage coupon_products" ON coupon_products FOR ALL USING (is_admin());
CREATE POLICY "Authenticated can read coupon_products" ON coupon_products FOR SELECT USING (true);
```

#### 2. Adicionar coluna `exclude_combos` na tabela `coupons`
```sql
ALTER TABLE coupons ADD COLUMN exclude_combos BOOLEAN DEFAULT true;
```

### Alterações no admin (`src/pages/admin/CouponsManager.tsx`)

- Adicionar ao formulário de criação/edição:
  - **Switch "Excluir Combos"** (default: true) — impede uso em itens combo (2 Tags, 3 Tags)
  - **Seção "Produtos Específicos"** — lista de checkboxes com todos os produtos ativos da tabela `products`. Se nenhum selecionado, o cupom vale para todos
- Ao salvar, inserir/atualizar registros na tabela `coupon_products`
- Ao editar, carregar os produtos vinculados do cupom
- Na tabela de listagem, mostrar badge "Produtos específicos" quando houver restrição

### Alterações no edge function (`supabase/functions/validate-coupon/index.ts`)

- Receber `productIds` (array de IDs dos produtos no carrinho) no body da request
- Após validar o cupom, consultar `coupon_products` para verificar se há restrição de produtos
- Se houver restrição, verificar se pelo menos um produto do carrinho está na lista permitida
- Calcular desconto apenas sobre os produtos elegíveis (não sobre o total do pedido)
- Verificar `exclude_combos`: se true, rejeitar cupom se o carrinho contiver itens com ID `pet-tag-pack-2` ou `pet-tag-pack-3` (combos gerados pelo Pricing)

### Alterações no checkout

#### `src/components/checkout/CouponInput.tsx`
- Adicionar prop `cartProductIds: string[]` para enviar os IDs dos produtos ao edge function
- Passar `productIds` no body da chamada ao `validate-coupon`

#### `src/pages/customer/Checkout.tsx`
- Passar `cartProductIds={cart.map(item => item.product.id)}` ao `CouponInput`

### Lógica de bloqueio de combos
Os combos são identificados por IDs sintéticos (`pet-tag-pack-2`, `pet-tag-pack-3`) gerados no `Pricing.tsx`. O edge function verificará se algum desses IDs está no carrinho e, se `exclude_combos = true`, rejeitará o cupom com mensagem "Este cupom não é válido para combos com desconto".

