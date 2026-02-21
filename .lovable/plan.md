

# Permitir preenchimento manual quando API de CEP falhar

## Problema atual

Quando a API de CEP (ViaCEP ou BrasilAPI) falha ou nao encontra o CEP, o checkout trava silenciosamente:
- O `catch` na linha 213 apenas faz `console.error` -- o usuario nao recebe feedback
- Os campos de endereco ficam vazios e sem opcoes de frete
- Nao ha como calcular frete manualmente apos preencher cidade/estado

## Solucao

### 1. Feedback ao usuario quando CEP falhar

No bloco `catch` (linha 213) e quando `data.erro` + BrasilAPI tambem falhar, mostrar um toast informativo (nao destrutivo) orientando o usuario a preencher manualmente.

### 2. Adicionar estado `cepFailed`

Novo estado `cepFailed` (boolean) que sera `true` quando ambas APIs falharem. Isso habilita:
- Uma mensagem visual no formulario indicando "CEP nao encontrado, preencha manualmente"
- Um botao "Calcular Frete" que aparece quando `cepFailed === true` e cidade/estado estao preenchidos

### 3. Botao "Calcular Frete" manual

Quando o CEP falhar mas o usuario preencher cidade e estado manualmente, um botao aparece para disparar `fetchShippingQuotesWithAddress` com os dados manuais. Isso reutiliza a mesma logica existente de cotacao.

### 4. Tratar falha do BrasilAPI tambem

Atualmente, se ViaCEP retorna `erro: true` e BrasilAPI tambem falha, o codigo quebra silenciosamente. Envolver a chamada do BrasilAPI em try/catch proprio.

## Alteracoes no arquivo `src/pages/customer/Checkout.tsx`

### Novo estado
```typescript
const [cepFailed, setCepFailed] = useState(false);
```

### Funcao `handleZipBlur` atualizada
- Resetar `cepFailed` no inicio
- Envolver BrasilAPI em try/catch
- Se ambas APIs falharem: setar `cepFailed = true`, mostrar toast informativo, permitir preenchimento manual
- Se apenas dados de endereco falharem mas temos o CEP: ainda tentar buscar frete

### UI: Mensagem de fallback + botao calcular frete
- Abaixo dos campos de endereco, quando `cepFailed === true`, exibir alerta amarelo: "Nao conseguimos encontrar seu CEP. Preencha o endereco manualmente."
- Botao "Calcular Frete" visivel quando `cepFailed && shippingData.city && shippingData.state`
- O botao chama `fetchShippingQuotesWithAddress(digits, shippingData.city, shippingData.state)`

## O que NAO muda

- Fluxo normal quando CEP e encontrado
- Logica de frete local (Jaru/Porto Velho)
- Validacao de campos obrigatorios no `validateShipping`
- Logica de pagamento e criacao de pedido
