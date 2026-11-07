const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const { webcrypto } = require('crypto');

const { LocalStorageStorage } = require('../src/storage/localStorageStorage');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, '_site');

function createWebStorage() {
  const items = new Map();
  return {
    items,
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
  };
}

function openDemoPage(webStorage) {
  const readSiteFile = async (file) => {
    const content = fs.readFileSync(path.join(SITE, file), 'utf-8');
    return { text: async () => content, json: async () => JSON.parse(content) };
  };
  const window = { fetch: readSiteFile, crypto: webcrypto, localStorage: webStorage };
  const bootSource = fs.readFileSync(path.join(SITE, 'lib/demo/boot.js'), 'utf-8');
  vm.runInNewContext(bootSource, { window, Response, URL });
  return window;
}

async function call(window, method, url, body) {
  const res = await window.fetch(url, { method, body });
  return { status: res.status, body: await res.json() };
}

describe('LocalStorageStorage — Adapter de armazenamento do navegador', () => {
  it('deve retornar null quando ainda não há dados salvos na chave', () => {
    const storage = new LocalStorageStorage(createWebStorage(), 'habitflow:habits');
    assert.equal(storage.load(), null);
  });

  it('deve salvar e recarregar os hábitos na chave informada', () => {
    const webStorage = createWebStorage();
    const storage = new LocalStorageStorage(webStorage, 'habitflow:habits');
    storage.save([{ id: 'hab-1' }]);

    assert.deepEqual(storage.load(), [{ id: 'hab-1' }]);
    assert.deepEqual([...webStorage.items.keys()], ['habitflow:habits']);
  });
});

describe('Modo demonstração do GitHub Pages', () => {
  before(() => {
    execFileSync('bash', [path.join(ROOT, 'scripts/build-pages.sh')]);
  });

  it('deve carregar o boot do modo demo antes do app.client.js e exibir o aviso de demonstração', () => {
    const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf-8');
    const bootIndex = html.indexOf('<script src="lib/demo/boot.js"></script>');
    const appIndex = html.indexOf('<script src="app.client.js"></script>');

    assert.ok(bootIndex !== -1 && appIndex !== -1 && bootIndex < appIndex);
    assert.ok(html.includes('Modo demonstração: os dados ficam salvos só neste navegador.'));
  });

  it('deve mostrar os 3 hábitos de exemplo na primeira visita', async () => {
    const window = openDemoPage(createWebStorage());
    const res = await window.fetch('/api/habits');

    assert.equal(res.status, 200);
    assert.deepEqual(
      (await res.json()).map((h) => h.id),
      ['hab-01-eng-software', 'hab-02-hidratacao', 'hab-03-leitura']
    );
  });

  it('deve manter o hábito cadastrado ao recarregar a página com o mesmo navegador', async () => {
    const webStorage = createWebStorage();
    const created = await call(
      openDemoPage(webStorage),
      'POST',
      '/api/habits',
      JSON.stringify({ title: 'Meditar 10 minutos', category: 'Mindfulness' })
    );
    assert.equal(created.status, 201);

    const reloaded = await call(openDemoPage(webStorage), 'GET', '/api/habits?category=Mindfulness');
    assert.deepEqual(reloaded.body.map((h) => h.id), [created.body.id]);
  });

  it('deve responder 400 com a mesma mensagem da API Node para título curto', async () => {
    const res = await call(openDemoPage(createWebStorage()), 'POST', '/api/habits', JSON.stringify({ title: 'Oi' }));

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'O título do hábito é obrigatório e deve ter pelo menos 3 caracteres.');
  });

  it('deve responder 400 quando o corpo não é JSON válido', async () => {
    const res = await call(openDemoPage(createWebStorage()), 'POST', '/api/habits', '{ invalido');

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'JSON inválido no corpo da requisição.');
  });

  it('deve marcar check-in e refletir nas estatísticas', async () => {
    const window = openDemoPage(createWebStorage());
    const before = (await call(window, 'GET', '/api/habits/stats')).body;
    await call(window, 'POST', '/api/habits/hab-03-leitura/checkin', '{}');
    const after = (await call(window, 'GET', '/api/habits/stats')).body;

    assert.equal(after.completedTodayCount, before.completedTodayCount + 1);
  });

  it('deve informar no health a versão do package.json', async () => {
    const res = await call(openDemoPage(createWebStorage()), 'GET', '/api/health');
    assert.equal(res.body.version, require('../package.json').version);
  });

  it('deve repassar ao fetch nativo as requisições que não são da API', async () => {
    const window = openDemoPage(createWebStorage());
    const res = await window.fetch('lib/package.json');
    assert.equal((await res.json()).name, 'habitflow');
  });
});
