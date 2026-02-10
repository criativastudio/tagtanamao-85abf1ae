
# Correcao: CEP/Frete Dinamico no Checkout e Integracao Melhor Envio

## Problemas Identificados

1. **CreditCardForm.tsx com frete duplicado**: O componente de cartao de credito tem campos de CEP e frete proprios, chamando uma Edge Function `calcular-frete` que nao existe. Isso duplica a logica que ja esta no `Checkout.tsx`.

2. **CEP dispara multiplas chamadas**: No `Checkout.tsx`, o `handleZipChange` e chamado a cada tecla digitada (onChange), nao no onBlur como especificado. Isso gera chamadas desnecessarias.

3. **Frete local nao e exclusivo**: Para Porto Velho/Jaru, o sistema adiciona "Entrega Local" junto com as opcoes do Melhor Envio, em vez de mostrar apenas a opcao local.

4. **Frete do CreditCardForm nao persiste no pedido**: O frete selecionado dentro do CreditCardForm nao e utilizado na criacao do pedido.

## Solucao

### 1. Remover CEP/Frete do CreditCardForm.tsx

Remover completamente os campos de CEP, calculo de frete e selecao de transportadora do `CreditCardForm.tsx`. Este componente deve conter apenas dados do cartao (nome, numero, validade, CVV). O frete ja e tratado no `Checkout.tsx`.

- Remover estados: `cep`, `fretes`, `freteSelecionado`, `freteLoading`, `freteError`, `lastCepFetched`, `touchedFrete`
- Remover funcoes: `handleCepBlur`, `buildFreteOptions`
- Remover da interface `CardData`: campos `cep`, `frete`, `FreteOption`
- Remover JSX dos campos CEP e opcoes de frete
- Atualizar validacao: `isFormValid` nao depende mais de `freteSelecionado`

### 2. Corrigir CEP com onBlur no Checkout.tsx

Alterar o campo de CEP para usar `onBlur` em vez de `onChange` para disparar o calculo de frete:

- Separar `handleZipChange` em duas funcoes:
  - `handleZipInput`: apenas atualiza o estado (onChange)
  - `handleZipBlur`: dispara busca de endereco via ViaCEP + calculo de frete (onBlur)
- Adicionar `lastZipFetched` para evitar chamadas duplicadas quando o CEP nao mudou

### 3. Frete Local Exclusivo

Quando o CEP resolver para Porto Velho/RO ou Jaru/RO:
- NAO chamar o Melhor Envio
- Exibir apenas "Entrega Local" com valor fixo de R$ 5,00
- Pre-selecionar automaticamente

### 4. Filtrar 3 opcoes de frete

Quando usar Melhor Envio, exibir exatamente 3 opcoes:
- Correios PAC
- Correios SEDEX
- A opcao mais barata de outra transportadora

### 5. Persistencia do frete no pedido

Ja esta implementada no `handleCreateOrder` do Checkout.tsx (campos `shipping_carrier`, `shipping_service_name`, `shipping_delivery_time`, `shipping_cost`). Nenhuma alteracao necessaria.

## Detalhes Tecnicos

### Arquivo 1: `src/components/checkout/CreditCardForm.tsx`

Simplificar o componente removendo toda logica de frete:

```typescript
// REMOVER: interface FreteOption e campo frete da CardData
// ANTES:
export interface FreteOption { ... }
export interface CardData {
  ...
  cep?: string;
  frete?: FreteOption | null;
}

// DEPOIS:
export interface CardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  brand: string | null;
}
```

Remover ~100 linhas de logica de frete (estados, handlers, JSX).

### Arquivo 2: `src/pages/customer/Checkout.tsx`

**CEP com onBlur:**
```typescript
// Campo CEP: onChange apenas atualiza estado, onBlur faz a busca
<Input
  id="zip"
  value={shippingData.zip}
  onChange={(e) => setShippingData(prev => ({ ...prev, zip: e.target.value }))}
  onBlur={() => handleZipBlur(shippingData.zip)}
  placeholder="00000-000"
/>
```

**Frete local exclusivo:**
```typescript
const handleZipBlur = async (zip: string) => {
  const digits = zip.replace(/\D/g, '');
  if (digits.length !== 8 || digits === lastZipFetched) return;
  setLastZipFetched(digits);

  // Buscar endereco via ViaCEP
  const cepData = await fetch(`https://viacep.com.br/ws/${digits}/json/`).then(r => r.json());
  // ... atualizar campos de endereco ...

  const city = (cepData.localidade || '').trim().toLowerCase();
  const state = (cepData.uf || '').trim().toUpperCase();

  // Frete local exclusivo
  if (state === 'RO' && (city === 'porto velho' || city === 'jaru')) {
    const local = { service: `Entrega Local - ${cepData.localidade}`, carrier: 'Entrega Local', price: 5.0, delivery_time: 2 };
    setShippingQuotes([local]);
    setSelectedShipping(local);
    return;
  }

  // Melhor Envio para outros CEPs
  await fetchShippingQuotesWithAddress(digits, cepData.localidade, cepData.uf);
};
```

**Filtrar 3 opcoes:**
```typescript
// Dentro de fetchShippingQuotesWithAddress, apos receber quotes:
const pac = quotes.find(q => /pac/i.test(q.service));
const sedex = quotes.find(q => /sedex/i.test(q.service));
const others = quotes.filter(q => q !== pac && q !== sedex);
const cheapest = others.sort((a, b) => a.price - b.price)[0];
const filtered = [pac, sedex, cheapest].filter(Boolean);
setShippingQuotes(filtered);
setSelectedShipping(filtered[0] || null);
```

### Nao ha alteracoes necessarias em:
- Edge Functions (melhor-envio, asaas-payment, process-credit-card-payment)
- Banco de dados (schema ja tem todos os campos necessarios)
- OrdersManager.tsx (logistica admin ja funcional)

### Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/checkout/CreditCardForm.tsx` | Remover logica de CEP/frete duplicada |
| `src/pages/customer/Checkout.tsx` | CEP onBlur, frete local exclusivo, filtro 3 opcoes |
