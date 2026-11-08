const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Readable } = require('stream');
const { spawn } = require('child_process');

const {
  calculateStreaks,
  isValidDateFormat,
} = require('../src/utils/streakCalculator');
const {
  HabitService,
  ValidationError,
  NotFoundError,
} = require('../src/services/habitService');
const { SqliteStorage } = require('../src/storage/sqliteStorage');
const { createAppServer } = require('../src/app');
const { createApiRouter } = require('../src/api/router');

function tempDatabaseFile(prefix) {
  return path.join(
    os.tmpdir(),
    `habitflow-${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`
  );
}

function createEmptyDatabase(file) {
  new SqliteStorage(file).close();
}

function removeDatabase(file) {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(`${file}${suffix}`, { force: true });
  }
}

describe('StreakCalculator — Regras de Ofensiva ([RF06])', () => {
  it('deve retornar streaks zeradas quando não houver check-ins', () => {
    const result = calculateStreaks([], '2026-11-06');
    assert.deepEqual(result, {
      currentStreak: 0,
      bestStreak: 0,
      completedToday: false,
    });
  });

  it('deve calcular corretamente sequência consecutiva ativa até hoje', () => {
    const dates = ['2026-11-04', '2026-11-05', '2026-11-06'];
    const result = calculateStreaks(dates, '2026-11-06');
    assert.equal(result.currentStreak, 3);
    assert.equal(result.bestStreak, 3);
    assert.equal(result.completedToday, true);
  });

  it('deve manter a ofensiva ativa quando o último check-in foi ontem', () => {
    const dates = ['2026-11-04', '2026-11-05'];
    const result = calculateStreaks(dates, '2026-11-06');
    assert.equal(result.currentStreak, 2);
    assert.equal(result.completedToday, false);
  });

  it('deve zerar currentStreak quando houver quebra de mais de 1 dia e preservar bestStreak', () => {
    const dates = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13'];
    const result = calculateStreaks(dates, '2026-11-06');
    assert.equal(result.currentStreak, 0);
    assert.equal(result.bestStreak, 4);
    assert.equal(result.completedToday, false);
  });

  it('deve considerar como recorde a maior sequência quando há sequências separadas por intervalo', () => {
    const dates = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11'];
    const result = calculateStreaks(dates, '2026-10-11');
    assert.equal(result.bestStreak, 3);
    assert.equal(result.currentStreak, 2);
  });

  it('deve validar formato de data YYYY-MM-DD', () => {
    assert.equal(isValidDateFormat('2026-11-06'), true);
    assert.equal(isValidDateFormat('06-11-2026'), false);
    assert.equal(isValidDateFormat('2026-02-31'), false);
  });
});

describe('HabitService — Persistência em SQLite ([RNF02])', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'habitflow-storage-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('deve criar o diretório e o banco com 3 hábitos de exemplo quando ainda não existem', () => {
    const dataFile = path.join(tempDir, 'nested', 'habitflow.db');
    new HabitService(new SqliteStorage(dataFile));

    assert.deepEqual(
      new SqliteStorage(dataFile).list().map((h) => h.id),
      ['hab-01-eng-software', 'hab-02-hidratacao', 'hab-03-leitura']
    );
  });

  it('não deve recriar os hábitos de exemplo num banco já existente', () => {
    const dataFile = path.join(tempDir, 'habitflow.db');
    createEmptyDatabase(dataFile);
    new HabitService(new SqliteStorage(dataFile));

    assert.deepEqual(new SqliteStorage(dataFile).list(), []);
  });

  it('deve persistir todos os check-ins gravados ao mesmo tempo por processos diferentes', async () => {
    const dataFile = path.join(tempDir, 'habitflow.db');
    createEmptyDatabase(dataFile);
    const { id } = new HabitService(new SqliteStorage(dataFile)).createHabit({ title: 'Correr 5km' });
    const months = ['01', '02', '03', '04'];

    const writer = (month) => `
      const { HabitService } = require(${JSON.stringify(path.join(__dirname, '../src/services/habitService'))});
      const { SqliteStorage } = require(${JSON.stringify(path.join(__dirname, '../src/storage/sqliteStorage'))});
      const service = new HabitService(new SqliteStorage(${JSON.stringify(dataFile)}));
      for (let day = 1; day <= 28; day++) {
        service.toggleCheckIn(${JSON.stringify(id)}, '2026-${month}-' + String(day).padStart(2, '0'));
      }
    `;
    const exitCodes = await Promise.all(
      months.map(
        (month) =>
          new Promise((resolve) => {
            spawn(process.execPath, ['-e', writer(month)], { stdio: 'ignore' }).on('exit', resolve);
          })
      )
    );

    assert.deepEqual(exitCodes, [0, 0, 0, 0]);
    assert.equal(new SqliteStorage(dataFile).findById(id).completedDates.length, 4 * 28);
  });
});

