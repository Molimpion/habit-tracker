const http = require('http');
const { URL } = require('url');
const { HabitService } = require('./services/habitService');
const { version } = require('../package.json');

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        req.destroy();
        reject(new Error('Payload muito grande'));
      }
    });
    req.on('end', () => {
      if (!raw || raw.trim() === '') {
        return resolve({});
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        const syntaxError = new Error('JSON inválido no corpo da requisição.');
        syntaxError.statusCode = 400;
        reject(syntaxError);
      }
    });
    req.on('error', reject);
  });
}

function createAppServer(customDataFile) {
  const habitService = new HabitService(customDataFile);

  const requestListener = async (req, res) => {
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        return res.end();
      }

      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;

      if (pathname === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, {
          status: 'ok',
          service: 'HabitFlow API',
          version,
          timestamp: new Date().toISOString(),
        });
      }

      if (pathname === '/api/habits' && req.method === 'GET') {
        const filters = {
          category: parsedUrl.searchParams.get('category') || undefined,
          status: parsedUrl.searchParams.get('status') || undefined,
          search: parsedUrl.searchParams.get('search') || undefined,
        };
        const habits = habitService.getAllHabits(filters);
        return sendJson(res, 200, habits);
      }

      if (pathname === '/api/habits' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const created = habitService.createHabit(body);
        return sendJson(res, 201, created);
      }

      const checkinMatch = pathname.match(/^\/api\/habits\/([^/]+)\/checkin$/);
      if (checkinMatch && req.method === 'POST') {
        const id = decodeURIComponent(checkinMatch[1]);
        const body = await parseJsonBody(req);
        const result = habitService.toggleCheckIn(id, body.date);
        return sendJson(res, 200, result);
      }

      const itemMatch = pathname.match(/^\/api\/habits\/([^/]+)$/);
      if (itemMatch) {
        const id = decodeURIComponent(itemMatch[1]);

        if (req.method === 'GET') {
          const habit = habitService.getHabitById(id);
          return sendJson(res, 200, habit);
        }

        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          const updated = habitService.updateHabit(id, body);
          return sendJson(res, 200, updated);
        }

        if (req.method === 'DELETE') {
          const deleted = habitService.deleteHabit(id);
          return sendJson(res, 200, {
            message: 'Hábito removido com sucesso.',
            deletedHabit: deleted,
          });
        }
      }

      if (pathname.startsWith('/api/')) {
        return sendJson(res, 404, { error: 'Endpoint da API não encontrado.' });
      }

      return sendJson(res, 404, { error: 'Recurso não encontrado.' });
    } catch (error) {
      const status = error.statusCode || 500;
      return sendJson(res, status, {
        error: error.message || 'Erro interno no servidor.',
      });
    }
  };

  const server = http.createServer(requestListener);
  server.requestListener = requestListener;
  return server;
}

module.exports = { createAppServer };
