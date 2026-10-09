# Sentinela — AXIA SUL × Vigitec

Aplicação web para gerenciar solicitações de ativação e desativação de alarmes patrimoniais de 79 instalações.

[Acessar o aplicativo](https://axia-sul-alarmes.perkysong8.chatgpt.site) · [Manual completo](LEIA-ME.md)

## Recursos

- Painel de subestações com busca por nome ou sigla e filtros por status.
- Verde: ativado; vermelho: desativado; blocos piscantes: ativação ou desativação solicitada, aguardando confirmação.
- Operadores AXIA SUL solicitam; usuários Vigitec confirmam a execução.
- Autenticação por usuário e senha, administração de contas e três perfis de acesso.
- Solicitação e confirmação por usuários diferentes, com proteção contra pedidos duplicados e alterações concorrentes.
- Histórico com responsáveis, datas e horários de Brasília, filtros e exportação CSV.
- Demonstração com dados ilustrativos separados dos registros reais.

## Primeiro acesso

Na publicação privada, autentique-se pelo ChatGPT e cadastre o primeiro administrador do Sentinela. Depois, cadastre as equipes e libere o acesso delas ao Site. Cada instalação começa como **A conferir**: a Vigitec ou um administrador deve registrar o estado real antes da primeira solicitação. Não há senha padrão.

O sistema registra a comunicação entre as equipes. A Vigitec realiza a ativação e a desativação física dos alarmes; não há integração automática com centrais físicas, e-mail ou WhatsApp.

## Executar localmente

Requisitos: Node.js >=22.13 e npm.

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_ambitious_yellowjacket.sql
npm run dev
```

Aplique cada migração local uma única vez. A prévia normalmente abre em `http://127.0.0.1:5173`. Os bancos local e publicado são independentes. Veja o [manual](LEIA-ME.md) para detalhes sobre Windows, publicação, perfis e testes.

## Tecnologia e estrutura

React, TypeScript e Vinext, executados em Cloudflare Workers, com persistência Cloudflare D1 e migrações Drizzle.

- `app/`: interface, autenticação e API.
- `app/stations.json`: instalações fornecidas para o projeto.
- `db/` e `drizzle/`: modelo e migrações do banco.
- `scripts/verify-flow.mjs`: 59 verificações de integração na prévia local com banco vazio.
- `.openai/hosting.json`: configuração da publicação Sites.

Dependências instaladas, builds, banco local, sessões e arquivos temporários ficam fora do Git. Credenciais não devem ser adicionadas ao repositório.