describe('HabitService — CRUD, Validações e Check-in ([RF01] a [RF08])', () => {
  let tempFile;
  let service;

  beforeEach(() => {
    tempFile = tempDatabaseFile('test');
    createEmptyDatabase(tempFile);
    service = new HabitService(new SqliteStorage(tempFile));
  });

  afterEach(() => {
    removeDatabase(tempFile);
  });

  it('deve cadastrar um novo hábito válido ([RF01])', () => {
    const habit = service.createHabit(
      {
        title: 'Praticar TDD com Node.js',
        description: 'Escrever testes antes do código',
        category: 'Estudos',
        targetDaysPerWeek: 5,
      },
      '2026-11-06'
    );

    assert.ok(habit.id.startsWith('hab-'));
    assert.equal(habit.title, 'Praticar TDD com Node.js');
    assert.equal(habit.category, 'Estudos');
    assert.equal(habit.targetDaysPerWeek, 5);
    assert.equal(habit.currentStreak, 0);
  });

  it('deve manter o hábito cadastrado ao recarregar o serviço a partir do banco ([RNF02])', () => {
    const created = service.createHabit({ title: 'Alongar pela manhã' });
    const reloaded = new HabitService(new SqliteStorage(tempFile)).getAllHabits();
    assert.deepEqual(reloaded.map((h) => h.id), [created.id]);
  });

  it('deve rejeitar hábito com título menor que 3 caracteres ([RF08])', () => {
    assert.throws(
      () => service.createHabit({ title: 'Oi' }),
      (err) =>
        err instanceof ValidationError &&
        err.statusCode === 400 &&
        err.message === 'O título do hábito é obrigatório e deve ter pelo menos 3 caracteres.'
    );
  });

  it('deve rejeitar meta semanal fora do intervalo de 1 a 7 ([RF08])', () => {
    assert.throws(
      () => service.createHabit({ title: 'Correr', targetDaysPerWeek: 8 }),
      (err) =>
        err instanceof ValidationError &&
        err.message === 'A meta semanal (targetDaysPerWeek) deve ser um número inteiro entre 1 e 7.'
    );
  });

  it('deve usar a categoria Outros quando a categoria informada não existe ([RF01])', () => {
    const habit = service.createHabit({ title: 'Tocar violão', category: 'Música' });
    assert.equal(habit.category, 'Outros');
  });

  it('deve filtrar hábitos por categoria e por termo de busca ([RF02])', () => {
    service.createHabit({ title: 'Beber água', category: 'Saúde' });
    service.createHabit({ title: 'Revisar flashcards', description: 'Inglês', category: 'Estudos' });

    const saude = service.getAllHabits({ category: 'saúde' });
    assert.deepEqual(saude.map((h) => h.title), ['Beber água']);

    const busca = service.getAllHabits({ search: 'inglês' });
    assert.deepEqual(busca.map((h) => h.title), ['Revisar flashcards']);

    const todas = service.getAllHabits({ category: 'Todas' });
    assert.equal(todas.length, 2);
  });

  it('deve lançar NotFoundError ao buscar um ID inexistente ([RF02])', () => {
    assert.throws(
      () => service.getHabitById('hab-inexistente'),
      (err) => err instanceof NotFoundError && err.statusCode === 404
    );
  });

  it('deve editar e excluir um hábito existente ([RF03], [RF04])', () => {
    const created = service.createHabit({
      title: 'Ler 10 páginas',
      category: 'Estudos',
      targetDaysPerWeek: 4,
    });

    const updated = service.updateHabit(created.id, {
      title: 'Ler 25 páginas',
      targetDaysPerWeek: 7,
    });
    assert.equal(updated.title, 'Ler 25 páginas');
    assert.equal(updated.targetDaysPerWeek, 7);
    assert.equal(updated.category, 'Estudos');

    service.deleteHabit(created.id);
    assert.throws(
      () => service.getHabitById(created.id),
      (err) => err instanceof NotFoundError && err.statusCode === 404
    );
  });

  it('deve rejeitar edição que deixa o título com menos de 3 caracteres ([RF03], [RF08])', () => {
    const created = service.createHabit({ title: 'Meditar' });
    assert.throws(
      () => service.updateHabit(created.id, { title: 'Ok' }),
      (err) => err instanceof ValidationError && err.statusCode === 400
    );
  });

  it('deve realizar toggle de check-in diário ([RF05])', () => {
    const habit = service.createHabit({
      title: 'Caminhar 30 minutos',
      category: 'Saúde',
      targetDaysPerWeek: 6,
    });

    const firstToggle = service.toggleCheckIn(habit.id, '2026-11-06', '2026-11-06');
    assert.equal(firstToggle.action, 'added');
    assert.equal(firstToggle.habit.completedToday, true);
    assert.equal(firstToggle.habit.currentStreak, 1);

    const secondToggle = service.toggleCheckIn(habit.id, '2026-11-06', '2026-11-06');
    assert.equal(secondToggle.action, 'removed');
    assert.equal(secondToggle.habit.completedToday, false);
    assert.equal(secondToggle.habit.currentStreak, 0);
  });

  it('deve preservar o histórico de check-ins ao editar o hábito ([RF03])', () => {
    const habit = service.createHabit({ title: 'Escrever diário' });
    service.toggleCheckIn(habit.id, '2026-11-05', '2026-11-06');

    const updated = service.updateHabit(habit.id, { title: 'Escrever no diário' });
    assert.deepEqual(updated.completedDates, ['2026-11-05']);
  });

  it('deve filtrar hábitos por status do dia ([RF02])', () => {
    const feito = service.createHabit({ title: 'Arrumar a cama' });
    service.createHabit({ title: 'Estudar SQL' });
    service.toggleCheckIn(feito.id, '2026-11-06', '2026-11-06');

    const concluidos = service.getAllHabits({ status: 'completed' }, '2026-11-06');
    assert.deepEqual(concluidos.map((h) => h.title), ['Arrumar a cama']);

    const pendentes = service.getAllHabits({ status: 'pending' }, '2026-11-06');
    assert.deepEqual(pendentes.map((h) => h.title), ['Estudar SQL']);
  });

  it('deve rejeitar check-in com data fora do formato YYYY-MM-DD ([RF05], [RF08])', () => {
    const habit = service.createHabit({ title: 'Dormir cedo' });
    assert.throws(
      () => service.toggleCheckIn(habit.id, '06/11/2026'),
      (err) =>
        err instanceof ValidationError &&
        err.message === 'Formato de data inválido. Utilize o padrão YYYY-MM-DD.'
    );
  });

  it('deve consolidar as estatísticas do dia ([RF07])', () => {
    const feito = service.createHabit({ title: 'Caminhar 30 minutos' });
    service.createHabit({ title: 'Estudar SQL' });
    service.createHabit({ title: 'Ler 10 páginas' });
    service.toggleCheckIn(feito.id, '2026-11-05', '2026-11-06');
    service.toggleCheckIn(feito.id, '2026-11-06', '2026-11-06');

    const stats = service.getDashboardStats('2026-11-06');
    assert.deepEqual(stats, {
      date: '2026-11-06',
      totalHabits: 3,
      completedTodayCount: 1,
      pendingTodayCount: 2,
      completionRateToday: 33,
      activeBestStreak: 2,
      historicalBestStreak: 2,
      totalCheckIns: 2,
    });
  });

  it('deve retornar taxa de conclusão 0 quando não há hábitos ([RF07])', () => {
    const stats = service.getDashboardStats('2026-11-06');
    assert.equal(stats.totalHabits, 0);
    assert.equal(stats.completionRateToday, 0);
  });
});

