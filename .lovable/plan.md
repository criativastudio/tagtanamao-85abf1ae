

## Plano: Corrigir desativação do template Netflix

### Problema
Ao desativar o template, o código faz `update({ active_template_id: null, template_config: {} })` — isso apaga todo o `template_config` (mídias, textos, botões especiais). Quando o usuário reativa, os dados foram perdidos.

### Correção
Remover `template_config: {}` de todas as chamadas de desativação. Apenas setar `active_template_id: null`. Assim os dados ficam preservados no `template_config` e, ao reativar, tudo é restaurado.

### Arquivos afetados (4 ocorrências)

1. **`src/components/display/DisplayTemplateSelector.tsx`** (linha 113)
   - `update({ active_template_id: null })` — remover `template_config: {}`

2. **`src/pages/customer/DisplayTemplateManager.tsx`** (linha 132)
   - Mesmo fix

3. **`src/pages/admin/DisplayTemplatesManager.tsx`** (linha 208)
   - Mesmo fix

4. **`src/components/admin/TemplatesTabContent.tsx`** (linha 221)
   - Mesmo fix

### Comportamento após correção
- **Desativar** → `active_template_id = null`, página pública exibe layout padrão (Bio Page), dados do Netflix permanecem em `template_config`
- **Reativar** → `active_template_id` volta ao ID do template, todos os dados anteriores são restaurados automaticamente

