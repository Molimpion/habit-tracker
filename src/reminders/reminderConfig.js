const REQUIRED = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'];
const DEFAULT_HOUR = 20;

function readReminderConfig(env) {
  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length > 0) {
    return { enabled: false, missing };
  }

  const hour = env.REMINDER_HOUR === undefined ? DEFAULT_HOUR : Number(env.REMINDER_HOUR);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error('REMINDER_HOUR deve ser um número inteiro de 0 a 23.');
  }

  return {
    enabled: true,
    hour,
    smtp: {
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    from: env.MAIL_FROM,
  };
}

module.exports = { readReminderConfig };
