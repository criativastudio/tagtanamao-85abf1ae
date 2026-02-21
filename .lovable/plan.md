
# Adicionar botao "Adicionar ao Carrinho" nos combos de Tag Pet

## Situacao atual

A secao de precos (`Pricing.tsx`) exibe 3 planos de combos de Tag Pet (1, 2 e 3 tags) mas cada card so tem o botao "Comprar Agora", que adiciona ao carrinho e redireciona direto ao checkout. Nao ha opcao de apenas adicionar ao carrinho sem sair da pagina.

## Alteracao

Adicionar um botao discreto com icone de carrinho ao lado (ou abaixo) do botao "Comprar Agora" em cada card de combo.

### Novo botao

- Icone: `ShoppingCart` (lucide)
- Variante: `ghost` (discreto)
- Comportamento: adiciona o produto ao carrinho, exibe toast de confirmacao, mas **nao redireciona** ao checkout
- Posicao: ao lado esquerdo do botao "Comprar Agora", na mesma linha

### Logica

Criar funcao `handleAddToCart` similar a `handleBuyNow` mas sem o `navigate("/loja/checkout")`:
- Monta o objeto `Product` igual ao `handleBuyNow`
- Chama `addToCart(product)`
- Se nao logado: redireciona para login com redirect ao checkout
- Se logado: mostra toast de confirmacao e permanece na pagina

### Layout dos botoes

```
[Icone Carrinho] [   Comprar Agora   ]
```

O botao de carrinho sera `variant="ghost" size="icon"` com classe `h-10 w-10` para ficar alinhado com o botao principal.

## Arquivo afetado

`src/components/Pricing.tsx` -- adicionar import do `ShoppingCart`, criar `handleAddToCart`, e ajustar o JSX dos botoes (linhas 179-187).
