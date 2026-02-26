

## Exibição de todos os tipos de produto na Landing Page e Loja

### Problema

Atualmente, a landing page (`Products.tsx`) e a loja (`Shop.tsx`) buscam apenas da tabela `products` e exibem badges com lógica binária: "Para Pets" (pet_tag) ou "Para Empresas" (tudo mais). Isso causa dois problemas:

1. **Produtos nfc_tag e nfc_card** — já são salvos na tabela `products`, então já aparecem nas páginas, mas com o badge genérico "Para Empresas" em vez de labels específicos
2. **Templates** — ficam na tabela `display_templates`, que não é consultada por nenhuma das duas páginas, logo nunca aparecem

### Solução

#### 1. Mapa de labels e cores por tipo (`Products.tsx` e `Shop.tsx`)

Substituir a lógica binária de badges por um mapa completo:

| type | Label | Cor |
|---|---|---|
| `pet_tag` | Para Pets | verde (primary) |
| `business_display` | Para Empresas | azul (glow-secondary) |
| `nfc_tag` | Tag Celular | âmbar |
| `nfc_card` | Card NFC | roxo |
| `template` | Template Digital | rosa |

#### 2. Incluir templates na listagem (`Products.tsx` e `Shop.tsx`)

Além da query em `products`, fazer uma segunda query em `display_templates` (onde `is_active = true`), mapear os resultados para a interface `Product` e mesclá-los na lista exibida:

```text
display_templates → Product mapping:
  id         → id
  name       → name
  description→ description
  price      → price
  "template" → type
  preview_url→ image_url
  is_active  → is_active
  null       → gallery_images
  created_at → created_at
```

#### 3. Botão "Comprar" para templates

Na landing e na loja, templates funcionam como qualquer produto: adicionados ao carrinho e comprados normalmente. O fluxo pós-compra (criação de bio_page, ativação) continua sendo tratado pelo checkout existente.

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `src/components/Products.tsx` | Buscar `display_templates` ativos, mesclar na lista, atualizar badges com mapa de tipos/cores |
| `src/pages/customer/Shop.tsx` | Mesma lógica: buscar templates, mesclar, atualizar labels de tipo |

### Nenhuma alteração de banco necessária

Ambas as tabelas já têm RLS que permite SELECT público de itens ativos.

