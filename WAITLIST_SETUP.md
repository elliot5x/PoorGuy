# Configuração da lista de espera

## 1. Supabase

1. Crie um projeto no Supabase.
2. Execute `supabase db push` neste repositório ou aplique a migration de `supabase/migrations`.
3. Implante a função:

```bash
supabase functions deploy waitlist --no-verify-jwt
```

Configure os seguintes segredos, sempre no Supabase, nunca no GitHub:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `ADMIN_PASSWORD`
- `ADMIN_TOKEN`
- `WAITLIST_EMAIL_FROM`
- `PUBLIC_SITE_URL`

`WAITLIST_EMAIL_FROM` deve usar um domínio verificado no Resend.
`PUBLIC_SITE_URL` deve ser `https://elliot5x.github.io/PoorGuy`.

## 2. Front-end

No deploy do GitHub Pages, configure a URL pública da função nos seguintes arquivos:

- `assets/js/waitlist.js`: `WAITLIST_ENDPOINT`
- `assets/js/waitlist-confirmacao.js`: `WAITLIST_CONFIRM_ENDPOINT`
- `assets/js/waitlist-descadastro.js`: `WAITLIST_UNSUBSCRIBE_ENDPOINT`
- `assets/js/waitlist-admin.js`: `WAITLIST_ADMIN_ENDPOINT`

Todos devem apontar para a mesma URL da função, terminando em `/waitlist`.

## 3. Painel administrativo

Acesse `pages/admin/waitlist.html`. Entre com `ADMIN_PASSWORD`. O navegador recebe temporariamente o `ADMIN_TOKEN` em memória. A senha e o token não são armazenados nem escritos no código-fonte.

## 4. Exigências operacionais

- Resend precisa de domínio e remetente verificados.
- Revise o domínio e os templates antes do envio.
- Substitua os textos da Política de Privacidade pelo responsável legal da empresa antes do lançamento público.
- Não coloque a service role key, a API key do Resend ou o token administrativo em nenhum arquivo do front-end.
