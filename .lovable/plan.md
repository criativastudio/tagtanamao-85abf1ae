

## Plano: Campo de visibilidade por produto

### Banco de dados
Adicionar coluna `visibility` na tabela `products` com 3 valores possíveis: `landing`, `shop`, `both` (default: `both`).

```sql
ALTER TABLE products ADD COLUMN visibility TEXT NOT NULL DEFAULT 'both';
```

### Admin (`src/pages/admin/ProductsManager.tsx`)
Adicionar ao formulário de criação/edição um campo RadioGroup com 3 opções:
- Mostrar apenas na Landing Page (`landing`)
- Mostrar apenas na Loja (`shop`)
- Mostrar em ambos (`both`)

O `formData` ganha o campo `visibility` (default `both`). O `handleOpenEditor` carrega o valor salvo. O `handleSaveProduct` inclui `visibility` no `productData`.

### Tipo (`src/types/ecommerce.ts`)
Adicionar `visibility: string` ao `Product` interface.

### Landing Page (`src/components/Products.tsx`)
Filtrar produtos regulares: adicionar `.in('visibility', ['landing', 'both'])` na query.

### Loja (`src/pages/customer/Shop.tsx`)
Filtrar produtos regulares: adicionar `.in('visibility', ['shop', 'both'])` na query.

### Templates (`display_templates`)
Templates já possuem controle `show_on_landing` separado. Esse novo campo aplica-se apenas à tabela `products`.

