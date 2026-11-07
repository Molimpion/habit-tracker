const { createAppServer } = require('./app');

const PORT = process.env.PORT || 3000;
const server = createAppServer();

server.listen(PORT, () => {
  console.log(`HabitFlow rodando em http://localhost:${PORT}`);
});
