# Monitoramento de Jornada — API para VS Code

Servidor REST feito com **Node.js + Express + MariaDB/MySQL** para o aplicativo Android Monitoramento de Jornada. Inclui cadastro/login com senha criptografada, autenticação JWT, abertura e finalização de jornadas e registro dos pontos GPS.

> Este projeto contém o servidor da API e o script do banco. Ele não substitui nem altera automaticamente o projeto Android Studio.

## 1. Instale os programas necessários

- **Node.js LTS** (instale uma versão suportada, de preferência Node.js 20 ou superior): https://nodejs.org/
- **Visual Studio Code**: https://code.visualstudio.com/
- **XAMPP** com MySQL/MariaDB, ou outro servidor MariaDB/MySQL.
- Extensão **REST Client** no VS Code para executar os testes de `api.http` (opcional).

Depois de instalar o Node.js, feche e abra novamente o VS Code.

## 2. Crie as tabelas do banco

1. Inicie o módulo **MySQL** no painel do XAMPP. No XAMPP, esse módulo costuma fornecer MariaDB.
2. Abra `http://localhost/phpmyadmin` ou conecte-se ao servidor pelo HeidiSQL.
3. Abra o arquivo `sql/monitoramento_jornada.sql` e execute todo o conteúdo.
4. Confirme que o banco `monitoramento_jornada` e as tabelas `usuarios`, `configuracoes`, `jornadas` e `pontos_localizacao` foram criados.

O arquivo `sql/usuario_api_template.sql` é opcional: use-o apenas se quiser criar um usuário de banco exclusivo para a API. Troque a senha de exemplo antes de executar. Para uma instalação XAMPP local recém-instalada, muitas vezes é mais simples começar com as credenciais locais que você já usa no phpMyAdmin.

## 3. Configure a API

No VS Code, use **File → Open Folder** e abra a pasta que contém este `README.md` e o `package.json`.

Abra **Terminal → New Terminal**. No terminal PowerShell, rode:

```powershell
node -v
npm -v
```

Se os dois comandos mostrarem números de versão, crie o arquivo de configuração:

```powershell
Copy-Item .env.example .env
```

Abra `.env` e confira estes valores (ajuste conforme o seu MariaDB):

```dotenv
PORT=3000
NODE_ENV=development
JWT_SECRET=coloque_aqui_um_segredo_aleatorio_com_mais_de_32_caracteres
JWT_EXPIRES_IN=8h
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=monitoramento_jornada
DB_CONNECTION_LIMIT=10
CORS_ORIGIN=*
```

- `DB_USER` e `DB_PASSWORD` precisam corresponder ao usuário/senha configurados no banco.
- Em XAMPP local, `root` pode estar sem senha, mas isso depende da sua instalação.
- Substitua `JWT_SECRET` por um segredo longo e aleatório. Não publique o `.env`, não envie esse arquivo para terceiros e não use estas configurações de desenvolvimento em produção.

## 4. Instale dependências e inicie o servidor

No terminal do VS Code, na pasta que contém `package.json`, execute:

```powershell
npm install
npm run dev
```

Para executar sem reinicialização automática, use `npm start`. Mantenha o terminal aberto enquanto estiver testando.

Deve aparecer uma mensagem semelhante a:

```text
Conexão com MariaDB confirmada.
Monitoramento de Jornada API ativa na porta 3000.
Teste local: http://localhost:3000/api/health
```

Se a conexão do banco falhar, a API pode iniciar, mas o teste de saúde retornará `503`. Confira se o MySQL/MariaDB do XAMPP está ativo, se as tabelas foram criadas e se as credenciais do `.env` estão corretas.

## 5. Teste no navegador

Abra `http://localhost:3000/api/health`. Com tudo conectado, o resultado será:

```json
{
  "status": "ok",
  "database": "connected"
}
```

Se aparecer `Cannot GET /`, verifique se está usando o endereço correto: o teste do banco é `/api/health`.

## 6. Teste cadastro, login e jornada

Instale a extensão **REST Client** no VS Code, abra `api.http` e clique em **Send Request** acima de cada teste, começando pelo health check. Faça cadastro e login primeiro; copie o token da resposta e cole em `@token`. Em seguida, crie uma jornada, copie o ID dela para os testes de GPS e finalize-a.

Você também pode usar Postman ou Insomnia. As rotas principais são:

| Método | Endereço | O que faz |
|---|---|---|
| GET | `/api/health` | Testa API e banco |
| POST | `/api/auth/register` | Cadastra motorista |
| POST | `/api/auth/login` | Faz login e entrega token |
| GET | `/api/auth/me` | Consulta usuário autenticado |
| POST | `/api/jornadas` | Inicia jornada |
| GET | `/api/jornadas` | Lista jornadas do usuário |
| GET | `/api/jornadas/:id` | Consulta jornada e pontos GPS |
| POST | `/api/jornadas/:id/pontos` | Adiciona ponto GPS à jornada ativa |
| PATCH | `/api/jornadas/:id/finalizar` | Finaliza jornada ativa |

As rotas de autenticação protegidas exigem o cabeçalho `Authorization: Bearer TOKEN`.

## 7. Conectar ao aplicativo Android

- **Emulador Android Studio:** use `http://10.0.2.2:3000/` para acessar a API que roda no computador.
- **Celular físico na mesma rede Wi-Fi:** use o IPv4 do computador na rede local, por exemplo `http://192.168.0.10:3000/` (substitua pelo IP real do seu computador). Pode ser necessário permitir Node.js no Firewall do Windows.
- **No próprio computador:** use `http://localhost:3000/`.

O Android não deve se conectar diretamente ao MariaDB. O fluxo correto é **Android → API Node.js → MariaDB**. Para testes com HTTP no Android, a política de tráfego sem criptografia do aplicativo também pode precisar ser configurada; em produção, use HTTPS.

## Estrutura do projeto

```text
MonitoramentoDeJornada_API_VSCode/
├── .env.example
├── .gitignore
├── api.http
├── package.json
├── README.md
├── sql/
│   ├── monitoramento_jornada.sql
│   └── usuario_api_template.sql
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/database.js
│   ├── middleware/auth.middleware.js
│   └── routes/
│       ├── auth.routes.js
│       └── jornadas.routes.js
└── .vscode/launch.json
```

## Problemas comuns

**`node` ou `npm` não é reconhecido:** instale Node.js LTS, feche e reabra o VS Code e rode `node -v` e `npm -v` novamente.

**Erro de conexão ou `ECONNREFUSED`:** ligue o MySQL/MariaDB no XAMPP e confirme host/porta no `.env`.

**`Access denied for user`:** confira `DB_USER` e `DB_PASSWORD`. As credenciais de login do phpMyAdmin não são necessariamente iguais às que você imaginou; use as credenciais que funcionam na sua instalação.

**`Unknown database` ou `Table doesn't exist`:** execute `sql/monitoramento_jornada.sql` no banco correto.

**Porta 3000 ocupada:** mude `PORT=3001` no `.env` e use essa nova porta também no endereço de teste e no aplicativo Android.

## Importante

A API foi preparada como base de desenvolvimento. Antes de colocar em produção, configure HTTPS, credenciais exclusivas e fortes, política CORS restrita, backups e regras de privacidade/consentimento para a coleta de localização. Registre GPS somente com permissão apropriada do usuário.
