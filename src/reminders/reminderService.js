const { HabitService } = require('../services/habitService');
const { toLocalISODate } = require('../utils/streakCalculator');

function buildMessage(user, pendingHabits) {
  const count = pendingHabits.length;
  const plural = count === 1 ? '' : 's';
  return {
    to: user.email,
    subject: `HabitFlow: ${count} hábito${plural} pendente${plural} hoje`,
    text:
      `Olá, ${user.name}!\n\n` +
      'Ainda faltam estes hábitos hoje:\n' +
      pendingHabits.map((habit) => `- ${habit.title}\n`).join('') +
      '\nPara parar de receber, desmarque "Lembrete por e-mail" no HabitFlow.\n',
  };
}

class ReminderService {
  constructor({ storage, mailer, hour, log = console.error }) {
    this.storage = storage;
    this.mailer = mailer;
    this.hour = hour;
    this.log = log;
  }

  async runOnce(now = new Date()) {
    if (now.getHours() < this.hour) {
      return;
    }
    const today = toLocalISODate(now);

    for (const user of this.storage.listUsersToRemind(today)) {
      const pending = new HabitService(this.storage.forUser(user.id)).getAllHabits(
        { status: 'pending' },
        today
      );
      if (pending.length === 0) {
        continue;
      }
      if (!this.storage.claimReminder(user.id, today, user.lastReminderDate)) {
        continue;
      }
      try {
        await this.mailer.send(buildMessage(user, pending));
      } catch (error) {
        this.storage.releaseReminder(user.id, today, user.lastReminderDate);
        this.log(`Falha ao enviar o lembrete de ${user.id}: ${error.message}`);
      }
    }
  }
}

module.exports = { ReminderService };
