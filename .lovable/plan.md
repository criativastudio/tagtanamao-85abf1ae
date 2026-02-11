

# Menu Financeiro - Dashboard Admin

## Resumo
Criar uma nova pagina `/admin/financeiro` com painel financeiro completo para o administrador, com controle de vendas, filtros por produto e periodo, graficos de analise e resultados consolidados.

## Dados Utilizados
A pagina consultara as tabelas `orders`, `order_items`, `products` e `payments` ja existentes no banco de dados. Nao sera necessario criar tabelas novas nem migracoes.

## Componentes a Criar

### 1. Pagina `src/pages/admin/FinancialDashboard.tsx`
Pagina principal com:
- Header com botao de voltar ao admin
- Cards de resumo (receita total, ticket medio, total de pedidos, pedidos pagos)
- Filtros: seletor de produto (dropdown com todos os produtos) e seletor de periodo (data inicio e data fim) com presets rapidos (7 dias, 30 dias, 90 dias)
- Grafico de barras: receita por dia no periodo selecionado (usando recharts, ja instalado)
- Grafico de pizza: distribuicao de vendas por produto
- Grafico de linha: evolucao de vendas ao longo do tempo
- Tabela resumo com totais consolidados por produto no periodo

### 2. Logica de Dados
- Buscar pedidos com status `paid`, `processing`, `shipped` ou `delivered` (excluir `pending` e `cancelled`)
- Cruzar `orders` com `order_items` e `products` para detalhar vendas por produto
- Agrupar por dia para o grafico temporal
- Calcular metricas: receita bruta, desconto total (campo `discount_amount`), receita liquida, frete total, ticket medio

## Integracao no Sistema

### 3. Rota em `src/App.tsx`
Adicionar rota `/admin/financeiro` apontando para `FinancialDashboard` dentro de `ProtectedRoute`.

### 4. Link no Admin Hub
Adicionar botao/card "Financeiro" no `AdminDashboard.tsx` (ou no `UserSettings.tsx` onde ficam os links admin), com icone `DollarSign` do lucide-react, direcionando para `/admin/financeiro`.

## Detalhes Tecnicos

- **Graficos**: `recharts` (BarChart, PieChart, LineChart) com `ResponsiveContainer`, seguindo o mesmo padrao visual de `DashboardAnalytics.tsx` (cores HSL do tema, glass-card, tooltips estilizados)
- **Filtros**: `date-fns` para manipulacao de datas, componentes `Input type="date"` e `Select` do shadcn para produto
- **Queries**: Supabase client com `.gte()` e `.lte()` no campo `created_at` dos pedidos para filtro de periodo
- **Animacoes**: `framer-motion` com `initial/animate` seguindo o padrao existente
- **Formatacao**: `Intl.NumberFormat` pt-BR para valores em BRL (mesmo padrao do `OrdersManager`)
- **Responsividade**: Grid responsivo com `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` para cards, graficos em `lg:grid-cols-2`

