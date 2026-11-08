const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Readable } = require('stream');
const { spawn } = require('child_process');

const { SqliteStorage } = require('../src/storage/sqliteStorage');
const { ReminderService } = require('../src/reminders/reminderService');
const { readReminderConfig } = require('../src/reminders/reminderConfig');
const { createAppServer } = require('../src/app');
const { AuthService } = require('../src/auth/authService');

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';

function tempDatabaseFile() {
  return path.join(
    os.tmpdir(),
    `habitflow-reminder-${Date.now()}-${Math.random().toString(16).slice(2)}.db`
  );
}

function removeDatabase(file) {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(`${file}${suffix}`, { force: true });
  }
}

function at(day, hour) {
  return new Date(2026, 10, day, hour, 0, 0);
}

describe('ReminderService — lembrete diário de hábitos pendentes ([NOT-210])', () => {
  let file;
  let storage;
  let sent;
  let mailer;
  let reminders;

  function createUser(id, { remindersEnabled = true } = {}) {
    storage.createUser({
      id,
      name: `Pessoa ${id}`,
      email: `${id}@exemplo.com`,
      passwordHash: 'irrelevante',
      createdAt: new Date().toISOString(),
    });
    storage.setRemindersEnabled(id, remindersEnabled);
    return storage.forUser(id);
  }

  function addHabit(store, id, title) {
    store.insert({
      id,
      title,
      description: '',
      category: 'Outros',
      targetDaysPerWeek: 7,
      createdAt: at(1, 9).toISOString(),
    });
  }

  beforeEach(() => {
    file = tempDatabaseFile();
    storage = new SqliteStorage(file);
    sent = [];
    mailer = {
      async send(message) {
        sent.push(message);
      },
    };
    reminders = new ReminderService({ storage, mailer, hour: 20 });
  });

  afterEach(() => removeDatabase(file));

  it('não envia antes do horário configurado', async () => {
    addHabit(createUser('usr-a'), 'hab-1', 'Correr');
    await reminders.runOnce(at(7, 19));
    assert.deepEqual(sent, []);
  });

  it('envia às 20h um e-mail com os hábitos pendentes do dia', async () => {
    const store = createUser('usr-a');
    addHabit(store, 'hab-1', 'Correr');
    addHabit(store, 'hab-2', 'Ler');
    addHabit(store, 'hab-3', 'Meditar');
    store.addCheckIn('hab-2', '2026-11-07');

    await reminders.runOnce(at(7, 20));

    assert.deepEqual(sent, [
      {
        to: 'usr-a@exemplo.com',
        subject: 'HabitFlow: 2 hábitos pendentes hoje',
        text:
          'Olá, Pessoa usr-a!\n\n' +
          'Ainda faltam estes hábitos hoje:\n' +
          '- Correr\n' +
          '- Meditar\n\n' +
          'Para parar de receber, desmarque "Lembrete por e-mail" no HabitFlow.\n',
      },
    ]);
  });

  it('envia uma vez só por dia, mesmo rodando de novo ou num serviço recriado', async () => {
    addHabit(createUser('usr-a'), 'hab-1', 'Correr');

    await reminders.runOnce(at(7, 20));
    await reminders.runOnce(at(7, 21));
    await new ReminderService({ storage: new SqliteStorage(file), mailer, hour: 20 }).runOnce(at(7, 22));

    assert.equal(sent.length, 1);
  });

  it('envia de novo no dia seguinte', async () => {
    addHabit(createUser('usr-a'), 'hab-1', 'Correr');

    await reminders.runOnce(at(7, 20));
    await reminders.runOnce(at(8, 20));

    assert.equal(sent.length, 2);
  });

  it('não envia para quem não ativou o lembrete', async () => {
    addHabit(createUser('usr-a', { remindersEnabled: false }), 'hab-1', 'Correr');
    await reminders.runOnce(at(7, 20));
    assert.deepEqual(sent, []);
  });

  it('não envia quando todos os hábitos do dia estão feitos', async () => {
    const store = createUser('usr-a');
    addHabit(store, 'hab-1', 'Correr');
    store.addCheckIn('hab-1', '2026-11-07');

    await reminders.runOnce(at(7, 20));

    assert.deepEqual(sent, []);
  });

  it('envia só para o dono dos hábitos pendentes', async () => {
    addHabit(createUser('usr-a'), 'hab-1', 'Correr');
    createUser('usr-b');

    await reminders.runOnce(at(7, 20));

    assert.deepEqual(sent.map((m) => m.to), ['usr-a@exemplo.com']);
  });

  it('tenta de novo na próxima rodada quando o envio falha', async () => {
    addHabit(createUser('usr-a'), 'hab-1', 'Correr');
    let failures = 1;
    const flakyMailer = {
      async send(message) {
        if (failures > 0) {
          failures -= 1;
          throw new Error('SMTP indisponível');
        }
        sent.push(message);
      },
    };
    const flaky = new ReminderService({ storage, mailer: flakyMailer, hour: 20, log: () => {} });

    await flaky.runOnce(at(7, 20));
    assert.equal(sent.length, 0);
    await flaky.runOnce(at(7, 20));
    assert.equal(sent.length, 1);
  });
});

