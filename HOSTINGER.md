# Sentinela na Hostinger

A versão Hostinger mantém a interface e as regras do Sentinela, com um servidor Express em Node.js 22 e armazenamento persistente em MySQL/MariaDB. Usuários, sessões, solicitações e auditoria são gravados no banco, independentemente dos arquivos de cada publicação.

## Configuração de publicação

| Campo | Valor |
| --- | --- |
| Tipo de aplicativo | Express |
| Node.js | 22 |
| Diretório raiz | `.` |
| Comando de build | `npm run build` |
| Script de build | `build` |
| Diretório de saída | deixe vazio (Express) |
| Arquivo de entrada | `dist/hostinger/server.mjs` |
| Gerenciador de pacotes | npm |

Esses valores se aplicam ao pacote preparado por `hostinger/prepare.mjs`. O `package.json` desse pacote contém somente as dependências usadas na Hostinger. Os arquivos de desenvolvimento Cloudflare/Netlify continuam disponíveis no projeto original.

## Preparar o pacote

Na raiz do projeto:

```powershell
npm ci --prefix hostinger
node hostinger/prepare.mjs
cd outputs/hostinger/source
npm ci
npm run build
```

O arquivo enviado à Hostinger deve conter o código-fonte de `outputs/hostinger/source`, com `package.json` na raiz, excluindo `node_modules`, `dist`, arquivos `.env`, credenciais e arquivos temporários. A plataforma instala as dependências e executa o build. Não envie o build do Cloudflare nem o diretório `dist/standalone`.

## Banco e variáveis

Crie um banco dedicado ao site no plano existente. Configure as variáveis no servidor, nunca no código ou em variáveis `VITE_*`:

- `MYSQL_HOST=127.0.0.1`
- `MYSQL_PORT=3306`
- `MYSQL_DATABASE`: nome completo fornecido pela Hostinger.
- `MYSQL_USER`: usuário completo fornecido pela Hostinger.
- `MYSQL_PASSWORD`: senha forte do banco.
- `APP_ORIGIN`: endereço HTTPS completo do site, sem barra final.
- `SENTINELA_SETUP_TOKEN`: chave particular aleatória de pelo menos 32 caracteres.
- `NODE_ENV=production`
- `NPM_CONFIG_INCLUDE=dev`: instala também as ferramentas usadas durante o build, mesmo com `NODE_ENV=production`.

O servidor respeita `PORT` quando informado pela plataforma. Na primeira inicialização, cria as tabelas ausentes sem apagar dados. Alterações futuras de estrutura precisam de novas migrações explícitas; `CREATE TABLE IF NOT EXISTS` não altera tabelas existentes.

O site inicia sem contas. Abra-o e informe a chave inicial, seu nome e o usuário e senha desejados para criar o primeiro administrador. Não existe senha padrão. As 79 instalações começam como **A conferir**. Cadastre as equipes e confira os estados físicos antes de registrar solicitações reais.

Este banco é independente das publicações Sites e Netlify; registros de outras plataformas não são transferidos automaticamente. A chave inicial pode ser removida depois do cadastro do primeiro administrador.

## Verificação local

`hostinger/test.mjs`, executado dentro do pacote preparado, exige um banco descartável local cujo nome comece por `sentinela_test_`. Ele valida migração, rollback, concorrência, conflitos únicos, cookies HTTPS, proteção da configuração inicial, persistência e executa `scripts/verify-flow.mjs` com o backend real. A suíte completa verifica autenticação, três perfis, 79 instalações, solicitações, confirmações, auditoria, CSRF, sessões desativadas e limitação de tentativas.

As publicações por arquivo não enviam alterações ao GitHub. Para usar o repositório completo pelo GitHub, mantenha a raiz `.` e o arquivo de entrada `dist/hostinger/server.mjs`, com tipo Express, e selecione o script `build:hostinger` (comando `npm run build:hostinger`). O script `build` da raiz continua destinado ao Sites/Cloudflare; o pacote por arquivo possui seu próprio `build`.

## Recuperação de senha

Veja [RECUPERACAO-SENHA.md](RECUPERACAO-SENHA.md). A migração aditiva cria `user_recovery` sem apagar contas. O SMTP é configurado somente no ambiente do servidor.
