

## Status: Não implementado

A funcionalidade de visibilidade por produto **ainda não foi implementada**. O plano foi aprovado na conversa anterior, mas nenhuma alteração foi executada:

- **Banco de dados**: A coluna `visibility` **não existe** na tabela `products`.
- **Admin**: O formulário de criação/edição **não possui** o campo de seleção (Landing / Loja / Ambos).
- **Landing Page** (`src/components/Products.tsx`): **Não filtra** por visibilidade.
- **Loja** (`src/pages/customer/Shop.tsx`): **Não filtra** por visibilidade.
- **Tipo** (`src/types/ecommerce.ts`): **Não possui** o campo `visibility`.

### Plano de implementação

1. **Migração**: Adicionar coluna `visibility TEXT NOT NULL DEFAULT 'both'` à tabela `products`.
2. **Tipo**: Adicionar `visibility: string` ao `Product` em `src/types/ecommerce.ts`.
3. **Admin** (`src/pages/admin/ProductsManager.tsx`): Adicionar RadioGroup ao formulário com as 3 opções, incluir `visibility` no `formData`, `handleOpenEditor` e `handleSaveProduct`.
4. **Landing Page** (`src/components/Products.tsx`): Adicionar `.in('visibility', ['landing', 'both'])` na query.
5. **Loja** (`src/pages/customer/Shop.tsx`): Adicionar `.in('visibility', ['shop', 'both'])` na query.

