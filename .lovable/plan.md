

## Gerenciador de Templates de Display no Admin

### Contexto

Atualmente o admin tem o `TemplatesManager` em `/admin/templates`, mas ele gerencia **art_templates** (modelos de arte SVG para produção). Os templates de display (Netflix e futuros) ficam na tabela `display_templates` e **não têm interface administrativa** — o único registro existente foi inserido via SQL.

O `DisplayTemplateSelector` (usado pelo usuário final) exige que o usuário **compre** o template antes de ativá-lo (tabela `user_templates`). O admin precisa poder ativar templates em qualquer display sem essa restrição.

### Mudanças

#### 1. Nova página: `src/pages/admin/DisplayTemplatesManager.tsx`

Página administrativa para gerenciar a tabela `display_templates` com:

- **Listagem** em grid de cards com preview, nome, preço, template_key, status (ativo/inativo)
- **Switch ativo/inativo** em cada card (toggle `is_active`)
- **Criar/Editar** template via dialog: nome, descrição, template_key, preço, preview_url (upload), features (lista editável), is_active
- **Excluir** template com confirmação
- **Ativar template em um display específico**: seção com select de displays (busca por nome/código) + botão "Ativar" que faz update direto no `business_displays.active_template_id` sem exigir compra/user_templates
- **Desativar template de um display**: botão para limpar `active_template_id` e `template_config`

#### 2. Rota e navegação

- Adicionar rota `/admin/display-templates` no `App.tsx`
- Adicionar link no `AdminDashboard` ou menu admin existente para acessar a nova página

#### 3. Lógica de ativação admin (sem compra)

O admin poderá:
1. Selecionar um display (por nome ou código QR)
2. Escolher um template da lista
3. Clicar "Ativar" → faz `UPDATE business_displays SET active_template_id = template.id WHERE id = display.id`

Isso bypassa completamente a tabela `user_templates`, que é o fluxo de compra do usuário final.

### Arquivos

- **Criar**: `src/pages/admin/DisplayTemplatesManager.tsx` — nova página completa
- **Editar**: `src/App.tsx` — adicionar import e rota `/admin/display-templates`

### Detalhes técnicos

A tabela `display_templates` já tem RLS configurado: admins podem fazer ALL, qualquer um pode SELECT templates ativos. O admin já tem permissão de UPDATE em `business_displays` via `is_admin()`. Nenhuma migration é necessária.

