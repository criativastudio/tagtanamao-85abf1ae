

# Gerenciamento de Usuarios no Admin

## Resumo
Criar uma nova pagina `/admin/usuarios` acessivel pelo menu Admin em Configuracoes, que lista todos os usuarios cadastrados com busca, status de compra, e ao clicar em um usuario exibe detalhes completos: produtos, links das paginas, e metricas de acesso.

## O que sera feito

### 1. Nova pagina `UsersManager.tsx`
- Lista todos os perfis do banco de dados (tabela `profiles`)
- Exibe para cada usuario: nome, e-mail, status (comprou / nao comprou)
- Campo de busca por nome, e-mail ou codigo unico (QR code)
- Ao clicar em um usuario, abre painel de detalhes

### 2. Painel de detalhes do usuario
Ao selecionar um usuario:
- **Produtos comprados**: lista pedidos da tabela `orders` + `order_items` + `products`
- **Links das paginas**: busca `pet_tags` e `business_displays` do usuario, exibe links publicos (`/pet/:qr` e `/display/:qr`)
- **Bio pages**: lista `bio_pages` do usuario com links (`/bio/:slug`)
- **Metricas da pagina**:
  - Total de cliques (da tabela `bio_page_analytics` + `qr_scans`)
  - Botoes mais clicados
  - Horarios de maior acesso (agrupando eventos por hora do dia)

### 3. Rota e navegacao
- Nova rota `/admin/usuarios` no `App.tsx` (protegida)
- Novo item no `adminMenuItems` em `UserSettings.tsx` com icone `Users`

## Detalhes tecnicos

### Consultas ao banco
- Perfis: `supabase.from('profiles').select('*')` - admin ja tem policy ALL
- Pedidos do usuario: `supabase.from('orders').select('*, order_items(*, products(*))').eq('user_id', userId)` - admin policy existe
- Pet tags: `supabase.from('pet_tags').select('*').eq('user_id', userId)` - admin policy existe
- Displays: `supabase.from('business_displays').select('*').eq('user_id', userId)` - admin policy existe
- Bio pages: `supabase.from('bio_pages').select('*').eq('user_id', userId)` - admin policy existe
- Analytics: `supabase.from('bio_page_analytics').select('*')` filtrado pelos bio_page_ids do usuario
- Scans: `supabase.from('qr_scans').select('*')` filtrado pelos pet_tag_ids e display_ids do usuario

Todas essas tabelas ja possuem RLS policies que permitem acesso admin (`is_admin()` ou similar), entao nenhuma migracao de banco e necessaria.

### Arquivos a criar/editar
1. **Criar** `src/pages/admin/UsersManager.tsx` - pagina principal com lista, busca e painel de detalhes
2. **Editar** `src/App.tsx` - adicionar rota `/admin/usuarios`
3. **Editar** `src/pages/customer/UserSettings.tsx` - adicionar item "Usuarios" no `adminMenuItems`

### Estrutura da pagina

```text
+------------------------------------------+
| <- Voltar    Gestao de Usuarios          |
+------------------------------------------+
| [Busca por nome, e-mail ou codigo]       |
+------------------------------------------+
| Nome        | E-mail     | Status       |
|-------------|------------|--------------|
| Joao Silva  | joao@...   | Comprou      |
| Maria       | maria@...  | Nao comprou  |
+------------------------------------------+

Ao clicar em um usuario:
+------------------------------------------+
| Detalhes: Joao Silva                     |
|------------------------------------------|
| Produtos Comprados:                      |
|   - Tag Pet x2 (Pedido #abc)            |
|------------------------------------------|
| Paginas:                                 |
|   - Pet: /pet/123456 (Rex)              |
|   - Display: /display/789 (Loja X)      |
|   - Bio: /bio/joao-silva               |
|------------------------------------------|
| Metricas (ultimos 30 dias):             |
|   Total visualizacoes: 450              |
|   Total cliques: 89                     |
|   Botoes mais clicados: Instagram (32)  |
|   Horario pico: 18h-20h                |
+------------------------------------------+
```
