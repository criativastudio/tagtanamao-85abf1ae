

# Ajustes no Painel Admin

## 1. Botao "Apagar Tag" na Exportacao para Impressao (UserSettings.tsx)

Na aba **Exportar**, adicionar um botao "Apagar Tag" que aparece quando ha itens selecionados na lista de QR Codes Disponiveis. Ao clicar, exibe um dialog de confirmacao e deleta as tags/displays selecionadas do banco de dados (tabelas `pet_tags` e `business_displays`), removendo-as tambem da lista local e das categorias.

**Localizacao no codigo:** `src/pages/customer/UserSettings.tsx`, linhas 770-823 (secao "QR Codes Disponiveis"), ao lado do botao "Selecionar todos".

**Comportamento:**
- Botao vermelho "Apagar Tag" visivel somente quando `selectedCodes.size > 0`
- AlertDialog de confirmacao antes de excluir
- Deleta de `pet_tags` ou `business_displays` conforme o tipo
- Atualiza estados locais (`petTags`, `displays`, `categories`)
- Toast de sucesso/erro

---

## 2. Criacao Manual de QR Code no Gerador (AdminDashboard.tsx)

Na pagina do **Gerador de QR Codes** (`/admin`), adicionar uma secao "Criar QR Code Manual" com:

- Campo de texto para digitar o codigo (somente numerico, max 6 caracteres)
- Select para escolher o tipo: Pet Tag ou Meu Display
- Botao "Criar"
- Validacao em tempo real:
  - Aceita apenas digitos (0-9)
  - Maximo 6 caracteres
  - Verifica duplicidade no banco (`pet_tags` + `business_displays`) antes de inserir
- Ao criar, insere no banco e adiciona a lista de codigos gerados

**Localizacao no codigo:** `src/pages/AdminDashboard.tsx`, novo card entre os geradores existentes e a lista de codigos gerados (apos linha 803).

---

## Detalhes Tecnicos

### UserSettings.tsx - Novo botao e funcao de exclusao

Adicionar:
- Import de `Trash2` do lucide-react e `AlertDialog` components
- Estado `showDeleteConfirm` para o dialog
- Funcao `deleteSelectedTags` que:
  1. Separa codigos por tipo (pet_tag vs business_display)
  2. Deleta em lote via `.in('id', ids)` em cada tabela
  3. Remove dos estados `petTags`, `displays` e `categories`
  4. Limpa `selectedCodes`
- Botao ao lado de "Selecionar todos" / "X selecionado(s)"
- AlertDialog de confirmacao

### AdminDashboard.tsx - Secao de criacao manual

Adicionar:
- Estados: `manualCode`, `manualType`
- Funcao `createManualQRCode` que:
  1. Valida formato (regex `/^\d{1,6}$/`)
  2. Verifica duplicidade em ambas tabelas
  3. Insere no banco
  4. Gera QR code visual e adiciona ao `generatedCodes`
- Card com Input (pattern numerico, maxLength 6), Select (tipo), e Button

### Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/customer/UserSettings.tsx` | Botao "Apagar Tag" + AlertDialog de confirmacao |
| `src/pages/AdminDashboard.tsx` | Secao de criacao manual de QR Code |

### Sem alteracao no banco de dados

Ambas as funcionalidades usam as tabelas `pet_tags` e `business_displays` existentes sem necessidade de mudancas no schema.

