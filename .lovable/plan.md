

## Reprodução automática de Reels nas capas — Limitação técnica e alternativa

### Problema
O Instagram **não oferece uma API pública** para obter o vídeo bruto (MP4) de um Reel apenas com a URL. O embed via `<iframe>` mostra a interface completa do Instagram (comentários, likes, botões) e **não permite controlar autoplay, mute ou tela cheia** — é uma limitação imposta pelo Instagram.

Para reproduzir um vídeo do Instagram como se fosse um vídeo nativo (autoplay, mudo, fullscreen na capa), seria necessário extrair a URL direta do MP4, o que:
- Viola os Termos de Serviço do Instagram
- Requer scraping server-side que quebra frequentemente
- Links diretos expiram rapidamente

### Alternativa viável: melhorar o iframe existente

Podemos melhorar significativamente a experiência do iframe atual:

1. **Esconder a UI do Instagram ao máximo** — usar CSS para esconder elementos do iframe (limitado por cross-origin, mas podemos escalar/cortar o iframe para mostrar apenas o vídeo)
2. **Escalar o iframe para "tela cheia"** — usar `transform: scale()` e `overflow: hidden` no container para ampliar apenas a área do vídeo do Reel, cortando a interface ao redor
3. **Estilo Netflix** — manter o aspect-ratio 2:3, com gradiente escuro por cima para integrar ao design

### Mudanças em `NetflixTemplate.tsx`

Para os itens `type === "instagram"` nas covers e thumbnails:

```tsx
<div className="w-full aspect-[2/3] overflow-hidden relative">
  <iframe
    src={`https://www.instagram.com/reel/${id}/embed/?autoplay=1&mute=1`}
    className="absolute border-0"
    style={{
      width: "300%",
      height: "300%",
      top: "-100%",
      left: "-100%",
      transform: "scale(0.5)",
      transformOrigin: "center center",
      pointerEvents: "none"
    }}
    allow="autoplay; encrypted-media"
    allowFullScreen
    scrolling="no"
  />
</div>
```

- `pointerEvents: "none"` para que o hover do Netflix funcione por cima
- Container com `overflow: hidden` corta a UI extra do Instagram
- Parâmetros `autoplay=1&mute=1` na URL do embed (o Instagram nem sempre respeita, mas vale tentar)
- Gradiente escuro por cima para disfarçar bordas

### Arquivos modificados
- **`src/components/display/NetflixTemplate.tsx`**: atualizar renderização de `type === "instagram"` nas covers e thumbnails para usar iframe escalado com autoplay/mute e overflow hidden

### Limitação importante
Mesmo com essas melhorias, o embed do Instagram **não garante autoplay silencioso** — depende do navegador e das políticas do Instagram. Para reprodução perfeita, a recomendação é que o usuário faça **upload direto do vídeo** (que já é suportado), o que dá controle total sobre autoplay, mute e tela cheia.

