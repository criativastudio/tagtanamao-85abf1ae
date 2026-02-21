
# Melhorar Layout da Lista de Pedidos - Admin

## Problema atual

A tabela de pedidos tem 8 colunas densas, com badges, textos pequenos e muitas acoes comprimidas na mesma linha. Em telas menores fica ainda pior. A hierarquia visual nao esta clara -- tudo tem o mesmo peso visual.

## Solucao: Layout em Cards

Substituir a tabela por um layout de cards responsivos. Cada card representa um pedido com hierarquia visual clara:

### Estrutura de cada card

```text
+----------------------------------------------------------+
|  #a1b2c3d4    Pendente [badge]       14/02/2025 10:30     |
|----------------------------------------------------------|
|  Joao Silva                                               |
|  joao@email.com                                          |
|----------------------------------------------------------|
|  Tag Pet Inteligente (Pet Tag) x1                        |
|  Display Acrilico (Display Empresarial) x2               |
|----------------------------------------------------------|
|  Total: R$ 189,90    Pgto: Confirmado [badge]            |
|  Frete: PAC - R$ 22,50                                   |
|----------------------------------------------------------|
|  [Olho] [Arte] [Etiqueta] [Declaracao] [Imprimir]       |
+----------------------------------------------------------+
```

### Hierarquia visual

1. **Linha 1 (header do card)**: ID do pedido (mono, destaque), status (badge colorido), data (muted, direita)
2. **Linha 2 (cliente)**: Nome em negrito, email abaixo em muted
3. **Linha 3 (produtos)**: Lista de itens com nome, badge de tipo e quantidade -- separados por divisor sutil
4. **Linha 4 (valores)**: Total em destaque (primary), status de pagamento como badge outline, frete em muted
5. **Linha 5 (acoes)**: Botoes de acao com tooltips, alinhados a direita

### Melhorias especificas

- **Espacamento**: padding consistente de `p-4` com `gap-3` entre secoes
- **Separadores**: `border-b border-border/50` sutis entre secoes do card
- **Tipografia**: titulos em `font-semibold text-sm`, dados secundarios em `text-xs text-muted-foreground`
- **Badges**: tamanho consistente, sem badges minusculos de 10px
- **Responsivo**: cards empilham naturalmente em mobile sem scroll horizontal

### Manter tabela no dialog de detalhes

O dialog de detalhes continua com tabela pois mostra poucos itens e funciona bem ali. Apenas ajustar espacamento interno.

## Arquivos afetados

1. `src/pages/admin/OrdersManager.tsx` -- substituir bloco da tabela (linhas 610-744) por layout de cards

## O que NAO muda

- Logica de fetch, filtros, busca
- Stats cards no topo
- Dialog de detalhes (apenas ajustes menores de espacamento)
- Todas as funcoes de acao (etiqueta, arte, declaracao, etc)
- Filtros e barra de busca
