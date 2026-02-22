
# Foto de Perfil no Botao "Salvar Contato" (vCard)

## O que muda

Ao configurar um botao "Salvar Contato" no editor de displays, o usuario podera enviar uma foto de perfil. Quando alguem clicar em "Salvar Contato" na pagina publica, o arquivo .vcf gerado incluira a imagem, e o contato sera salvo no celular com foto.

## Como funciona

### 1. Campo de upload no editor (SpecialButtonFields.tsx)

Adicionar um campo de upload de imagem abaixo do campo "Nome" no formulario de vCard. O usuario clica para selecionar uma foto, a imagem e comprimida (reutilizando a logica existente de compressao) e enviada para o storage no bucket `bio-images` na pasta `vcard-photos/`. A URL publica e armazenada como 9o campo separado por `|` na string de dados do botao.

### 2. Atualizacao do formato de dados

O campo `url` do botao passa de 8 para 9 campos:
```
nome|telefone|email|website|endereco|instagram|facebook|empresa|foto_url
```

### 3. Geracao do vCard com foto (buttonActions.ts)

Ao gerar o .vcf, se houver URL de foto, o sistema:
- Faz fetch da imagem
- Converte para base64
- Adiciona a propriedade `PHOTO;ENCODING=b;TYPE=JPEG:` no vCard

Isso e compativel com iOS, Android e a maioria dos apps de contatos.

### 4. Download assincrono

Como a conversao da imagem para base64 requer um fetch, as funcoes `generateVCard` e o handler de clique nos botoes de contato passam a ser assincronas. O download do .vcf aguarda a conversao antes de iniciar.

## Detalhes tecnicos

### Arquivos afetados

1. **src/components/bio/SpecialButtonFields.tsx**
   - Adicionar input de upload de foto com preview e botao de remover
   - Logica de upload para `bio-images/vcard-photos/`
   - Compressao via `compressImage` existente (tipo 'profile', 400x400)
   - Atualizar `parseVCardUrl` para incluir campo `photoUrl` (indice 8)
   - Atualizar `updateVCard` para serializar o 9o campo

2. **src/lib/buttonActions.ts**
   - Adicionar campo `photoUrl` em `parseVCardData`
   - Tornar `generateVCard` async
   - Se `photoUrl` existir: fetch da imagem, converter para base64, incluir `PHOTO;ENCODING=b;TYPE=JPEG:base64data`

3. **src/pages/PublicBioPage.tsx**
   - Tornar o handler do botao Contact async (await generateVCard)

4. **src/pages/PublicDisplayPage.tsx**
   - Mesma alteracao: await no generateVCard

### UI do upload no editor

- Miniatura circular da foto (se ja enviada) com botao "X" para remover
- Botao "Enviar foto do contato" com icone de camera
- Indicador de loading durante upload
- Aceita apenas imagens (accept="image/*")
