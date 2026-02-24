

## Renderizar Secoes Dinamicas na Landing Page

### Resumo
Fazer com que as secoes cadastradas no banco (`site_sections`) sejam renderizadas automaticamente na landing page, de forma que qualquer secao criada, editada ou reordenada no painel admin apareca imediatamente no site.

### Como funciona hoje
- A landing page (`Index.tsx`) tem componentes estaticos fixos: Hero, Features, Products, HowItWorks, Pricing, Testimonials, FAQ, CTA, Footer
- O admin gerencia secoes no banco `site_sections` mas elas nao aparecem no site

### O que muda

**1. Novo componente `src/components/DynamicSections.tsx`**
- Componente que busca todas as secoes ativas do banco (`is_active = true`), ordenadas por `position`
- Para cada secao, renderiza o conteudo apropriado baseado no `section_type`:
  - **video**: Exibe video do YouTube (iframe embed com autoplay se configurado) ou video uploaded (`<video>` tag)
  - **pet_slides**: Exibe carrossel com fotos de pets encontrados (busca dados da tabela `qr_scans` ou `pet_tags` com fotos disponiveis)
- Cada secao mostra titulo e descricao (se houver)
- Usa `useQuery` do TanStack para cache e revalidacao automatica

**2. Modificacao em `src/pages/Index.tsx`**
- Importar e incluir `<DynamicSections />` entre os componentes existentes (apos Hero, antes de Features)
- As secoes estaticas existentes (Features, Products, etc.) continuam iguais - nada muda nelas

**3. Renderizacao por tipo**

Para tipo `video`:
- Se `config.youtubeId` existe: renderiza iframe do YouTube com embed, autoplay opcional via `config.autoplay`
- Se `media_url` ou `config.videoUrl` existe: renderiza tag `<video>` com controls e autoplay opcional
- Container com aspect-ratio 16:9, max-width centralizado

Para tipo `pet_slides`:
- Busca pet tags com foto (`pet_photo_url IS NOT NULL`) que foram escaneadas (pets encontrados)
- Renderiza carrossel usando Embla Carousel (ja instalado no projeto)
- Mostra foto do pet, nome e um badge "Encontrado via Tag"
- Se nao houver dados, a secao nao aparece

### Detalhes tecnicos

**Arquivos criados:**
- `src/components/DynamicSections.tsx` - componente que busca e renderiza secoes

**Arquivos modificados:**
- `src/pages/Index.tsx` - adiciona `<DynamicSections />` no layout

**Busca de dados:**
```typescript
const { data: sections } = useQuery({
  queryKey: ['site-sections-public'],
  queryFn: async () => {
    const { data } = await supabase
      .from('site_sections')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true });
    return data;
  }
});
```

**Nenhuma alteracao de banco necessaria** - a tabela `site_sections` ja tem RLS para leitura publica de secoes ativas.

**Resultado:** Ao criar ou editar uma secao no admin e ativar, ela aparece automaticamente na landing page na proxima visita (ou ao recarregar). A ordem segue o campo `position` definido no painel.
