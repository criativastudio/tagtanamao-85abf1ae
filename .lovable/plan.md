## Criar página de gerenciamento para Links Bio com seletor de templates

### Contexto

Atualmente, ao clicar "Editar" em um link bio na aba "Links Bio" de Meus Produtos, o usuário é redirecionado para `/dashboard/bio/{id}` (o editor de bio padrão). O usuário quer que essa tela seja à mesma do DisplaysManager, com seção de templates premium (comprar, ativar, desativar, voltar ao padrão), conforme o print anexado.

### Problema

O `DisplayTemplateSelector` atual depende de um `displayId` para funcionar — ele ativa templates na tabela `business_displays.active_template_id`. Bio pages standalone (sem display vinculado) não têm esse vínculo, então o seletor de templates não funciona para elas.

### Solução

Criar uma nova página `BioLinkManager` que replica a experiência do `DisplaysManager` para bio pages standalone, incluindo:

#### 1. Nova página: `src/pages/customer/BioLinkManager.tsx`

Uma página dedicada acessada via `/dashboard/bio-link/{id}` que exibe:

- **Header** com botão voltar, título "Gerenciar Link Bio" e botões "Ver Página" / "Editar" / "Salvar"
- **Stats**: visualizações (da tabela `bio_page_analytics`), última visualização, quantidade de botões
- **Informações básicas**: título, subtítulo/descrição, slug (URL), status ativo/inativo
- **Cor do tema**: baseado no `theme.primaryColor` da bio page
- **Botões/Links**: lista dos botões configurados na bio page
- **Templates Premium**: componente `DisplayTemplateSelector` adaptado (ou um novo `BioTemplateSelector`) que permite comprar/ativar/desativar templates para a bio page
- **Link "Personalizar (TEMPLATE PADRÃO)"**: redireciona para `/dashboard/bio/{id}` (o editor completo de bio)

#### 2. Adaptação do seletor de templates para bio pages

Duas opções:

**Opção A — Criar display virtual**: Quando o usuário ativa um template em uma bio page standalone, criar automaticamente um `business_display` virtual (sem código QR físico) e vincular a bio page a ele via `display_id`. Isso permite reutilizar o `DisplayTemplateSelector` sem alteração.

**Opção B (recomendada) — Novo componente `BioTemplateSelector**`: Um componente similar ao `DisplayTemplateSelector` mas que opera na `bio_page` diretamente. Em vez de setar `active_template_id` no `business_displays`, ele armazena a referência do template ativo na própria bio page (via um campo `active_template_id` na tabela `bio_pages`, ou via a config do tema).

Recomendo a **Opção A** por ser mais simples e reutilizar toda a infra existente de templates. Quando o usuário ativa um template premium:

1. Cria-se um `business_display` sem `qr_code` físico (ou com um código gerado internamente)
2. Vincula a bio_page a esse display via `display_id`
3. O `DisplayTemplateSelector` funciona normalmente

#### 3. Atualizar rota em `App.tsx`

Adicionar rota `/dashboard/bio-link/:id` apontando para `BioLinkManager`.

#### 4. Atualizar MyProducts.tsx

Mudar o botão "Editar" dos bio links para navegar para `/dashboard/bio-link/{id}` em vez de `/dashboard/bio/{id}`.

### Arquivos a criar/editar


| Arquivo                                 | Ação                                                       |
| --------------------------------------- | ---------------------------------------------------------- |
| `src/pages/customer/BioLinkManager.tsx` | **Criar** — página de gerenciamento estilo DisplaysManager |
| `src/App.tsx`                           | **Editar** — adicionar rota `/dashboard/bio-link/:id`      |
| `src/pages/customer/MyProducts.tsx`     | **Editar** — mudar navegação do botão "Editar"             |


### Alteração de banco de dados

Nenhuma alteração necessária se usarmos a Opção A (criar display virtual ao ativar template). O `DisplayTemplateSelector` e toda a infra de templates continuam funcionando como estão.

### Detalhes técnicos

- A página `BioLinkManager` busca a bio page por ID, exibe seus dados no formato visual do DisplaysManager
- O `DisplayTemplateSelector` é incluído condicionalmente: se a bio page já tem um `display_id`, usa-o; se não, o seletor cria um display virtual ao ativar o primeiro template
- O link "Personalizar (TEMPLATE PADRÃO)" continua levando ao BioEditor existente (`/dashboard/bio/{id}`)
- Analytics são buscados da tabela `bio_page_analytics` filtrando por `bio_page_id`