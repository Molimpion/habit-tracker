const { createAppServer } = require('./app');
const { SqliteStorage } = require('./storage/sqliteStorage');
const { readReminderConfig } = require('./reminders/reminderConfig');
const { ReminderService } = require('./reminders/reminderService');
const { createSmtpMailer } = require('./reminders/smtpMailer');

const PORT = process.env.PORT || 3000;
const REMINDER_INTERVAL_MS = 60 * 1000;
const EXAMPLE_JWT_SECRET = 'troque-por-um-segredo-aleatorio';

if (!process.env.JWT_SECRET) {
  console.error('Defina a variável de ambiente JWT_SECRET antes de iniciar o servidor.');
  process.exit(1);
}

if (process.env.JWT_SECRET === EXAMPLE_JWT_SECRET) {
  console.warn(
    'Atenção: JWT_SECRET ainda é o valor de exemplo. Gere um segredo com "openssl rand -hex 32" antes de expor o servidor.'
  );
}

let reminderConfig;
try {
  reminderConfig = readReminderConfig(process.env);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const server = createAppServer({
  databaseFile: process.env.DATABASE_FILE,
  jwtSecret: process.env.JWT_SECRET,
});

if (reminderConfig.enabled) {
  const reminders = new ReminderService({
    storage: new SqliteStorage(server.databaseFile),
    mailer: createSmtpMailer(reminderConfig),
    hour: reminderConfig.hour,
  });
  setInterval(() => {
    reminders.runOnce().catch((error) => console.error(`Falha no lembrete: ${error.message}`));
  }, REMINDER_INTERVAL_MS).unref();
  console.log(`Lembretes por e-mail ligados a partir das ${reminderConfig.hour}h.`);
} else {
  console.warn(`Lembretes por e-mail desligados: faltam ${reminderConfig.missing.join(', ')}.`);
}

server.listen(PORT, () => {
  console.log(`HabitFlow rodando em http://localhost:${PORT}`);
});
