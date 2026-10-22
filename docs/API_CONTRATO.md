# Contrato da API — Monitoramento de Jornada

Base URL local: `http://localhost:3000`

Todos os endpoints abaixo estão implementados em `src/server.js`. Os endpoints marcados como autenticados exigem o cabeçalho `Authorization: Bearer <token>`.

## Verificação

### `GET /api/health`
Confirma que a API responde e que o MariaDB está acessível.

Resposta esperada `200`:
```json
{"status":"ok","database":"connected"}
```

Se o banco estiver indisponível, retorna `503`.

## Autenticação

### `POST /api/auth/register`
Entrada:
```json
{"name":"João Teste","email":"joao@example.com","password":"SenhaForte123"}
```
Resposta `201`: `{ "token": "...", "user": { "id": 1, "name": "João Teste", "email": "joao@example.com" } }`.

### `POST /api/auth/login`
Entrada:
```json
{"email":"joao@example.com","password":"SenhaForte123"}
```
Resposta `200`: token e objeto de usuário.

### `POST /api/auth/recovery`
Entrada: `{"email":"joao@example.com"}`. Neste pacote, o endpoint responde de forma genérica, mas não envia e-mail real; a integração com provedor de e-mail ainda precisa ser configurada.

## Perfil (autenticado)

- `GET /api/users/me` — consulta perfil.
- `PUT /api/users/me` — atualiza `name` e `email`.
- `PUT /api/users/me/password` — recebe `currentPassword` e `newPassword`.

## Jornadas (autenticado)

### `GET /api/journeys`
Lista jornadas do usuário autenticado.

### `POST /api/journeys`
Entrada:
```json
{
  "name":"Jornada de teste",
  "collectionIntervalSeconds":10,
  "plannedDate":"2026-10-15",
  "plannedStartTime":"08:30",
  "plannedEndTime":"09:30"
}
```

### `GET /api/journeys/:id`
Consulta uma jornada do próprio usuário.

### `POST /api/journeys/:id/points`
Entrada:
```json
{
  "latitude":-22.1205,
  "longitude":-51.3902,
  "accuracy":5,
  "recordedAt":"2026-10-15T11:30:00.000Z"
}
```

### `GET /api/journeys/:id/points`
Retorna os pontos ordenados pela sequência de coleta.

### `PATCH /api/journeys/:id/end`
Encerra a jornada ativa e retorna os dados atualizados.

## Códigos de resposta comuns

- `200`: operação concluída.
- `201`: recurso criado.
- `400`: entrada inválida.
- `401`: não autenticado ou credencial incorreta.
- `404`: recurso não encontrado ou fora do escopo do usuário.
- `409`: conflito, como outra jornada ativa.
- `422`: coordenada inválida.
- `500`: erro interno sem detalhes sensíveis.
- `503`: banco indisponível no endpoint de saúde.
