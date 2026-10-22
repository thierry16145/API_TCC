const API_URL = process.env.API_URL || 'http://localhost:3000';
const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const userA = {
  name: 'Usuario QA',
  email: process.env.TEST_USER_EMAIL || `qa.${stamp}@example.com`,
  password: process.env.TEST_USER_PASSWORD || 'Teste@12345'
};
const userB = {
  name: 'Usuario QA Segundo',
  email: process.env.TEST_SECOND_USER_EMAIL || `qa2.${stamp}@example.com`,
  password: process.env.TEST_SECOND_USER_PASSWORD || 'Teste@12345'
};
let tokenA;
let tokenB;
const createdJourneys = [];

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const raw = await response.text();
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
  return { response, body, raw };
}
const auth = (token) => ({ Authorization: `Bearer ${token}` });
async function register(user) {
  return request('/api/auth/register', { method: 'POST', body: JSON.stringify(user) });
}
async function login(user) {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: user.email, password: user.password }) });
}
async function createJourney(token, name = `Jornada QA ${Date.now()}`, interval = 10) {
  const r = await request('/api/journeys', {
    method: 'POST', headers: auth(token),
    body: JSON.stringify({ name, collectionIntervalSeconds: interval, plannedDate: new Date().toISOString().slice(0, 10) })
  });
  const id = r.body?.id;
  if (id) createdJourneys.push({ token, id });
  return r;
}
async function addPoint(token, id, latitude, longitude) {
  return request(`/api/journeys/${id}/points`, {
    method: 'POST', headers: auth(token),
    body: JSON.stringify({ latitude, longitude, accuracy: 5, recordedAt: new Date().toISOString() })
  });
}
async function endJourney(token, id) {
  return request(`/api/journeys/${id}/end`, { method: 'PATCH', headers: auth(token), body: JSON.stringify({}) });
}

beforeAll(async () => {
  // If the configured QA accounts already exist, login still permits repeatable runs.
  await register(userA);
  await register(userB);
  const [a, b] = await Promise.all([login(userA), login(userB)]);
  if (![200, 201].includes(a.response.status) || !a.body?.token) throw new Error(`API login A failed (${a.response.status}): ${a.raw}`);
  if (![200, 201].includes(b.response.status) || !b.body?.token) throw new Error(`API login B failed (${b.response.status}): ${b.raw}`);
  tokenA = a.body.token;
  tokenB = b.body.token;
});

afterAll(async () => {
  for (const item of createdJourneys) {
    try { await endJourney(item.token, item.id); } catch (_) { /* cleanup best effort */ }
  }
});

describe('1. Testes funcionais e de regressão', () => {
  test('CT-FUNC-01 — Cadastro válido e confirmação da conta', async () => {
    const newUser = { name: 'Cadastro QA', email: `cad.${Date.now()}@example.com`, password: 'Teste@12345' };
    const created = await register(newUser);
    expect(created.response.status).toBe(201);
    expect(created.body?.user?.email).toBe(newUser.email);
    const logged = await login(newUser);
    expect(logged.response.status).toBe(200);
    expect(logged.body?.token).toBeTruthy();
  });

  test('CT-FUNC-02 — Criação de jornada válida aparece na consulta', async () => {
    const created = await createJourney(tokenA, `Fluxo feliz ${Date.now()}`);
    expect(created.response.status).toBe(201);
    expect(created.body?.status).toBe('active');
    const list = await request('/api/journeys', { headers: auth(tokenA) });
    expect(list.response.status).toBe(200);
    expect(list.body.some(j => j.id === created.body.id)).toBe(true);
    await endJourney(tokenA, created.body.id);
  });

  test('CT-FUNC-03 — Encerramento persiste o estado e o horário final', async () => {
    const created = await createJourney(tokenA, `Encerramento ${Date.now()}`);
    const ended = await endJourney(tokenA, created.body.id);
    expect(ended.response.status).toBe(200);
    expect(ended.body.status).toBe('completed');
    expect(ended.body.endedAt).toBeTruthy();
  });

  test('CT-FUNC-04 — Consulta de pontos apresenta os dados da rota', async () => {
    const created = await createJourney(tokenA, `Consulta rota ${Date.now()}`);
    await addPoint(tokenA, created.body.id, -22.1201, -51.3901);
    await addPoint(tokenA, created.body.id, -22.1211, -51.3911);
    const points = await request(`/api/journeys/${created.body.id}/points`, { headers: auth(tokenA) });
    expect(points.response.status).toBe(200);
    expect(points.body.length).toBe(2);
    expect(points.body[0].sequenceNumber).toBeLessThan(points.body[1].sequenceNumber);
    await endJourney(tokenA, created.body.id);
  });

  test('CT-FUNC-05 — Regressão: nova jornada não corrompe as anteriores', async () => {
    const old = await createJourney(tokenA, `Antiga ${Date.now()}`);
    await addPoint(tokenA, old.body.id, -22.1201, -51.3901);
    await endJourney(tokenA, old.body.id);
    const oldBefore = await request(`/api/journeys/${old.body.id}`, { headers: auth(tokenA) });
    const newer = await createJourney(tokenA, `Nova ${Date.now()}`);
    await endJourney(tokenA, newer.body.id);
    const oldAfter = await request(`/api/journeys/${old.body.id}`, { headers: auth(tokenA) });
    expect(oldAfter.response.status).toBe(200);
    expect(oldAfter.body.id).toBe(oldBefore.body.id);
    expect(oldAfter.body.name).toBe(oldBefore.body.name);
    expect(oldAfter.body.status).toBe(oldBefore.body.status);
  });
});

