

# Corrigir PIX ficando em carregamento infinito

## Problema identificado
O componente `AsaasAwaitingPayment` escuta mudancas em tempo real na tabela `orders`, mas essa tabela **nao esta habilitada para Realtime**. Apenas `pix_payments` e `payments` estao no Realtime. Por isso, o pagamento nunca e detectado como confirmado.

Alem disso, nao ha fallback de polling — se o Realtime falhar, o usuario fica preso na tela de carregamento.

## Solucao

### 1. Habilitar Realtime na tabela `orders`
Criar uma migracao SQL para adicionar a tabela `orders` a publicacao Realtime:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
```

### 2. Adicionar polling como fallback
No componente `AsaasAwaitingPayment`, alem da subscription Realtime, adicionar um polling que verifica o status do pedido a cada 5 segundos. Isso garante que mesmo se o Realtime falhar, o pagamento sera detectado.

### 3. Escutar tambem a tabela `payments`
Como a tabela `payments` ja esta no Realtime, adicionar uma subscription secundaria nela (filtrada pelo `order_id`) para maior confiabilidade.

## Arquivos a editar
1. **Migracao SQL** — habilitar Realtime para `orders`
2. **`src/components/checkout/AsaasAwaitingPayment.tsx`** — adicionar polling fallback + subscription na tabela `payments`

## Detalhes tecnicos

### Polling fallback (a cada 5s)
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const { data } = await supabase
      .from('orders')
      .select('payment_status, status')
      .eq('id', orderId)
      .maybeSingle();
    
    if (data?.payment_status === 'confirmed' || data?.status === 'paid') {
      setStatus('confirmed');
      // trigger callback
    }
  }, 5000);
  return () => clearInterval(interval);
}, [orderId]);
```

### Subscription dupla (orders + payments)
Manter a subscription existente em `orders` (que passara a funcionar apos a migracao) e adicionar uma em `payments` filtrada por `order_id`.

