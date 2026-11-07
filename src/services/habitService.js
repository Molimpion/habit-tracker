const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  getTodayISO,
  calculateStreaks,
} = require('../utils/streakCalculator');

const VALID_CATEGORIES = [
  'Saúde',
  'Estudos',
  'Produtividade',
  'Mindfulness',
  'Finanças',
  'Outros',
];

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class HabitService {
  constructor(customDataFile) {
    this.dataFile =
      customDataFile ||
      path.join(__dirname, '..', '..', 'data', 'habits.json');
    this._ensureStorage();
  }

  _ensureStorage() {
    const dir = path.dirname(this.dataFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.dataFile)) {
      const initialSeed = this._createSeedData();
      fs.writeFileSync(
        this.dataFile,
        JSON.stringify(initialSeed, null, 2),
        'utf-8'
      );
    }
  }

  _createSeedData() {
    const today = getTodayISO();
    return [
      {
        id: 'hab-01-eng-software',
        title: 'Estudar Engenharia de Software e Git Flow',
        description: 'Revisar requisitos, casos de uso e praticar commits atômicos diariamente.',
        category: 'Estudos',
        targetDaysPerWeek: 5,
        completedDates: [today],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'hab-02-hidratacao',
        title: 'Beber 2.5L de Água',
        description: 'Manter garrafa de água na mesa durante os estudos e trabalho.',
        category: 'Saúde',
        targetDaysPerWeek: 7,
        completedDates: [today],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'hab-03-leitura',
        title: 'Ler 15 páginas de livro técnico',
        description: 'Leitura focada em arquitetura limpa e boas práticas de código.',
        category: 'Produtividade',
        targetDaysPerWeek: 5,
        completedDates: [],
        createdAt: new Date().toISOString(),
      },
    ];
  }

  _readRawHabits() {
    this._ensureStorage();
    const content = fs.readFileSync(this.dataFile, 'utf-8');
    return JSON.parse(content || '[]');
  }

  _writeRawHabits(habits) {
    this._ensureStorage();
    fs.writeFileSync(this.dataFile, JSON.stringify(habits, null, 2), 'utf-8');
  }

  _enrichHabit(habit, referenceDate = getTodayISO()) {
    const { currentStreak, bestStreak, completedToday } = calculateStreaks(
      habit.completedDates || [],
      referenceDate
    );
    return {
      ...habit,
      currentStreak,
      bestStreak,
      completedToday,
    };
  }

  createHabit(payload, referenceDate = getTodayISO()) {
    const { title, description = '', category = 'Outros', targetDaysPerWeek = 7 } =
      payload || {};

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      throw new ValidationError(
        'O título do hábito é obrigatório e deve ter pelo menos 3 caracteres.'
      );
    }

    const parsedTarget = Number(targetDaysPerWeek);
    if (
      !Number.isInteger(parsedTarget) ||
      parsedTarget < 1 ||
      parsedTarget > 7
    ) {
      throw new ValidationError(
        'A meta semanal (targetDaysPerWeek) deve ser um número inteiro entre 1 e 7.'
      );
    }

    const normalizedCategory = VALID_CATEGORIES.includes(category)
      ? category
      : 'Outros';

    const newHabit = {
      id: `hab-${crypto.randomUUID().slice(0, 8)}`,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      category: normalizedCategory,
      targetDaysPerWeek: parsedTarget,
      completedDates: [],
      createdAt: new Date().toISOString(),
    };

    const habits = this._readRawHabits();
    habits.push(newHabit);
    this._writeRawHabits(habits);

    return this._enrichHabit(newHabit, referenceDate);
  }
}

module.exports = {
  HabitService,
  ValidationError,
  NotFoundError,
  VALID_CATEGORIES,
};
