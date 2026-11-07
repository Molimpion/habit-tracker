const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  calculateStreaks,
  isValidDateFormat,
} = require('../src/utils/streakCalculator');
const {
  HabitService,
  ValidationError,
  NotFoundError,
} = require('../src/services/habitService');

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

describe('HabitService — Persistência em JSON ([RNF02])', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'habitflow-storage-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('deve criar o diretório e o arquivo com 3 hábitos de exemplo quando ainda não existem', () => {
    const dataFile = path.join(tempDir, 'nested', 'habits.json');
    new HabitService(dataFile);

    const saved = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    assert.deepEqual(
      saved.map((h) => h.id),
      ['hab-01-eng-software', 'hab-02-hidratacao', 'hab-03-leitura']
    );
  });

  it('não deve sobrescrever um arquivo de dados já existente', () => {
    const dataFile = path.join(tempDir, 'habits.json');
    fs.writeFileSync(dataFile, '[]', 'utf-8');
    new HabitService(dataFile);

    assert.equal(fs.readFileSync(dataFile, 'utf-8'), '[]');
  });
});

describe('HabitService — CRUD, Validações e Check-in ([RF01] a [RF08])', () => {
  let tempFile;
  let service;

  beforeEach(() => {
    tempFile = path.join(
      os.tmpdir(),
      `habitflow-test-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
    );
    fs.writeFileSync(tempFile, '[]', 'utf-8');
    service = new HabitService(tempFile);
  });

  afterEach(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
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

  it('deve manter o hábito cadastrado ao recarregar o serviço a partir do arquivo ([RNF02])', () => {
    const created = service.createHabit({ title: 'Alongar pela manhã' });
    const reloaded = JSON.parse(fs.readFileSync(tempFile, 'utf-8'));
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
});
