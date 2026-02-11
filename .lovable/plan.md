
## Tracker de Etapas para Pedidos de Display Empresarial

### Objetivo
Substituir o badge simples de status por um tracker visual de etapas (stepper) dentro do card expansivel do pedido, mostrando claramente em qual fase o pedido se encontra. Aplicavel apenas a pedidos que contenham display empresarial (`display_arts` presente).

### Como funciona

O pedido continua sendo unico. Ao expandir o accordion, alem dos itens e endereco, aparece um stepper vertical com as etapas:

1. **Pendente** - Aguardando pagamento
2. **Pago** - Pagamento aprovado
3. **Personalizar Arte** - Arte em aberto (com botao de acao)
4. **Arte Finalizada / Em Producao** - Arte aprovada, em producao
5. **Enviado** - Pedido despachado
6. **Entregue** - Pedido recebido

Cada etapa mostra:
- Icone circular: verde preenchido (concluida), azul pulsante (atual), cinza (futura)
- Linha conectora entre etapas (verde para concluidas, cinza para futuras)
- Label e descricao curta
- Botao de acao na etapa atual quando aplicavel (ex: "Personalizar Meu Display", "Pagar Agora", "Rastrear")

### Detalhes Tecnicos

**Arquivo modificado:** `src/pages/customer/MyOrders.tsx`

**Logica de deteccao:** Um pedido e de display empresarial se `order.display_arts` existe e tem pelo menos 1 item. Para esses pedidos, o stepper e exibido. Para pedidos comuns (pet tags), o layout atual e mantido.

**Mapeamento de status para etapas:**

```text
Status do pedido    ->  Etapa ativa (indice)
pending             ->  0 (Pendente)
paid                ->  1 (Pago)
awaiting_customization -> 2 (Personalizar Arte)
art_finalized       ->  3 (Arte Finalizada)
processing          ->  3 (Em Producao)
ready_to_ship       ->  4 (Enviado)
shipped             ->  4 (Enviado)
delivered           ->  5 (Entregue)
cancelled           ->  exibe badge vermelho separado
```

**Componente `DisplayOrderStepper`** (inline no mesmo arquivo):
- Recebe `order: OrderWithItems` e `navigate` como props
- Define array de etapas com `label`, `icon`, `description`
- Calcula `currentStepIndex` a partir do status do pedido
- Renderiza lista vertical com circulos, linhas e labels
- Inclui botoes de acao contextuais na etapa atual

**Mudancas no layout do card:**
- O badge de status no header permanece para referencia rapida
- Dentro do `AccordionContent`, antes dos itens, renderiza `<DisplayOrderStepper>` se for pedido de display
- Os botoes de acao atuais (Personalizar, Pagar, Rastrear) migram para dentro do stepper na etapa correspondente
- Para pedidos nao-display, tudo continua como esta

### Estilo visual

- Circulos: `w-8 h-8 rounded-full` com `bg-primary` (concluida), `bg-primary animate-pulse ring-4 ring-primary/20` (atual), `bg-muted` (futura)
- Icone dentro: `CheckCircle` (concluida), icone especifico (atual/futura)
- Linha vertical: `w-0.5 h-6` com `bg-primary` ou `bg-muted`
- Labels: `font-medium text-sm` (ativa), `text-muted-foreground text-sm` (outras)

Nenhuma alteracao de banco de dados e necessaria. Tudo e derivado do status existente do pedido.
