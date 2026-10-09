# Sentinela — AXIA SUL × Vigitec

Aplicativo web de gestão de alarmes patrimoniais com as 79 instalações do arquivo fornecido. Siglas e nomes foram preservados conforme a lista original.

## Primeiro acesso

1. Abra o endereço do aplicativo. A publicação inicial é privada para o proprietário no Sites.
2. Cadastre o primeiro administrador escolhendo seu usuário e uma senha de pelo menos 10 caracteres. Não há senha padrão.
3. Em **Usuários**, cadastre operadores AXIA SUL e vigilantes Vigitec.
4. A Vigitec ou um administrador deve conferir o estado real de cada instalação. As instalações começam em **A conferir**; nenhum estado operacional é presumido.
5. Para outras pessoas acessarem a publicação privada, conceda acesso ao Site nas configurações de compartilhamento, além de cadastrar as contas do aplicativo. O acesso ao Site e o usuário/senha do Sentinela são controles complementares.

## Fluxo

- **Operador AXIA SUL:** consulta instalações, solicita ativação ou desativação e acompanha os logs.
- **Vigilância Vigitec:** consulta pedidos, executa a ação no sistema de alarme e registra a confirmação.
- **Administrador:** gerencia contas e possui acesso operacional. Não pode confirmar a própria solicitação.

Verde indica **Ativado** e vermelho **Desativado**. Solicitações de ativação alternam verde e verde claro; solicitações de desativação alternam vermelho e vermelho claro. Há indicação textual em todos os estados. A preferência de movimento reduzido substitui a animação por uma borda destacada.

O aplicativo registra a comunicação e a confirmação manual entre as equipes. Não existe integração direta com centrais físicas de alarmes, WhatsApp, e-mail ou sistemas da Vigitec. As solicitações aparecem na fila compartilhada e o painel consulta atualizações a cada 8 segundos. A execução física continua com a Vigitec.

## Dados e acesso

Dados compartilhados persistem no Cloudflare D1: usuários, sessões, instalações, solicitações e eventos. Datas são armazenadas em UTC e exibidas no horário de Brasília. A auditoria mantém IDs, nomes e horários dos responsáveis. Logs têm filtros por instalação, tipo de evento e período, paginação e exportação CSV.

Senhas são derivadas com PBKDF2-SHA256 e salt individual. Sessões usam tokens aleatórios, hashes no banco e cookies HttpOnly, SameSite=Strict e Secure em HTTPS, com validade de oito horas. Permissões são verificadas no servidor. Alterar ou desativar um usuário encerra suas sessões. Tentativas repetidas de login são limitadas por usuário/IP. Escritas verificam origem e cabeçalho de aplicação; solicitações usam versão do registro para evitar sobrescritas concorrentes.

**Explorar demonstração** usa dados ilustrativos em memória, separados do banco. O seletor de perfil permite conhecer os fluxos das duas equipes. Recarregar encerra as alterações da demonstração.

## Desenvolvimento

Requisitos: Node.js >=22.13 e npm. A base utiliza Vinext/React, Cloudflare Workers e Drizzle. Configuração de publicação em `.openai/hosting.json`, modelo de banco em `db/schema.ts` e migrações em `drizzle/`.

```sh
npm run install:ci
npm run build
# Aplique cada migração local uma única vez, em ordem:
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_ambitious_yellowjacket.sql
npm run dev
```

No Windows, caso o shim do npm não encontre sua instalação, execute seu `npm-cli.js` existente por Node. A prévia é local e usa banco separado da publicação. Não publique `.wrangler`, `.sites-runtime`, credenciais ou dados de testes.

## Verificação

`node scripts/verify-flow.mjs` testa uma prévia local em `127.0.0.1:5173` com banco vazio, criando dados exclusivamente de teste. Inclui 59 verificações de autenticação, perfis, as 79 instalações, os dois fluxos, estados pendentes, proteção contra duplicação, impedimento da própria confirmação, logs com datas, sessões revogadas, CSRF e limite de login. Não execute contra dados operacionais.

Verificados também a compilação TypeScript, o build de produção e a interação visual com solicitação e confirmação em demonstração.
