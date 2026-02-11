

# Fluxo de Producao do Display Empresarial

## Resumo

Implementar o fluxo completo de personalizacao de arte para pedidos de Display Empresarial. Apos a compra, o pedido fica com status "Aguardando personalizacao". O cliente escolhe um template, envia logo e nome da empresa, e ao salvar a arte e travada, um QR Code unico e gerado e vinculado. O admin so pode baixar o PDF apos a arte estar finalizada.

## 1. Migracoes de Banco de Dados

### 1.1 Alterar constraint de status dos pedidos
O banco atual aceita apenas: pending, paid, processing, shipped, delivered, cancelled.
Precisamos adicionar: `awaiting_customization`, `art_finalized`, `ready_to_ship`.

```sql
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status = ANY (ARRAY[
    'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled',
    'awaiting_customization', 'art_finalized', 'ready_to_ship'
  ]));
```

### 1.2 Criar tabela `display_arts`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| order_id | uuid NOT NULL | Referencia ao pedido |
| order_item_id | uuid | Referencia ao item do pedido |
| user_id | uuid NOT NULL | Dono da arte |
| template_id | uuid | Template escolhido |
| logo_url | text | URL da logomarca |
| company_name | text | Nome da empresa |
| qr_code_id | uuid | Referencia ao QR Code |
| final_svg | text | SVG final renderizado |
| final_pdf_url | text | URL do PDF para impressao |
| locked | boolean DEFAULT false | Trava de edicao |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

RLS: Usuario ve/edita apenas seus registros; admin ve tudo.

### 1.3 Criar tabela `qr_codes`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| code | text UNIQUE NOT NULL | Codigo unico do QR |
| order_id | uuid | Pedido vinculado |
| display_art_id | uuid | Arte vinculada |
| is_used | boolean DEFAULT false | Se ja foi atribuido |
| created_at | timestamptz DEFAULT now() | |

RLS: Admin gerencia; usuario ve os seus via order_id.

### 1.4 Trigger de updated_at em display_arts
Reutilizar a funcao `update_updated_at_column` existente.

## 2. Alteracoes no Checkout (`Checkout.tsx`)

Apos criar o pedido e os itens, verificar se algum item e do tipo `business_display`. Se for:
- Criar registro em `display_arts` com `order_id`, `order_item_id`, `user_id`
- Alterar status do pedido para `awaiting_customization` (apos pagamento confirmado)

Na logica de confirmacao de pagamento (quando status muda para `paid`), se o pedido contem display empresarial, mudar automaticamente para `awaiting_customization`.

## 3. Nova Pagina: `DisplayArtCustomizer.tsx`

Pagina dedicada em `/personalizar-display/:displayArtId` onde o cliente:

1. **Escolhe um template** - Lista de templates ativos filtrados por `product_type = 'business_display'` ou `'display'`
2. **Envia logomarca** - Upload com preview circular (area fixa, crop circular)
3. **Digita nome da empresa** - Campo obrigatorio
4. **Preview em tempo real** - SVG do template com logo e nome sobrepostos
5. **Botao "Finalizar Arte"** que:
   - Valida que template, logo e nome estao preenchidos
   - Chama edge function `finalize-display-art` que:
     - Gera QR Code unico (UUID curto ou codigo alfanumerico)
     - Insere na tabela `qr_codes`
     - Aplica QR Code na arte SVG (posicao padrao do template)
     - Salva `final_svg` e marca `locked = true`
     - Atualiza status do pedido para `art_finalized`
   - Exibe mensagem de sucesso e impede novas edicoes

**Protecoes:**
- Se `locked = true`, todos os campos ficam desabilitados e botao muda para "Arte Finalizada"
- Nao permite salvar sem todos os campos preenchidos

## 4. Edge Function: `finalize-display-art`

Nova edge function que:
1. Recebe `displayArtId`
2. Valida que template_id, logo_url e company_name estao preenchidos
3. Gera codigo unico para QR (ex: `DSP-XXXXXX`)
4. Insere registro em `qr_codes`
5. Gera SVG final com QR Code embutido (usando biblioteca qrcode)
6. Atualiza `display_arts` com `final_svg`, `qr_code_id`, `locked = true`
7. Atualiza `orders.status` para `art_finalized`
8. Retorna sucesso