describe('API HTTP — Integração das rotas REST', () => {
  let tempFile;
  let server;

  function invokeApi(method, url, bodyObj = null) {
    return new Promise((resolve, reject) => {
      const rawBody = bodyObj ? JSON.stringify(bodyObj) : '';
      const req = new Readable({
        read() {
          if (rawBody) this.push(rawBody);
          this.push(null);
        },
      });
      req.method = method;
      req.url = url;
      req.headers = { host: 'localhost', 'content-type': 'application/json' };

      const res = {
        statusCode: 200,
        headers: {},
        writeHead(status, headers) {
          this.statusCode = status;
          this.headers = headers || {};
        },
        end(payload) {
          resolve({
            status: this.statusCode,
            json: () => JSON.parse(payload || '{}'),
          });
        },
      };

      server.requestListener(req, res).catch(reject);
    });
  }

  beforeEach(() => {
    tempFile = tempDatabaseFile('api');
    createEmptyDatabase(tempFile);
    server = createAppServer(tempFile);
  });

  afterEach(() => {
    removeDatabase(tempFile);
  });

  it('deve responder GET /api/health com status 200 e a versão do package.json', async () => {
    const res = await invokeApi('GET', '/api/health');
    assert.equal(res.status, 200);
    const body = res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.version, require('../package.json').version);
  });

  it('deve criar, listar e marcar check-in via HTTP REST', async () => {
    const createRes = await invokeApi('POST', '/api/habits', {
      title: 'Meditar 10 minutos',
      category: 'Mindfulness',
      targetDaysPerWeek: 7,
    });
    assert.equal(createRes.status, 201);
    const created = createRes.json();

    const listRes = await invokeApi('GET', '/api/habits?category=Mindfulness');
    assert.equal(listRes.status, 200);
    assert.deepEqual(listRes.json().map((h) => h.id), [created.id]);

    const checkinRes = await invokeApi('POST', `/api/habits/${created.id}/checkin`, {});
    assert.equal(checkinRes.status, 200);
    const checkinData = checkinRes.json();
    assert.equal(checkinData.action, 'added');
    assert.equal(checkinData.habit.completedToday, true);
  });

  it('deve retornar 400 com a mensagem de validação quando o título é curto demais', async () => {
    const res = await invokeApi('POST', '/api/habits', { title: 'Oi' });
    assert.equal(res.status, 400);
    assert.deepEqual(res.json(), {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'O título do hábito é obrigatório e deve ter pelo menos 3 caracteres.',
        fields: { title: 'O título do hábito é obrigatório e deve ter pelo menos 3 caracteres.' },
      },
    });
  });

  it('deve retornar 400 quando o corpo da requisição não é JSON válido', async () => {
    const req = new Readable({
      read() {
        this.push('{ invalido');
        this.push(null);
      },
    });
    req.method = 'POST';
    req.url = '/api/habits';
    req.headers = { host: 'localhost' };
    const result = await new Promise((resolve, reject) => {
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
    assert.equal(result.status, 400);
    assert.deepEqual(result.body, {
      error: { code: 'VALIDATION_ERROR', message: 'JSON inválido no corpo da requisição.' },
    });
  });

  it('deve retornar 404 ao editar ou excluir um hábito inexistente', async () => {
    const putRes = await invokeApi('PUT', '/api/habits/hab-nao-existe', { title: 'Novo título' });
    assert.equal(putRes.status, 404);
    assert.deepEqual(putRes.json(), {
      error: { code: 'NOT_FOUND', message: 'Hábito não encontrado.' },
    });

    const deleteRes = await invokeApi('DELETE', '/api/habits/hab-nao-existe');
    assert.equal(deleteRes.status, 404);
    assert.deepEqual(deleteRes.json(), {
      error: { code: 'NOT_FOUND', message: 'Hábito não encontrado.' },
    });
  });

  it('deve excluir um hábito existente via DELETE e deixar de encontrá-lo', async () => {
    const created = (await invokeApi('POST', '/api/habits', { title: 'Beber água' })).json();

    const deleteRes = await invokeApi('DELETE', `/api/habits/${created.id}`);
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.json().deletedHabit.id, created.id);

    const getRes = await invokeApi('GET', `/api/habits/${created.id}`);
    assert.equal(getRes.status, 404);
    assert.deepEqual(getRes.json(), {
      error: { code: 'NOT_FOUND', message: 'Hábito não encontrado.' },
    });
  });

  it('deve retornar 404 para endpoint de API desconhecido', async () => {
    const res = await invokeApi('GET', '/api/nao-existe');
    assert.equal(res.status, 404);
    assert.deepEqual(res.json(), {
      error: { code: 'NOT_FOUND', message: 'Endpoint da API não encontrado.' },
    });
  });

  it('deve retornar as estatísticas em GET /api/habits/stats', async () => {
    await invokeApi('POST', '/api/habits', { title: 'Beber água' });
    const res = await invokeApi('GET', '/api/habits/stats');
    assert.equal(res.status, 200);
    assert.equal(res.json().totalHabits, 1);
    assert.equal(res.json().completionRateToday, 0);
  });
});

