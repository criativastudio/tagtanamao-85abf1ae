
# Cor do Texto do Nome da Empresa no Personalizar Display

## Resumo
Adicionar um seletor de cor para o texto do nome da empresa no customizador de display, permitindo que o usuario escolha a cor que melhor combina com o template selecionado. A cor sera salva no banco de dados e utilizada tanto no preview em tempo real quanto na arte final gerada pela edge function.

## Alteracoes

### 1. Adicionar coluna `text_color` na tabela `display_arts`
- Nova coluna `text_color` do tipo `text`, valor padrao `#000000`
- Migracao SQL simples

### 2. Atualizar `DisplayArtCustomizer.tsx`
- Adicionar estado `textColor` (inicializado com valor do banco ou `#000000`)
- Passar `textColor` para `buildPreviewSvg` no lugar do `#000000` fixo
- Adicionar um seletor de cor no card "3. Nome da Empresa" com:
  - Input nativo `type="color"` estilizado
  - Paleta rapida com cores pre-definidas (preto, branco, vermelho, azul, dourado, verde)
- Salvar a cor no banco ao alterar (mesma logica do `handleSaveCompanyName`)

### 3. Atualizar Edge Function `finalize-display-art`
- Buscar o campo `text_color` do registro `display_arts`
- Usar esse valor no atributo `fill` do elemento `<text>` do nome da empresa no SVG final (linha 144), substituindo o `#000000` fixo

## Detalhes tecnicos

### Migracao SQL
```sql
ALTER TABLE public.display_arts ADD COLUMN text_color text DEFAULT '#000000';
```

### DisplayArtCustomizer.tsx

Funcao `buildPreviewSvg` recebe novo parametro `textColor`:
```typescript
function buildPreviewSvg(svgContent, positions, logoUrl, companyName, logoZoom, textColor) {
  // ...
  textEl.setAttribute('fill', textColor);
  // ...
}
```

UI no card do nome da empresa — paleta de cores rapidas + input color:
```typescript
const COLOR_PRESETS = [
  { label: 'Preto', value: '#000000' },
  { label: 'Branco', value: '#FFFFFF' },
  { label: 'Vermelho', value: '#DC2626' },
  { label: 'Azul', value: '#2563EB' },
  { label: 'Dourado', value: '#D4A843' },
  { label: 'Verde', value: '#16A34A' },
];
```

### Edge Function `finalize-display-art`
Linha 144 atualizada:
```typescript
fill="${displayArt.text_color || '#000000'}"
```

### Arquivos afetados
1. Migracao SQL — nova coluna `text_color`
2. `src/pages/customer/DisplayArtCustomizer.tsx` — estado, UI e preview
3. `supabase/functions/finalize-display-art/index.ts` — usar cor na arte final
