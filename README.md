# PoorGuy

Landing page de pre-lancamento da PoorGuy, uma rede social criada para conectar pessoas com contas atrasadas a uma comunidade de apoio transparente, com selecao aleatoria dos apoiadores.

**Site publicado:** https://elliot5x.github.io/PoorGuy/

## Sobre o projeto

O PoorGuy foi desenvolvido com foco em acolhimento, respeito, simplicidade e transparencia. A interface apresenta a proposta da plataforma, como funciona o processo, informacoes de seguranca, perguntas frequentes e um formulario para entrada na lista de espera.

O recebimento de apoio nao representa uma garantia de pagamento.

## Tecnologias

- HTML5
- CSS3
- JavaScript
- GitHub Pages

## Estrutura

```text
.
├── assets/
│   ├── css/
│   ├── images/
│   └── js/
├── .github/workflows/
├── index.html
├── .gitignore
└── README.md
```

## Executar localmente

Como o site e estatico, abra o arquivo `index.html` diretamente no navegador ou execute um servidor local:

```bash
python3 -m http.server 4173
```

Depois, acesse `http://localhost:4173`.

## Publicacao

O deploy para o GitHub Pages acontece automaticamente quando alteracoes sao enviadas para a branch `main`.

## Privacidade

Dados sensiveis como CPF, endereco, documentos bancarios e informacoes bancarias nao devem ser exibidos publicamente.
