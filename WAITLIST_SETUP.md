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
- `ADMIN_USERNAME`
- `WAITLIST_EMAIL_FROM`
- `PUBLIC_SITE_URL`
- `ALLOWED_ORIGINS`
- `ADMIN_SESSION_SECRET`
- `UNSUBSCRIBE_SECRET`
- `SIGNUP_ENABLED`
- `BROADCAST_ENABLED`

`WAITLIST_EMAIL_FROM` deve usar um domínio verificado no Resend.
`PUBLIC_SITE_URL` deve ser `https://elliot5x.github.io/PoorGuy`.
`ALLOWED_ORIGINS` pode ser vazio, ou conter origens adicionais separadas por vírgula, por exemplo:
`https://seudominio.com.br,https://www.seudominio.com.br`.

`SIGNUP_ENABLED` controla novos cadastros; o padrão é `true`. Para desativar o cadastro sem
revelar que está desligado, configure `false`:

```bash
supabase secrets set SIGNUP_ENABLED=false
supabase functions deploy waitlist --no-verify-jwt
```

Para voltar a aceitar cadastros:

```bash
supabase secrets set SIGNUP_ENABLED=true
supabase functions deploy waitlist --no-verify-jwt
```

`BROADCAST_ENABLED` controla o envio de mensagens em massa e testes. O padrão seguro é
desligado; somente o valor exato `true` habilita o envio:

```bash
supabase secrets set BROADCAST_ENABLED=false
supabase functions deploy waitlist --no-verify-jwt
```

Para ligar os envios:

```bash
supabase secrets set BROADCAST_ENABLED=true
supabase functions deploy waitlist --no-verify-jwt
```

A migration `20261105000000_waitlist_hardening.sql` cria o controle persistente de taxa por IP/e-mail
e os campos de expiração e horário do último envio de confirmação.

A migration `20261107000000_waitlist_security.sql` revoga o acesso da Data API aos papéis `anon` e
`authenticated` nas sete tabelas do waitlist, ativa RLS forçado e impede que tabelas futuras criadas
no schema `public` recebam privilégio padrão nessas APIs.

Execute `supabase/scripts/verify_waitlist_rls.sql` no SQL Editor somente para conferência. Para testar
a Data API com a chave pública, sem executar `db push`:

```bash
SUPABASE_URL=https://SEU-PROJECTO.supabase.co \
SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA \
./supabase/scripts/test_waitlist_anon_api.sh
```

Ao reenviar confirmação para um cadastro pendente, o backend substitui o hash de descadastro.
Por isso, links de descadastro enviados em mensagens anteriores desse mesmo cadastro deixam de valer.

## 2. Front-end

No deploy do GitHub Pages, configure a URL pública da função uma única vez em `assets/js/waitlist-config.js`, na propriedade `endpoint`.
Ela deve apontar para a mesma URL da função, terminando em `/waitlist`.
Os scripts públicos de cadastro, confirmação, descadastro e administração usam essa configuração.

## 3. Painel administrativo

Acesse `pages/admin/waitlist.html`. Entre com `ADMIN_USERNAME` e `ADMIN_PASSWORD`.
Configure ambos como segredos separados do Supabase:

```bash
supabase secrets set ADMIN_USERNAME="seu-usuario"
supabase secrets set ADMIN_PASSWORD="sua-senha"
supabase functions deploy waitlist --no-verify-jwt
```

Se `ADMIN_USERNAME` ainda não estiver configurado, o servidor aceita o campo de usuário, mas não
o exige; configure-o antes de considerar essa camada ativa. Após o login, o navegador guarda
temporariamente em `sessionStorage` uma sessão HMAC assinada com `ADMIN_SESSION_SECRET`, válida por 30 minutos.

## 4. Exigências operacionais

- Resend precisa de domínio e remetente verificados.
- Revise o domínio e os templates antes do envio.
- Substitua os textos da Política de Privacidade pelo responsável legal da empresa antes do lançamento público.
- Não coloque a service role key, a API key do Resend ou o token administrativo em nenhum arquivo do front-end.

## 5. Retenção da atividade administrativa

Proposta aguardando aprovação: executar uma limpeza manual autenticada no painel que apague
eventos de `waitlist_admin_events` criados há mais de 180 dias. Essa opção evita um cron externo e
permite auditar quando a limpeza ocorreu.

Antes da aprovação, nenhuma exclusão automática foi ativada. Confirme se deseja:

1. adotar a limpeza manual acima, ou
2. adicionar uma `pg_cron`/`cron.schedule` diária.

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

### Verificar bloqueio de envio sem o segredo

Remova o segredo, redeploy e faça login no painel para obter um token administrativo:

```bash
supabase secrets unset BROADCAST_ENABLED
supabase functions deploy waitlist --no-verify-jwt

ADMIN_TOKEN=$(curl -s -X POST "https://SEU-PROJECTO.supabase.co/functions/v1/waitlist?action=admin-login" \
  -H "Content-Type: application/json" \
  --data '{"username":"SEU_USUARIO","password":"SUA_ADMIN_PASSWORD"}' | jq -r '.token')

curl -i -X POST "https://SEU-PROJECTO.supabase.co/functions/v1/waitlist?action=admin-send-test" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  --data '{"to":"teste@example.com","subject":"Teste","body":"Teste"}'
```

A resposta esperada é `403` com `{"error":"broadcast_disabled","message":"Envio desativado..."}`.

### Verificar cadastro silencioso

```bash
supabase secrets set SIGNUP_ENABLED=false
supabase functions deploy waitlist --no-verify-jwt

curl -i -X POST "https://SEU-PROJECTO.supabase.co/functions/v1/waitlist?action=subscribe" \
  -H "Origin: https://elliot5x.github.io" \
  -H "Content-Type: application/json" \
  --data '{"email":"silencioso@example.com","interest":"request_support","consent":true,"hp":""}'
```

A resposta deve ser a mensagem neutra de cadastro já usada pela função, sem criar registro nem enviar e-mail.
