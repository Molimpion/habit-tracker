const crypto = require('crypto');
const {
  toLocalISODate,
  getTodayISO,
  isValidDateFormat,
  calculateStreaks,
} = require('../utils/streakCalculator');
const { ValidationError, NotFoundError } = require('../utils/errors');

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const VALID_CATEGORIES = [
  'Saúde',
  'Estudos',
  'Produtividade',
  'Mindfulness',
  'Finanças',
  'Outros',
];

class HabitService {
  constructor(storage) {
    this.storage = storage;
  }

  _findOrFail(id) {
    const found = this.storage.findById(id);
    if (!found) {
      throw new NotFoundError('Hábito não encontrado.');
    }
    return found;
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

  getAllHabits(filters = {}, referenceDate = getTodayISO()) {
    const habits = this.storage.list().map((h) =>
      this._enrichHabit(h, referenceDate)
    );

    return habits.filter((habit) => {
      if (
        filters.category &&
        filters.category !== 'Todas' &&
        habit.category.toLowerCase() !== filters.category.toLowerCase()
      ) {
        return false;
      }

      if (filters.status === 'completed' && !habit.completedToday) {
        return false;
      }
      if (filters.status === 'pending' && habit.completedToday) {
        return false;
      }

      if (filters.search && filters.search.trim() !== '') {
        const term = filters.search.trim().toLowerCase();
        const matchTitle = habit.title.toLowerCase().includes(term);
        const matchDesc = (habit.description || '')
          .toLowerCase()
          .includes(term);
        if (!matchTitle && !matchDesc) {
          return false;
        }
      }

      return true;
    });
  }

  getHabitById(id, referenceDate = getTodayISO()) {
    return this._enrichHabit(this._findOrFail(id), referenceDate);
  }

  createHabit(payload, referenceDate = getTodayISO()) {
    const { title, description = '', category = 'Outros', targetDaysPerWeek = 7 } =
      payload || {};

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      throw new ValidationError(
        'O título do hábito é obrigatório e deve ter pelo menos 3 caracteres.',
        'title'
      );
    }

    const parsedTarget = Number(targetDaysPerWeek);
    if (
      !Number.isInteger(parsedTarget) ||
      parsedTarget < 1 ||
      parsedTarget > 7
    ) {
      throw new ValidationError(
        'A meta semanal (targetDaysPerWeek) deve ser um número inteiro entre 1 e 7.',
        'targetDaysPerWeek'
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

    this.storage.insert(newHabit);

    return this._enrichHabit(newHabit, referenceDate);
  }

  updateHabit(id, payload, referenceDate = getTodayISO()) {
    const current = this._findOrFail(id);
    const updatedTitle =
      payload.title !== undefined ? payload.title : current.title;

    if (
      !updatedTitle ||
      typeof updatedTitle !== 'string' ||
      updatedTitle.trim().length < 3
    ) {
      throw new ValidationError(
        'O título do hábito é obrigatório e deve ter pelo menos 3 caracteres.',
        'title'
      );
    }

    const updatedTarget =
      payload.targetDaysPerWeek !== undefined
        ? Number(payload.targetDaysPerWeek)
        : current.targetDaysPerWeek;

    if (
      !Number.isInteger(updatedTarget) ||
      updatedTarget < 1 ||
      updatedTarget > 7
    ) {
      throw new ValidationError(
        'A meta semanal (targetDaysPerWeek) deve ser um número inteiro entre 1 e 7.',
        'targetDaysPerWeek'
      );
    }

    const updatedCategory =
      payload.category !== undefined
        ? VALID_CATEGORIES.includes(payload.category)
          ? payload.category
          : current.category
        : current.category;

    const updatedHabit = {
      ...current,
      title: updatedTitle.trim(),
      description:
        payload.description !== undefined
          ? String(payload.description).trim()
          : current.description,
      category: updatedCategory,
      targetDaysPerWeek: updatedTarget,
    };

    this.storage.update(updatedHabit);

    return this._enrichHabit(updatedHabit, referenceDate);
  }

  deleteHabit(id) {
    const removed = this._findOrFail(id);
    this.storage.remove(id);
    return removed;
  }

  toggleCheckIn(id, dateStr = getTodayISO(), referenceDate = getTodayISO()) {
    if (!isValidDateFormat(dateStr)) {
      throw new ValidationError(
        'Formato de data inválido. Utilize o padrão YYYY-MM-DD.',
        'date'
      );
    }

    const habit = this._findOrFail(id);

    let action;
    if (habit.completedDates.includes(dateStr)) {
      this.storage.removeCheckIn(id, dateStr);
      action = 'removed';
    } else {
      this.storage.addCheckIn(id, dateStr);
      action = 'added';
    }

    return {
      action,
      date: dateStr,
      habit: this._enrichHabit(this.storage.findById(id), referenceDate),
    };
  }

  getMonthlyReport(month, referenceDate = getTodayISO()) {
    if (typeof month !== 'string' || !MONTH_REGEX.test(month)) {
      throw new ValidationError('Informe o mês no formato AAAA-MM.', 'month');
    }

    const [year, monthNumber] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const habits = this.storage.list().map((habit) => {
      const createdOn = toLocalISODate(new Date(habit.createdAt));
      const firstCheckIn = habit.completedDates[0];
      return {
        title: habit.title,
        startsOn: firstCheckIn && firstCheckIn < createdOn ? firstCheckIn : createdOn,
        completed: new Set(habit.completedDates),
      };
    });

    const rows = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${month}-${String(day).padStart(2, '0')}`;
      if (date > referenceDate) {
        break;
      }
      for (const habit of habits) {
        if (date >= habit.startsOn) {
          rows.push({
            date,
            habit: habit.title,
            status: habit.completed.has(date) ? 'feito' : 'pendente',
          });
        }
      }
    }
    return rows;
  }

  getDashboardStats(referenceDate = getTodayISO()) {
    const habits = this.getAllHabits({}, referenceDate);
    const totalHabits = habits.length;
    const completedTodayCount = habits.filter((h) => h.completedToday).length;
    const completionRateToday =
      totalHabits > 0
        ? Math.round((completedTodayCount / totalHabits) * 100)
        : 0;

    const activeBestStreak = habits.reduce(
      (max, h) => Math.max(max, h.currentStreak),
      0
    );
    const historicalBestStreak = habits.reduce(
      (max, h) => Math.max(max, h.bestStreak),
      0
    );
    const totalCheckIns = habits.reduce(
      (sum, h) => sum + (h.completedDates ? h.completedDates.length : 0),
      0
    );

    return {
      date: referenceDate,
      totalHabits,
      completedTodayCount,
      pendingTodayCount: totalHabits - completedTodayCount,
      completionRateToday,
      activeBestStreak,
      historicalBestStreak,
      totalCheckIns,
    };
  }
}

module.exports = {
  HabitService,
  ValidationError,
  NotFoundError,
  VALID_CATEGORIES,
};
