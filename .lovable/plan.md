
# Redirecionamento pos-compra para Minhas Compras

## Resumo
Ajustar o fluxo pos-checkout para redirecionar o usuario para a pagina "Minhas Compras" (`/meus-pedidos`) ao inves de `/obrigado` ou `/dashboard`. Na pagina de pedidos, cada pedido ja expande para mostrar status e itens — basta garantir que pedidos de display exibam o botao "Personalizar Arte" de forma clara.

## Alteracoes

### 1. Redirecionar para `/meus-pedidos` apos pagamento confirmado

**Arquivo:** `src/pages/customer/Checkout.tsx`

- Alterar `handlePaymentConfirmed` (linha 590): redirecionar para `/meus-pedidos` ao inves de `/obrigado`
- Alterar redirect apos cartao de credito aprovado (linha 470): trocar `navigate('/obrigado?pedido=...')` por `navigate('/meus-pedidos')`
- Alterar redirect no polling de cartao (linha 570): trocar `navigate('/obrigado?pedido=...')` por `navigate('/meus-pedidos')`

- Alterar `PaymentSuccessOverlay` `onNavigateDashboard` (linha 932): trocar `navigate('/dashboard')` por `navigate('/meus-pedidos')`

### 2. Atualizar PaymentSuccessOverlay para redirecionar automaticamente para Minhas Compras

**Arquivo:** `src/components/checkout/PaymentSuccessOverlay.tsx`

- O overlay ja faz redirect automatico apos 3.5s via `onNavigateDashboard()` — com a mudanca acima, ira para `/meus-pedidos` automaticamente
- Atualizar o texto do botao principal de "Ir para Minhas Compras" ja esta correto, manter
- Atualizar texto do rodape para indicar "Redirecionando para Minhas Compras"

### 3. Garantir botao de personalizar display nos pedidos

**Arquivo:** `src/pages/customer/MyOrders.tsx`

- Na secao de acoes do pedido (dentro do AccordionContent), adicionar botao "Personalizar Arte" quando o pedido tiver `display_arts` com `locked === false`
- O botao navega para `/personalizar-display/:displayArtId`
- Exibir botao com icone de Paintbrush e texto "Personalizar Arte do Display"

## Detalhes tecnicos

### Checkout.tsx — mudancas de redirect

```typescript
// handlePaymentConfirmed (linha 590)
const handlePaymentConfirmed = () => {
  navigate('/meus-pedidos');
};

// Cartao aprovado (linha 470)
navigate('/meus-pedidos');

// Polling aprovado (linha 570)
navigate('/meus-pedidos');

// PaymentSuccessOverlay onNavigateDashboard (linha 932)
onNavigateDashboard={() => navigate("/meus-pedidos")}
```

### MyOrders.tsx — botao personalizar display

Dentro do AccordionContent, apos a secao de itens, verificar se o pedido tem `display_arts` com pelo menos uma arte nao travada (`locked === false`) e exibir botao:

```typescript
{order.items?.map((item: any) => {
  const openArts = item.display_arts?.filter((a: any) => !a.locked) || [];
  return openArts.map((art: any) => (
    <Button key={art.id} size="sm" variant="outline"
      onClick={() => navigate(`/personalizar-display/${art.id}`)}>
      <Paintbrush className="w-4 h-4 mr-2" />
      Personalizar Arte do Display
    </Button>
  ));
})}
```

### Arquivos afetados
1. `src/pages/customer/Checkout.tsx` — trocar todos os redirects para `/meus-pedidos`
2. `src/components/checkout/PaymentSuccessOverlay.tsx` — ajustar texto de redirect
3. `src/pages/customer/MyOrders.tsx` — adicionar botao de personalizar arte do display