## 5. Alteracoes no Admin - OrdersManager.tsx

### 5.1 Novos status no mapa de labels e cores
```
awaiting_customization: "Aguardando Personalização" (laranja)
art_finalized: "Arte Finalizada" (verde)
ready_to_ship: "Pronto para Envio" (azul claro)
```

### 5.2 Indicador de arte no detalhe do pedido
- Se o pedido tem `display_arts` vinculado, mostrar secao "Arte do Display"
- Se `locked = false`: badge "Aguardando arte do cliente"
- Se `locked = true`: mostrar preview do SVG final + botao "Download PDF"
- Botao "Download PDF" gera PDF a partir do SVG (client-side ou via storage)

### 5.3 Regra de bloqueio de producao
- O botao para mudar status para `processing` so aparece se todas as artes do pedido estiverem com `locked = true`
- Mensagem de aviso se houver arte pendente

## 6. Alteracoes em MyOrders.tsx (area do cliente)

### 6.1 Novos status visíveis
- `awaiting_customization`: badge laranja "Personalizar Arte" com botao que leva a `/personalizar-display/:id`
- `art_finalized`: badge verde "Arte Finalizada - Aguardando Producao"
- `ready_to_ship`: badge "Pronto para Envio"

### 6.2 Botao de acao
- Se status = `awaiting_customization`, mostrar botao "Personalizar Meu Display" que navega para o customizador

## 7. Rotas Novas (App.tsx)

```
/personalizar-display/:displayArtId -> DisplayArtCustomizer (protegida)
```

## 8. Tipos (ecommerce.ts)

Adicionar interfaces:
```typescript
interface DisplayArt {
  id: string;
  order_id: string;
  order_item_id: string | null;
  user_id: string;
  template_id: string | null;
  logo_url: string | null;
  company_name: string | null;
  qr_code_id: string | null;
  final_svg: string | null;
  final_pdf_url: string | null;
  locked: boolean;
  created_at: string;
  updated_at: string;
  template?: ArtTemplate;
  qr_code?: QrCode;
}

interface QrCode {
  id: string;
  code: string;
  order_id: string | null;
  display_art_id: string | null;
  is_used: boolean;
  created_at: string;
}
```

Atualizar `OrderStatus` para incluir novos valores.

## 9. Fluxo Completo Resumido

1. Cliente compra display → pedido criado com status `pending`
2. Pagamento confirmado → status muda para `awaiting_customization` + `display_arts` criado
3. Cliente acessa "Meus Pedidos" → ve botao "Personalizar" → vai para `/personalizar-display/:id`
4. Cliente escolhe template, envia logo, digita nome → clica "Finalizar Arte"
5. Backend gera QR, aplica na arte, trava edicao → status muda para `art_finalized`
6. Admin ve pedido com arte finalizada → baixa PDF → envia para grafica
7. Admin muda status para `processing` (so se arte finalizada)
8. Apos producao, admin muda para `ready_to_ship` → gera etiqueta e declaracao → envia

## Detalhes Tecnicos

- A edge function `finalize-display-art` usa `SUPABASE_SERVICE_ROLE_KEY` para atualizar tabelas com seguranca
- O QR Code gerado aponta para a URL `/display/:code` que ja existe no sistema
- O SVG final usa a posicao de QR definida no template (campo editavel tipo `qr_position` ou posicao fixa)
- Logo circular: no customizador, a preview mostra o logo com `border-radius: 50%` e `object-fit: cover`
- Config TOML: adicionar `[functions.finalize-display-art]` com `verify_jwt = true`
- Arquivos criados: `src/pages/customer/DisplayArtCustomizer.tsx`, `supabase/functions/finalize-display-art/index.ts`
- Arquivos modificados: `src/types/ecommerce.ts`, `src/App.tsx`, `src/pages/customer/Checkout.tsx`, `src/pages/customer/MyOrders.tsx`, `src/pages/admin/OrdersManager.tsx`

