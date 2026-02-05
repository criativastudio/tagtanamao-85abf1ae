
# Correção de CORS na Edge Function activate-product

## Problemas Identificados

1. **Função ausente no config.toml** - A função `activate-product` não está registrada
2. **Headers CORS incompletos** - Faltam headers que o cliente Supabase envia automaticamente
3. **Resposta OPTIONS sem status explícito** - Pode causar problemas em alguns navegadores

---

## Alterações Necessárias

### 1. Adicionar função ao config.toml

Adicionar a configuração da função `activate-product` com `verify_jwt = false` para permitir chamadas públicas:

```toml
[functions.activate-product]
verify_jwt = false
```

### 2. Atualizar CORS Headers

Atualizar os headers para incluir todos os headers enviados pelo cliente Supabase:

**De:**
```javascript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
```

**Para:**
```javascript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

### 3. Corrigir resposta OPTIONS

Adicionar status 200 explícito e body 'ok':

**De:**
```javascript
if (req.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders });
}
```

**Para:**
```javascript
if (req.method === "OPTIONS") {
  return new Response("ok", { status: 200, headers: corsHeaders });
}
```

---

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/config.toml` | Adicionar configuração da função |
| `supabase/functions/activate-product/index.ts` | Corrigir CORS headers e resposta OPTIONS |

---

## Resultado Esperado

Após as correções, a função `activate-product` aceitará requisições cross-origin corretamente, permitindo que o frontend ative produtos sem erros de CORS.
