# PoorGuy

Site público e painel da lista de espera da PoorGuy.

**Site publicado:** https://elliot5x.github.io/PoorGuy/

## Tecnologias

- HTML5
- CSS3
- JavaScript
- Supabase Edge Functions
- Supabase Postgres
- Resend
- GitHub Pages

## Estrutura

```text
.
├── assets/
│   ├── css/
│   ├── images/
│   └── js/
├── pages/
│   ├── admin/
│   ├── legal/
│   └── preview.html
├── supabase/
│   ├── functions/
│   ├── migrations/
│   └── scripts/
├── index.html
├── WAITLIST_SETUP.md
└── README.md
```

## Executar localmente

Como o site é estático, execute um servidor local na raiz do projeto:

```bash
python3 -m http.server 4173
```

Acesse `http://localhost:4173`.

## Lista de espera

A configuração da Edge Function, os segredos, o deploy e os testes estão documentados em [WAITLIST_SETUP.md](WAITLIST_SETUP.md).

O painel administrativo está em `pages/admin/waitlist.html`.

## Publicação

O GitHub Pages é publicado automaticamente a partir da branch `main`.

## Privacidade

A política publicada está em `pages/legal/privacidade.html`.
