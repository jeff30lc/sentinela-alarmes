# Publicar o Sentinela na Netlify

Esta versão executa a interface React/Vite no CDN da Netlify e a API em uma Netlify Function com Postgres. O login é próprio do Sentinela: a equipe não precisa de conta ChatGPT.

## Configuração do projeto

O arquivo `netlify.toml` define:

| Campo | Valor |
| --- | --- |
| Branch de produção | `main` |
| Diretório base | raiz do repositório (deixe vazio) |
| Build command | `npm run build:netlify` |
| Publish directory | `dist/netlify` |
| Functions directory | `netlify/functions` |
| Node.js | `22` |
| `NETLIFY_NEXT_PLUGIN_SKIP` | `true` |

O plugin `@netlify/plugin-nextjs` espera o resultado de `next build`. Esta publicação usa um build Vite específico, sem depender da pasta `.next`. O arquivo de configuração tem precedência sobre os valores correspondentes do painel. Se houver um Next.js Runtime instalado manualmente nas integrações do projeto, remova essa integração; a variável acima também desabilita sua execução.

## Banco de dados

O pacote oficial `@netlify/database` permite que a Netlify provisione um banco Postgres e aplique as migrações em `netlify/database/migrations/` durante o deploy. Se o banco não aparecer, abra **Data & Storage → Database** no projeto e crie-o pelo painel. A disponibilidade e o consumo seguem o plano da sua conta Netlify.

A conexão é obtida no servidor por `getConnectionString()`. A plataforma fornece `NETLIFY_DB_URL`; não copie a conexão para o código, para variáveis `VITE_*` ou para o GitHub. O navegador acessa somente a API `/api/*`, que verifica a sessão e o perfil do usuário.

A migração cria usuários, sessões, instalações, solicitações, auditoria e controle de tentativas de login. Os lotes usam uma única conexão e uma transação com isolamento serializável, preservando o estado, o pedido e o log juntos. Conflitos temporários de transação são repetidos até três vezes.

## Primeiro acesso

1. Nas variáveis de ambiente do projeto Netlify, adicione **`SENTINELA_SETUP_TOKEN`**.
2. Escolha uma chave particular de 16 a 256 caracteres (recomendação: pelo menos 32 caracteres aleatórios) e marque-a como segredo. Ela deve estar disponível para **Functions** no ambiente de produção.
3. Execute **Deploys → Trigger deploy → Deploy site**. Se houver artefatos da tentativa anterior, use a opção de limpar o cache e publicar novamente.
4. Abra o endereço `.netlify.app` fornecido pelo painel.
5. Na configuração inicial, informe essa chave, seu nome e o usuário e senha desejados. Não existe senha padrão.
6. Cadastre operadores AXIA SUL e usuários de vigilância Vigitec em **Usuários**.
7. Confira os estados reais das 79 instalações antes de iniciar as solicitações.

A chave inicial impede que outro visitante registre o primeiro administrador. Ela não é a senha de login e não é gravada no banco. Depois de criar o administrador, você pode remover a variável e publicar novamente; o login continuará funcionando. Sem uma chave válida, a configuração inicial é recusada.

O banco Netlify é independente do D1 da publicação Sites. A primeira implantação começa sem contas e registros operacionais; os nomes das instalações são carregados ao criar o primeiro administrador. Registros existentes em outra publicação não são transferidos automaticamente.

## Atualizações

Commits em `main` disparam as publicações quando o repositório estiver conectado à Netlify. As migrações são versionadas e aplicadas pela plataforma; não altere uma migração que já foi aplicada. Use um novo arquivo numerado para futuras mudanças no esquema.

## Verificação local

```sh
npm ci
npm run build:netlify
npm run test:netlify
```

O teste sobe um Postgres local em memória usando o emulador oficial da Netlify, aplica a migração e executa a função real. Inclui as 59 verificações funcionais de autenticação, perfis, alarmes e auditoria, além de testes da chave inicial, cookies HTTPS, rollback, concorrência, conflitos únicos e totais numéricos. O teste nunca aponta para um banco de produção e encerra as conexões ao terminar.

## Referências

- [Funções Netlify](https://docs.netlify.com/build/functions/get-started/)
- [Banco Netlify](https://docs.netlify.com/build/data-and-storage/netlify-database/getting-started/)
- [Migrações](https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/)
