

# Frete Local para Porto Velho e Jaru - Checkout

## Resumo

Adicionar duas opcoes de frete local (R$ 5,00) para Porto Velho-RO e Jaru-RO no checkout, integradas ao calculo total e aos pagamentos via Asaas (PIX, Cartao e Boleto). Para outras cidades, exibir apenas PAC e SEDEX.

---

## Alteracoes

### 1. Frontend - Checkout.tsx

**Logica de shipping quotes (funcao `fetchShippingQuotes`):**

- Atualmente gera apenas PAC (R$ 12,90) e SEDEX (R$ 24,90) fixos
- Alterar para verificar cidade e estado preenchidos via ViaCEP:
  - Se `city = "Porto Velho"` e `state = "RO"` -> adicionar "Entrega Local - Porto Velho" (R$ 5,00, 2 dias uteis) + PAC + SEDEX
  - Se `city = "Jaru"` e `state = "RO"` -> adicionar "Entrega Local - Jaru" (R$ 5,00, 2 dias uteis) + PAC + SEDEX  
  - Outras cidades -> apenas PAC + SEDEX
- Selecionar frete local como padrao quando disponivel

**Calculo do total (`getTotalWithShipping`):**

- Manter a logica atual: `subtotal - desconto + frete`
- O cupom ja aplica desconto apenas sobre o subtotal (produtos), nao sobre o frete -- isso ja funciona corretamente no codigo atual

**UI de opcoes de frete:**

- Nenhuma mudanca na estrutura do RadioGroup -- as novas opcoes aparecerao automaticamente na lista

### 2. Backend - Edge Functions

Validacao do valor do frete no backend para evitar manipulacao. Tres funcoes precisam de ajuste:

**a) `asaas-payment/index.ts` (PIX/Boleto via Asaas):**

- Apos buscar o pedido no banco, recalcular o total esperado:
  - Buscar `order_items` para somar subtotal dos produtos
  - Verificar `shipping_cost` e `shipping_method` do pedido
  - Validar que frete local (R$ 5,00) so e permitido se cidade = Porto Velho ou Jaru e estado = RO
  - Validar que o `amount` enviado pelo frontend bate com `subtotal + shipping_cost - discount_amount`
- Incluir descricao do frete na descricao do pagamento Asaas: `Pedido #XXXX | Frete: Entrega Local - Porto Velho`

**b) `process-credit-card-payment/index.ts` (Cartao de Credito):**

- Mesma validacao: recalcular total a partir dos items + frete - desconto
- Validar frete local contra cidade/estado do endereco de entrega
- Incluir descricao do frete no campo `description` do pagamento

**c) `pix-payment/index.ts` (PIX direto):**

- Mesma validacao de total: buscar items do pedido, validar frete, comparar com amount enviado

### 3. Constantes de frete validas (backend)

Definir no backend os valores permitidos:

```text
FRETES_VALIDOS:
  - "PAC" -> R$ 12,90
  - "SEDEX" -> R$ 24,90
  - "LOCAL_PORTO_VELHO" -> R$ 5,00 (somente cidade=Porto Velho, estado=RO)
  - "LOCAL_JARU" -> R$ 5,00 (somente cidade=Jaru, estado=RO)
```

---

## Detalhes Tecnicos

### Checkout.tsx - Mudanca na funcao fetchShippingQuotes

```text
Antes:
  Gera quotes fixas [PAC, SEDEX] sempre

Depois:
  1. Verifica shippingData.city e shippingData.state
  2. Se Porto Velho/RO -> quotes = [Local PVH R$5, PAC R$12.90, SEDEX R$24.90]
  3. Se Jaru/RO -> quotes = [Local Jaru R$5, PAC R$12.90, SEDEX R$24.90]
  4. Senao -> quotes = [PAC R$12.90, SEDEX R$24.90]
  5. Seleciona primeira opcao como padrao (frete local quando disponivel)
```

A comparacao de cidade sera case-insensitive e com trim para evitar falhas por acentuacao do ViaCEP.

### Edge Functions - Validacao de frete

Cada edge function que recebe `amount` do frontend fara:

1. Buscar `order_items` do pedido e somar `quantity * unit_price`
2. Ler `shipping_cost`, `shipping_method`, `discount_amount` do pedido
3. Verificar se `shipping_method` esta na lista de metodos validos
4. Se frete local, verificar que `shipping_city` e Porto Velho ou Jaru e `shipping_state` e RO
5. Comparar `amount` com `subtotal + shipping_cost - discount_amount` (tolerancia de R$ 0,01)
6. Rejeitar pagamento se valor nao bater

### Arquivos modificados

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/customer/Checkout.tsx` | Logica de quotes com frete local condicional |
| `supabase/functions/asaas-payment/index.ts` | Validacao de frete + descricao no pagamento |
| `supabase/functions/process-credit-card-payment/index.ts` | Validacao de frete + descricao no pagamento |
| `supabase/functions/pix-payment/index.ts` | Validacao de frete |

### Nenhuma mudanca no banco de dados

A coluna `shipping_method` (text) e `shipping_cost` (numeric) ja existem na tabela `orders` e comportam os novos valores sem alteracao de schema.

