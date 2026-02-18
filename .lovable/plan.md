
# Ajuste do botão "Personalizar Arte do Display" + Fix do build error

## Problemas a resolver

### 1. Build Error (crítico)
**Arquivo:** `src/pages/customer/MyOrders.tsx`, linha 50

O Realtime do Supabase retorna `payload.new` como `Record<string, any>`, mas o `setOrders` espera `OrderWithItems[]`. O TypeScript rejeita a atribuição porque o tipo retornado não satisfaz a interface.

**Fix:** fazer cast explícito de `payload.new as OrderWithItems` dentro do `.map()`.

---

### 2. Botão de Personalizar — Nova Página de Gerenciamento

**Problema atual:** quando o pedido tem múltiplos displays (quantidade > 1), cada arte gera um botão separado desorientado. Além disso, navegar direto para `/personalizar-display/:id` não dá visão geral do progresso do pedido.

**Solução:** criar uma nova página `DisplaysOrderManager` que centraliza a personalização de um pedido inteiro, e alterar o botão em `MyOrders` para apontar para ela.

---

## Arquivos a criar/editar

### 1. FIX: `src/pages/customer/MyOrders.tsx`

**A) Corrigir o build error no realtime (linha 50):**
```typescript
// Antes (quebrado):
setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? payload.new : o)));

// Depois (corrigido):
setOrders((prev) =>
  prev.map((o) =>
    o.id === payload.new.id
      ? { ...o, ...(payload.new as Partial<OrderWithItems>) }
      : o
  )
);
```

**B) Simplificar os botões de "Personalizar Arte" — substituir toda a lógica existente por um único botão por pedido que navega para a nova página:**
```tsx
{/* Botão único por pedido — somente para displays, somente se não processando */}
{hasDisplay && ["awaiting_customization", "paid"].includes(normalizedStatus) && (
  <Button
    size="sm"
    variant="outline"
    className="border-primary/50 text-primary hover:bg-primary/10"
    onClick={() => navigate(`/personalizar-display?order_id=${order.id}`)}
  >
    <Paintbrush className="w-4 h-4 mr-2" />
    Personalizar Arte do Display
  </Button>
)}
```

---

### 2. CRIAR: `src/pages/customer/DisplaysOrderManager.tsx`

Nova página acessada via `/personalizar-display?order_id=<uuid>`.

**O que ela faz:**
- Busca o pedido e todos os seus `order_items` com `product.type === 'business_display'` + `display_arts`
- Para cada display item (respeitando `quantity`), mostra um card com:
  - Nome do produto
  - Status da arte (não iniciada / em edição / finalizada)
  - Botão "Personalizar" que navega para `/personalizar-display/:artId` (ou cria a arte e navega)
- Botão "Voltar aos Pedidos"
- Atualização em tempo real via Realtime (canal `display_arts`)

**UI dos cards de display:**

```
┌─────────────────────────────────────────────┐
│  [ícone]  Display Acrílico Empresarial       │
│           Arte: Em edição                    │
│                           [Personalizar →]   │
└─────────────────────────────────────────────┘
```

Status visual:
- Não iniciada → badge amarelo "Pendente"
- Em edição (locked: false) → badge azul "Em edição"  
- Finalizada (locked: true) → badge verde "Finalizada ✓"

**Lógica de navegação ao clicar em Personalizar:**
- Se já existe `display_art` para aquele `order_item_id` → navegar para `/personalizar-display/:artId`
- Se não existe → criar nova `display_art` com `order_id` e `order_item_id` → navegar para o ID criado

**Lógica de criação de artes por quantidade:**

Como cada `order_item` pode ter `quantity > 1`, a página cria/lista artes suficientes. Exemplo: se `quantity = 2`, existirão 2 `display_art` records associados àquele `order_item_id`.

---

### 3. EDITAR: `src/App.tsx`

Adicionar rota para a nova página:
```tsx
import DisplaysOrderManager from "./pages/customer/DisplaysOrderManager";

// Na lista de rotas:
<Route
  path="/personalizar-display"
  element={<ProtectedRoute><DisplaysOrderManager /></ProtectedRoute>}
/>
```

A rota `/personalizar-display/:displayArtId` (com parâmetro) já existe e permanece intacta para a personalização individual.

---

## Fluxo completo após a mudança

```text
MyOrders
  └── [botão "Personalizar Arte do Display"]
        │
        ▼
  DisplaysOrderManager (/personalizar-display?order_id=<uuid>)
        │  Lista todos os displays do pedido
        │  Mostra status de cada arte
        │
        └── [botão "Personalizar" por display]
              │
              ▼
        DisplayArtCustomizer (/personalizar-display/:artId)
              │  Editor completo (template, logo, nome)
              │  Ao finalizar → edge function → status → processing
              │
              └── [Voltar] → DisplaysOrderManager
```

---

## O que NÃO muda

- `fetchOrders` e toda lógica de dados em `MyOrders`
- `DisplayArtCustomizer` — permanece intacto
- `OrderProductionStepper` — permanece intacto
- `statusConfig`, badges, seção de itens, entrega, rastreio em `MyOrders`
- Edge functions existentes
- RLS policies

---

## Arquivos afetados

1. `src/pages/customer/MyOrders.tsx` — fix build error + simplificação do botão
2. `src/pages/customer/DisplaysOrderManager.tsx` — CRIAR (nova página)
3. `src/App.tsx` — adicionar rota `/personalizar-display` (sem parâmetro)
