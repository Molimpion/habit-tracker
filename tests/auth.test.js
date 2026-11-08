const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Readable } = require('stream');
const { spawnSync } = require('child_process');

const { signToken, verifyToken } = require('../src/auth/jwt');
const { AuthService } = require('../src/auth/authService');
const { SqliteStorage } = require('../src/storage/sqliteStorage');
const { createAppServer } = require('../src/app');

const SECRET = crypto.randomBytes(32).toString('hex');
const NOW = 1_800_000_000;

function tempDatabaseFile() {
  return path.join(
    os.tmpdir(),
    `habitflow-auth-${Date.now()}-${Math.random().toString(16).slice(2)}.db`
  );
}

function removeDatabase(file) {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(`${file}${suffix}`, { force: true });
  }
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('JWT HS256 com crypto nativo', () => {
  it('devolve o payload de um token válido assinado com o mesmo segredo', () => {
    const token = signToken({ sub: 'usr-1' }, SECRET, { now: NOW, expiresInSeconds: 60 });
    assert.deepEqual(verifyToken(token, SECRET, { now: NOW + 59 }), {
      sub: 'usr-1',
      iat: NOW,
      exp: NOW + 60,
    });
  });

  it('rejeita token expirado', () => {
    const token = signToken({ sub: 'usr-1' }, SECRET, { now: NOW, expiresInSeconds: 60 });
    assert.equal(verifyToken(token, SECRET, { now: NOW + 60 }), null);
  });

  it('rejeita token assinado com outro segredo', () => {
    const token = signToken({ sub: 'usr-1' }, 'outro-segredo', { now: NOW, expiresInSeconds: 60 });
    assert.equal(verifyToken(token, SECRET, { now: NOW }), null);
  });

  it('rejeita token com o payload alterado depois de assinado', () => {
    const [header, , signature] = signToken({ sub: 'usr-1' }, SECRET, {
      now: NOW,
      expiresInSeconds: 60,
    }).split('.');
    const forged = `${header}.${base64url({ sub: 'usr-2', iat: NOW, exp: NOW + 60 })}.${signature}`;
    assert.equal(verifyToken(forged, SECRET, { now: NOW }), null);
  });

  it('rejeita token com algoritmo none', () => {
    const unsigned = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({ sub: 'usr-1', exp: NOW + 60 })}.`;
    assert.equal(verifyToken(unsigned, SECRET, { now: NOW }), null);
  });

  it('rejeita texto que não é um token', () => {
    assert.equal(verifyToken('nao-e-um-token', SECRET, { now: NOW }), null);
  });
});

describe('AuthService — cadastro e login', () => {
  let file;
  let auth;

  beforeEach(() => {
    file = tempDatabaseFile();
    auth = new AuthService(new SqliteStorage(file), SECRET);
  });

  afterEach(() => removeDatabase(file));

  it('cadastra e devolve token e usuário público, sem o hash da senha', () => {
    const result = auth.register({ name: ' Ana ', email: 'Ana@Exemplo.com', password: '12345678' });

    assert.deepEqual(Object.keys(result).sort(), ['token', 'user']);
    assert.deepEqual(Object.keys(result.user).sort(), ['email', 'id', 'name']);
    assert.equal(result.user.name, 'Ana');
    assert.equal(result.user.email, 'ana@exemplo.com');
    assert.equal(auth.authenticate(`Bearer ${result.token}`), result.user.id);
  });

  it('guarda a senha com hash scrypt e nunca em texto puro', () => {
    auth.register({ name: 'Ana', email: 'ana@exemplo.com', password: 'senha-forte-1' });
    const stored = new SqliteStorage(file).findUserByEmail('ana@exemplo.com');

    assert.notEqual(stored.passwordHash, 'senha-forte-1');
    assert.match(stored.passwordHash, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  });

  it('recusa e-mail já cadastrado sem diferenciar maiúsculas com 409', () => {
    auth.register({ name: 'Ana', email: 'ana@exemplo.com', password: '12345678' });
    assert.throws(
      () => auth.register({ name: 'Outra Ana', email: 'ANA@exemplo.com', password: '87654321' }),
      { statusCode: 409, code: 'CONFLICT', message: 'Já existe uma conta com este e-mail.' }
    );
  });

  it('recusa senha com menos de 8 caracteres apontando o campo password', () => {
    assert.throws(() => auth.register({ name: 'Ana', email: 'ana@exemplo.com', password: '1234567' }), {
      statusCode: 400,
      fields: { password: 'A senha deve ter pelo menos 8 caracteres.' },
    });
  });

  it('recusa e-mail sem formato válido apontando o campo email', () => {
    assert.throws(() => auth.register({ name: 'Ana', email: 'ana.exemplo.com', password: '12345678' }), {
      statusCode: 400,
      fields: { email: 'Informe um e-mail válido.' },
    });
  });

  it('recusa nome vazio apontando o campo name', () => {
    assert.throws(() => auth.register({ name: '   ', email: 'ana@exemplo.com', password: '12345678' }), {
      statusCode: 400,
      fields: { name: 'O nome é obrigatório.' },
    });
  });

  it('faz login com o e-mail em qualquer caixa e a senha correta', () => {
    const { user } = auth.register({ name: 'Ana', email: 'ana@exemplo.com', password: '12345678' });
    const result = auth.login({ email: 'ANA@EXEMPLO.COM', password: '12345678' });

    assert.deepEqual(result.user, user);
    assert.equal(auth.authenticate(`Bearer ${result.token}`), user.id);
  });

  it('responde a mesma mensagem para senha errada e para e-mail inexistente', () => {
    auth.register({ name: 'Ana', email: 'ana@exemplo.com', password: '12345678' });
    const expected = { statusCode: 401, code: 'UNAUTHORIZED', message: 'E-mail ou senha inválidos.' };

    assert.throws(() => auth.login({ email: 'ana@exemplo.com', password: 'errada123' }), expected);
    assert.throws(() => auth.login({ email: 'ninguem@exemplo.com', password: '12345678' }), expected);
  });

  it('não autentica cabeçalho ausente, sem Bearer ou com token inválido', () => {
    assert.equal(auth.authenticate(undefined), null);
    assert.equal(auth.authenticate('Basic abc'), null);
    assert.equal(auth.authenticate('Bearer abc.def.ghi'), null);
  });
});

describe('SqliteStorage — isolamento por usuário no próprio SQL', () => {
  let file;
  let storeA;
  let storeB;

  function createUser(storage, id) {
    storage.createUser({
      id,
      name: id,
      email: `${id}@exemplo.com`,
      passwordHash: 'irrelevante',
      createdAt: new Date().toISOString(),
    });
    return storage.forUser(id);
  }

  beforeEach(() => {
    file = tempDatabaseFile();
    const storage = new SqliteStorage(file);
    storeA = createUser(storage, 'usr-a');
    storeB = createUser(storage, 'usr-b');
    storeA.insert({
      id: 'hab-a',
      title: 'Correr 5km',
      description: '',
      category: 'Saúde',
      targetDaysPerWeek: 3,
      createdAt: new Date().toISOString(),
    });
    storeA.addCheckIn('hab-a', '2026-11-01');
  });

  afterEach(() => removeDatabase(file));

  it('não altera o hábito de A quando B chama update, remove e check-in com o id dele', () => {
    storeB.update({ id: 'hab-a', title: 'Invadido', description: 'x', category: 'Outros', targetDaysPerWeek: 7 });
    storeB.addCheckIn('hab-a', '2026-11-02');
    storeB.removeCheckIn('hab-a', '2026-11-01');
    storeB.remove('hab-a');

    const habit = storeA.findById('hab-a');
    assert.equal(habit.title, 'Correr 5km');
    assert.equal(habit.targetDaysPerWeek, 3);
    assert.deepEqual(habit.completedDates, ['2026-11-01']);
  });
});

describe('API HTTP — autenticação e isolamento por usuário ([AUTH-200])', () => {
  let file;
  let server;

  function invoke(method, url, { body, token } = {}) {
    return new Promise((resolve, reject) => {
      const rawBody = body ? JSON.stringify(body) : '';
      const req = new Readable({
        read() {
          if (rawBody) this.push(rawBody);
          this.push(null);
        },
      });
      req.method = method;
      req.url = url;
      req.headers = { host: 'localhost' };
      if (token) {
        req.headers.authorization = `Bearer ${token}`;
      }
      const res = {
        writeHead(status) {
          this.statusCode = status;
        },
        end(payload) {
          resolve({ status: this.statusCode, body: JSON.parse(payload) });
        },
      };
      server.requestListener(req, res).catch(reject);
    });
  }

  async function register(name, email) {
    const res = await invoke('POST', '/api/auth/register', {
      body: { name, email, password: '12345678' },
    });
    assert.equal(res.status, 201);
    return res.body.token;
  }

  beforeEach(() => {
    file = tempDatabaseFile();
    server = createAppServer({ databaseFile: file, jwtSecret: SECRET });
  });

  afterEach(() => removeDatabase(file));

  it('responde 401 UNAUTHORIZED nas rotas de hábito sem token', async () => {
    for (const [method, url] of [
      ['GET', '/api/habits'],
      ['GET', '/api/habits/stats'],
      ['POST', '/api/habits'],
      ['GET', '/api/habits/hab-1'],
      ['POST', '/api/habits/hab-1/checkin'],
    ]) {
      const res = await invoke(method, url, { body: { title: 'Correr' } });
      assert.equal(res.status, 401, `${method} ${url}`);
      assert.deepEqual(res.body, {
        error: { code: 'UNAUTHORIZED', message: 'Faça login para continuar.' },
      });
    }
  });

  it('mantém o healthcheck público', async () => {
    const res = await invoke('GET', '/api/health');
    assert.equal(res.status, 200);
  });

  it('começa a conta nova sem hábitos', async () => {
    const token = await register('Ana', 'ana@exemplo.com');
    const res = await invoke('GET', '/api/habits', { token });
    assert.deepEqual(res.body, []);
  });

  it('não mostra os hábitos de A quando B lista os dele', async () => {
    const tokenA = await register('Ana', 'ana@exemplo.com');
    const tokenB = await register('Bruno', 'bruno@exemplo.com');
    const created = await invoke('POST', '/api/habits', { token: tokenA, body: { title: 'Correr 5km' } });

    const listA = await invoke('GET', '/api/habits', { token: tokenA });
    const listB = await invoke('GET', '/api/habits', { token: tokenB });
    const statsB = await invoke('GET', '/api/habits/stats', { token: tokenB });

    assert.deepEqual(listA.body.map((h) => h.id), [created.body.id]);
    assert.deepEqual(listB.body, []);
    assert.equal(statsB.body.totalHabits, 0);
  });

  it('responde 404 quando B tenta ler, editar, marcar ou excluir o hábito de A', async () => {
    const tokenA = await register('Ana', 'ana@exemplo.com');
    const tokenB = await register('Bruno', 'bruno@exemplo.com');
    const { id } = (await invoke('POST', '/api/habits', { token: tokenA, body: { title: 'Correr 5km' } })).body;

    for (const [method, url, body] of [
      ['GET', `/api/habits/${id}`],
      ['PUT', `/api/habits/${id}`, { title: 'Invadido' }],
      ['POST', `/api/habits/${id}/checkin`, {}],
      ['DELETE', `/api/habits/${id}`],
    ]) {
      const res = await invoke(method, url, { token: tokenB, body });
      assert.equal(res.status, 404, `${method} ${url}`);
    }

    const intact = await invoke('GET', `/api/habits/${id}`, { token: tokenA });
    assert.equal(intact.body.title, 'Correr 5km');
    assert.deepEqual(intact.body.completedDates, []);
  });

  it('faz login pela API e devolve um token que acessa os hábitos', async () => {
    await register('Ana', 'ana@exemplo.com');
    const login = await invoke('POST', '/api/auth/login', {
      body: { email: 'ana@exemplo.com', password: '12345678' },
    });

    assert.equal(login.status, 200);
    assert.deepEqual(Object.keys(login.body.user).sort(), ['email', 'id', 'name']);
    const res = await invoke('GET', '/api/habits', { token: login.body.token });
    assert.equal(res.status, 200);
  });

  it('responde 401 com token expirado', async () => {
    const token = await register('Ana', 'ana@exemplo.com');
    const { sub } = verifyToken(token, SECRET);
    const expired = signToken({ sub }, SECRET, {
      now: Math.floor(Date.now() / 1000) - 2 * 24 * 3600,
      expiresInSeconds: 24 * 3600,
    });

    const res = await invoke('GET', '/api/habits', { token: expired });
    assert.equal(res.status, 401);
  });

  it('emite token que expira em 24 horas', async () => {
    const token = await register('Ana', 'ana@exemplo.com');
    const { iat, exp } = verifyToken(token, SECRET);
    assert.equal(exp - iat, 24 * 3600);
  });
});

describe('Inicialização do servidor', () => {
  it('recusa iniciar sem JWT_SECRET e explica o que falta', () => {
    const env = { ...process.env, PORT: '0', DATABASE_FILE: tempDatabaseFile() };
    delete env.JWT_SECRET;
    const result = spawnSync(process.execPath, [path.join(__dirname, '../src/server.js')], {
      env,
      encoding: 'utf-8',
      timeout: 5000,
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Defina a variável de ambiente JWT_SECRET/);
  });
});
