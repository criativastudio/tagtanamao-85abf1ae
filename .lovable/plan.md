

## Status: ✅ Implementado

A funcionalidade de visibilidade por produto foi implementada com sucesso:

- **Banco de dados**: Coluna `visibility TEXT NOT NULL DEFAULT 'both'` adicionada à tabela `products`.
- **Tipo** (`src/types/ecommerce.ts`): Campo `visibility?: string` adicionado ao `Product`.
- **Admin** (`src/pages/admin/ProductsManager.tsx`): RadioGroup com 3 opções (Landing / Loja / Ambos) no formulário de criação/edição.
- **Landing Page** (`src/components/Products.tsx`): Filtra por `.in('visibility', ['landing', 'both'])`.
- **Loja** (`src/pages/customer/Shop.tsx`): Filtra por `.in('visibility', ['shop', 'both'])`.