describe('Formato padrão de erro da API ([API-ERR])', () => {
  let tempFile;
  let service;
  let handleApiRequest;

  beforeEach(() => {
    tempFile = tempDatabaseFile('err');
    createEmptyDatabase(tempFile);
    service = new HabitService(new SqliteStorage(tempFile));
    handleApiRequest = createApiRouter({ habitService: service, version: 'test' });
  });

  afterEach(() => {
    removeDatabase(tempFile);
  });

  function request(method, pathname, body) {
    return handleApiRequest({
      method,
      pathname,
      searchParams: new URLSearchParams(),
      readBody: async () => body || {},
    });
  }

  it('aponta o campo targetDaysPerWeek quando a meta semanal é inválida', async () => {
    const res = await request('POST', '/api/habits', { title: 'Correr 5km', targetDaysPerWeek: 9 });
    const message = 'A meta semanal (targetDaysPerWeek) deve ser um número inteiro entre 1 e 7.';
    assert.equal(res.status, 400);
    assert.deepEqual(res.payload, {
      error: { code: 'VALIDATION_ERROR', message, fields: { targetDaysPerWeek: message } },
    });
  });

  it('aponta o campo date quando a data do check-in tem formato inválido', async () => {
    const created = service.createHabit({ title: 'Ler um capítulo' });
    const res = await request('POST', `/api/habits/${created.id}/checkin`, { date: '06/11/2026' });
    const message = 'Formato de data inválido. Utilize o padrão YYYY-MM-DD.';
    assert.equal(res.status, 400);
    assert.deepEqual(res.payload, {
      error: { code: 'VALIDATION_ERROR', message, fields: { date: message } },
    });
  });

  it('responde 500 com mensagem genérica sem expor o erro interno', async () => {
    const failingRouter = createApiRouter({
      habitService: {
        getAllHabits() {
          throw new Error('EACCES: permission denied, open /srv/segredo.json');
        },
      },
      version: 'test',
    });
    const res = await failingRouter({
      method: 'GET',
      pathname: '/api/habits',
      searchParams: new URLSearchParams(),
      readBody: async () => ({}),
    });
    assert.equal(res.status, 500);
    assert.deepEqual(res.payload, {
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno no servidor.' },
    });
  });

  it('responde 404 no mesmo formato para arquivo estático inexistente', async () => {
    const server = createAppServer(tempFile);
    const result = await new Promise((resolve, reject) => {
      const res = {
        writeHead(status) {
          this.statusCode = status;
        },
        end(payload) {
          resolve({ status: this.statusCode, body: JSON.parse(payload) });
        },
      };
      server
        .requestListener({ method: 'GET', url: '/nao-existe.html', headers: { host: 'localhost' } }, res)
        .catch(reject);
    });
    assert.equal(result.status, 404);
    assert.deepEqual(result.body, {
      error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' },
    });
  });
});
