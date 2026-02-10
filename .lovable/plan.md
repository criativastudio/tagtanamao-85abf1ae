

# Correcao: Marcacao de Corte Quadrada nos Ultimos 12 QR Codes

## Problema Identificado

Na funcao `exportCategoryAsSVG` (tanto em `UserSettings.tsx` quanto em `AdminDashboard.tsx`), o tipo de marcacao de corte (circular vs quadrada) e determinado apenas pelo **primeiro codigo da categoria**:

```
const codeType = category.codes[0]?.type || 'pet_tag';
const isDisplay = codeType === 'business_display';
```

Se os ultimos codigos da categoria forem de tipo diferente (ex: `business_display` misturados com `pet_tag`), o SVG gera **todas** as marcas de corte como circulos (baseado no primeiro item), porem as imagens PNG geradas pelo canvas renderizam individualmente conforme o tipo de cada codigo -- criando conflito visual nos ultimos 12 itens.

Alem disso, a renderizacao no canvas para `business_display` desenha um `strokeRect` (marca quadrada) embutido na imagem PNG, que aparece sobreposta a marca circular do SVG.

## Solucao

Alterar a logica de geracao de marcas de corte no SVG para verificar o tipo **individual** de cada codigo, em vez de usar o tipo do primeiro codigo para todos. Isso garante que cada QR Code receba a marca de corte correta (circulo para Pet Tag, quadrado para Display).

## Detalhes Tecnicos

### Arquivo 1: `src/pages/customer/UserSettings.tsx`

**Funcao `exportCategoryAsSVG` (linhas 470-483):**
- Alterar o loop de geracao de cut marks para verificar `codesToExport[index].type` individualmente
- Cada codigo recebe `<circle>` ou `<rect>` conforme seu proprio tipo

**Antes:**
```typescript
codesToExport.forEach((code, index) => {
  // ...posicao calculada...
  if (isDisplay) {  // <-- usa flag global do primeiro item
    svgContent += `<rect .../>`;
  } else {
    svgContent += `<circle .../>`;
  }
});
```

**Depois:**
```typescript
codesToExport.forEach((code, index) => {
  // ...posicao calculada...
  const codeIsDisplay = code.type === 'business_display';
  const codeItemSize = codeIsDisplay ? DISPLAY_SIZE_MM : QR_DIAMETER_MM;
  if (codeIsDisplay) {
    const halfSize = codeItemSize / 2;
    svgContent += `<rect .../>`;
  } else {
    svgContent += `<circle .../>`;
  }
});
```

### Arquivo 2: `src/pages/AdminDashboard.tsx`

**Exportacao 1m² (linhas 665-673):**
- Este path forca todas as marcas como circulos para os 1368 itens (684 QR + 684 logos)
- Manter circulos para todas as posicoes, pois a exportacao 1m² e exclusiva para Pet Tags

**Exportacao por categoria (linhas 760-778):**
- Mesma correcao do UserSettings: verificar o tipo de cada codigo individualmente em vez de usar `isDisplay` global

### Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/customer/UserSettings.tsx` | Cut marks individuais por tipo de codigo |
| `src/pages/AdminDashboard.tsx` | Cut marks individuais na exportacao por categoria |

### Sem alteracao no banco de dados

Apenas logica de renderizacao SVG e ajustada.

