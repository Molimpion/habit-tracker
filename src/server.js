const { createAppServer } = require('./app');

const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('Defina a variável de ambiente JWT_SECRET antes de iniciar o servidor.');
  process.exit(1);
}

const server = createAppServer({
  databaseFile: process.env.DATABASE_FILE,
  jwtSecret: process.env.JWT_SECRET,
});

server.listen(PORT, () => {
  console.log(`HabitFlow rodando em http://localhost:${PORT}`);
});
