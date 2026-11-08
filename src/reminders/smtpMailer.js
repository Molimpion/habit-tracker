const nodemailer = require('nodemailer');

function createSmtpMailer({ smtp, from }) {
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  return {
    send: ({ to, subject, text }) => transport.sendMail({ from, to, subject, text }),
  };
}

module.exports = { createSmtpMailer };
