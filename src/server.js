const { createAppServer } = require('./app');

const PORT = process.env.PORT || 3000;
const server = createAppServer(process.env.DATABASE_FILE);

server.listen(PORT, () => {
  console.log(`HabitFlow rodando em http://localhost:${PORT}`);
});
