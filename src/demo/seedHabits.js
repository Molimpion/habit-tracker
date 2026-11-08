const { getTodayISO } = require('../utils/streakCalculator');

function createSeedHabits() {
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

module.exports = { createSeedHabits };
