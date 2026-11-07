const fs = require('fs');
const path = require('path');
const {
  getTodayISO,
} = require('../utils/streakCalculator');

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
}

module.exports = {
  HabitService,
  ValidationError,
  NotFoundError,
};
