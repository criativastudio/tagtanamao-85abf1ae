

## Bloquear templates para usuários não pagos e permitir liberação manual pelo admin

### Problema atual

Existem **3 pontos** no código onde um usuário pode adquirir templates gratuitos (preço = 0) sem pagar, inserindo diretamente na tabela `user_templates`:

1. `src/components/display/DisplayTemplateSelector.tsx` — linha 129-133: se `template.price === 0`, insere em `user_templates` instantaneamente
2. `src/pages/customer/DisplayTemplateManager.tsx` — linha 144-153: mesma lógica para templates gratuitos
3. Qualquer template com `price = 0` pode ser auto-adquirido sem validação

Além disso, **não existe interface admin** para liberar manualmente um template a um usuário específico.

### Solução

#### 1. Bloquear auto-aquisição de templates gratuitos pelo usuário

Remover a lógica de "adquirir grátis" em todos os componentes do lado do cliente. Templates só podem ser desbloqueados por:
- **Compra** (fluxo de checkout existente → insere em `user_templates`)
- **Admin** (liberação manual via painel)

| Arquivo | Mudança |
|---|---|
| `src/components/display/DisplayTemplateSelector.tsx` | Remover bloco `if (template.price === 0)` no `handlePurchase`. Todos os templates não-owned redirecionam para checkout (`/loja/checkout?template_id=...`), independente do preço |
| `src/pages/customer/DisplayTemplateManager.tsx` | Mesma remoção no `handlePurchaseTemplate` — remover auto-aquisição de templates gratuitos |

#### 2. Admin: interface para liberar templates manualmente a usuários

Adicionar uma nova seção no `TemplatesTabContent.tsx` (aba Templates do admin de produtos) que permite:
- Selecionar um usuário (busca por email na tabela `profiles`)
- Selecionar um template
- Clicar "Liberar" → insere em `user_templates`
- Listar templates já liberados com opção de revogar (deletar de `user_templates`)

| Arquivo | Mudança |
|---|---|
| `src/components/admin/TemplatesTabContent.tsx` | Adicionar seção "Liberar Template para Usuário" com select de usuário (busca por email), select de template, botão liberar, e lista de liberações existentes com botão revogar |

#### 3. Fluxo de compra (já funciona)

O desbloqueio automático pós-compra **já está implementado** em 3 pontos e não precisa de alteração:
- `Checkout.tsx` linha 577: insere em `user_templates` após cartão aprovado
- `Checkout.tsx` linha 708: insere em `user_templates` após PIX confirmado
- `asaas-payment/index.ts` linha 220: insere em `user_templates` via webhook

#### 4. Nenhuma alteração de banco necessária

A tabela `user_templates` já existe com as colunas necessárias (`user_id`, `template_id`, `order_id`). As políticas RLS já permitem:
- Admin: ALL (gerenciar)
- System: INSERT (backend)
- Users: SELECT own

O admin já pode inserir e deletar via RLS policy "Admins can manage user templates".

### Resumo das mudanças

| Arquivo | Ação |
|---|---|
| `src/components/display/DisplayTemplateSelector.tsx` | Remover auto-aquisição gratuita — sempre redirecionar para checkout |
| `src/pages/customer/DisplayTemplateManager.tsx` | Remover auto-aquisição gratuita — sempre redirecionar para checkout |
| `src/components/admin/TemplatesTabContent.tsx` | Adicionar seção de liberação manual de templates para usuários (busca por email, liberar, revogar) |

