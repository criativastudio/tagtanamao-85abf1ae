

# Diagnostico: Artes de Display funcionam no Lovable mas nao no ambiente publicado (VPS)

## Problema identificado

Existem **dois pontos criticos** que explicam por que as alteracoes funcionam dentro do Lovable mas nao no ambiente publicado na VPS:

---

## 1. Edge Functions NAO sao enviadas pelo GitHub

**Este e o problema principal.** A Edge Function `finalize-display-art` (que gera o SVG final com imagens base64, QR code, etc.) roda no **Supabase**, nao no frontend. 

- No Lovable Cloud, as Edge Functions sao deployadas automaticamente no Supabase conectado ao projeto Lovable.
- Na sua VPS, voce usa um **Supabase externo**. O codigo das Edge Functions esta na pasta `supabase/functions/` no repositorio GitHub, mas **elas nao se deployam sozinhas** -- voce precisa fazer o deploy manualmente no seu Supabase externo usando o Supabase CLI.

**Ou seja:** todas as correcoes feitas na `finalize-display-art` (embed de imagens base64, xlink:href, correcao de viewBox 2:3) **existem apenas no Supabase do Lovable**, nao no seu Supabase externo.

### Como resolver

Voce precisa fazer o deploy das Edge Functions no seu Supabase externo. No terminal da VPS (ou qualquer maquina com o Supabase CLI instalado):

```text
# 1. Certifique-se de ter o Supabase CLI instalado
npx supabase --version

# 2. Faca login (se ainda nao fez)
npx supabase login

# 3. Vincule ao seu projeto Supabase externo
npx supabase link --project-ref SEU_PROJECT_REF

# 4. Deploy de todas as Edge Functions
npx supabase functions deploy finalize-display-art --no-verify-jwt

# Ou deploy de todas de uma vez:
npx supabase functions deploy --no-verify-jwt
```

Voce tambem precisa garantir que os **secrets** (ASAAS_API_KEY, EVOLUTION_API_KEY, etc.) estejam configurados no seu Supabase externo.

---

## 2. Arquivo `sanitize.ts` -- este VAI pelo GitHub (sem problemas)

O arquivo `src/lib/sanitize.ts` (que corrigimos para permitir `data:` URIs e `xlink:href` no DOMPurify) **e um arquivo frontend**. Ele vai normalmente no commit para o GitHub e e incluido no build da VPS. Portanto, essa correcao **ja esta funcionando** no ambiente publicado.

---

## 3. Arquivo `.env` NAO e enviado pelo GitHub

O `.gitignore` contem a linha `.env`, entao o arquivo `.env` com as variaveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, etc. **nao e enviado para o GitHub**.

Porem, isso provavelmente ja esta coberto no seu setup, pois:
- O `docker-compose.yml` passa essas variaveis como build args
- O `runtime-client.ts` tem fallback hardcoded para o Supabase do Lovable

**Atencao:** Se na VPS voce aponta para um Supabase diferente, certifique-se de que o `.env` na VPS contem as credenciais corretas do seu Supabase externo, e nao as do Lovable.

---

## Resumo

| Item | Vai pelo GitHub? | Funciona na VPS? | Acao necessaria |
|------|-----------------|-------------------|-----------------|
| `src/lib/sanitize.ts` | Sim | Sim | Nenhuma |
| `supabase/functions/finalize-display-art/` | Sim (codigo) | **Nao** (precisa deploy) | Deploy via Supabase CLI |
| `.env` | **Nao** (.gitignore) | Depende | Verificar variaveis na VPS |
| Outras Edge Functions | Sim (codigo) | **Nao** (precisa deploy) | Deploy via Supabase CLI |

## Conclusao

O problema principal e que as **Edge Functions precisam ser deployadas separadamente** no seu Supabase externo. O GitHub recebe o codigo, mas o Supabase nao executa automaticamente o que esta na pasta `supabase/functions/` -- e necessario usar o `supabase functions deploy` via CLI.

