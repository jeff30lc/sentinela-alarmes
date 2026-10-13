# Recuperação de senha do Sentinela

## Uso

1. Cada usuário entra em sua conta e abre **E-mail de recuperação** no menu do perfil. Para salvar ou alterar o endereço, deve confirmar a senha atual. Contas existentes recebem um aviso enquanto não houver e-mail cadastrado. O cadastro inicial de administrador e o formulário de usuários também possuem o campo.
2. Quem esqueceu a senha usa **Esqueci minha senha** no login e informa o endereço cadastrado.
3. O sistema envia um link válido por 15 minutos. O usuário escolhe e confirma uma senha de 10 a 128 caracteres e volta ao login.

O ADM deve cadastrar o endereço de recuperação solicitado pelo responsável dentro de sua conta. Endereços individuais não são gravados no código-fonte nem distribuídos com os arquivos públicos. Uma conta que já perdeu o acesso e não tem e-mail cadastrado precisa da ajuda de outro administrador para cadastrar o endereço correto.

## Envio pela Hostinger

É necessária uma caixa de e-mail existente no serviço **Hostinger Email**. O endereço do remetente pode ser diferente dos endereços de recuperação dos usuários. Ter um site hospedado não garante que uma caixa remetente esteja criada.

Configure no ambiente Node.js da aplicação, preservando as variáveis já existentes do banco:

| Variável | Valor |
| --- | --- |
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | Endereço completo da caixa remetente |
| `SMTP_PASSWORD` | Senha da caixa, somente no servidor |
| `MAIL_FROM` | Endereço completo da mesma caixa remetente |
| `APP_ORIGIN` | Endereço HTTPS canônico do site, sem barra final |

As configurações SMTP são documentadas pela [Hostinger](https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email/). O transporte usa TLS com validação de certificado. Não coloque a senha em Git, no cliente, em variáveis `VITE_*` ou em mensagens de chat.

A API de variáveis da Hostinger substitui o conjunto inteiro e retorna valores mascarados nas leituras. Nunca reutilize `********` como senha ou substitua o ambiente sem conhecer todos os valores reais. Para acrescentar as chaves SMTP, use os campos do hPanel preservando as configurações atuais. Após salvar, reinicie o aplicativo para carregar os novos valores.

Sem remetente e credenciais SMTP configurados, a tela informa que o envio está indisponível. Não existe senha padrão ou redefinição apenas por nome de usuário. Para Sites/Cloudflare, o envio pode ser habilitado por HTTPS com `RESEND_API_KEY`, `MAIL_FROM` e `APP_ORIGIN`; na Netlify, SMTP também é suportado. Cada publicação possui seu próprio banco e ambiente.

## Dados e migração

A tabela `user_recovery` armazena o endereço associado à conta, o hash do token e sua expiração. Ela não altera nem remove registros de alarmes. As contas existentes continuam válidas sem e-mail, até cadastrarem um.

- Hostinger: a inicialização cria a tabela ausente com `CREATE TABLE IF NOT EXISTS`.
- Netlify/Postgres: `netlify/database/migrations/0002_password_recovery.sql`.
- Sites/D1: `drizzle/0001_password_recovery.sql` e metadados Drizzle atualizados.

O token é gerado aleatoriamente, entregue no fragmento do link e removido da barra de endereço ao abrir a página. Apenas seu hash é persistido. O consumo é atômico: duas tentativas simultâneas não conseguem usar o mesmo link. Alterar e-mail, senha, perfil ou situação do usuário invalida os links anteriores. A redefinição encerra as sessões e registra o responsável e o horário no histórico.

Respostas de solicitação são iguais para endereços cadastrados, ausentes e contas desativadas. Falhas de entrega não expõem a existência de contas. Há limites por endereço e por origem, além da proteção de CSRF. Falhas SMTP são registradas sem tokens, senhas ou conteúdo do e-mail.

## Validação

`npm run test:recovery` executa a suíte com banco Postgres descartável e D1 em memória, capturando mensagens exclusivamente dentro do teste. Inclui expiração, repetição, concorrência, troca de e-mail, contas desativadas, revogação de sessões, desbloqueio de login, auditoria, limites e CSRF. Nenhum e-mail real é enviado por essa suíte.

`hostinger/test.mjs` também executa as verificações de recuperação quando há um MySQL local descartável cujo nome começa por `sentinela_test_`. Nunca execute testes contra o banco operacional.

Depois de configurar o SMTP e cadastrar o e-mail, faça uma solicitação real de recuperação para conferir recebimento, pasta de spam e acesso pelo link.
