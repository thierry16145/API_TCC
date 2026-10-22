# O que fica em cada pasta

- `src/server.js`: rotas HTTP, validação, autenticação e regras de negócio.
- `src/db.js`: pool de conexões para MariaDB.
- `sql/monitoramento_jornada.sql`: banco e tabelas.
- `sql/usuario_api_template.sql`: usuário limitado da API no MariaDB.
- `tests/index.test.js`: testes funcionais, de condições e segurança pela API.
- `tests/performance/`: scripts k6 para baseline, carga, estresse, recuperação e concorrência.
- `.env.example`: modelo de configuração; copiar para `.env` e inserir as credenciais locais.
- `api.http`: requisições para testar a API diretamente dentro do VS Code com a extensão REST Client.
- `.vscode/launch.json`: configuração de depuração pelo VS Code.
