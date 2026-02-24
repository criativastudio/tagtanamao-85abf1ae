

## Mover Seleção de Templates para Dentro da Página de Edição do Display

### Situação Atual
- A seleção de templates fica em uma página separada (`/dashboard/displays/templates` via `DisplayTemplateManager.tsx`)
- O usuário precisa navegar para outra tela para gerenciar templates
- Na tela de edição do display, existe apenas um link "Personalizar (TEMPLATE PADRÃO)" que leva ao editor de bio

### Plano

#### 1. Criar componente `DisplayTemplateSelector`
Novo componente reutilizável que encapsula a lógica de browse/ativação de templates, extraída do `DisplayTemplateManager.tsx`:
- Recebe `displayId` e `userId` como props
- Busca templates disponíveis (`display_templates`), templates comprados (`user_templates`), e o `active_template_id` do display
- Mostra grid de templates com cards (preview, preço, badge "Ativo", badge "Premium")
- Botões: "Adquirir" (grátis), "Comprar" (pago), "Ativar" (já comprado), "Desativar" (ativo)
- Quando um template é ativado, mostra botão para abrir o editor de conteúdo (navega para `/dashboard/displays/templates?display=ID`) para edição avançada de mídia

#### 2. Integrar na página `DisplaysManager.tsx`
- Adicionar uma nova seção **"Templates Premium"** no painel de edição do display (após a seção de botões/links e antes do link ao bio editor)
- Renderizar o `DisplayTemplateSelector` quando um display está selecionado
- Visível tanto em modo de visualização quanto em modo de edição

#### 3. Manter a página `DisplayTemplateManager` para edição de conteúdo
- A página separada continua existindo para o editor de mídia (capas, thumbnails, Reels)
- O botão "Editar Conteúdo" no novo componente navega para ela

### Arquivos
- **Criar**: `src/components/display/DisplayTemplateSelector.tsx` — componente com grid de templates, lógica de compra/ativação
- **Editar**: `src/pages/DisplaysManager.tsx` — importar e renderizar o novo componente dentro do painel de detalhes do display selecionado (linha ~920, após a seção de botões)

### Detalhes Técnicos
O componente `DisplayTemplateSelector` fará queries independentes:
```
display_templates (is_active = true)
user_templates (user_id = current user)
business_displays (para ler active_template_id)
```
Ao ativar/desativar template, atualiza `business_displays.active_template_id` diretamente. Sem migração de banco necessária.

