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
