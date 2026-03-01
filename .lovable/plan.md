

## Plano: Adicionar redefinição de senha na página de Auth

### Alterações necessárias

#### 1. `src/pages/Auth.tsx`
- Adicionar estado `isForgotPassword` para controlar a exibição do formulário de "esqueci minha senha"
- Quando ativo, mostrar apenas o campo de email + botão "Enviar link de redefinição"
- Chamar `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/redefinir-senha' })`
- Adicionar link "Esqueceu sua senha?" abaixo do campo de senha no modo login
- Botão para voltar ao login

#### 2. Criar `src/pages/ResetPassword.tsx`
- Página pública para definir nova senha após clicar no link do email
- Detectar token de recovery na URL hash (`type=recovery`)
- Formulário com campo de nova senha + confirmação
- Chamar `supabase.auth.updateUser({ password })` para atualizar
- Redirecionar ao `/dashboard` após sucesso

#### 3. `src/App.tsx`
- Adicionar rota pública `/redefinir-senha` apontando para `ResetPassword`

### Resumo do fluxo
1. Usuário clica "Esqueceu sua senha?" na tela de login
2. Digita o email e clica enviar
3. Recebe email com link para `/redefinir-senha`
4. Na página, digita a nova senha e confirma
5. Senha atualizada, redirecionado ao dashboard

