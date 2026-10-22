-- ============================================================
-- PROJETO: MONITORAMENTO DE JORNADA
-- BANCO: MySQL / MariaDB
-- USO: HeidiSQL
-- ============================================================
-- Este script cria o banco, tabelas, relacionamentos, índices,
-- dados fictícios e consultas de teste.
--
-- Pode ser executado novamente: as tabelas são recriadas para
-- evitar erro de dados duplicados durante os testes.
-- ============================================================

-- ============================================================
-- 1. CRIAÇÃO DO BANCO DE DADOS
-- ============================================================

CREATE DATABASE IF NOT EXISTS monitoramento_jornada
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE monitoramento_jornada;

-- ============================================================
-- 2. LIMPEZA CONTROLADA
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS pontos_localizacao;
DROP TABLE IF EXISTS jornadas;
DROP TABLE IF EXISTS configuracoes;
DROP TABLE IF EXISTS usuarios;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 3. TABELA: usuarios
-- Armazena motoristas e administradores.
-- ============================================================

CREATE TABLE usuarios (


    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    senha VARCHAR(255) NOT NULL COMMENT 'Senha armazenada como hash',
    perfil ENUM('motorista', 'admin') NOT NULL DEFAULT 'motorista',
    data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_usuarios PRIMARY KEY (id),
    CONSTRAINT uq_usuarios_email UNIQUE (email),

    INDEX idx_usuarios_perfil (perfil)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. TABELA: configuracoes
-- Configurações de GPS e permissão de localização.
-- Uma configuração por usuário.
-- ============================================================

CREATE TABLE configuracoes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id INT UNSIGNED NOT NULL,
    precisao_gps ENUM('alta', 'media', 'baixa') NOT NULL DEFAULT 'media',
    permissao_localizacao ENUM(
        'concedida',
        'negada',
        'nao_solicitada'
    ) NOT NULL DEFAULT 'nao_solicitada',

    CONSTRAINT pk_configuracoes PRIMARY KEY (id),
    CONSTRAINT uq_configuracoes_usuario UNIQUE (usuario_id),

    CONSTRAINT fk_configuracoes_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. TABELA: jornadas
-- Registra as jornadas de trabalho dos usuários motoristas.
-- A FK liga cada jornada a um usuário.
-- ============================================================

CREATE TABLE jornadas (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id INT UNSIGNED NOT NULL,
    data_hora_inicio DATETIME NULL,
    data_hora_fim DATETIME NULL,
    status ENUM(
        'preparacao',
        'em_andamento',
        'encerrada'
    ) NOT NULL DEFAULT 'preparacao',
    distancia_total DECIMAL(10,2) NOT NULL DEFAULT 0.00
        COMMENT 'Distância total percorrida em quilômetros',

    CONSTRAINT pk_jornadas PRIMARY KEY (id),

    INDEX idx_jornadas_usuario (usuario_id),
    INDEX idx_jornadas_status (status),
    INDEX idx_jornadas_inicio (data_hora_inicio),

    CONSTRAINT fk_jornadas_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. TABELA: pontos_localizacao
-- Guarda cada ponto coletado pelo GPS durante uma jornada.
-- Ao excluir uma jornada, seus pontos são excluídos em cascata.
-- ============================================================

CREATE TABLE pontos_localizacao (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    jornada_id INT UNSIGNED NOT NULL,

    latitude DECIMAL(10,7) NOT NULL
        COMMENT 'Latitude GPS',

    longitude DECIMAL(10,7) NOT NULL
        COMMENT 'Longitude GPS',

    data_hora_coleta DATETIME NOT NULL
        COMMENT 'Data e hora da coleta do GPS',

    velocidade DECIMAL(8,2) NOT NULL DEFAULT 0.00
        COMMENT 'Velocidade em km/h',

    CONSTRAINT pk_pontos_localizacao PRIMARY KEY (id),

    INDEX idx_pontos_jornada_data (jornada_id, data_hora_coleta),

    CONSTRAINT fk_pontos_jornada
        FOREIGN KEY (jornada_id)
        REFERENCES jornadas (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. MOCK DATA - USUARIOS
-- Os valores de senha são hashes fictícios apenas para teste.
-- ============================================================

INSERT INTO usuarios
    (id, nome, email, senha, perfil)
VALUES
    (1, 'Carlos Silva', 'carlos@teste.com',
        '$2y$10$MOCK_HASH_CARLOS_1234567890123456789012345678901234567890',
        'motorista'),

    (2, 'Joao Santos', 'joao@teste.com',
        '$2y$10$MOCK_HASH_JOAO_12345678901234567890123456789012345678901',
        'motorista'),

    (3, 'Administrador Sistema', 'admin@teste.com',
        '$2y$10$MOCK_HASH_ADMIN_12345678901234567890123456789012345678',
        'admin');

-- ============================================================
-- 8. MOCK DATA - CONFIGURACOES
-- ============================================================

INSERT INTO configuracoes
    (id, usuario_id, precisao_gps, permissao_localizacao)
VALUES
    (1, 1, 'alta', 'concedida'),
    (2, 2, 'media', 'concedida'),
    (3, 3, 'baixa', 'nao_solicitada');

-- ============================================================
-- 9. MOCK DATA - JORNADAS
-- ============================================================

INSERT INTO jornadas
    (id, usuario_id, data_hora_inicio, data_hora_fim, status, distancia_total)
VALUES
    (1, 1, '2026-10-06 07:30:00', '2026-10-06 11:45:00',
        'encerrada', 52.40),

    (2, 1, '2026-10-06 13:00:00', NULL,
        'em_andamento', 18.75),

    (3, 2, '2026-10-06 08:00:00', '2026-10-06 12:30:00',
        'encerrada', 67.80),

    (4, 2, NULL, NULL,
        'preparacao', 0.00);

-- ============================================================
-- 10. MOCK DATA - PONTOS DE LOCALIZACAO
-- Coordenadas fictícias apenas para testar os relacionamentos.
-- ============================================================

INSERT INTO pontos_localizacao
    (id, jornada_id, latitude, longitude, data_hora_coleta, velocidade)
VALUES
    -- Jornada 1
    (1, 1, -22.7314000, -48.5702000, '2026-10-06 07:30:00', 0.00),
    (2, 1, -22.7321000, -48.5710000, '2026-10-06 07:35:00', 32.50),
    (3, 1, -22.7342000, -48.5745000, '2026-10-06 07:40:00', 48.20),
    (4, 1, -22.7380000, -48.5793000, '2026-10-06 07:45:00', 55.70),

    -- Jornada 2
    (5, 2, -22.7400000, -48.5800000, '2026-10-06 13:00:00', 0.00),
    (6, 2, -22.7425000, -48.5832000, '2026-10-06 13:05:00', 40.30),
    (7, 2, -22.7461000, -48.5875000, '2026-10-06 13:10:00', 51.80),
    (8, 2, -22.7502000, -48.5920000, '2026-10-06 13:15:00', 46.40),

    -- Jornada 3
    (9, 3, -22.7000000, -48.5500000, '2026-10-06 08:00:00', 0.00),
    (10, 3, -22.7045000, -48.5565000, '2026-10-06 08:10:00', 35.20),
    (11, 3, -22.7100000, -48.5630000, '2026-10-06 08:20:00', 48.60),
    (12, 3, -22.7165000, -48.5695000, '2026-10-06 08:30:00', 52.10);

-- ============================================================
-- 11. CONSULTAS DE TESTE
-- ============================================================

-- 11.1 Usuários
SELECT *
FROM usuarios
ORDER BY id;

-- 11.2 Configurações
SELECT *
FROM configuracoes
ORDER BY id;

-- 11.3 Jornadas
SELECT *
FROM jornadas
ORDER BY id;

-- 11.4 Pontos de localização
SELECT *
FROM pontos_localizacao
ORDER BY jornada_id, data_hora_coleta;

-- 11.5 Usuário + configuração
SELECT
    u.id AS usuario_id,
    u.nome,
    u.email,
    u.perfil,
    c.precisao_gps,
    c.permissao_localizacao
FROM usuarios AS u
LEFT JOIN configuracoes AS c
    ON c.usuario_id = u.id
ORDER BY u.id;

-- 11.6 Usuário + jornadas
SELECT
    u.id AS usuario_id,
    u.nome AS motorista,
    j.id AS jornada_id,
    j.data_hora_inicio,
    j.data_hora_fim,
    j.status,
    j.distancia_total
FROM usuarios AS u
INNER JOIN jornadas AS j
    ON j.usuario_id = u.id
ORDER BY j.id;

-- 11.7 Jornada + pontos GPS
SELECT
    j.id AS jornada_id,
    j.status,
    p.id AS ponto_id,
    p.latitude,
    p.longitude,
    p.data_hora_coleta,
    p.velocidade
FROM jornadas AS j
INNER JOIN pontos_localizacao AS p
    ON p.jornada_id = j.id
ORDER BY j.id, p.data_hora_coleta;

-- 11.8 Relacionamento completo
SELECT
    u.nome AS motorista,
    u.email,
    j.id AS jornada_id,
    j.status AS status_jornada,
    j.data_hora_inicio,
    j.data_hora_fim,
    j.distancia_total AS distancia_km,
    p.id AS ponto_id,
    p.latitude,
    p.longitude,
    p.data_hora_coleta,
    p.velocidade AS velocidade_kmh
FROM usuarios AS u
INNER JOIN jornadas AS j
    ON j.usuario_id = u.id
INNER JOIN pontos_localizacao AS p
    ON p.jornada_id = j.id
ORDER BY j.id, p.data_hora_coleta;

-- ============================================================
-- 12. TESTE DE CASCATA - NÃO EXECUTAR POR PADRÃO
-- Se executar:
-- DELETE FROM jornadas WHERE id = 2;
-- os pontos da jornada 2 serão apagados automaticamente.
-- ============================================================

-- DELETE FROM jornadas WHERE id = 2;

-- Conferência:escola_dbconfiguracoesmonitoramento_jornada
-- SELECT * FROM pontos_localizacao WHERE jornada_id = 2;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
