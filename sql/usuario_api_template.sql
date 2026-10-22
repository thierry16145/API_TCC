-- OPCIONAL: crie um usuário próprio para a API em vez de usar root.
-- Antes de executar, substitua a senha de exemplo por uma senha forte.
-- Em algumas instalações do XAMPP, o usuário root local já é usado sem senha;
-- nesse caso, este arquivo é opcional e você pode manter DB_USER=root no .env.

CREATE USER IF NOT EXISTS 'monitoramento_app'@'localhost'
  IDENTIFIED BY 'TROQUE_POR_UMA_SENHA_FORTE';

GRANT SELECT, INSERT, UPDATE, DELETE
  ON monitoramento_jornada.* TO 'monitoramento_app'@'localhost';

FLUSH PRIVILEGES;

-- Se a API conectar usando 127.0.0.1 e o usuário acima não funcionar,
-- confirme os usuários/hosts configurados no MariaDB. Não abra acesso externo
-- ao banco sem necessidade.