describe('2. Análise do valor limite e teste de condições', () => {
  test('CT-COND-01 — Latitude abaixo do limite mínimo é rejeitada', async () => {
    const j = await createJourney(tokenA, `Lat inválida ${Date.now()}`);
    const r = await addPoint(tokenA, j.body.id, -90.000001, 0);
    expect(r.response.status).toBe(422);
    await endJourney(tokenA, j.body.id);
  });

  test('CT-COND-02 — Latitude no limite mínimo é aceita', async () => {
    const j = await createJourney(tokenA, `Lat limite ${Date.now()}`);
    const r = await addPoint(tokenA, j.body.id, -90, 0);
    expect(r.response.status).toBe(201);
    await endJourney(tokenA, j.body.id);
  });

  test('CT-COND-03 — Coordenadas intermediárias válidas são aceitas', async () => {
    const j = await createJourney(tokenA, `Coord média ${Date.now()}`);
    const r = await addPoint(tokenA, j.body.id, -22.1205, -51.3902);
    expect(r.response.status).toBe(201);
    await endJourney(tokenA, j.body.id);
  });

  test('CT-COND-04 — Longitude no limite superior é aceita', async () => {
    const j = await createJourney(tokenA, `Lon limite ${Date.now()}`);
    const r = await addPoint(tokenA, j.body.id, 0, 180);
    expect(r.response.status).toBe(201);
    await endJourney(tokenA, j.body.id);
  });

  test('CT-COND-05 — Combinação de autenticação, nome e intervalo válidos inicia jornada', async () => {
    const j = await createJourney(tokenA, `Condições ${Date.now()}`, 5);
    expect(j.response.status).toBe(201);
    expect(j.body.collectionIntervalSeconds).toBe(5);
    await endJourney(tokenA, j.body.id);
  });
});

describe('3. Testes de segurança', () => {
  test('CT-SEG-01 — Payload XSS no nome do usuário é rejeitado', async () => {
    const r = await register({ name: '<script>alert(1)</script>', email: `xss.${Date.now()}@example.com`, password: 'Teste@12345' });
    expect(r.response.status).toBe(400);
    expect(r.response.headers.get('content-type')).toContain('application/json');
  });

  test('CT-SEG-02 — Usuário não acessa jornada pertencente a outra conta (IDOR/BOLA)', async () => {
    const other = await createJourney(tokenB, `Privada ${Date.now()}`);
    const r = await request(`/api/journeys/${other.body.id}`, { headers: auth(tokenA) });
    expect(r.response.status).toBe(404);
    await endJourney(tokenB, other.body.id);
  });

  test('CT-SEG-03 — Login incorreto e rota protegida sem token são bloqueados', async () => {
    const wrong = await login({ email: userA.email, password: 'senha-incorreta' });
    expect(wrong.response.status).toBe(401);
    const injection = await login({ email: "' OR 1=1 --", password: 'qualquer' });
    expect(injection.response.status).toBe(401);
    expect(injection.body?.token).toBeFalsy();
    const noToken = await request('/api/journeys');
    expect(noToken.response.status).toBe(401);
  });

  test('CT-SEG-04 — HTML em nome da jornada é rejeitado', async () => {
    const r = await request('/api/journeys', { method: 'POST', headers: auth(tokenA), body: JSON.stringify({ name: '<b>Jornada</b>', collectionIntervalSeconds: 10 }) });
    expect(r.response.status).toBe(400);
  });

  test('CT-SEG-05 — Erro não revela stack trace nem credenciais', async () => {
    const r = await request('/api/journeys/not-an-id', { headers: auth(tokenA) });
    expect([400, 404]).toContain(r.response.status);
    const lower = r.raw.toLowerCase();
    expect(lower).not.toContain('stack trace');
    expect(lower).not.toContain('senha_hash');
    expect(lower).not.toContain('jwt_secret');
    expect(lower).not.toContain('select * from');
  });
});
