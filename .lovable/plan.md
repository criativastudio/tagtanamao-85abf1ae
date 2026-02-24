

## Adicionar Botões "Criar Conta" e "Login" nas Páginas de QR Code Não Ativado

### Resumo
Adicionar botões de "Criar Conta" e "Login" abaixo da mensagem "Aguardando Ativação" nas páginas públicas de Pet Tag e Business Display. Os botões só aparecem quando o produto não está ativado e desaparecem automaticamente após a ativação (pois o bloco inteiro de "Aguardando Ativação" deixa de ser renderizado).

### Páginas afetadas

**1. `src/pages/PublicPetPage.tsx` (linhas 327-346)**
- Bloco `if (!pet.is_activated)` — adicionar dois botões (`Link` do react-router-dom) após o texto existente:
  - "Criar Conta" → `/auth` (botão primário/glow)
  - "Já tenho conta" → `/auth` (botão outline)

**2. `src/pages/PublicDisplayPage.tsx` (linhas 282-304)**
- Bloco `if (!display.is_activated)` — mesma lógica, mesmos botões

**3. `src/pages/PublicBioPage.tsx`**
- Não se aplica — bio pages usam `is_active` (publicação) e não `is_activated` (ativação de produto físico). Não há tela de "Aguardando Ativação" nesta página.

### Comportamento
- Quando `is_activated = false`: mostra mensagem + botões de conta
- Quando `is_activated = true`: o bloco inteiro não renderiza (já funciona assim), então os botões desaparecem automaticamente
- Os botões levam à página `/auth` que já suporta login e cadastro

### Detalhes técnicos

**Arquivos modificados:**
- `src/pages/PublicPetPage.tsx` — import `Link` de react-router-dom, adicionar botões no bloco de não ativado
- `src/pages/PublicDisplayPage.tsx` — mesma alteração

Ambos já importam `Button` e `Link` (PublicPetPage importa `Link` via react-router-dom). Nenhuma dependência nova necessária.

