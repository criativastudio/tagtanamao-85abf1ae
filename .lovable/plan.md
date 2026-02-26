

## Reestruturação da página de Produtos Admin com seções por tipo

### Contexto atual

- **ProductsManager** (`/admin/produtos`): CRUD genérico de produtos da tabela `products`, sem separação por tipo
- **DisplayTemplatesManager** (`/admin/display-templates`): página separada com CRUD de templates + ativação em displays
- O menu admin em `UserSettings.tsx` lista ambos como itens separados

### O que será feito

Reescrever `ProductsManager.tsx` para consolidar tudo em uma única página com **Tabs** organizadas por tipo de produto:

**Abas:**
1. **Tag Pet** — lista/CRUD de produtos com `type = 'pet_tag'`
2. **Display Empresarial** — lista/CRUD de produtos com `type = 'business_display'`
3. **Templates** — CRUD completo da tabela `display_templates` + ativação/desativação em displays (toda a lógica que hoje está em `DisplayTemplatesManager`)
4. **Tag Celular** — lista/CRUD de produtos com `type = 'nfc_tag'`
5. **Card NFC** — lista/CRUD de produtos com `type = 'nfc_card'`

### Estrutura técnica

- Cada aba de produto físico (Pet, Display, Tag Celular, Card NFC) filtra `products` por `type` e usa o mesmo dialog de criação/edição que já existe, pré-selecionando o tipo
- A aba **Templates** incorpora toda a lógica atual do `DisplayTemplatesManager` (CRUD `display_templates` + ativar/desativar `active_template_id` em `business_displays` sem exigir compra)
- O botão "Novo Produto" será contextual: na aba de templates cria um template, nas outras cria um produto com o tipo correto

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/pages/admin/ProductsManager.tsx` | Reescrever com Tabs por tipo + seção Templates integrada |
| `src/pages/customer/UserSettings.tsx` | Remover item "Templates de Display" do menu admin (já está dentro de Produtos) |
| `src/App.tsx` | Remover rota `/admin/display-templates` e import do `DisplayTemplatesManager` |
| `src/pages/admin/DisplayTemplatesManager.tsx` | Pode ser mantido como arquivo (não quebra nada) ou removido — a funcionalidade migra para ProductsManager |

### Detalhes de implementação

A página usará `Tabs` do Radix com 5 abas. As 4 abas de produtos físicos compartilham:
- Grid de cards com imagem, nome, preço, switch ativo/inativo, editar, excluir
- Dialog de criação/edição com campos: nome, descrição, preço, imagem, galeria, ativo — com `type` pré-definido pela aba

A aba Templates terá:
- Grid de cards de templates (nome, key, preço, features, switch ativo)
- Seção "Ativar template em display" com selects de display + template + botão Ativar
- Lista de displays com template ativo + botão Desativar
- Dialog de criação/edição de template (nome, key, descrição, preço, preview_url, features, ativo)

Nenhuma alteração de banco de dados é necessária.

