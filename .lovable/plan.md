

## Adicionar seção "Links Bio" na página Meus Produtos

### Problema

Atualmente, a página "Meus Produtos" lista apenas **Tags Pet** e **Displays**. Quando um usuário compra apenas o template Netflix (sem produto físico), ele recebe uma `bio_page` com `display_id = null`. Essa bio page fica "perdida" — não aparece em lugar nenhum no dashboard de produtos.

### Solução

Adicionar uma nova aba **"Links Bio"** na página `MyProducts.tsx` que lista todas as `bio_pages` do usuário que **não estão vinculadas a um display** (`display_id IS NULL`).

### Mudanças no arquivo `src/pages/customer/MyProducts.tsx`

1. **Novo estado e interface** para bio pages independentes:
   - Interface `BioPageItem` com campos `id`, `title`, `slug`, `is_active`, `profile_photo_url`, `created_at`
   - Estado `bioPages` no componente principal

2. **Fetch de bio pages** no `fetchProducts`:
   - Query: `bio_pages` WHERE `user_id = user.id` AND `display_id IS NULL`
   - Ordenado por `created_at desc`

3. **Nova aba "Links Bio"** nas Tabs (de 3 para 4 colunas):
   - `Todos` | `Tags Pet` | `Displays` | `Links Bio`

4. **Stats cards** atualizados:
   - Grid de 5 cards (ou manter 4 e substituir "Total" por "Links Bio")
   - Novo card com icone `Link` e contagem de bio pages

5. **Card de bio page** com:
   - Icone diferenciado (Link ou Globe) em cor roxa
   - Título da bio page
   - Slug como subtítulo
   - Status ativo/inativo (em vez de "ativado/aguardando")
   - Botão "Ver página" abrindo `/bio/{slug}`
   - Botão "Editar" navegando para `/dashboard/bio/{id}`

6. **Busca** inclui bio pages no filtro por título ou slug

7. **Aba "Todos"** inclui bio pages junto com tags e displays

### Detalhes técnicos

- A tabela `bio_pages` já tem RLS que permite `SELECT` para o dono (`auth.uid() = user_id`)
- Nenhuma alteração de banco de dados necessária
- O filtro `display_id IS NULL` garante que bio pages vinculadas a displays não apareçam duplicadas (elas já aparecem indiretamente via o display)

