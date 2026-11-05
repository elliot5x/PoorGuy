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
- `WAITLIST_EMAIL_FROM`
- `PUBLIC_SITE_URL`
- `ALLOWED_ORIGINS`
- `ADMIN_SESSION_SECRET`
- `UNSUBSCRIBE_SECRET`

`WAITLIST_EMAIL_FROM` deve usar um domínio verificado no Resend.
`PUBLIC_SITE_URL` deve ser `https://elliot5x.github.io/PoorGuy`.
`ALLOWED_ORIGINS` pode ser vazio, ou conter origens adicionais separadas por vírgula, por exemplo:
`https://seudominio.com.br,https://www.seudominio.com.br`.

A migration `20261105000000_waitlist_hardening.sql` cria o controle persistente de taxa por IP/e-mail
e os campos de expiração e horário do último envio de confirmação.

Ao reenviar confirmação para um cadastro pendente, o backend substitui o hash de descadastro.
Por isso, links de descadastro enviados em mensagens anteriores desse mesmo cadastro deixam de valer.

## 2. Front-end

No deploy do GitHub Pages, configure a URL pública da função uma única vez em `assets/js/waitlist-config.js`, na propriedade `endpoint`.
Ela deve apontar para a mesma URL da função, terminando em `/waitlist`.
Os scripts públicos de cadastro, confirmação, descadastro e administração usam essa configuração.

## 3. Painel administrativo

Acesse `pages/admin/waitlist.html`. Entre com `ADMIN_PASSWORD`. Após o login, o navegador guarda temporariamente em `sessionStorage` uma sessão HMAC assinada com `ADMIN_SESSION_SECRET`, válida por 30 minutos.

## 4. Exigências operacionais

- Resend precisa de domínio e remetente verificados.
- Revise o domínio e os templates antes do envio.
- Substitua os textos da Política de Privacidade pelo responsável legal da empresa antes do lançamento público.
- Não coloque a service role key, a API key do Resend ou o token administrativo em nenhum arquivo do front-end.

## 5. Teste com curl

Cadastro válido:

```bash
curl -i -X POST "https://SEU-PROJECTO.supabase.co/functions/v1/waitlist?action=subscribe" \
  -H "Origin: https://elliot5x.github.io" \
  -H "Content-Type: application/json" \
  --data '{"email":"teste@example.com","interest":"request_support","consent":true,"hp":""}'
```

Confirmação:

```bash
curl -i -X POST "https://SEU-PROJECTO.supabase.co/functions/v1/waitlist?action=verify" \
  -H "Origin: https://elliot5x.github.io" \
  -H "Content-Type: application/json" \
  --data '{"token":"TOKEN_DO_EMAIL"}'
```