describe('Configuração do lembrete por variáveis de ambiente', () => {
  const smtp = {
    SMTP_HOST: 'smtp.exemplo.com',
    SMTP_PORT: '587',
    SMTP_USER: 'usuario',
    SMTP_PASS: 'senha-de-teste',
    MAIL_FROM: 'HabitFlow <nao-responda@exemplo.com>',
  };

  it('fica desligado e lista as variáveis que faltam quando o SMTP não está completo', () => {
    assert.deepEqual(readReminderConfig({ SMTP_HOST: 'smtp.exemplo.com' }), {
      enabled: false,
      missing: ['SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'],
    });
  });

  it('liga com o SMTP completo e usa 20h quando REMINDER_HOUR não é definido', () => {
    assert.deepEqual(readReminderConfig(smtp), {
      enabled: true,
      hour: 20,
      smtp: { host: 'smtp.exemplo.com', port: 587, user: 'usuario', pass: 'senha-de-teste' },
      from: 'HabitFlow <nao-responda@exemplo.com>',
    });
  });

  it('usa o REMINDER_HOUR informado', () => {
    assert.equal(readReminderConfig({ ...smtp, REMINDER_HOUR: '7' }).hour, 7);
  });

  it('recusa REMINDER_HOUR fora de 0 a 23', () => {
    for (const value of ['24', '-1', '8.5', 'oito']) {
      assert.throws(() => readReminderConfig({ ...smtp, REMINDER_HOUR: value }), {
        message: 'REMINDER_HOUR deve ser um número inteiro de 0 a 23.',
      });
    }
  });
});

describe('API HTTP — preferência de lembrete da conta', () => {
  let file;
  let server;
  let token;

  function invoke(method, url, { body, auth = true } = {}) {
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
      if (auth) {
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

  beforeEach(() => {
    file = tempDatabaseFile();
    server = createAppServer({ databaseFile: file, jwtSecret: SECRET });
    token = new AuthService(new SqliteStorage(file), SECRET).register({
      name: 'Ana',
      email: 'ana@exemplo.com',
      password: '12345678',
    }).token;
  });

  afterEach(() => removeDatabase(file));

  it('começa com o lembrete desligado', async () => {
    const res = await invoke('GET', '/api/account');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { name: 'Ana', email: 'ana@exemplo.com', remindersEnabled: false });
  });

  it('liga e desliga o lembrete', async () => {
    const on = await invoke('PATCH', '/api/account', { body: { remindersEnabled: true } });
    assert.equal(on.body.remindersEnabled, true);
    assert.equal((await invoke('GET', '/api/account')).body.remindersEnabled, true);

    const off = await invoke('PATCH', '/api/account', { body: { remindersEnabled: false } });
    assert.equal(off.body.remindersEnabled, false);
  });

  it('recusa valor que não é booleano apontando o campo remindersEnabled', async () => {
    const res = await invoke('PATCH', '/api/account', { body: { remindersEnabled: 'sim' } });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.error.fields, {
      remindersEnabled: 'remindersEnabled deve ser true ou false.',
    });
  });

  it('responde 401 sem token', async () => {
    const res = await invoke('GET', '/api/account', { auth: false });
    assert.equal(res.status, 401);
  });
});

describe('Inicialização do servidor sem SMTP', () => {
  it('sobe normalmente e avisa que os lembretes estão desligados', async () => {
    const env = {
      PATH: process.env.PATH,
      PORT: '0',
      JWT_SECRET: SECRET,
      DATABASE_FILE: tempDatabaseFile(),
    };
    const child = spawn(process.execPath, [path.join(__dirname, '../src/server.js')], { env });
    let output = '';
    const started = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 5000);
      const collect = (chunk) => {
        output += chunk;
        if (output.includes('HabitFlow rodando')) {
          clearTimeout(timer);
          resolve(true);
        }
      };
      child.stdout.on('data', collect);
      child.stderr.on('data', collect);
    });
    child.kill();
    removeDatabase(env.DATABASE_FILE);

    assert.equal(started, true);
    assert.match(
      output,
      /Lembretes por e-mail desligados: faltam SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM\./
    );
  });
});
