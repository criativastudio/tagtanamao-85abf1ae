

## Gerenciar Secoes do Site - Pagina Dedicada

### Resumo
Criar uma pagina dedicada `/admin/secoes` para gerenciar secoes dinamicas da landing page, com formulario completo para criar/editar secoes, suporte a upload de video e link do YouTube, e edicao inline de todos os campos.

### O que muda

**1. Banco de dados**
- Criar bucket de storage `site-videos` para uploads de video direto
- Adicionar colunas `description` (TEXT) e `media_url` (TEXT) na tabela `site_sections` para armazenar descricao e URL de midia (video uploaded ou YouTube)

**2. Nova pagina `src/pages/admin/SiteSectionsPage.tsx`**
- Pagina completa acessada via `/admin/secoes`
- Header com botao voltar e "Adicionar nova secao"
- Lista de secoes existentes em cards editaveis
- Cada card mostra: titulo, descricao, tipo, midia (preview de video/YouTube), status ativo/inativo, botoes de reordenar e excluir
- Edicao inline: clicar em um card abre formulario de edicao com todos os campos
- Formulario de criacao em Dialog com campos: titulo, descricao, tipo de secao, midia (upload de video OU link YouTube), autoplay (toggle)

**3. Formulario de nova secao**
- Campo titulo (texto)
- Campo descricao (textarea)
- Tipo de secao (video / pet_slides)
- Para tipo video: opcao de colar link YouTube OU fazer upload direto de arquivo de video (armazenado no bucket `site-videos`)
- Toggle autoplay
- O config JSONB armazenara: `{ videoUrl, youtubeUrl, autoplay, description }`

**4. Integracao no painel admin**
- Adicionar item "Secoes do Site" no array `adminSettingsItems` em `UserSettings.tsx` com icone `Layout` apontando para `/admin/secoes`
- Remover o `<SiteSectionsManager />` embutido diretamente na aba Admin (substituido pelo link para a pagina dedicada)
- Adicionar rota `/admin/secoes` em `App.tsx`

**5. Edicao inline**
- Cada secao na lista tera botao "Editar" que expande um formulario inline ou abre Dialog
- Permitir alterar titulo, descricao, midia, tipo e autoplay
- Salvar alteracoes via update no banco

### Detalhes tecnicos

**Arquivos modificados:**
- `src/App.tsx` - nova rota `/admin/secoes`
- `src/pages/customer/UserSettings.tsx` - adicionar item no menu admin, remover SiteSectionsManager inline
- `supabase/migrations/` - nova migration para colunas description e media_url + bucket site-videos

**Arquivos criados:**
- `src/pages/admin/SiteSectionsPage.tsx` - pagina completa

**Migration SQL:**
```sql
-- Adicionar colunas a site_sections
ALTER TABLE public.site_sections
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Bucket para videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-videos', 'site-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket
CREATE POLICY "Admins can upload site videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-videos' AND public.is_admin());

CREATE POLICY "Admins can delete site videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-videos' AND public.is_admin());

CREATE POLICY "Anyone can view site videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-videos');
```

**Upload de video:**
- Usa Supabase Storage (`site-videos` bucket)
- Limite de 50MB por arquivo
- Aceita formatos mp4, webm, mov
- Apos upload, salva a URL publica no campo `media_url` e no `config.videoUrl`

**YouTube:**
- Aceita URLs no formato `youtube.com/watch?v=` ou `youtu.be/`
- Extrai o video ID e salva no `config.youtubeUrl`
- Preview usa iframe embed do YouTube

